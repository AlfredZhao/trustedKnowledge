import oracledb
from fastapi import HTTPException, status


def oracle_http_exception(exc: oracledb.Error, prefix: str) -> HTTPException:
    error = exc.args[0] if exc.args else exc
    message = getattr(error, "message", str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"{prefix}: {message}")
