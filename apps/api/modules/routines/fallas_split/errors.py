"""Errores del pipeline fallas_split."""


class FallasSplitError(Exception):
    """Error base."""

    code = "FALLAS_SPLIT_ERROR"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class FallasSplitValidationError(FallasSplitError):
    code = "VALIDATION_ERROR"


class FallasSplitCsvError(FallasSplitError):
    code = "CSV_ERROR"


class FallasSplitConflictError(FallasSplitError):
    code = "OUTPUT_CONFLICT"

    def __init__(self, message: str, conflicting_files: list[str]):
        super().__init__(message)
        self.conflicting_files = conflicting_files
