#!/bin/bash

# Start All - CECI Assessment System
# Starts both the ML Pipeline API and the React App

echo "🌟 Starting CECI Assessment System..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "${YELLOW}Warning: Python 3 is not installed${NC}"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "${YELLOW}Warning: Node.js is not installed${NC}"
    echo "Please install Node.js 16 or higher"
    exit 1
fi

echo "${BLUE}Step 1: Starting ML Pipeline API...${NC}"
cd ml_pipeline

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null

# Install dependencies if needed
if [ ! -f ".dependencies_installed" ]; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt > /dev/null 2>&1
    touch .dependencies_installed
fi

# Start ML Pipeline in background
echo "Launching ML Pipeline API on port 8000..."
python run.py server > ../ml_pipeline.log 2>&1 &
ML_PIPELINE_PID=$!
echo "ML Pipeline PID: $ML_PIPELINE_PID"
echo $ML_PIPELINE_PID > ../ml_pipeline.pid

# Wait for ML Pipeline to start
echo "Waiting for ML Pipeline to start..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "${GREEN}✓ ML Pipeline is running!${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo "${YELLOW}Warning: ML Pipeline may not be running${NC}"
        echo "Check ml_pipeline.log for errors"
    fi
done

cd ..

echo ""
echo "${BLUE}Step 2: Starting React App...${NC}"
cd copy1

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing npm dependencies..."
    npm install
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file from .env.development..."
    cp .env.development .env
fi

echo "Launching React App on port 5173..."
npm run dev > ../react_app.log 2>&1 &
REACT_APP_PID=$!
echo "React App PID: $REACT_APP_PID"
echo $REACT_APP_PID > ../react_app.pid

echo ""
echo "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo "${GREEN}║     CECI Assessment System is Running!              ║${NC}"
echo "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "📍 Services:"
echo "  🐍 ML Pipeline API:  http://localhost:8000"
echo "  📊 API Docs:         http://localhost:8000/docs"
echo "  ⚛️  React App:        http://localhost:5173"
echo ""
echo "📋 Logs:"
echo "  ML Pipeline: tail -f ml_pipeline.log"
echo "  React App:   tail -f react_app.log"
echo ""
echo "🛑 To stop all services:"
echo "  ./stop-all.sh"
echo "  or kill $ML_PIPELINE_PID $REACT_APP_PID"
echo ""
echo "${YELLOW}Press Ctrl+C to view logs or leave running in background${NC}"
echo ""

# Option to tail logs
read -p "View logs? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Tail both logs
    tail -f ml_pipeline.log react_app.log
fi
