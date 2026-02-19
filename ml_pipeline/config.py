"""
Pipeline configuration and hyperparameters
"""
from dataclasses import dataclass, field
from typing import Dict


@dataclass
class FeatureEngineeringConfig:
    """Feature engineering parameters"""
    min_sessions: int = 1


@dataclass
class TreeModelConfig:
    """Tree-based model parameters"""
    weights: Dict[str, float] = field(default_factory=lambda: {
        'accuracy': 0.35,
        'reaction': 0.25,
        'hesitation': 0.20,
        'engagement': 0.20
    })
    reaction_time_normalization: float = 50.0
    hesitation_penalty: float = 10.0


@dataclass
class TemporalModelConfig:
    """Temporal model parameters"""
    min_sessions_for_trend: int = 2
    trend_sensitivity: float = 10.0


@dataclass
class BayesianConfig:
    """Bayesian calibration parameters"""
    prior: float = 0.5
    confidence_session_threshold: int = 10


@dataclass
class RiskAssessmentConfig:
    """Risk band thresholds"""
    green_threshold: float = 70.0
    amber_threshold: float = 40.0
    persistent_difficulty_threshold: float = 60.0
    low_improvement_threshold: float = -20.0
    low_confidence_threshold: float = 40.0


@dataclass
class PipelineConfig:
    """Complete pipeline configuration"""
    feature_engineering: FeatureEngineeringConfig = field(default_factory=FeatureEngineeringConfig)
    tree_model: TreeModelConfig = field(default_factory=TreeModelConfig)
    temporal_model: TemporalModelConfig = field(default_factory=TemporalModelConfig)
    bayesian: BayesianConfig = field(default_factory=BayesianConfig)
    risk_assessment: RiskAssessmentConfig = field(default_factory=RiskAssessmentConfig)


# Default configuration instance
DEFAULT_CONFIG = PipelineConfig()
