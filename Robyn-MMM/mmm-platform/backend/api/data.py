import os
import uuid
from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
import pandas as pd

from models.database import get_db
from models.entities import ClientEntity, DatasetEntity, UserEntity
from models.schemas import DataUpload, DataPreview, BigQueryConfig, BigQueryMMMConfig, BigQueryTableInfo, BigQuerySchemaField
from api.auth import get_current_user
from services.bigquery import BigQueryService
from services.data_validator import DataValidator

from config import UPLOAD_DIR

router = APIRouter()


# BigQuery exploration endpoints - must be defined BEFORE {client_id} routes
@router.get("/bigquery/datasets")
async def list_bigquery_datasets(
    project_id: str,
    current_user: UserEntity = Depends(get_current_user)
):
    """List all datasets in a BigQuery project."""
    bq_service = BigQueryService(project_id)
    try:
        datasets = bq_service.list_datasets()
        return {"datasets": datasets}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to list datasets: {str(e)}"
        )


@router.get("/bigquery/tables", response_model=List[BigQueryTableInfo])
async def list_bigquery_tables(
    project_id: str,
    dataset: str,
    current_user: UserEntity = Depends(get_current_user)
):
    """List all tables in a BigQuery dataset."""
    bq_service = BigQueryService(project_id)
    try:
        tables = bq_service.list_tables(dataset)
        return [BigQueryTableInfo(table_id=t) for t in tables]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to list tables: {str(e)}"
        )


@router.get("/bigquery/schema", response_model=List[BigQuerySchemaField])
async def get_bigquery_schema(
    project_id: str,
    dataset: str,
    table: str,
    current_user: UserEntity = Depends(get_current_user)
):
    """Get schema of a BigQuery table."""
    bq_service = BigQueryService(project_id)
    try:
        schema = bq_service.get_table_schema(dataset, table)
        return [BigQuerySchemaField(**f) for f in schema]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get schema: {str(e)}"
        )


# Client-specific data endpoints
@router.post("/{client_id}/upload", response_model=DataUpload)
async def upload_csv(
    client_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """Upload a CSV file for a client."""
    # Verify client ownership
    client = db.query(ClientEntity).filter(
        ClientEntity.id == client_id,
        ClientEntity.owner_id == current_user.id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are supported"
        )

    # Save file
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{client_id}_{file_id}.csv")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # Read and validate
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to parse CSV: {str(e)}"
        )

    # Validate data
    validator = DataValidator(df)
    validation_result = validator.validate()

    # Detect date range
    date_start, date_end = validator.get_date_range()

    # Create dataset record
    dataset = DatasetEntity(
        client_id=client_id,
        name=file.filename,
        source_type="csv",
        file_path=file_path,
        date_range_start=date_start,
        date_range_end=date_end,
        row_count=len(df),
        columns=df.columns.tolist(),
        validation_status=validation_result["status"],
        validation_messages=validation_result["messages"]
    )

    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return dataset


