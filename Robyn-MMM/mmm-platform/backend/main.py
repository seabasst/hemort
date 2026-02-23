from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from api import clients, data, models, auth, reports, test_data
from models.database import engine, Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="Kiri Media MMM Platform",
    description="Marketing Mix Modeling platform for performance marketing agencies",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - allow Vercel frontend and local development
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5001",
    "http://frontend:3000",
    "http://localhost:4000",
    "https://frontend-dun-theta-0wcqlspumi.vercel.app",  # Vercel production
    "https://*.vercel.app",  # Vercel preview deployments
]

# Also allow origins from environment variable
import os
extra_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
ALLOWED_ORIGINS.extend([o.strip() for o in extra_origins if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Allow all Vercel subdomains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(data.router, prefix="/api/data", tags=["Data"])
app.include_router(models.router, prefix="/api/models", tags=["Models"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(test_data.router, prefix="/api/test", tags=["Test Data"])

@app.get("/")
async def root():
    return {"message": "Kiri Media MMM Platform API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
