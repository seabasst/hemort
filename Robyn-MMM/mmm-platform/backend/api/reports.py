import os
from typing import List, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from models.database import get_db
from models.entities import ClientEntity, ModelRunEntity, UserEntity
from api.auth import get_current_user, get_current_user_from_query
from services.report_generator import ReportGenerator

router = APIRouter()


def scan_plots_directory(plots_dir: str) -> List[Dict[str, str]]:
    """Scan a directory for PNG plot files and return their metadata."""
    plots = []
    if not plots_dir or not os.path.exists(plots_dir):
        return plots

    # Scan main directory and Robyn subdirectories
    dirs_to_scan = [plots_dir]
    for subdir in os.listdir(plots_dir):
        subdir_path = os.path.join(plots_dir, subdir)
        if os.path.isdir(subdir_path) and subdir.startswith("Robyn_"):
            dirs_to_scan.append(subdir_path)

    for scan_dir in dirs_to_scan:
        for filename in sorted(os.listdir(scan_dir)):
            if filename.endswith('.png'):
                plot_name = filename[:-4]  # Remove .png extension

                # Categorize plots by Robyn naming conventions
                category = "other"
                if "response" in plot_name.lower() or "curve" in plot_name.lower():
                    category = "response_curves"
                elif "pareto" in plot_name.lower():
                    category = "model_selection"
                elif "decomp" in plot_name.lower() or "waterfall" in plot_name.lower():
                    category = "decomposition"
                elif "spend" in plot_name.lower() or "effect" in plot_name.lower():
                    category = "channel_analysis"
                elif "fit" in plot_name.lower() or "actual" in plot_name.lower():
                    category = "model_fit"
                elif "adstock" in plot_name.lower() or "decay" in plot_name.lower():
                    category = "adstock"
                elif "allocat" in plot_name.lower() or "optim" in plot_name.lower():
                    category = "budget_allocation"
                elif "cluster" in plot_name.lower():
                    category = "model_selection"
                elif "hypersampling" in plot_name.lower() or "convergence" in plot_name.lower():
                    category = "model_fit"
                elif "validation" in plot_name.lower():
                    category = "model_fit"

                plots.append({
                    "name": plot_name,
                    "filename": filename,
                    "category": category
                })

    return plots


@router.get("/{client_id}/runs/{run_id}/pdf")
async def generate_pdf_report(
    client_id: int,
    run_id: int,
    token: str = None,
    db: Session = Depends(get_db),
):
    """Generate and download a PDF report for a model run. Accepts token via query parameter."""
    # Support token via query param for window.open()
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

    if not model_run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model run not found"
        )

    if model_run.status != "complete":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Model run must be complete to generate report"
        )

    # Generate PDF
    generator = ReportGenerator()
    try:
        pdf_path = generator.generate(
            client=client,
            model_run=model_run
        )

        return FileResponse(
            path=pdf_path,
            filename=f"{client.name}_MMM_Report_{model_run.id}.pdf",
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate report: {str(e)}"
        )


@router.get("/{client_id}/runs/{run_id}/summary")
async def get_report_summary(
    client_id: int,
    run_id: int,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """Get a summary of the model run results for the report page."""
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

    # Scan for actual plot files
    plots = scan_plots_directory(model_run.plots_dir)

    return {
        "client": {
            "id": client.id,
            "name": client.name,
            "industry": client.industry,
            "currency": client.currency
        },
        "run": {
            "id": model_run.id,
            "status": model_run.status,
            "created_at": model_run.created_at.isoformat() if model_run.created_at else None,
            "completed_at": model_run.completed_at.isoformat() if model_run.completed_at else None,
            "error_message": model_run.error_message
        },
        "metrics": model_run.metrics,
        "channel_contributions": model_run.channel_contributions,
        "response_curves": model_run.response_curves,
        "optimal_budget": model_run.optimal_budget,
        "plots_available": plots
    }
