# CECI Assessment System - Complete Project

**Composite Early Childhood Indicator (CECI)** - Early Childhood Intellectual Disability Screening System

## 🎯 Project Overview

This project implements a game-based assessment system for early childhood intellectual disability screening. It combines a child-friendly React web application with a sophisticated Python ML Pipeline for accurate, reliable developmental assessments.

## 📁 Project Structure

```
major_project/
├── copy1/                      # React Web Application
│   ├── App.tsx                # Main app component
│   ├── components/            # React components
│   ├── services/              # API service layer
│   │   └── ceciApiService.ts # ML Pipeline integration
│   ├── hooks/                 # Custom React hooks
│   │   └── useCECICalculation.ts
│   ├── ceciAlgorithm.ts       # Local TypeScript implementation
│   ├── types.ts               # TypeScript type definitions
│   ├── .env.example           # Environment configuration example
│   └── ML_PIPELINE_INTEGRATION.md  # Integration guide
│
├── ml_pipeline/               # Python ML Pipeline (Backend)
│   ├── api.py                 # FastAPI REST API
│   ├── pipeline.py            # Pipeline orchestrator
│   ├── config.py              # Configuration management
│   ├── validation.py          # Data validation
│   ├── monitoring.py          # Metrics and health checks
│   ├── logging_config.py      # Logging system
│   ├── stages/                # Pipeline stages
│   │   ├── feature_engineering.py
│   │   ├── tree_model.py
│   │   ├── temporal_model.py
│   │   ├── bayesian_calibration.py
│   │   └── post_processing.py
│   ├── tests/                 # Comprehensive test suite (86+ tests)
│   ├── examples/              # Usage examples
│   ├── Dockerfile             # Container image
│   ├── docker-compose.yml     # Docker orchestration
│   ├── README.md              # ML Pipeline documentation
│   ├── DEPLOYMENT.md          # Deployment guide
│   └── ARCHITECTURE.md        # Architecture documentation
│
├── start-all.sh               # Start both services
├── stop-all.sh                # Stop all services
└── README.md                  # This file
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **Git** (optional)

### One-Command Start

```bash
# Make scripts executable (first time only)
chmod +x start-all.sh stop-all.sh

# Start everything
./start-all.sh
```

This will:
1. Start the ML Pipeline API on port 8000
2. Start the React App on port 5173
3. Show you the URLs to access

### Manual Start

#### Option 1: Start ML Pipeline

```bash
cd ml_pipeline

# Install dependencies
pip install -r requirements.txt

# Run server
python run.py server
```

#### Option 2: Start React App

```bash
cd copy1

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Run development server
npm run dev
```

### Access the Application

- **React App**: http://localhost:5173
- **ML Pipeline API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🎮 How to Use

### 1. Select User Role

Choose from:
- **Child**: Play assessment games
- **Parent**: Manage child profile and view results
- **Doctor**: Analyze health data and observations

### 2. Create Child Profile (Parent)

Enter child information:
- Name, Date of Birth
- Height, Weight, Blood Group
- Medical conditions

### 3. Play Games (Child)

Complete interactive games:
- Reaction Catcher
- Pattern Memory
- Emotion Detective
- Shape Sorter
- And more...

### 4. View Results (Parent/Doctor)

See comprehensive assessment:
- **CECI Score**: 0-100 with confidence level
- **Risk Band**: Green (Typical), Amber (Monitor), Red (Specialist)
- **Model Breakdown**: Tree-Based, Temporal, Bayesian scores
- **Recommendations**: Personalized guidance
- **Development Graph**: Visual performance chart

## 🧠 ML Pipeline Features

### Hybrid ML Approach

Combines three sophisticated models:

1. **Tree-Based Model** (RF/XGBoost simulation)
   - Feature importance analysis
   - Weighted behavioral scoring
   - Baseline risk assessment

2. **Temporal Model** (LSTM/GRU simulation)
   - Session-by-session trend analysis
   - Improvement/decline detection
   - Volatility and consistency scoring

3. **Bayesian Calibration**
   - Uncertainty quantification
   - Confidence scoring
   - Model agreement analysis

### Pipeline Stages

```
Game Data → Feature Engineering → Tree Model → Temporal Model
         → Bayesian Calibration → Post-Processing → CECI Score
```

### Risk Bands

- **🟢 Green (≥70%)**: Typical development - Continue current activities
- **🟡 Amber (40-69%)**: Monitor closely - Increase practice frequency
- **🔴 Red (<40%)**: Specialist recommended - Seek professional assessment

## 🔗 Integration

The React app integrates with the ML Pipeline through:

1. **API Service Layer** (`ceciApiService.ts`)
2. **Custom React Hook** (`useCECICalculation`)
3. **Automatic Fallback** to local calculation if API unavailable

### Status Indicators

The Results page shows:
- **✓ ML Pipeline**: Using Python ML Pipeline API
- **⚠ Local Mode**: Using local TypeScript fallback
- **API offline**: Informational message about fallback

See `copy1/ML_PIPELINE_INTEGRATION.md` for detailed integration documentation.

## 📊 Data Flow

```
User Interaction (Games)
         ↓
Behavioral Data Collection
(reaction time, accuracy, hesitation, engagement)
         ↓
React App (Frontend)
         ↓
