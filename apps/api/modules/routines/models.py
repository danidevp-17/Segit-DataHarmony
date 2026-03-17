"""
Modelo de Routine (catálogo de rutinas operacionales).
Cada rutina define un script ejecutable, parámetros e inputs de archivo.
"""
from sqlalchemy import Column, String, Text, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB

from shared.base_model import Base, UUIDMixin, TimestampMixin


class Routine(Base, UUIDMixin, TimestampMixin):
    """
    Rutina operacional: script con parámetros e inputs.
    Ejemplo: addfaultname, load_pts2grid, grav_batch, etc.
    """
    __tablename__ = "routines"

    # Slug único para URLs (ej: addfaultname, load_pts2grid)
    slug = Column(String(128), nullable=False, unique=True, index=True)
    name = Column(String(256), nullable=False)
    description = Column(Text, default="", nullable=False)
    script = Column(String(512), nullable=False)  # Ruta o nombre del script
    # Parámetros: [{"key": "param1", "label": "Param 1", "required": true}]
    params = Column(JSONB, default=list, nullable=False)
    # Inputs de archivo: [{"name": "input1", "label": "Archivo", "accept": ".csv", "multiple": false}]
    file_inputs = Column(JSONB, default=list, nullable=False)
    needs_datasource = Column(Boolean, default=False, nullable=False)
    # Módulo asociado (ej: geology_geophysics) para filtrado y políticas
    module = Column(String(64), default="geology_geophysics", nullable=False, index=True)
