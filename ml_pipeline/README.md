# CECI ML Pipeline

**Composite Early Childhood Indicator (CECI)** - ML Pipeline for Early Childhood Intellectual Disability Screening

## Overview

The CECI ML Pipeline is a sophisticated, modular machine learning system designed to assess early childhood development through game-based behavioral data. It combines multiple ML approaches to provide reliable, calibrated risk assessments for identifying potential developmental concerns.

## Features

- **Modular Architecture**: Clean separation of concerns with independent pipeline stages
- **Hybrid ML Approach**: Combines Tree-Based, Temporal, and Bayesian models
- **Data Validation**: Comprehensive input validation and preprocessing
- **Uncertainty Quantification**: Bayesian calibration for confidence scoring
- **REST API**: FastAPI-based API for easy integration
- **Comprehensive Testing**: Full test suite with pytest
- **Production Ready**: Logging, monitoring, and deployment configurations

## Architecture

```
Game Results
     ↓
Feature Engineering → Tree-Based Model → Temporal Model → Bayesian Calibration → Post-Processing
     ↓                      ↓                  ↓                   ↓                    ↓
  Features          Baseline Score      Trend Analysis      Calibrated Score      Risk Band
                                                                                  Recommendation
```

### Pipeline Stages

1. **Feature Engineering**: Extracts behavioral metrics and temporal sequences
2. **Tree-Based Model**: Simulates Random Forest/XGBoost with weighted features
3. **Temporal Model**: Analyzes session-by-session trends (LSTM/GRU simulation)
4. **Bayesian Calibration**: Uncertainty-aware probability estimation
5. **Post-Processing**: Risk band classification and personalized recommendations

## Installation

### Requirements

- Python 3.8+
- pip

### Install Dependencies

```bash
cd ml_pipeline
pip install -r requirements.txt
```

## Quick Start

### Basic Usage

```python
from ml_pipeline import calculate_ceci

# Your game results
game_results = [
    {
        'gameId': 'reaction-catcher',
        'score': 85,
        'timestamp': 1640000000000,
        'behavioralMetrics': {
            'accuracy': 85.0,
            'averageReactionTime': 490.0,
            'hesitationCount': 2,
            'engagementScore': 80.0,
            'reactionTimes': [450, 520, 480, 510, 490],
            'correctAttempts': 17,
            'incorrectAttempts': 3,
            'reactionTimeVariability': 25.5
        }
    },
    # ... more sessions
]

# Calculate CECI score
ceci_score = calculate_ceci(game_results, child_name="Emma")

print(f"Overall Score: {ceci_score['overall']}/100")
print(f"Risk Band: {ceci_score['riskBand']}")
print(f"Confidence: {ceci_score['confidence']}%")
print(f"Recommendation: {ceci_score['recommendation']}")
```

### Using the API Server

#### Start the Server

```bash
# From ml_pipeline directory
python api.py

# Or using uvicorn directly
uvicorn ml_pipeline.api:app --host 0.0.0.0 --port 8000
```

#### Make API Requests

```python
import requests

response = requests.post(
    "http://localhost:8000/predict",
    json={
        "results": game_results,
        "childName": "Emma"
    }
)

prediction = response.json()
print(prediction['score'])
```

### With Data Validation

```python
from ml_pipeline.validation import validate_and_preprocess

# Validate and clean data
processed_results, quality_report = validate_and_preprocess(game_results)

print(f"Quality Score: {quality_report['quality_score']}/100")
print(f"Warnings: {quality_report['warnings']}")

# Use processed results
ceci_score = calculate_ceci(processed_results, child_name="Emma")
```

## Examples

See the `examples/` directory for more detailed examples:

- **basic_usage.py**: Basic pipeline usage and CECI calculation
- **api_client.py**: API client implementation and usage

Run examples:

```bash
cd examples
python basic_usage.py
python api_client.py  # Requires API server running
```

## Configuration

The pipeline is highly configurable through `config.py`:

```python
from ml_pipeline import PipelineConfig, CECIPipeline

# Custom configuration
config = PipelineConfig()

# Modify tree model weights
config.tree_model.weights = {
    'accuracy': 0.40,
    'reaction': 0.30,
    'hesitation': 0.15,
    'engagement': 0.15
}

# Modify risk thresholds
config.risk_assessment.green_threshold = 75.0
config.risk_assessment.amber_threshold = 45.0

# Create pipeline with custom config
pipeline = CECIPipeline(config)
```

## Risk Band Classification

### 🟢 Green Band (70-100%)
- **Meaning**: Child is developing typically
- **Action**: Continue current activities, regular monitoring

### 🟡 Amber Band (40-69%)
- **Meaning**: Some areas need attention
- **Action**: Monitor closely, increase practice frequency