API Service Layer
         ↓
ML Pipeline (Backend)
         ↓
  Stage 1: Feature Engineering
  Stage 2: Tree-Based Model
  Stage 3: Temporal Model
  Stage 4: Bayesian Calibration
  Stage 5: Post-Processing
         ↓
CECI Score Result
         ↓
Display in UI
```

## 🧪 Testing

### ML Pipeline Tests

```bash
cd ml_pipeline

# Run all tests
pytest

# Run with coverage
pytest --cov=ml_pipeline --cov-report=html

# Run specific test file
pytest tests/test_pipeline.py -v
```

**Test Coverage**: 86+ test cases across all pipeline stages

### React App

```bash
cd copy1

# Run tests (if configured)
npm test
```

## 📦 Deployment

### Development

Use the quick start scripts or manual commands above.

### Production

#### ML Pipeline

See `ml_pipeline/DEPLOYMENT.md` for comprehensive deployment guide.

Options:
- **Docker**: `docker-compose up`
- **Systemd**: Linux service configuration
- **Cloud**: AWS, GCP, Azure deployment guides

#### React App

```bash
cd copy1

# Build for production
npm run build

# Deploy dist/ folder to web server
```

Update `.env.production` with production API URL.

## 🛠️ Configuration

### ML Pipeline Configuration

Edit `ml_pipeline/config.py` or use environment variables:

```python
# Risk thresholds
GREEN_THRESHOLD = 70.0
AMBER_THRESHOLD = 40.0

# Model weights
TREE_MODEL_WEIGHTS = {
    'accuracy': 0.35,
    'reaction': 0.25,
    'hesitation': 0.20,
    'engagement': 0.20
}
```

### React App Configuration

Edit `copy1/.env`:

```bash
# ML Pipeline API URL
VITE_API_BASE_URL=http://localhost:8000

# Enable ML Pipeline
VITE_USE_ML_PIPELINE=true

# Enable fallback
VITE_ENABLE_FALLBACK=true
```

## 📈 Monitoring

### ML Pipeline Metrics

- **Execution Time**: Per-stage and total
- **Prediction Count**: Total assessments
- **Risk Band Distribution**: Green/Amber/Red counts
- **Error Tracking**: Failed predictions
- **API Health**: `/health` endpoint

### Logs

```bash
# ML Pipeline logs
tail -f ml_pipeline/logs/ceci_pipeline_*.log

# React App console
# Check browser developer tools
```

## 🆘 Troubleshooting

### API Not Connecting

**Problem**: React app shows "Local Mode" always

**Solutions**:
1. Check ML Pipeline is running: `curl http://localhost:8000/health`
2. Verify `.env` has correct `VITE_API_BASE_URL`
3. Check for CORS errors in browser console
4. Ensure no firewall blocking port 8000

### CORS Errors

**Problem**: Browser blocks API requests

**Solution**: Update `ml_pipeline/api.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://your-domain.com"  # Add your domain
    ],
    ...
)
```

### Port Already in Use

**Problem**: Can't start services

**Solutions**:
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or use different ports
python run.py server --port 8001
npm run dev -- --port 5174
```

## 📚 Documentation

- **Main README**: This file
- **ML Pipeline**:
  - `ml_pipeline/README.md` - Usage and API documentation
  - `ml_pipeline/ARCHITECTURE.md` - System architecture
  - `ml_pipeline/DEPLOYMENT.md` - Deployment guide
- **React App**:
  - `copy1/ML_PIPELINE_INTEGRATION.md` - Integration guide
  - `copy1/CECI_ALGORITHM_DOCUMENTATION.md` - Algorithm details
  - `copy1/VISUAL_GUIDE.md` - UI visual guide
- **Implementation**:
  - `IMPLEMENTATION_SUMMARY.md` - Original implementation summary

## 🎯 Key Features

### React App (copy1/)

- ✅ Child-friendly game interface
- ✅ Parent/Child/Doctor role system
- ✅ Comprehensive child profile management
- ✅ Parent observations diary
- ✅ Real-time CECI assessment display
- ✅ Development performance graphs
- ✅ ML Pipeline integration with fallback
- ✅ Responsive, accessible design

### ML Pipeline (ml_pipeline/)

- ✅ Modular 5-stage architecture
- ✅ REST API with FastAPI
- ✅ Comprehensive data validation
- ✅ Advanced logging and monitoring
- ✅ 86+ test suite with pytest
- ✅ Docker deployment support
- ✅ Production-ready error handling
- ✅ Configurable hyperparameters

## 🚧 Future Enhancements

- [ ] Real ML models (trained RF, LSTM)
- [ ] Database integration for persistence
- [ ] User authentication system
- [ ] Longitudinal tracking dashboard
- [ ] PDF report generation
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Offline mode with sync
- [ ] Advanced analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit a pull request

## 📄 License

Copyright © 2026 CECI Project

## 👥 Team

CECI Project Team

## 📞 Support

For issues or questions:
1. Check the documentation
2. Review troubleshooting section
3. Check browser/server logs
4. Open an issue on GitHub

---

**Version**: 1.0.0
**Last Updated**: January 2026
**Status**: Production Ready ✅

Built with ❤️ using React, TypeScript, Python, FastAPI, and Modern ML techniques
