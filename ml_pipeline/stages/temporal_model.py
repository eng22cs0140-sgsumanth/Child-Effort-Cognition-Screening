"""
Temporal Model Stage
Simulates LSTM/GRU behavior by analyzing session-by-session trends
"""
import numpy as np
from typing import Dict, Any, List
from .base import PipelineStage
from ..config import PipelineConfig


class TemporalModelStage(PipelineStage):
    """Analyzes temporal patterns and trends in performance over sessions"""

    def __init__(self):
        super().__init__("TemporalModel")

    def execute(self, context: Dict[str, Any], config: PipelineConfig) -> Dict[str, Any]:
        features = context.get('features')

        if not features or features['session_count'] < config.temporal_model.min_sessions_for_trend:
            context['temporal_model_output'] = {
                'persistentDifficulty': 0.0,
                'effortInconsistency': 0.0,
                'improvementTrend': 0.0,
                'volatilityScore': 0.0
            }
            return context

        accuracy_seq = features['accuracy_sequence']
        reaction_time_seq = features['reaction_time_sequence']
        engagement_seq = features['engagement_sequence']

        # Calculate improvement trend (normalized slope)
        improvement_trend = self._calculate_trend(
            accuracy_seq,
            config.temporal_model.trend_sensitivity
        )

        # Calculate volatility (consistency of performance)
        accuracy_std = float(np.std(accuracy_seq))
        reaction_time_std = float(np.std(reaction_time_seq))
        volatility_score = min(100.0, (accuracy_std + reaction_time_std / 10) * 2)

        # Persistent difficulty: consistently low scores
        avg_accuracy = float(np.mean(accuracy_seq))
        persistent_difficulty = max(0.0, 100.0 - avg_accuracy)

        # Effort inconsistency: high volatility + variable engagement
        engagement_std = float(np.std(engagement_seq))
        effort_inconsistency = min(100.0, (volatility_score + engagement_std) / 2)

        # Emotional variability trend (slope of EVI across sessions)
        evi_seq = features.get('evi_sequence', [])
        emotional_variability_trend = 0.0
        if len(evi_seq) >= 2:
            emotional_variability_trend = self._calculate_trend(
                evi_seq,
                config.temporal_model.trend_sensitivity
            )

        # Overall emotional variability score (0-100)
        emotional_variability = features.get('emotional_variability_index', 0.0)

        temporal_output = {
            'persistentDifficulty': persistent_difficulty,
            'effortInconsistency': effort_inconsistency,
            'improvementTrend': improvement_trend,
            'volatilityScore': volatility_score,
            'emotionalVariabilityTrend': emotional_variability_trend,
            'emotionalVariability': float(emotional_variability),
        }

        context['temporal_model_output'] = temporal_output
        return context

    def _calculate_trend(self, values: List[float], sensitivity: float) -> float:
        """Calculate trend using simple linear regression"""
        if len(values) < 2:
            return 0.0

        n = len(values)
        x = np.arange(n)
        x_mean = np.mean(x)
        y_mean = np.mean(values)

        numerator = np.sum((x - x_mean) * (values - y_mean))
        denominator = np.sum((x - x_mean) ** 2)

        if denominator == 0:
            return 0.0

        slope = numerator / denominator

        # Normalize to -100 to 100 range
        normalized = slope * sensitivity
        return float(max(-100.0, min(100.0, normalized)))