### 🔴 Red Band (0-39%)
- **Meaning**: Professional assessment recommended
- **Action**: Consult developmental specialist

## Data Requirements

### Minimum Requirements
- At least 1 game session
- Valid behavioral metrics per session

### Recommended for Optimal Assessment
- 3+ game sessions
- Sessions spread over time (not all same day)
- Complete behavioral metrics for each session

### Required Fields

```python
{
    'gameId': str,                    # Game identifier
    'score': float,                   # Game score (0-100)
    'timestamp': int,                 # Unix timestamp in milliseconds
    'behavioralMetrics': {
        'accuracy': float,            # Percentage (0-100)
        'averageReactionTime': float, # Milliseconds
        'hesitationCount': int,       # Number of hesitations
        'engagementScore': float,     # Percentage (0-100)
        'reactionTimes': List[float], # Array of reaction times
        'correctAttempts': int,
        'incorrectAttempts': int,
        'reactionTimeVariability': float
    }
}
```

## Testing

Run the complete test suite:

```bash
# From ml_pipeline directory
pytest

# With coverage report
pytest --cov=ml_pipeline --cov-report=html

# Run specific test file
pytest tests/test_pipeline.py

# Run with verbose output
pytest -v
```

## API Documentation

Once the server is running, visit:
- **Interactive docs**: http://localhost:8000/docs
- **Alternative docs**: http://localhost:8000/redoc

### API Endpoints

#### GET /health
Health check endpoint

**Response:**
```json
{
  "status": "healthy",
  "pipeline_stages": 5,
  "config": {...}
}
```

#### POST /predict
Calculate CECI score

**Request:**
```json
{
  "results": [...],
  "childName": "Emma"
}
```

**Response:**
```json
{
  "score": {
    "overall": 85,
    "riskBand": "green",
    "confidence": 75,
    "treeBasedScore": 82,
    "temporalScore": 86,
    "bayesianCalibration": 84,
    "recommendation": "Emma is developing typically..."
  },
  "pipelineMetrics": {...}
}
```

#### GET /config
Get pipeline configuration

## Logging

Configure logging:

```python
from ml_pipeline.logging_config import PipelineLogger

# Setup logging
PipelineLogger.setup_logging(
    log_level="INFO",
    log_dir="logs",
    enable_console=True,
    enable_file=True
)

# Get logger
logger = PipelineLogger.get_logger(__name__)
logger.info("Pipeline started")
```

## Performance

Typical execution times (on standard hardware):
- Feature Engineering: 1-3ms
- Tree-Based Model: <1ms
- Temporal Model: 1-2ms
- Bayesian Calibration: <1ms
- Post-Processing: <1ms
- **Total Pipeline**: 3-7ms

## Development

### Project Structure

```
ml_pipeline/
├── __init__.py           # Package initialization
├── api.py                # FastAPI server
├── config.py             # Configuration classes
├── models.py             # Pydantic data models
├── pipeline.py           # Main pipeline orchestration
├── validation.py         # Data validation utilities
├── logging_config.py     # Logging configuration
├── stages/               # Pipeline stages
│   ├── __init__.py
│   ├── base.py
│   ├── feature_engineering.py
│   ├── tree_model.py
│   ├── temporal_model.py
│   ├── bayesian_calibration.py
│   └── post_processing.py
├── tests/                # Test suite
│   ├── conftest.py
│   ├── test_*.py
│   └── ...
└── examples/             # Usage examples
    ├── basic_usage.py
    └── api_client.py
```

### Adding Custom Stages

```python
from ml_pipeline.stages.base import PipelineStage

class CustomStage(PipelineStage):
    def __init__(self):
        super().__init__("CustomStage")

    def execute(self, context, config):
        # Your logic here
        context['custom_output'] = process_data(context['features'])
        return context
```

## Troubleshooting

### Common Issues

**Issue**: ImportError when running examples
```bash
# Solution: Install package in development mode
pip install -e .
```

**Issue**: API server fails to start
```bash
# Solution: Check if port 8000 is already in use
lsof -i :8000  # Linux/Mac
netstat -ano | findstr :8000  # Windows
```

**Issue**: Low confidence scores
```
Solution: Ensure you have at least 3-5 game sessions for reliable assessment
```

## Contributing

1. Write tests for new features
2. Follow existing code style
3. Update documentation
4. Run test suite before submitting

## License

Copyright © 2026 CECI Project

## Citation

If you use this pipeline in research, please cite:

```
@software{ceci_pipeline_2026,
  title = {CECI ML Pipeline: Early Childhood Intellectual Disability Screening},
  author = {CECI Project Team},
  year = {2026},
  version = {1.0.0}
}
```

## Contact

For questions or issues:
- Open an issue in the repository
- Contact: [your-email@example.com]

---

**Built with**: Python, FastAPI, NumPy, Pydantic, pytest
