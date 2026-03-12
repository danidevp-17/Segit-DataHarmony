"""
Modelos para access policies.
Controla qué datasources puede usar cada routine y cada módulo.
"""
from sqlalchemy import Column, String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from shared.base_model import Base


class AccessPolicyRoutine(Base):
    """Routine → lista de datasources permitidos."""
    __tablename__ = "access_policy_routine"

    routine_slug = Column(String(128), primary_key=True)
    datasource_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id", ondelete="CASCADE"), primary_key=True)


class AccessPolicyModule(Base):
    """Module → lista de datasources permitidos. Vacío = todos permitidos."""
    __tablename__ = "access_policy_module"

    module_id = Column(String(64), primary_key=True)
    datasource_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id", ondelete="CASCADE"), primary_key=True)
