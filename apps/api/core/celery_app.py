"""
Celery app para tareas en segundo plano.
Usa Redis como broker y backend.
"""
from celery import Celery

from core.config import settings

app = Celery(
    "dataharmony",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["modules.jobs.tasks"],
)
app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hora máximo por tarea
)
