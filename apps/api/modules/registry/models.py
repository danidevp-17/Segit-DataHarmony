"""
Modelos para app_modules y app_sections.
Definen la estructura dinámica de la aplicación (navegación, módulos, secciones).
"""
from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from shared.base_model import Base, UUIDMixin, TimestampMixin


class AppModule(Base, UUIDMixin, TimestampMixin):
    """Módulo principal de la aplicación (Data Quality, G&G, Cartography, etc.)."""
    __tablename__ = "app_modules"

    slug = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(64), nullable=True)
    color = Column(String(32), nullable=True)
    order_index = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    route = Column(String(256), nullable=True)

    sections = relationship("AppSection", back_populates="module", order_by="AppSection.order_index")


class AppSection(Base, UUIDMixin, TimestampMixin):
    """Sección dentro de un módulo (ej: Scripts, Applications dentro de Data Quality)."""
    __tablename__ = "app_sections"

    module_id = Column(UUID(as_uuid=True), ForeignKey("app_modules.id", ondelete="CASCADE"), nullable=False)
    slug = Column(String(64), nullable=False, index=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    route = Column(String(256), nullable=True)
    icon = Column(String(64), nullable=True)

    module = relationship("AppModule", back_populates="sections")
