# ML Pipeline Integration Guide

This document explains how the React app integrates with the Python ML Pipeline for CECI assessments.

## Overview

The application now supports **two modes** of CECI calculation:

1. **ML Pipeline Mode** (Recommended): Uses the Python backend for advanced ML analysis
2. **Local Mode** (Fallback): Uses the TypeScript implementation when API is unavailable

## Architecture

```
React App (copy1/)
      ↓
useCECICalculation Hook
      ↓
   ┌──────┴──────┐
   ↓             ↓
API Service   Local Algorithm
(ceciApiService.ts)  (ceciAlgorithm.ts)
   ↓
Python ML Pipeline
(ml_pipeline/)
```

## Setup Instructions

### 1. Configure Environment

Copy the environment example file:

```bash
cd copy1
cp .env.example .env
```

Edit `.env` to configure:

```bash
# ML Pipeline API URL
VITE_API_BASE_URL=http://localhost:8000

# Enable ML Pipeline integration
VITE_USE_ML_PIPELINE=true

# Enable automatic fallback to local calculation
VITE_ENABLE_FALLBACK=true

# API timeout (milliseconds)
VITE_API_TIMEOUT=10000
```

### 2. Start the ML Pipeline

First, start the Python ML Pipeline API server:

```bash
cd ../ml_pipeline

# Option 1: Using run.py
python run.py server

# Option 2: Using make
make run

# Option 3: Using Docker
make docker-up
```

The API will be available at `http://localhost:8000`

Verify it's running:
```bash
curl http://localhost:8000/health
```

### 3. Start the React App

```bash
cd copy1
npm install  # If not already installed
npm run dev
```

The app will be available at `http://localhost:5173`

## How It Works

### Integration Points

#### 1. API Service Layer (`services/ceciApiService.ts`)

Handles communication with the ML Pipeline:

```typescript
import { getCECIApiService } from './services/ceciApiService';

const apiService = getCECIApiService();

// Check if API is available
const available = await apiService.isAvailable();

// Calculate CECI score
const score = await apiService.calculateCECI(gameResults, childName);
```

#### 2. Custom Hook (`hooks/useCECICalculation.ts`)

Manages CECI calculation with automatic fallback:

```typescript
import { useCECICalculation } from './hooks/useCECICalculation';

const {
  score,           // CECI score result
  source,          // 'api' or 'local'
  loading,         // Calculation in progress
  error,           // Error message if any
  apiAvailable,    // Is API server reachable
  calculate        // Manual calculation function
} = useCECICalculation(results, childName, { autoCalculate: true });
```

#### 3. App Component (`App.tsx`)

Uses the hook to get CECI scores:

```typescript
const {
  score: apiCeciScore,
  source: ceciSource,
  loading: ceciLoading,
  error: ceciError,
  apiAvailable
} = useCECICalculation(results, child.name || 'Child', { autoCalculate: true });

// Use API result if available, otherwise fallback to local
const ceciScore = apiCeciScore || calculateCECI(results, child.name || 'Child');
```

### Automatic Fallback

The integration includes intelligent fallback logic:

1. **Try API First**: Attempts to use the ML Pipeline API
2. **Detect Failures**: Catches network errors, timeouts, or server issues
3. **Fallback to Local**: Automatically uses TypeScript implementation
4. **Show Status**: Displays source indicator in UI

```
API Available ────► Use ML Pipeline ────► Display "✓ ML Pipeline"
     │
     ↓ (Error/Timeout)
     │
     ↓
Local Fallback ───► Use TypeScript ────► Display "⚠ Local Mode"
```

## Features

### Status Indicators

The Results page shows the calculation source:

- **✓ ML Pipeline**: Using Python ML Pipeline API
- **⚠ Local Mode**: Using local TypeScript algorithm
- **⏳ Calculating...**: Calculation in progress
- **API offline - using local algorithm**: Informational message

### Error Handling

The app gracefully handles:
- Network failures
- API timeouts
- Server errors
- Invalid responses
- Connection refused

All errors trigger automatic fallback to local calculation.

### Performance

- **API Mode**: ~10-50ms (network + processing)
- **Local Mode**: ~1-5ms (browser only)
- **Timeout**: 10 seconds (configurable)
- **Auto-retry**: Every 30 seconds checks API availability

## Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | ML Pipeline API URL |
| `VITE_USE_ML_PIPELINE` | `true` | Enable ML Pipeline integration |
| `VITE_ENABLE_FALLBACK` | `true` | Auto-fallback to local on error |
| `VITE_API_TIMEOUT` | `10000` | Request timeout (ms) |
| `VITE_DEBUG` | `false` | Enable debug logging |

### Hook Options

```typescript
useCECICalculation(results, childName, {
  useMLPipeline: true,    // Use API or go straight to local
  enableFallback: true,   // Auto-fallback on error
  autoCalculate: true     // Calculate automatically on data change
});
```

