"""Configuration settings for the MMM Platform backend."""

import os

# Base directory - either /app in Docker or the backend directory locally
BASE_DIR = os.getenv("APP_BASE_DIR", os.path.dirname(os.path.abspath(__file__)))

# Output directories
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")
UPLOAD_DIR = os.path.join(OUTPUTS_DIR, "uploads")
REPORTS_DIR = os.path.join(OUTPUTS_DIR, "reports")
RUNS_DIR = os.path.join(OUTPUTS_DIR, "runs")

# R scripts directory
R_SCRIPTS_DIR = os.path.join(BASE_DIR, "r_scripts")

# Create directories if they don't exist
for directory in [OUTPUTS_DIR, UPLOAD_DIR, REPORTS_DIR, RUNS_DIR]:
    os.makedirs(directory, exist_ok=True)
