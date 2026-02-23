"""API endpoint for generating test data."""

import os
import uuid
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from models.database import get_db
from models.entities import ClientEntity, DatasetEntity, UserEntity
from models.schemas import DataUpload
from api.auth import get_current_user
from services.sample_data import generate_sample_data
from services.data_validator import DataValidator
from config import UPLOAD_DIR

router = APIRouter()


@router.post("/{client_id}/generate-test-data", response_model=DataUpload)
async def generate_test_data(
    client_id: int,
    weeks: int = 156,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """Generate sample MMM data for testing."""
    # Verify client ownership
    client = db.query(ClientEntity).filter(
        ClientEntity.id == client_id,
        ClientEntity.owner_id == current_user.id
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Generate data
    df = generate_sample_data(weeks=weeks)

    # Save to file
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{client_id}_test_{file_id}.csv")
    df.to_csv(file_path, index=False)

    # Validate
    validator = DataValidator(df)
    validation_result = validator.validate()
    date_start, date_end = validator.get_date_range()

    # Create dataset record
    dataset = DatasetEntity(
        client_id=client_id,
        name=f"Test Data ({weeks} weeks)",
        source_type="generated",
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


@router.get("/sample-csv")
async def download_sample_csv():
    """Download a sample CSV file for reference."""
    import tempfile

    df = generate_sample_data(weeks=104)  # 2 years

    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        df.to_csv(f.name, index=False)
        return FileResponse(
            f.name,
            media_type="text/csv",
            filename="sample_mmm_data.csv"
        )
