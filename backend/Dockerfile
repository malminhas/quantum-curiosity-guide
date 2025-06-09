FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Accept build arguments
ARG PORT=8087
ARG ROOT_PATH=""

# Set environment variables
ENV PORT=$PORT
ENV ROOT_PATH=$ROOT_PATH
ENV PYTHONPATH=/app

# Expose the port
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# Create startup script to handle optional root-path
RUN echo '#!/bin/bash\nif [ -n "$ROOT_PATH" ]; then\n  exec uvicorn grover_api:app --host 0.0.0.0 --port $PORT --root-path "$ROOT_PATH"\nelse\n  exec uvicorn grover_api:app --host 0.0.0.0 --port $PORT\nfi' > /start.sh && \
    chmod +x /start.sh

# Run the application
CMD ["/start.sh"]
