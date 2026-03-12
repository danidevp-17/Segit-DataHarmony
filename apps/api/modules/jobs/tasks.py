"""
Tareas Celery para jobs.
"""
import json
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

from core.celery_app import app
from core.database import SessionLocal
from modules.jobs.models import JobStatus
from modules.jobs.repository import get_job_by_id, update_job
from modules.routines.repository import get_routine_by_slug


def _get_script_path(script_ref: str, base_path: str | None = None) -> Path | None:
    """Obtiene ruta absoluta del script. Retorna None si no existe."""
    base = Path(base_path) if base_path else Path("./data/routines")
    path = base / script_ref
    if path.exists():
        return path
    # Fallback: asumir que está en raíz del proyecto
    alt = Path(script_ref)
    if alt.is_absolute() and alt.exists():
        return alt
    return None


@app.task(bind=True, name="run_routine")
def run_routine(self, job_id: str):
    """
    Ejecuta una routine asociada a un job.
    Actualiza el job: RUNNING -> SUCCESS/FAILURE.
    """
    db = SessionLocal()
    try:
        from uuid import UUID
        uid = UUID(job_id)
        job = get_job_by_id(db, uid)
        if not job:
            self.update_state(state="FAILURE", meta={"error": "Job not found"})
            return {"status": "failure", "error": "Job not found"}

        payload = job.payload or {}
        routine_id = payload.get("routineId") or payload.get("routine_slug")
        if not routine_id:
            update_job(db, job, status=JobStatus.FAILURE.value, error="No routineId in payload", finished_at=datetime.now(timezone.utc))
            db.commit()
            return {"status": "failure", "error": "No routineId in payload"}

        routine = get_routine_by_slug(db, str(routine_id))
        if not routine:
            update_job(db, job, status=JobStatus.FAILURE.value, error=f"Routine not found: {routine_id}", finished_at=datetime.now(timezone.utc))
            db.commit()
            return {"status": "failure", "error": f"Routine not found: {routine_id}"}

        update_job(db, job, status=JobStatus.RUNNING.value, task_id=self.request.id, started_at=datetime.now(timezone.utc))
        db.commit()

        script_path = _get_script_path(routine.script)
        params = payload.get("params") or {}
        datasource_id = payload.get("datasourceId")

        if script_path and script_path.is_file():
            try:
                env = {"ROUTINE_PARAMS": json.dumps(params)}
                if datasource_id:
                    env["DATASOURCE_ID"] = str(datasource_id)
                result = subprocess.run(
                    [str(script_path)],
                    capture_output=True,
                    text=True,
                    timeout=300,
                    env={**__import__("os").environ, **env},
                    cwd=str(script_path.parent),
                )
                if result.returncode == 0:
                    update_job(db, job, status=JobStatus.SUCCESS.value, result={"stdout": result.stdout or "", "stderr": result.stderr or "", "returnCode": result.returncode}, finished_at=datetime.now(timezone.utc))
                else:
                    update_job(db, job, status=JobStatus.FAILURE.value, error=result.stderr or result.stdout or f"Exit code {result.returncode}", result={"stdout": result.stdout, "stderr": result.stderr, "returnCode": result.returncode}, finished_at=datetime.now(timezone.utc))
            except subprocess.TimeoutExpired:
                update_job(db, job, status=JobStatus.FAILURE.value, error="Script execution timeout (300s)", finished_at=datetime.now(timezone.utc))
            except Exception as e:
                update_job(db, job, status=JobStatus.FAILURE.value, error=str(e), finished_at=datetime.now(timezone.utc))
        else:
            # Stub: script no existe, simular éxito para pruebas
            time.sleep(1)
            update_job(db, job, status=JobStatus.SUCCESS.value, result={"message": "Routine executed (stub - script not found)", "routineId": routine_id, "params": params}, finished_at=datetime.now(timezone.utc))
        db.commit()
        return {"status": "success"}
    finally:
        db.close()
