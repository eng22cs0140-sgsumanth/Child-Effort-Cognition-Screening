"""
CECI ML Pipeline Package
"""
from .pipeline import CECIPipeline, get_pipeline, calculate_ceci
from .config import PipelineConfig, DEFAULT_CONFIG
from .models import GameResult, CECIScore, BehavioralMetrics

__version__ = "1.0.0"

__all__ = [
    'CECIPipeline',
    'get_pipeline',
    'calculate_ceci',
    'PipelineConfig',
    'DEFAULT_CONFIG',
    'GameResult',
    'CECIScore',
    'BehavioralMetrics'
]
