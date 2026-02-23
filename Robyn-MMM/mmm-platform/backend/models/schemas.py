from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# Auth schemas
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class User(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None


# Channel configuration
class ChannelConfig(BaseModel):
    name: str
    enabled: bool = True
    spend_column: Optional[str] = None


# BigQuery configuration
class BigQueryConfig(BaseModel):
    project_id: str
    dataset: str
    table: str


class BigQuerySpendTable(BaseModel):
    """Configuration for a spend source table."""
    table: str
    date_col: str
    spend_col: str
    alias: str  # Channel name (e.g., 'meta', 'google', 'tiktok')


class BigQueryMMMConfig(BaseModel):
    """Configuration for building MMM data from BigQuery."""
    project_id: str
    dataset: str
    revenue_table: str
    revenue_date_col: str
    revenue_col: str
    spend_tables: List[BigQuerySpendTable]
    aggregation: str = "weekly"  # 'daily' or 'weekly'


class BigQueryTableInfo(BaseModel):
    """Information about a BigQuery table."""
    table_id: str
    row_count: Optional[int] = None


class BigQuerySchemaField(BaseModel):
    """Schema field information."""
    name: str
    type: str


# Client schemas
class ClientBase(BaseModel):
    name: str
    industry: Optional[str] = None
    currency: str = "SEK"
    channels: List[str] = Field(default_factory=lambda: ["meta", "google", "tiktok", "email"])


class ClientCreate(ClientBase):
    bigquery_config: Optional[BigQueryConfig] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    currency: Optional[str] = None
    channels: Optional[List[str]] = None
    bigquery_config: Optional[BigQueryConfig] = None


class Client(ClientBase):
    id: int
    bigquery_config: Optional[Dict] = None
    created_at: datetime
    updated_at: Optional[datetime]
    latest_run_status: Optional[str] = None
    latest_run_date: Optional[datetime] = None

    class Config:
        from_attributes = True


# Data schemas
class DataPreview(BaseModel):
    columns: List[str]
    row_count: int
    date_range_start: Optional[str]
    date_range_end: Optional[str]
    sample_rows: List[Dict[str, Any]]
    validation_status: str
    validation_messages: List[str]


class DataUpload(BaseModel):
    id: int
    client_id: int
    name: str
    source_type: str
    row_count: int
    columns: List[str]
    date_range_start: Optional[datetime]
    date_range_end: Optional[datetime]
    validation_status: str
    validation_messages: List[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Model run schemas
class HyperparameterRange(BaseModel):
    min: float
    max: float


class AdstockConfig(BaseModel):
    theta: HyperparameterRange = Field(default_factory=lambda: HyperparameterRange(min=0.0, max=0.9))


class SaturationConfig(BaseModel):
    alpha: HyperparameterRange = Field(default_factory=lambda: HyperparameterRange(min=0.5, max=3.0))
    gamma: HyperparameterRange = Field(default_factory=lambda: HyperparameterRange(min=0.3, max=1.0))


class ModelConfig(BaseModel):
    date_column: str = "date"
    revenue_column: str = "revenue"
    spend_columns: List[str]
    control_columns: Optional[List[str]] = None
    adstock: AdstockConfig = Field(default_factory=AdstockConfig)
    saturation: SaturationConfig = Field(default_factory=SaturationConfig)
    iterations: int = 2000
    trials: int = 5


class ModelRunCreate(BaseModel):
    dataset_id: int
    config: ModelConfig


class ModelRunStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETE = "complete"
    FAILED = "failed"


class ChannelContribution(BaseModel):
    channel: str
    contribution: float
    percentage: float
    roi: float


class ModelMetrics(BaseModel):
    r_squared: float
    nrmse: float
    mape: float


class ResponseCurve(BaseModel):
    channel: str
    spend_values: List[float]
    response_values: List[float]
    current_spend: float
    optimal_spend: float


class BudgetAllocation(BaseModel):
    channel: str
    current_spend: float
    optimal_spend: float
    change_percentage: float
    expected_revenue_change: float


class ModelRunResponse(BaseModel):
    id: int
    client_id: int
    dataset_id: int
    status: str
    progress: float
    error_message: Optional[str]
    config: Dict[str, Any]
    metrics: Optional[ModelMetrics]
    channel_contributions: Optional[List[ChannelContribution]]
    response_curves: Optional[List[ResponseCurve]]
    optimal_budget: Optional[List[BudgetAllocation]]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# Budget optimizer request
class BudgetOptimizerRequest(BaseModel):
    total_budget: float
    constraints: Optional[Dict[str, Dict[str, float]]] = None  # channel: {min: x, max: y}
