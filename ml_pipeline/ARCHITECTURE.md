# CECI ML Pipeline - Architecture Documentation

## System Overview

The CECI (Composite Early Childhood Indicator) ML Pipeline is a modular, production-ready system for assessing early childhood development through game-based behavioral data analysis.

## Design Principles

1. **Modularity**: Each component is independent and replaceable
2. **Testability**: Comprehensive test coverage for all modules
3. **Extensibility**: Easy to add new stages or models
4. **Observability**: Built-in logging, monitoring, and metrics
5. **Production-Ready**: Validation, error handling, and deployment configs

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Application                        │
│              (React App / Mobile App / Web)                  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Server                           │
│                  (api.py - REST API)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Data Validation Layer                       │
│           (validation.py - Input sanitization)               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    CECI Pipeline Core                        │
│                  (pipeline.py - Orchestrator)                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Stage 1: Feature Engineering                        │  │
│  │  - Extracts behavioral metrics                       │  │
│  │  - Computes temporal sequences                       │  │
│  │  - Calculates trends and statistics                  │  │
│  └───────────────────┬──────────────────────────────────┘  │
│                      │                                      │
│  ┌───────────────────▼──────────────────────────────────┐  │
│  │  Stage 2: Tree-Based Model                           │  │
│  │  - Weighted feature scoring                          │  │
│  │  - Simulates Random Forest/XGBoost                   │  │
│  │  - Produces baseline risk score                      │  │
│  └───────────────────┬──────────────────────────────────┘  │
│                      │                                      │
│  ┌───────────────────▼──────────────────────────────────┐  │
│  │  Stage 3: Temporal Model                             │  │
│  │  - Session-by-session analysis                       │  │
│  │  - Trend detection (improving/declining)             │  │
│  │  - Volatility and consistency scoring                │  │
│  └───────────────────┬──────────────────────────────────┘  │
│                      │                                      │
│  ┌───────────────────▼──────────────────────────────────┐  │
│  │  Stage 4: Bayesian Calibration                       │  │
│  │  - Uncertainty quantification                        │  │
│  │  - Confidence scoring                                │  │
│  │  - Model agreement analysis                          │  │
│  └───────────────────┬──────────────────────────────────┘  │
│                      │                                      │
│  ┌───────────────────▼──────────────────────────────────┐  │
│  │  Stage 5: Post-Processing                            │  │
│  │  - Risk band classification                          │  │
│  │  - Recommendation generation                         │  │
│  │  - Final score assembly                              │  │
│  └───────────────────┬──────────────────────────────────┘  │
└────────────────────────┼────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Monitoring & Logging                        │
│    (monitoring.py, logging_config.py - Observability)        │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. API Layer (`api.py`)

**Purpose**: REST API interface for external applications

**Key Features**:
- FastAPI framework for high performance
- CORS middleware for cross-origin requests
- Pydantic models for request/response validation
- Health check endpoints
- Configuration endpoint

**Endpoints**:
- `GET /`: Root endpoint (health status)
- `GET /health`: Detailed health check
- `POST /predict`: CECI prediction endpoint
- `GET /config`: Pipeline configuration

### 2. Data Validation (`validation.py`)

**Purpose**: Ensure data quality and integrity

**Components**:
- `DataValidator`: Validates input structure and ranges
- `DataQualityChecker`: Analyzes data quality metrics
- `validate_and_preprocess()`: Convenience function

**Validation Checks**:
- Required fields presence
- Data type validation
- Range validation (e.g., accuracy 0-100)
- Timestamp validity
- Behavioral metrics completeness

**Preprocessing**:
- Sort by timestamp
- Clamp values to valid ranges
- Filter invalid records
- Clean reaction times arrays

### 3. Pipeline Core (`pipeline.py`)

**Purpose**: Orchestrate execution of pipeline stages

**Key Classes**:
- `CECIPipeline`: Main pipeline orchestrator
- `get_pipeline()`: Singleton instance factory
- `calculate_ceci()`: Convenience function

**Features**:
- Sequential stage execution
- Context passing between stages
- Performance metrics tracking
- Error handling and recovery

**Context Flow**:
```python
context = {
    'raw_data': [...],           # Input
    'child_name': 'Emma',
    'features': {...},           # After Stage 1
    'tree_model_output': 85.0,   # After Stage 2
    'temporal_model_output': {}, # After Stage 3
    'bayesian_output': {},       # After Stage 4
    'final_score': {}            # After Stage 5
}
```

