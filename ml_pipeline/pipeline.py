"""
CECI ML Pipeline Core
Orchestrates the execution of pipeline stages
"""
import time
from typing import List, Dict, Any, Optional
from .config import PipelineConfig, DEFAULT_CONFIG
from .stages import (
    FeatureEngineeringStage,
    TreeBasedModelStage,
    TemporalModelStage,
    BayesianCalibrationStage,
    PostProcessingStage
)
from .models import GameResult, CECIScore


class CECIPipeline:
    """
    ML Pipeline for CECI Assessment
    Modular, extensible pipeline that processes game results through multiple stages
    """

    def __init__(self, config: Optional[PipelineConfig] = None):
        self.config = config or DEFAULT_CONFIG
        self.metrics: List[Dict[str, Any]] = []

        # Initialize pipeline stages in order
        self.stages = [
            FeatureEngineeringStage(),
            TreeBasedModelStage(),
            TemporalModelStage(),
            BayesianCalibrationStage(),
            PostProcessingStage()
        ]

    def predict(self, results: List[Dict[str, Any]], child_name: str = "Child") -> Dict[str, Any]:
        """
        Execute the full pipeline

        Args:
            results: List of game result dictionaries
            child_name: Name of the child being assessed

        Returns:
            CECIScore dictionary with assessment results
        """
        # Initialize context
        context = {
            'raw_data': results,
            'child_name': child_name
        }

        self.metrics = []

        # Execute each stage sequentially
        for stage in self.stages:
            start_time = time.time()

            context = stage.execute(context, self.config)

            end_time = time.time()

            # Track metrics
            self.metrics.append({
                'stage_name': stage.name,
                'execution_time': end_time - start_time,
                'input_size': len(results)
            })

        # Return final score
        if 'final_score' not in context:
            raise RuntimeError("Pipeline failed to produce a final score")

        return context['final_score']

    def get_metrics(self) -> List[Dict[str, Any]]:
        """Get pipeline execution metrics"""
        return self.metrics

    def get_config(self) -> PipelineConfig:
        """Get current pipeline configuration"""
        return self.config

    def update_config(self, **kwargs) -> None:
        """Update pipeline configuration"""
        # This would need proper implementation based on your config structure
        pass


# Singleton instance
_pipeline_instance: Optional[CECIPipeline] = None


def get_pipeline(config: Optional[PipelineConfig] = None) -> CECIPipeline:
    """Get or create pipeline instance"""
    global _pipeline_instance

    if _pipeline_instance is None or config is not None:
        _pipeline_instance = CECIPipeline(config)

    return _pipeline_instance


def calculate_ceci(results: List[Dict[str, Any]], child_name: str = "Child") -> Dict[str, Any]:
    """
    Main entry point for CECI calculation using the ML Pipeline

    Args:
        results: List of game result dictionaries
        child_name: Name of the child being assessed

    Returns:
        CECIScore dictionary
    """
    pipeline = get_pipeline()
    return pipeline.predict(results, child_name)