@router.post("/{client_id}/bigquery", response_model=DataUpload)
async def fetch_from_bigquery(
    client_id: int,
    config: BigQueryConfig,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """Fetch data from BigQuery for a client."""
    # Verify client ownership
    client = db.query(ClientEntity).filter(
        ClientEntity.id == client_id,
        ClientEntity.owner_id == current_user.id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    # Fetch from BigQuery
    bq_service = BigQueryService(config.project_id)
    try:
        df = bq_service.fetch_table(config.dataset, config.table)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch from BigQuery: {str(e)}"
        )

    # Save to CSV for processing
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{client_id}_bq_{file_id}.csv")
    df.to_csv(file_path, index=False)

    # Validate data
    validator = DataValidator(df)
    validation_result = validator.validate()
    date_start, date_end = validator.get_date_range()

    # Update client with BigQuery config
    client.bigquery_config = config.model_dump()
    db.commit()

    # Create dataset record
    dataset = DatasetEntity(
        client_id=client_id,
        name=f"BigQuery: {config.dataset}.{config.table}",
        source_type="bigquery",
        file_path=file_path,
        date_range_start=date_start,
        date_range_end=date_end,
        row_count=len(df),
        columns=df.columns.tolist(),
        validation_status=validation_result["status"],
        validation_messages=validation_result["messages"]
    )

    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return dataset


@router.get("/{client_id}/datasets", response_model=List[DataUpload])
async def list_datasets(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """List all datasets for a client."""
    client = db.query(ClientEntity).filter(
        ClientEntity.id == client_id,
        ClientEntity.owner_id == current_user.id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    datasets = db.query(DatasetEntity).filter(
        DatasetEntity.client_id == client_id
    ).order_by(DatasetEntity.created_at.desc()).all()

    return datasets


@router.get("/{client_id}/datasets/{dataset_id}/preview", response_model=DataPreview)
async def preview_dataset(
    client_id: int,
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """Preview a dataset with sample rows."""
    client = db.query(ClientEntity).filter(
        ClientEntity.id == client_id,
        ClientEntity.owner_id == current_user.id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    dataset = db.query(DatasetEntity).filter(
        DatasetEntity.id == dataset_id,
        DatasetEntity.client_id == client_id
    ).first()

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Read sample rows
    df = pd.read_csv(dataset.file_path)
    sample_rows = df.head(10).to_dict(orient="records")

    # Convert any NaN values to None for JSON serialization
    for row in sample_rows:
        for key, value in row.items():
            if pd.isna(value):
                row[key] = None

    return DataPreview(
        columns=dataset.columns,
        row_count=dataset.row_count,
        date_range_start=dataset.date_range_start.isoformat() if dataset.date_range_start else None,
        date_range_end=dataset.date_range_end.isoformat() if dataset.date_range_end else None,
        sample_rows=sample_rows,
        validation_status=dataset.validation_status,
        validation_messages=dataset.validation_messages
    )


@router.delete("/{client_id}/datasets/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    client_id: int,
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """Delete a dataset."""
    client = db.query(ClientEntity).filter(
        ClientEntity.id == client_id,
        ClientEntity.owner_id == current_user.id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    dataset = db.query(DatasetEntity).filter(
        DatasetEntity.id == dataset_id,
        DatasetEntity.client_id == client_id
    ).first()

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Delete file
    if dataset.file_path and os.path.exists(dataset.file_path):
        os.remove(dataset.file_path)

    db.delete(dataset)
    db.commit()




@router.post("/{client_id}/bigquery/mmm", response_model=DataUpload)
async def fetch_mmm_from_bigquery(
    client_id: int,
    config: BigQueryMMMConfig,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """Fetch MMM-ready data from BigQuery by combining revenue and spend sources."""
    # Verify client ownership
    client = db.query(ClientEntity).filter(
        ClientEntity.id == client_id,
        ClientEntity.owner_id == current_user.id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    # Fetch MMM data from BigQuery
    bq_service = BigQueryService(config.project_id)
    try:
        spend_tables = [st.model_dump() for st in config.spend_tables]
        df = bq_service.fetch_mmm_data(
            dataset=config.dataset,
            revenue_table=config.revenue_table,
            revenue_date_col=config.revenue_date_col,
            revenue_col=config.revenue_col,
            spend_tables=spend_tables,
            aggregation=config.aggregation
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch MMM data from BigQuery: {str(e)}"
        )

    # Save to CSV for processing
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{client_id}_mmm_{file_id}.csv")
    df.to_csv(file_path, index=False)

    # Validate data
    validator = DataValidator(df)
    validation_result = validator.validate()
    date_start, date_end = validator.get_date_range()

    # Store config on client
    client.bigquery_config = config.model_dump()
    db.commit()

    # Create dataset record
    spend_channels = [st.alias for st in config.spend_tables]
    dataset_name = f"MMM: {config.dataset} ({', '.join(spend_channels)})"

    dataset = DatasetEntity(
        client_id=client_id,
        name=dataset_name,
        source_type="bigquery_mmm",
        file_path=file_path,
        date_range_start=date_start,
        date_range_end=date_end,
        row_count=len(df),
        columns=df.columns.tolist(),
        validation_status=validation_result["status"],
        validation_messages=validation_result["messages"]
    )

    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    return dataset