### 4. Pipeline Stages

#### Stage 1: Feature Engineering (`stages/feature_engineering.py`)

**Input**: Raw game results
**Output**: Feature vectors and sequences

**Extracted Features**:
- **Aggregated**: avg_accuracy, avg_reaction_time, avg_hesitation, avg_engagement
- **Temporal**: accuracy_trend, reaction_time_trend, volatility
- **Session-based**: session_count, improvement_rate, consistency_score
- **Sequences**: accuracy_sequence, reaction_time_sequence, engagement_sequence

**Algorithms**:
- Linear regression for trend calculation
- Standard deviation for volatility
- Least squares for improvement rate

#### Stage 2: Tree-Based Model (`stages/tree_model.py`)

**Input**: Feature vectors
**Output**: Baseline risk score (0-100)

**Model Simulation**:
Simulates Random Forest/XGBoost using weighted feature importance:

```python
score = (
    accuracy * 0.35 +
    reaction_time_score * 0.25 +
    hesitation_score * 0.20 +
    engagement * 0.20
)
```

**Configurable Parameters**:
- Feature weights
- Reaction time normalization factor
- Hesitation penalty factor

#### Stage 3: Temporal Model (`stages/temporal_model.py`)

**Input**: Temporal sequences
**Output**: Temporal analysis metrics

**Outputs**:
- `persistentDifficulty`: Consistently low performance indicator
- `effortInconsistency`: Variability in engagement/performance
- `improvementTrend`: Direction and magnitude of trend (-100 to +100)
- `volatilityScore`: Performance consistency metric

**Algorithms**:
- Time series trend analysis
- Volatility calculation (standard deviation)
- Pattern detection for effort inconsistency

#### Stage 4: Bayesian Calibration (`stages/bayesian_calibration.py`)

**Input**: Tree and temporal model outputs
**Output**: Calibrated score with confidence

**Bayesian Update**:
```python
posterior = prior * (1 - evidence_strength) + likelihood * evidence_strength
```

**Confidence Calculation**:
- Based on data size (session count)
- Model agreement factor
- Ranges from 0-100%

**Purpose**:
- Account for uncertainty with limited data
- Prevent overconfidence
- Quantify reliability of assessment

#### Stage 5: Post-Processing (`stages/post_processing.py`)

**Input**: All model outputs
**Output**: Final CECI score and recommendation

**Fusion Algorithm**:
```python
ceci_overall = (
    tree_score * 0.3 +
    temporal_score * 0.3 +
    bayesian_calibrated * 0.4
)
```

**Risk Band Logic**:
- Green (≥70%): Typical development
- Amber (40-69%): Monitor closely
- Red (<40%): Specialist recommended

**Special Cases**:
- High persistent difficulty overrides score → Red
- Low confidence + borderline score → Amber
- Strong improvement trend → Enhanced recommendation

### 5. Configuration (`config.py`)

**Purpose**: Centralized configuration management

**Configuration Classes**:
- `FeatureEngineeringConfig`
- `TreeModelConfig`
- `TemporalModelConfig`
- `BayesianConfig`
- `RiskAssessmentConfig`
- `PipelineConfig` (aggregates all configs)

**Benefits**:
- Type-safe configuration with dataclasses
- Easy customization without code changes
- Version control for hyperparameters

### 6. Data Models (`models.py`)

**Purpose**: Type-safe data structures with validation

**Key Models**:
- `BehavioralMetrics`: Game session metrics
- `GameResult`: Single game session
- `CECIScore`: Final assessment result
- `PredictionRequest`: API request
- `PredictionResponse`: API response

**Validation**:
- Pydantic automatic validation
- Type checking
- Range constraints
- Field requirements

### 7. Logging (`logging_config.py`)

**Purpose**: Comprehensive logging infrastructure

**Features**:
- Color-coded console output
- File logging with rotation
- Structured log format
- Performance timing decorators
- Contextual logging (request IDs)

**Log Levels**:
- DEBUG: Detailed diagnostic info
- INFO: General informational messages
- WARNING: Warning messages
- ERROR: Error messages
- CRITICAL: Critical failures

### 8. Monitoring (`monitoring.py`)

**Purpose**: Performance tracking and health monitoring

**Components**:
- `MetricsCollector`: Aggregates metrics
- `PerformanceMonitor`: Context manager for timing
- `HealthChecker`: System health assessment