## Development

### Local Development

For development, run both servers:

```bash
# Terminal 1: ML Pipeline
cd ml_pipeline
python run.py server --reload

# Terminal 2: React App
cd copy1
npm run dev
```

### Testing Without ML Pipeline

To test with local calculation only:

```bash
# Set in .env
VITE_USE_ML_PIPELINE=false

# Or stop the ML Pipeline server
```

The app will automatically use local calculation.

### Debugging

Enable debug mode:

```bash
# In .env
VITE_DEBUG=true
```

Check browser console for detailed logs:
- API requests and responses
- Fallback triggers
- Calculation sources
- Error messages

## Production Deployment

### Update Environment

For production, update `.env.production`:

```bash
# Your production API URL
VITE_API_BASE_URL=https://api.your-domain.com

# Enable ML Pipeline
VITE_USE_ML_PIPELINE=true

# Enable fallback for reliability
VITE_ENABLE_FALLBACK=true

# Longer timeout for production
VITE_API_TIMEOUT=15000

# Disable debug
VITE_DEBUG=false
```

### Build for Production

```bash
npm run build
```

The built files will be in `dist/` with environment variables baked in.

### Deploy

1. **Deploy React App**: Upload `dist/` to your web server
2. **Deploy ML Pipeline**: See `ml_pipeline/DEPLOYMENT.md` for options
3. **Configure CORS**: Ensure ML Pipeline allows your domain

## Troubleshooting

### API Not Connecting

**Symptom**: Always shows "Local Mode"

**Solutions**:
```bash
# Check ML Pipeline is running
curl http://localhost:8000/health

# Check environment variable
echo $VITE_API_BASE_URL  # or check .env file

# Check browser console for CORS errors

# Verify network connectivity
ping localhost
```

### CORS Errors

**Symptom**: Browser console shows CORS policy errors

**Solution**: Update ML Pipeline CORS settings in `ml_pipeline/api.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",     # Vite dev server
        "http://localhost:3000",
        "https://your-production-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Timeouts

**Symptom**: "Request timeout" errors

**Solutions**:
```bash
# Increase timeout in .env
VITE_API_TIMEOUT=20000  # 20 seconds

# Check ML Pipeline performance
# See ml_pipeline logs for slow stages
```

### Different Results

**Symptom**: API and local give different scores

**Reason**: This is expected! The Python ML Pipeline is more sophisticated.

- **API**: Uses full ML Pipeline with NumPy, advanced algorithms
- **Local**: Simplified TypeScript implementation

For accurate assessments, always prefer API mode.

## API Endpoints Used

The React app uses these ML Pipeline endpoints:

### GET `/`
Health check (basic)

### GET `/health`
Detailed health status

### POST `/predict`
Calculate CECI score

**Request**:
```json
{
  "results": [...],
  "childName": "Emma"
}
```

**Response**:
```json
{
  "score": {
    "overall": 85,
    "riskBand": "green",
    "confidence": 75,
    "treeBasedScore": 82,
    "temporalScore": 86,
    "bayesianCalibration": 84,
    "recommendation": "..."
  },
  "pipelineMetrics": {...}
}
```

## Benefits of ML Pipeline Integration

### Why Use the API?

1. **More Accurate**: Advanced ML algorithms with NumPy
2. **Better Calibration**: Bayesian uncertainty quantification
3. **Sophisticated Models**: Real Random Forest and LSTM simulations
4. **Validated**: Comprehensive test suite (86+ tests)
5. **Extensible**: Easy to add new models or features
6. **Production-Ready**: Logging, monitoring, validation

### Why Keep Local Fallback?

1. **Reliability**: Works even if API is down
2. **Offline Support**: No internet required for basic function
3. **Development**: Test without running API server
4. **User Experience**: Never shows error to end users
5. **Graceful Degradation**: Always provides a result

## Monitoring

Check integration health:

1. **Status Indicator**: Look at Results page
2. **Browser Console**: Check for errors or warnings
3. **ML Pipeline Logs**: See API request logs
4. **Network Tab**: Inspect API calls and responses

## Future Enhancements

Planned improvements:

- [ ] Caching: Store API results to reduce requests
- [ ] Offline Queue: Queue calculations when API is down
- [ ] Batch Processing: Send multiple predictions at once
- [ ] WebSocket: Real-time updates for long calculations
- [ ] Progress Tracking: Show pipeline stage progress
- [ ] A/B Testing: Compare API vs Local results

## Support

For issues:

1. Check this documentation
2. Review browser console logs
3. Check ML Pipeline logs (`ml_pipeline/logs/`)
4. Verify environment configuration
5. Test API endpoints manually with `curl`

---

**Last Updated**: January 2026
**Version**: 1.0.0
