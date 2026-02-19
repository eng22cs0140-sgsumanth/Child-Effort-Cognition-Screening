"""
Feature Engineering Stage
Extracts and transforms raw game data into feature vectors
"""
import numpy as np
from typing import Dict, Any, List
from .base import PipelineStage
from ..config import PipelineConfig


class FeatureEngineeringStage(PipelineStage):
    """Transforms raw game results into structured feature vectors"""

    def __init__(self):
        super().__init__("FeatureEngineering")

    def execute(self, context: Dict[str, Any], config: PipelineConfig) -> Dict[str, Any]:
        raw_data = context.get('raw_data', [])

        if not raw_data:
            context['features'] = self._get_empty_features()
            return context

        # Sort by timestamp to maintain temporal order
        sorted_data = sorted(raw_data, key=lambda x: x['timestamp'])

        # Extract behavioral metrics
        metrics_array = [
            r['behavioralMetrics']
            for r in sorted_data
            if r.get('behavioralMetrics')
        ]

        if not metrics_array:
            context['features'] = self._get_empty_features()
            return context

        # Extract sequences for temporal analysis
        accuracy_seq = [m['accuracy'] for m in metrics_array]
        reaction_time_seq = [m['averageReactionTime'] for m in metrics_array]
        engagement_seq = [m['engagementScore'] for m in metrics_array]
        hesitation_seq = [m['hesitationCount'] for m in metrics_array]

        # Compute features
        features = {
            # Aggregated features
            'avg_accuracy': float(np.mean(accuracy_seq)),
            'avg_reaction_time': float(np.mean(reaction_time_seq)),
            'avg_hesitation': float(np.mean(hesitation_seq)),
            'avg_engagement': float(np.mean(engagement_seq)),

            # Temporal features
            'accuracy_trend': self._calculate_trend(accuracy_seq),
            'reaction_time_trend': self._calculate_trend(reaction_time_seq),
            'volatility': float(np.std(accuracy_seq)),

            # Session-based features
            'session_count': len(metrics_array),
            'improvement_rate': self._calculate_improvement_rate(accuracy_seq),
            'consistency_score': self._calculate_consistency_score(accuracy_seq),

            # Raw sequences for temporal models
            'accuracy_sequence': accuracy_seq,
            'reaction_time_sequence': reaction_time_seq,
            'engagement_sequence': engagement_seq
        }

        context['features'] = features
        return context

    def _get_empty_features(self) -> Dict[str, Any]:
        """Return empty feature vector"""
        return {
            'avg_accuracy': 0.0,
            'avg_reaction_time': 0.0,
            'avg_hesitation': 0.0,
            'avg_engagement': 0.0,
            'accuracy_trend': 0.0,
            'reaction_time_trend': 0.0,
            'volatility': 0.0,
            'session_count': 0,
            'improvement_rate': 0.0,
            'consistency_score': 0.0,
            'accuracy_sequence': [],
            'reaction_time_sequence': [],
            'engagement_sequence': []
        }

    def _calculate_trend(self, values: List[float]) -> float:
        """Calculate linear trend using least squares"""
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
        return float(slope)

    def _calculate_improvement_rate(self, sequence: List[float]) -> float:
        """Calculate improvement rate between first and last sessions"""
        if len(sequence) < 2:
            return 0.0

        first = sequence[0]
        last = sequence[-1]

        if first == 0:
            return 0.0

        return ((last - first) / max(first, 1)) * 100

    def _calculate_consistency_score(self, sequence: List[float]) -> float:
        """Calculate consistency score (inverse of variability)"""
        if len(sequence) < 2:
            return 100.0

        std_dev = float(np.std(sequence))
        return max(0.0, 100.0 - std_dev)