**Tracked Metrics**:
- Prediction count
- Risk band distribution
- Average scores and confidence
- Execution times per stage
- Error rates and types

## Data Flow

### Complete Request Flow

1. **Client** sends POST request to `/predict` with game results
2. **API Layer** validates request with Pydantic models
3. **Validation Layer** preprocesses and quality checks data
4. **Pipeline** executes 5 stages sequentially:
   - Extract features
   - Calculate tree-based score
   - Analyze temporal patterns
   - Calibrate with Bayesian approach
   - Generate final assessment
5. **Monitoring** records metrics
6. **API Layer** returns CECI score to client

### Error Handling Flow

```
Error Occurs
    ↓
Pipeline Stage catches exception
    ↓
Logs error with context
    ↓
Records in monitoring
    ↓
Returns appropriate HTTP error
    ↓
Client receives error response
```

## Extensibility

### Adding a New Pipeline Stage

```python
# 1. Create stage class
from ml_pipeline.stages.base import PipelineStage

class MyNewStage(PipelineStage):
    def __init__(self):
        super().__init__("MyNewStage")

    def execute(self, context, config):
        # Process data
        result = process(context['features'])
        context['my_output'] = result
        return context

# 2. Add to pipeline
pipeline = CECIPipeline()
pipeline.stages.insert(2, MyNewStage())  # Insert at position 2
```

### Adding New Configuration

```python
# In config.py
@dataclass
class MyNewConfig:
    param1: float = 1.0
    param2: int = 10

@dataclass
class PipelineConfig:
    # ... existing configs ...
    my_new_config: MyNewConfig = field(default_factory=MyNewConfig)
```

### Adding New Metrics

```python
# Use MetricsCollector
from ml_pipeline.monitoring import get_metrics_collector

collector = get_metrics_collector()
collector.record_custom_metric('my_metric', value)
```

## Performance Considerations

### Optimization Strategies

1. **Caching**: Results can be cached by input hash
2. **Parallel Processing**: Multiple predictions in parallel
3. **Batch Processing**: Process multiple children at once
4. **Model Pre-loading**: Pipeline instantiated once (singleton)
5. **NumPy Vectorization**: Fast array operations

### Scalability

- **Vertical**: Increase worker count (CPU cores)
- **Horizontal**: Deploy multiple instances behind load balancer
- **Stateless**: No shared state between requests
- **Fast**: ~3-7ms per prediction

## Security

### Current Measures

1. **Input Validation**: Pydantic + custom validators
2. **CORS**: Configurable allowed origins
3. **Type Safety**: Python type hints throughout
4. **Error Messages**: Sanitized before returning

### Recommended Additions

1. **Authentication**: JWT tokens, API keys
2. **Rate Limiting**: Prevent abuse
3. **Encryption**: HTTPS/TLS in production
4. **Input Sanitization**: XSS protection
5. **Audit Logging**: Track all predictions

## Testing Strategy

### Test Coverage

- **Unit Tests**: Each stage independently
- **Integration Tests**: Complete pipeline flow
- **Edge Cases**: Empty data, single session, extreme values
- **Performance Tests**: Execution time benchmarks

### Test Structure

```
tests/
├── conftest.py              # Fixtures
├── test_feature_engineering.py
├── test_tree_model.py
├── test_temporal_model.py
├── test_bayesian_calibration.py
├── test_post_processing.py
├── test_pipeline.py         # Integration
└── test_validation.py
```

## Deployment Architecture

### Recommended Production Setup

```
Internet
    ↓
[Load Balancer / CDN]
    ↓
[Reverse Proxy (nginx)]
    ↓
[CECI Pipeline Instances] × N
    ↓
[Monitoring / Logging]
```

### Container Architecture

```
Docker Host
    ├── ceci-pipeline:8000 (container 1)
    ├── ceci-pipeline:8001 (container 2)
    └── ceci-pipeline:8002 (container 3)
         ↓
    [Shared Logs Volume]
```

## Future Enhancements

### Potential Improvements

1. **Real ML Models**: Train actual RF/XGBoost and LSTM models
2. **Database Integration**: Store predictions and history
3. **User Management**: Multi-tenant support
4. **Advanced Analytics**: Longitudinal tracking dashboards
5. **Model Versioning**: A/B testing different models
6. **Batch API**: Process multiple children at once
7. **Webhooks**: Notify on assessment completion
8. **Export**: PDF reports generation

---

**Version**: 1.0.0
**Last Updated**: January 2026
**Maintainer**: CECI Project Team
