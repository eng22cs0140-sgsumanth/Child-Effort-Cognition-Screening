#!/bin/bash

# Stop All - CECI Assessment System
# Stops both the ML Pipeline API and the React App

echo "🛑 Stopping CECI Assessment System..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Stop ML Pipeline
if [ -f "ml_pipeline.pid" ]; then
    ML_PID=$(cat ml_pipeline.pid)
    echo "Stopping ML Pipeline (PID: $ML_PID)..."
    kill $ML_PID 2>/dev/null
    rm ml_pipeline.pid
    echo "${GREEN}✓ ML Pipeline stopped${NC}"
else
    echo "ML Pipeline PID file not found"
fi

# Stop React App
if [ -f "react_app.pid" ]; then
    REACT_PID=$(cat react_app.pid)
    echo "Stopping React App (PID: $REACT_PID)..."
    kill $REACT_PID 2>/dev/null
    rm react_app.pid
    echo "${GREEN}✓ React App stopped${NC}"
else
    echo "React App PID file not found"
fi

# Fallback: kill by port
echo ""
echo "Checking for remaining processes..."

# Kill any process on port 8000
lsof -ti:8000 | xargs kill -9 2>/dev/null && echo "${GREEN}✓ Killed process on port 8000${NC}"

# Kill any process on port 3002
lsof -ti:3002 | xargs kill -9 2>/dev/null && echo "${GREEN}✓ Killed process on port 3002${NC}"

echo ""
echo "${GREEN}All services stopped!${NC}"
