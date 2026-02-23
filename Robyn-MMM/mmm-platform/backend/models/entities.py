from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text, Float, Enum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from .database import Base


class ModelStatus(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETE = "complete"
    FAILED = "failed"


class UserEntity(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    clients = relationship("ClientEntity", back_populates="owner")


class ClientEntity(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    industry = Column(String(100))
    currency = Column(String(10), default="SEK")
    channels = Column(JSON, default=list)  # List of enabled channels
    bigquery_config = Column(JSON, nullable=True)  # BigQuery connection settings
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("UserEntity", back_populates="clients")
    datasets = relationship("DatasetEntity", back_populates="client", cascade="all, delete-orphan")
    model_runs = relationship("ModelRunEntity", back_populates="client", cascade="all, delete-orphan")


class DatasetEntity(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    name = Column(String(255), nullable=False)
    source_type = Column(String(50))  # "csv" or "bigquery"
    file_path = Column(String(500), nullable=True)
    date_range_start = Column(DateTime)
    date_range_end = Column(DateTime)
    row_count = Column(Integer)
    columns = Column(JSON)  # List of column names
    validation_status = Column(String(50))  # "valid", "warning", "error"
    validation_messages = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    client = relationship("ClientEntity", back_populates="datasets")
    model_runs = relationship("ModelRunEntity", back_populates="dataset")


class ModelRunEntity(Base):
    __tablename__ = "model_runs"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)

    # Model configuration
    config = Column(JSON, nullable=False)  # Column mappings, hyperparameters

    # Status tracking
    status = Column(String(20), default=ModelStatus.QUEUED.value)
    progress = Column(Float, default=0.0)
    error_message = Column(Text, nullable=True)

    # Results
    results = Column(JSON, nullable=True)  # Parsed Robyn outputs
    metrics = Column(JSON, nullable=True)  # R², NRMSE, MAPE
    channel_contributions = Column(JSON, nullable=True)
    response_curves = Column(JSON, nullable=True)
    optimal_budget = Column(JSON, nullable=True)

    # File paths for plots
    plots_dir = Column(String(500), nullable=True)

    # Timestamps
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    client = relationship("ClientEntity", back_populates="model_runs")
    dataset = relationship("DatasetEntity", back_populates="model_runs")
