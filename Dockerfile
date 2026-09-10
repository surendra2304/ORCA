# ==============================================================================
# Multi-stage Dockerfile for ORCA Marine Intelligence
# Combines React 19 Frontend + FastAPI Multi-Agent Backend on a single port
# ==============================================================================

# Stage 1: Build React 19 Vite Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app

# Install npm dependencies
COPY package*.json ./
RUN npm ci || npm install

# Copy frontend source and configuration files
COPY index.html vite.config.ts tsconfig*.json ./
COPY src/ ./src/
COPY public/ ./public/

# Build production assets into /app/dist
RUN npm run build

# Stage 2: Python 3.11 Production Server
FROM python:3.11-slim

WORKDIR /app

# Prevent python from writing pyc files and buffering stdout/stderr
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000

# Install curl for health check probing
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python backend dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application code, rules, and data directories
COPY app/ ./app/
COPY data/ ./data/
COPY rules/ ./rules/

# Copy compiled frontend from Stage 1 into /app/dist
COPY --from=frontend-builder /app/dist ./dist

# Expose default port
EXPOSE 8000

# Start FastAPI server on dynamic $PORT injected by Render
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
