"""
Servicio de dominio: split de fallas.dat por Fault Name sobre un volumen remoto.

La tarea Celery solo orquesta (job PENDING→RUNNING→SUCCESS); toda la lógica
de negocio vive aquí para poder evolucionar sin acoplar a Celery.
"""
from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from loguru import logger
from sqlalchemy.orm import Session

from modules.routines.fallas_split.errors import (
    FallasSplitConflictError,
    FallasSplitError,
)
from modules.routines.fallas_split.reader import filter_by_fault_name, load_fallas_dataframe
from modules.routines.fallas_split.transform import group_rows_by_fault
from modules.routines.fallas_split.validation import compare_to_golden, summarize_row_counts
from modules.routines.fallas_split.writer import build_outputs
from modules.volumes.path_sanitize import join_under_share, sanitize_path_under_share
from modules.volumes.repository import get_volume_by_id
from modules.volumes.storage.base import StoragePathNotFoundError
from modules.volumes.storage.factory import get_adapter

if TYPE_CHECKING:
    pass


def _open_volume_adapter(db: Session, volume_id: UUID):
    vol = get_volume_by_id(db, volume_id)
    if not vol:
        raise FallasSplitError(f"Volume not found: {volume_id}")
    if not vol.is_active:
        raise FallasSplitError("Volume is inactive")
    return vol, get_adapter(vol)


class FallasSplitService:
    """Ejecución interna del flujo fallas.dat → <Fault Name>.dat en volumen."""

    @staticmethod
    def execute_on_volume(
        db: Session,
        volume_id: UUID,
        directory_path: str,
        *,
        fault_name_filter: str = "",
        overwrite_existing: bool = False,
        golden_files: dict[str, str] | None = None,
    ) -> dict:
        """
        Lee {directory}/fallas.dat, escribe <Fault Name>.dat en el mismo directorio.

        Retorna dict listo para persistir en job.result.
        """
        vol, adapter = _open_volume_adapter(db, volume_id)
        share = vol.share_path or "/"

        try:
            dir_clean = sanitize_path_under_share(directory_path.strip() or share, share)
        except ValueError as e:
            raise FallasSplitError(str(e)) from e

        fallas_path = join_under_share(dir_clean, "fallas.dat")

        try:
            adapter.stat(dir_clean)
        except StoragePathNotFoundError:
            raise FallasSplitError(f"Directory not found: {dir_clean}") from None
        except Exception as e:
            raise FallasSplitError(f"Cannot access directory: {e}") from e

        try:
            raw = adapter.read_file(fallas_path)
        except StoragePathNotFoundError:
            raise FallasSplitError(f"fallas.dat not found at {fallas_path}") from None
        except Exception as e:
            raise FallasSplitError(f"Cannot read fallas.dat: {e}") from e

        df = load_fallas_dataframe(raw)
        df = filter_by_fault_name(df, fault_name_filter)
        grouped = group_rows_by_fault(df)
        outputs = build_outputs(grouped)

        conflicts: list[str] = []
        for fname in outputs:
            remote = join_under_share(dir_clean, fname)
            try:
                if adapter.exists(remote):
                    conflicts.append(fname)
            except Exception:
                logger.warning("exists check failed for {}", remote)

        if conflicts and not overwrite_existing:
            raise FallasSplitConflictError(
                "Output file(s) already exist. Enable overwrite or remove files.",
                conflicting_files=conflicts,
            )

        files_written: list[str] = []
        for fname, content in outputs.items():
            remote = join_under_share(dir_clean, fname)
            try:
                adapter.upload_file(remote, content.encode("utf-8"))
                files_written.append(remote)
            except Exception as e:
                raise FallasSplitError(f"Failed to write {fname}: {e}") from e

        row_counts = summarize_row_counts(grouped)
        result: dict = {
            "service": "fallas_split",
            "filesWritten": files_written,
            "fileNames": list(outputs.keys()),
            "rowsPerFault": row_counts,
            "directory": dir_clean,
            "stdout": (
                f"Wrote {len(files_written)} file(s): {', '.join(outputs.keys())}\n"
                f"Rows per fault: {row_counts}\n"
            ),
            "stderr": "",
        }

        if golden_files:
            result["validation"] = compare_to_golden(outputs, golden_files)
        else:
            result["validation"] = {
                "ok": True,
                "skipped": "No golden files provided for comparison",
            }

        return result


def execute_fallas_split_on_volume(
    db: Session,
    volume_id: UUID,
    directory_path: str,
    *,
    fault_name_filter: str = "",
    overwrite_existing: bool = False,
    golden_files: dict[str, str] | None = None,
) -> dict:
    """Alias retrocompatible; preferir FallasSplitService.execute_on_volume en código nuevo."""
    return FallasSplitService.execute_on_volume(
        db,
        volume_id,
        directory_path,
        fault_name_filter=fault_name_filter,
        overwrite_existing=overwrite_existing,
        golden_files=golden_files,
    )
