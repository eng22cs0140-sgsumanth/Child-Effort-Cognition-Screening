#!/bin/bash

# Start All - CECI Assessment System
# Starts the ML Pipeline (FastAPI) and the React Web App

echo "Starting CECI Assessment System..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check dependencies
if ! command -v python3 &> /dev/null; then
    echo "${YELLOW}Warning: python3 is not installed${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "${YELLOW}Warning: Node.js is not installed${NC}"
    exit 1
fi

# ── Step 1: ML Pipeline ────────────────────────────────────────────────────────
echo "${BLUE}Step 1: Starting ML Pipeline (FastAPI on port 8000)...${NC}"

# Create venv if it doesn't exist
if [ ! -d "ml_pipeline/venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv ml_pipeline/venv
fi

# Install dependencies if not already installed
if [ ! -f "ml_pipeline/venv/.dependencies_installed" ]; then
    echo "Installing Python dependencies..."
    ml_pipeline/venv/bin/pip install -r ml_pipeline/requirements.txt -q
    touch ml_pipeline/venv/.dependencies_installed
fi

# Start ML Pipeline in background
PYTHONPATH="$(pwd)" ml_pipeline/venv/bin/python ml_pipeline/run.py server > ml_pipeline.log 2>&1 &
ML_PID=$!
echo $ML_PID > ml_pipeline.pid

# Wait for ML Pipeline to be ready
echo "Waiting for ML Pipeline to start..."
for i in {1..20}; do
    if curl -s http://localhost:8000/ > /dev/null 2>&1; then
        echo "${GREEN}✓ ML Pipeline is running (PID: $ML_PID)${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 20 ]; then
        echo "${YELLOW}Warning: ML Pipeline may still be starting. Check ml_pipeline.log${NC}"
    fi
done

echo ""

# ── Step 2: React Web App ──────────────────────────────────────────────────────
echo "${BLUE}Step 2: Starting React Web App (port 3002)...${NC}"

# Install npm dependencies if needed
if [ ! -d "copy1/node_modules" ]; then
    echo "Installing npm dependencies..."
    cd copy1 && npm install -q && cd ..
fi

# Start React app in background
cd copy1 && npm run dev > ../react_app.log 2>&1 &
REACT_PID=$!
echo $REACT_PID > ../react_app.pid
cd ..

echo "${GREEN}✓ React App started (PID: $REACT_PID)${NC}"

echo ""
echo "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo "${GREEN}║       CECI Assessment System is Running!         ║${NC}"
echo "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo "Services:"
echo "  ML Pipeline API : http://localhost:8000"
echo "  API Docs        : http://localhost:8000/docs"
echo "  React Web App   : http://localhost:3002"
echo ""
echo "Logs:"
echo "  ML Pipeline : tail -f ml_pipeline.log"
echo "  React App   : tail -f react_app.log"
echo ""
echo "To stop all services:"
echo "  ./stop-all.sh"
echo ""

# Option to tail logs
read -p "View logs? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    tail -f ml_pipeline.log react_app.log
fi
