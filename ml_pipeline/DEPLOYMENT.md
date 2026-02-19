# CECI ML Pipeline - Deployment Guide

## Table of Contents

1. [Quick Start](#quick-start)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Production Deployment](#production-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Python 3.8 or higher
- pip package manager
- (Optional) Docker and Docker Compose for containerized deployment

### Install and Run

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run the server
python run.py server

# Or use make
make run
```

The API will be available at `http://localhost:8000`

## Local Development

### Setup Development Environment

```bash
# Clone or navigate to the project
cd ml_pipeline

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run with auto-reload for development
python run.py server --reload

# Or use make
make dev
```

### Running Tests

```bash
# Run all tests
python run.py test

# Run with coverage
python run.py test --coverage

# Or use make
make test
make coverage
```

### Running Examples

```bash
# Basic usage example
python run.py example basic_usage

# API client example
python run.py example api_client

# Or use make
make example-basic
make example-api
```

## Docker Deployment

### Build and Run with Docker Compose

```bash
# Build the image
docker-compose build

# Start the service
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop the service
docker-compose down
```

Or use Make:

```bash
make docker-build
make docker-up
make docker-logs
make docker-down
```

### Build Docker Image Manually

```bash
# Build image
docker build -t ceci-ml-pipeline:latest .

# Run container
docker run -d \
  --name ceci-pipeline \
  -p 8000:8000 \
  -v $(pwd)/logs:/app/logs \
  ceci-ml-pipeline:latest

# Check logs
docker logs -f ceci-pipeline

# Stop container
docker stop ceci-pipeline
docker rm ceci-pipeline
```

## Production Deployment

### Recommended Setup

1. **Use a production ASGI server** (Already configured with uvicorn)
2. **Run behind a reverse proxy** (nginx, Apache, or cloud load balancer)
3. **Enable HTTPS** with SSL/TLS certificates
4. **Set up monitoring** and health checks
5. **Configure log rotation**
6. **Use environment variables** for configuration

### Nginx Reverse Proxy Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8000/health;
        access_log off;
    }
}
```

### Systemd Service (Linux)

Create `/etc/systemd/system/ceci-pipeline.service`:

```ini
[Unit]
Description=CECI ML Pipeline API
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/ceci-ml-pipeline
Environment="PATH=/opt/ceci-ml-pipeline/venv/bin"
ExecStart=/opt/ceci-ml-pipeline/venv/bin/python run.py server
Restart=always
RestartSec=10

# Logging
StandardOutput=append:/var/log/ceci-pipeline/stdout.log
StandardError=append:/var/log/ceci-pipeline/stderr.log

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ceci-pipeline
sudo systemctl start ceci-pipeline
sudo systemctl status ceci-pipeline
```

### Running with Multiple Workers

For production, use multiple worker processes:

```bash
# Using run.py
python run.py server --workers 4

# Using uvicorn directly
uvicorn ml_pipeline.api:app --host 0.0.0.0 --port 8000 --workers 4
```

**Note:** Number of workers = (2 × CPU cores) + 1 is a common formula.

## Environment Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Logging
LOG_LEVEL=INFO
LOG_DIR=logs

# API
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4

# CORS
ALLOWED_ORIGINS=https://your-frontend.com,https://app.your-domain.com

# Pipeline
GREEN_THRESHOLD=70.0
AMBER_THRESHOLD=40.0

# Monitoring
ENABLE_METRICS=true
```

### Load Environment Variables

In your application or startup script:

```python
from dotenv import load_dotenv
import os

load_dotenv()

LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
API_PORT = int(os.getenv('API_PORT', 8000))
```

## Monitoring & Health Checks

### Health Check Endpoint

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "pipeline_stages": 5,
  "config": {...}
}
```

### Metrics Endpoint

Access pipeline metrics programmatically:

```python
from ml_pipeline.monitoring import get_metrics_collector

collector = get_metrics_collector()
summary = collector.get_summary()
print(summary)
```

### Log Monitoring

Logs are written to:
- Console: `stdout` (structured, colored)
- File: `logs/ceci_pipeline_YYYYMMDD.log`

Monitor logs in real-time:

```bash
# Local
tail -f logs/ceci_pipeline_*.log

# Docker
docker-compose logs -f

# Systemd
sudo journalctl -u ceci-pipeline -f
```

### Performance Monitoring

The pipeline tracks:
- Prediction counts
- Risk band distribution
- Average scores and confidence
- Execution times per stage
- Error rates

Export metrics:

```python
from ml_pipeline.monitoring import get_metrics_collector

collector = get_metrics_collector()
collector.export_metrics('metrics/export.json')
```

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows

# Kill process or use different port
python run.py server --port 8001
```

#### Import Errors

```bash
# Install in development mode
pip install -e .

# Or add to PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:/path/to/ml_pipeline"
```

#### Permission Denied (Logs)

```bash
# Create logs directory with correct permissions
mkdir -p logs
chmod 755 logs
```

#### Docker Build Fails

```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

#### High Memory Usage

- Reduce number of workers
- Limit metrics history size
- Enable log rotation
- Monitor with `docker stats` or `htop`

### Debugging

Enable debug logging:

```python
from ml_pipeline.logging_config import PipelineLogger

PipelineLogger.setup_logging(log_level="DEBUG")
```

Or set environment variable:

```bash
LOG_LEVEL=DEBUG python run.py server
```

### Performance Tuning

1. **Optimize worker count**: Match CPU cores
2. **Enable caching**: For repeated predictions
3. **Use connection pooling**: If using database
4. **Monitor slow stages**: Check pipeline metrics
5. **Upgrade hardware**: More CPU/RAM if needed

### Getting Help

1. Check logs: `logs/ceci_pipeline_*.log`
2. Run health check: `curl http://localhost:8000/health`
3. Check pipeline info: `python run.py info`
4. Review metrics: Check `/metrics` endpoint
5. Open an issue on GitHub with:
   - Error logs
   - System info
   - Steps to reproduce

## Security Best Practices

1. **Use HTTPS in production** (SSL/TLS)
2. **Configure CORS** properly (limit allowed origins)
3. **Keep dependencies updated** (`pip list --outdated`)
4. **Use environment variables** for sensitive data
5. **Enable authentication** if needed (add middleware)
6. **Regular security audits** (`pip-audit`, `safety check`)
7. **Limit API rate** (add rate limiting middleware)
8. **Monitor for anomalies** (unusual traffic patterns)

## Scaling

### Horizontal Scaling

Deploy multiple instances behind a load balancer:

```
Load Balancer (nginx/HAProxy/AWS ALB)
    ├── CECI Instance 1 (port 8001)
    ├── CECI Instance 2 (port 8002)
    ├── CECI Instance 3 (port 8003)
    └── CECI Instance 4 (port 8004)
```

### Kubernetes Deployment

Example `deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ceci-pipeline
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ceci-pipeline
  template:
    metadata:
      labels:
        app: ceci-pipeline
    spec:
      containers:
      - name: ceci-pipeline
        image: ceci-ml-pipeline:latest
        ports:
        - containerPort: 8000
        env:
        - name: LOG_LEVEL
          value: "INFO"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

---

**For more information, see [README.md](README.md)**
