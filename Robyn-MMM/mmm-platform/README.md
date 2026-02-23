# Kiri Media MMM Platform

A Marketing Mix Modeling (MMM) platform for performance marketing agencies. Built with FastAPI, Next.js, and Meta's Robyn package.

## Features

- **Multi-Client Management**: Manage multiple e-commerce clients with dedicated dashboards
- **Data Pipeline**: CSV upload or BigQuery integration for automated data ingestion
- **MMM Engine**: Powered by Meta's Robyn for accurate marketing attribution
- **Interactive Reports**: Channel contributions, response curves, and budget optimization
- **PDF Export**: Professional reports for client presentations

## Tech Stack

- **Backend**: Python 3.11 + FastAPI
- **Frontend**: Next.js 14 + Tailwind CSS
- **Database**: PostgreSQL 15
- **MMM Engine**: R + Robyn (via subprocess)
- **Charts**: Recharts

## Quick Start

### Prerequisites

- Docker and Docker Compose
- (Optional) Google Cloud credentials for BigQuery

### Running with Docker

```bash
cd mmm-platform
docker-compose up --build
```

Services will be available at:
- Frontend: http://localhost:5001
- Backend API: http://localhost:4000
- API Docs: http://localhost:4000/docs

### First Time Setup

1. Open http://localhost:5001
2. Create an account (Register)
3. Add your first client
4. Upload data or generate test data
5. Run an MMM model

## Data Format

The platform expects weekly marketing data in CSV format:

| Column | Type | Description |
|--------|------|-------------|
| date | YYYY-MM-DD | Week start date |
| revenue | numeric | Total revenue for the week |
| spend_meta | numeric | Meta (Facebook/Instagram) spend |
| spend_google | numeric | Google Ads spend |
| spend_tiktok | numeric | TikTok spend (optional) |
| spend_email | numeric | Email marketing spend (optional) |
| promo_flag | 0/1 | Promotion indicator (optional) |

### Minimum Requirements
- At least 52 rows (1 year of weekly data)
- At least 2 spend columns
- No missing values in key columns

## API Reference

### Authentication

```bash
# Register
POST /api/auth/register
{
  "email": "user@agency.com",
  "password": "secret",
  "full_name": "John Doe"
}

# Login
POST /api/auth/login
# Returns: { "access_token": "..." }
```

### Clients

```bash
# List clients
GET /api/clients/

# Create client
POST /api/clients/
{
  "name": "Acme Inc",
  "industry": "E-commerce",
  "currency": "SEK"
}
```

### Data Upload

```bash
# Upload CSV
POST /api/data/{client_id}/upload
Content-Type: multipart/form-data
file: <csv_file>

# Generate test data
POST /api/test/{client_id}/generate-test-data?weeks=156
```

### Model Runs

```bash
# Start model run
POST /api/models/{client_id}/runs
{
  "dataset_id": 1,
  "config": {
    "date_column": "date",
    "revenue_column": "revenue",
    "spend_columns": ["spend_meta", "spend_google", "spend_tiktok"]
  }
}

# Get run status
GET /api/models/{client_id}/runs/{run_id}

# Optimize budget
POST /api/models/{client_id}/runs/{run_id}/optimize
{
  "total_budget": 100000
}
```

### Reports

```bash
# Get report summary (JSON)
GET /api/reports/{client_id}/runs/{run_id}/summary

# Download PDF
GET /api/reports/{client_id}/runs/{run_id}/pdf
```

## Development

### Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

### Installing Robyn

Robyn requires R 4.0+ with dependencies:

```r
install.packages("remotes")
remotes::install_github("facebookexperimental/Robyn/R")
```

## Configuration

### Environment Variables

**Backend**:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `BIGQUERY_PROJECT_ID`: Google Cloud project ID (optional)
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account JSON (optional)

**Frontend**:
- `NEXT_PUBLIC_API_URL`: Backend API URL

## Project Structure

```
mmm-platform/
├── backend/
│   ├── api/              # API routes
│   │   ├── auth.py       # Authentication
│   │   ├── clients.py    # Client management
│   │   ├── data.py       # Data upload/BigQuery
│   │   ├── models.py     # Model runs
│   │   └── reports.py    # Report generation
│   ├── models/           # Database models
│   ├── services/         # Business logic
│   │   ├── bigquery.py   # BigQuery connector
│   │   ├── robyn_runner.py  # Robyn integration
│   │   └── report_generator.py  # PDF generation
│   ├── r_scripts/        # R script templates
│   └── main.py           # FastAPI app
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js pages
│   │   ├── components/   # React components
│   │   ├── lib/          # API client
│   │   └── types/        # TypeScript types
│   └── tailwind.config.ts
└── docker-compose.yml
```

## Design System

The platform follows a minimalistic Scandinavian aesthetic:

- **Colors**:
  - Primary: #0066FF
  - Background: #FFFFFF
  - Secondary: #F5F5F5
  - Text: #111111
  - Muted: #666666

- **Font**: Inter

## License

Proprietary - Kiri Media 2024
