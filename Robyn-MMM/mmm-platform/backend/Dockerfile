FROM python:3.11-slim

# Install R and required system dependencies
RUN apt-get update && apt-get install -y \
    r-base \
    r-base-dev \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libfontconfig1-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libfreetype6-dev \
    libpng-dev \
    libtiff5-dev \
    libjpeg-dev \
    cmake \
    && rm -rf /var/lib/apt/lists/*

# Install R packages
RUN R -e "install.packages(c('remotes', 'reticulate'), repos='https://cloud.r-project.org/')"
RUN R -e "remotes::install_github('facebookexperimental/Robyn/R')"

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create outputs directory
RUN mkdir -p /app/outputs

EXPOSE 4000

# Use PORT env var if set (Railway sets this), otherwise default to 4000
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-4000}
