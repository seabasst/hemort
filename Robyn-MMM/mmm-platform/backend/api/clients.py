from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from models.database import get_db
from models.entities import ClientEntity, ModelRunEntity, UserEntity
from models.schemas import Client, ClientCreate, ClientUpdate
from api.auth import get_current_user

router = APIRouter()


def get_client_with_latest_run(client: ClientEntity) -> dict:
    """Augment client data with latest run status."""
    client_dict = {
        "id": client.id,
        "name": client.name,
        "industry": client.industry,
        "currency": client.currency,
        "channels": client.channels or [],
        "bigquery_config": client.bigquery_config,
        "created_at": client.created_at,
        "updated_at": client.updated_at,
        "latest_run_status": None,
        "latest_run_date": None
    }

    if client.model_runs:
        latest_run = max(client.model_runs, key=lambda r: r.created_at)
        client_dict["latest_run_status"] = latest_run.status
        client_dict["latest_run_date"] = latest_run.created_at

    return client_dict


@router.get("/", response_model=List[Client])
async def list_clients(
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """List all clients for the current user."""
    clients = db.query(ClientEntity).filter(
        ClientEntity.owner_id == current_user.id
    ).order_by(desc(ClientEntity.created_at)).all()

    return [get_client_with_latest_run(c) for c in clients]


@router.post("/", response_model=Client, status_code=status.HTTP_201_CREATED)
async def create_client(
    client_data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """Create a new client."""
    client = ClientEntity(
        name=client_data.name,
        industry=client_data.industry,
        currency=client_data.currency,
        channels=client_data.channels,
        bigquery_config=client_data.bigquery_config.model_dump() if client_data.bigquery_config else None,
        owner_id=current_user.id
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return get_client_with_latest_run(client)


@router.get("/{client_id}", response_model=Client)
async def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """Get a specific client."""
    client = db.query(ClientEntity).filter(
        ClientEntity.id == client_id,
        ClientEntity.owner_id == current_user.id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    return get_client_with_latest_run(client)


@router.patch("/{client_id}", response_model=Client)
async def update_client(
    client_id: int,
    client_data: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """Update a client."""
    client = db.query(ClientEntity).filter(
        ClientEntity.id == client_id,
        ClientEntity.owner_id == current_user.id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    update_data = client_data.model_dump(exclude_unset=True)

    if "bigquery_config" in update_data and update_data["bigquery_config"]:
        update_data["bigquery_config"] = update_data["bigquery_config"]

    for field, value in update_data.items():
        setattr(client, field, value)

    db.commit()
    db.refresh(client)
    return get_client_with_latest_run(client)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: UserEntity = Depends(get_current_user)
):
    """Delete a client."""
    client = db.query(ClientEntity).filter(
        ClientEntity.id == client_id,
        ClientEntity.owner_id == current_user.id
    ).first()

    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found"
        )

    db.delete(client)
    db.commit()
