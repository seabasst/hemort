import asyncio
import os
from typing import List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import desc

from models.database import get_db
from models.entities import ClientEntity, DatasetEntity, ModelRunEntity, UserEntity
from models.schemas import (
    ModelRunCreate, ModelRunResponse, BudgetOptimizerRequest,
    BudgetAllocation, ModelMetrics, ChannelContribution, ResponseCurve
)
from api.auth import get_current_user, get_current_user_from_query
from services.robyn_runner import RobynRunner
from config import RUNS_DIR

router = APIRouter()


async def run_model_async(model_run_id: int, db_url: str):
    """Run the Robyn model in the background."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        model_run = db.query(ModelRunEntity).filter(ModelRunEntity.id == model_run_id).first()
        if not model_run:
            return

        # Update status to running
        model_run.status = "running"
        model_run.started_at = datetime.utcnow()
        db.commit()

        # Get dataset
        dataset = db.query(DatasetEntity).filter(DatasetEntity.id == model_run.dataset_id).first()

        # Run Robyn
        runner = RobynRunner()
        try:
            results = runner.run(
                data_path=dataset.file_path,
                config=model_run.config,
                output_dir=os.path.join(RUNS_DIR, str(model_run_id))
            )

            # Update with results
            model_run.status = "complete"
            model_run.completed_at = datetime.utcnow()
            model_run.progress = 100.0
            model_run.results = results.get("raw_results", {})
            model_run.metrics = results.get("metrics", {})
            model_run.channel_contributions = results.get("channel_contributions", [])
            model_run.response_curves = results.get("response_curves", [])
            model_run.optimal_budget = results.get("optimal_budget", [])
            model_run.plots_dir = results.get("plots_dir")

        except Exception as e:
            model_run.status = "failed"
            model_run.error_message = str(e)
            model_run.completed_at = datetime.utcnow()

        db.commit()

    finally:
        db.close()


@router.post("/{client_id}/runs", response_model=ModelRunResponse, status_code=status.HTTP_201_CREATED)
async def create_model_run(
    client_id: int,
    run_data: ModelRunCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """Create and start a new model run."""
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

    # Verify dataset exists
    dataset = db.query(DatasetEntity).filter(
        DatasetEntity.id == run_data.dataset_id,
        DatasetEntity.client_id == client_id
    ).first()

    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dataset not found"
        )

    # Create model run
    model_run = ModelRunEntity(
        client_id=client_id,
        dataset_id=run_data.dataset_id,
        config=run_data.config.model_dump(),
        status="queued"
    )

    db.add(model_run)
    db.commit()
    db.refresh(model_run)

    # Queue background task
    from models.database import DATABASE_URL
    background_tasks.add_task(run_model_async, model_run.id, DATABASE_URL)

    return model_run


@router.get("/{client_id}/runs", response_model=List[ModelRunResponse])
async def list_model_runs(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """List all model runs for a client."""
    client = db.query(ClientEntity).filter(
        ClientEntity.id == client_id,
        ClientEntity.owner_id == current_user.id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    runs = db.query(ModelRunEntity).filter(
        ModelRunEntity.client_id == client_id
    ).order_by(desc(ModelRunEntity.created_at)).all()

    return runs


@router.get("/{client_id}/runs/{run_id}", response_model=ModelRunResponse)
async def get_model_run(
    client_id: int,
    run_id: int,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """Get a specific model run."""
    client = db.query(ClientEntity).filter(
        ClientEntity.id == client_id,
        ClientEntity.owner_id == current_user.id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    model_run = db.query(ModelRunEntity).filter(
        ModelRunEntity.id == run_id,
        ModelRunEntity.client_id == client_id
    ).first()

    if not model_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model run not found"
        )

    return model_run


@router.get("/{client_id}/runs/{run_id}/plots/{plot_name}")
async def get_plot(
    client_id: int,
    run_id: int,
    plot_name: str,
    token: str = None,
    db: Session = Depends(get_db),
):
    """Get a specific plot from a model run. Accepts token via query parameter for image embedding."""
    import os
    from fastapi.responses import FileResponse

    # Support token via query param for image src tags
    current_user = await get_current_user_from_query(token=token, db=db)

    client = db.query(ClientEntity).filter(
        ClientEntity.id == client_id,
        ClientEntity.owner_id == current_user.id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    model_run = db.query(ModelRunEntity).filter(
        ModelRunEntity.id == run_id,
        ModelRunEntity.client_id == client_id
    ).first()

    if not model_run or not model_run.plots_dir:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model run or plots not found"
        )

    # Prepare filename with .png extension
    filename = plot_name if plot_name.endswith('.png') else f"{plot_name}.png"

    # Try exact path first
    plot_path = os.path.join(model_run.plots_dir, filename)

    # If not found, search in Robyn subdirectories
    if not os.path.exists(plot_path):
        for subdir in os.listdir(model_run.plots_dir):
            subdir_path = os.path.join(model_run.plots_dir, subdir)
            if os.path.isdir(subdir_path) and subdir.startswith("Robyn_"):
                potential_path = os.path.join(subdir_path, filename)
                if os.path.exists(potential_path):
                    plot_path = potential_path
                    break

    if not os.path.exists(plot_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plot '{plot_name}' not found"
        )

    return FileResponse(plot_path, media_type="image/png")


@router.post("/{client_id}/runs/{run_id}/optimize", response_model=List[BudgetAllocation])
async def optimize_budget(
    client_id: int,
    run_id: int,
    request: BudgetOptimizerRequest,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """Optimize budget allocation for a completed model run."""
    client = db.query(ClientEntity).filter(
        ClientEntity.id == client_id,
        ClientEntity.owner_id == current_user.id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    model_run = db.query(ModelRunEntity).filter(
        ModelRunEntity.id == run_id,
        ModelRunEntity.client_id == client_id
    ).first()

    if not model_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model run not found"
        )

    if model_run.status != "complete":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Model run must be complete to optimize budget"
        )

    # Run budget optimization using Robyn
    runner = RobynRunner()
    try:
        optimized = runner.optimize_budget(
            model_results=model_run.results,
            total_budget=request.total_budget,
            constraints=request.constraints
        )
        return optimized
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Budget optimization failed: {str(e)}"
        )
