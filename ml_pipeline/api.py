"""
FastAPI server for CECI ML Pipeline
Provides REST API endpoints for the dashboard
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .models import PredictionRequest, PredictionResponse, CECIScore
from .pipeline import get_pipeline
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="CECI ML Pipeline API",
    description="ML Pipeline for Early Childhood Intellectual Disability Screening",
    version="1.0.0"
)

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3002", "http://localhost:3000"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "CECI ML Pipeline API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    try:
        pipeline = get_pipeline()
        return {
            "status": "healthy",
            "pipeline_stages": len(pipeline.stages),
            "config": {
                "tree_model_weights": pipeline.config.tree_model.weights,
                "risk_thresholds": {
                    "green": pipeline.config.risk_assessment.green_threshold,
                    "amber": pipeline.config.risk_assessment.amber_threshold
                }
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    """
    Predict CECI score from game results

    Args:
        request: PredictionRequest containing game results and child name

    Returns:
        PredictionResponse with CECI score and pipeline metrics
    """
    try:
        logger.info(f"Received prediction request for {request.childName} with {len(request.results)} sessions")

        # Convert Pydantic models to dictionaries
        results_dict = [result.model_dump() for result in request.results]

        # Get pipeline and make prediction
        pipeline = get_pipeline()
        score_dict = pipeline.predict(results_dict, request.childName)

        # Convert to CECIScore model
        score = CECIScore(**score_dict)

        # Get pipeline metrics
        metrics = pipeline.get_metrics()

        logger.info(f"Prediction complete: Overall={score.overall}, RiskBand={score.riskBand}")

        return PredictionResponse(
            score=score,
            pipelineMetrics={
                "stages": metrics,
                "total_execution_time": sum(m['execution_time'] for m in metrics)
            }
        )

    except Exception as e:
        logger.error(f"Prediction failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.get("/config")
async def get_config():
    """Get current pipeline configuration"""
    try:
        pipeline = get_pipeline()
        config = pipeline.get_config()

        return {
            "feature_engineering": {
                "min_sessions": config.feature_engineering.min_sessions
            },
            "tree_model": {
                "weights": config.tree_model.weights,
                "reaction_time_normalization": config.tree_model.reaction_time_normalization,
                "hesitation_penalty": config.tree_model.hesitation_penalty
            },
            "temporal_model": {
                "min_sessions_for_trend": config.temporal_model.min_sessions_for_trend,
                "trend_sensitivity": config.temporal_model.trend_sensitivity
            },
            "bayesian": {
                "prior": config.bayesian.prior,
                "confidence_session_threshold": config.bayesian.confidence_session_threshold
            },
            "risk_assessment": {
                "green_threshold": config.risk_assessment.green_threshold,
                "amber_threshold": config.risk_assessment.amber_threshold,
                "persistent_difficulty_threshold": config.risk_assessment.persistent_difficulty_threshold,
                "low_improvement_threshold": config.risk_assessment.low_improvement_threshold,
                "low_confidence_threshold": config.risk_assessment.low_confidence_threshold
            }
        }
    except Exception as e:
        logger.error(f"Failed to get config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
