"""
Post-Processing Stage
Determines risk bands and generates recommendations.
Leverages trained model outputs when available.
"""
from typing import Dict, Any, Literal
from .base import PipelineStage
from ..config import PipelineConfig


class PostProcessingStage(PipelineStage):
    """Final stage that produces the CECI score and recommendations"""

    def __init__(self):
        super().__init__("PostProcessing")

    def execute(self, context: Dict[str, Any], config: PipelineConfig) -> Dict[str, Any]:
        tree_output = context.get('tree_model_output')
        temporal_output = context.get('temporal_model_output')
        bayesian_output = context.get('bayesian_output')
        child_name = context.get('child_name', 'Child')

        features = context.get('features')
        has_data = features and features.get('session_count', 0) > 0

        if tree_output is None or not temporal_output or not bayesian_output or not has_data:
            context['final_score'] = {
                'overall': 0,
                'riskBand': 'amber',
                'confidence': 0,
                'treeBasedScore': 0,
                'temporalScore': 0,
                'bayesianCalibration': 0,
                'recommendation': 'Insufficient data. Please complete more assessment sessions.'
            }
            return context

        # Compute temporal score
        temporal_score = 100.0 - temporal_output['persistentDifficulty']

        # Fusion into CECI overall score
        ceci_overall = (
            tree_output * 0.3 +
            temporal_score * 0.3 +
            bayesian_output['calibratedScore'] * 0.4
        )

        # Determine risk band - use trained model classification if available
        risk_band = self._determine_risk_band(
            ceci_overall,
            bayesian_output['confidence'],
            temporal_output,
            config,
            context
        )

        # Generate recommendation
        recommendation = self._generate_recommendation(
            risk_band,
            temporal_output,
            child_name
        )

        final_score = {
            'overall': round(ceci_overall),
            'riskBand': risk_band,
            'confidence': round(bayesian_output['confidence']),
            'treeBasedScore': round(tree_output),
            'temporalScore': round(temporal_score),
            'bayesianCalibration': round(bayesian_output['calibratedScore']),
            'recommendation': recommendation
        }

        # Add trained model metadata if available
        if context.get('tree_model_mode') == 'trained':
            final_score['modelMode'] = 'trained'
        if 'probabilities' in bayesian_output:
            final_score['riskProbabilities'] = bayesian_output['probabilities']

        context['final_score'] = final_score
        return context

    def _determine_risk_band(
        self,
        ceci_score: float,
        confidence: float,
        temporal_outputs: Dict[str, float],
        config: PipelineConfig,
        context: Dict[str, Any]
    ) -> Literal['green', 'amber', 'red']:
        """Determine Risk Band, using trained model when available"""
        risk_config = config.risk_assessment

        # If trained RF model provided a classification, use it as a strong signal
        rf_class = context.get('tree_model_rf_class')
        if rf_class is not None:
            rf_band = {0: 'green', 1: 'amber', 2: 'red'}[rf_class]
            # Use trained model classification, but still apply safety overrides
            if (temporal_outputs['persistentDifficulty'] > risk_config.persistent_difficulty_threshold and
                temporal_outputs['improvementTrend'] < risk_config.low_improvement_threshold):
                return 'red'
            if (confidence < risk_config.low_confidence_threshold and
                30 < ceci_score < 70):
                return 'amber'
            return rf_band

        # Fallback: original threshold-based logic
        if (temporal_outputs['persistentDifficulty'] > risk_config.persistent_difficulty_threshold and
            temporal_outputs['improvementTrend'] < risk_config.low_improvement_threshold):
            return 'red'

        if (confidence < risk_config.low_confidence_threshold and
            30 < ceci_score < 70):
            return 'amber'

        if ceci_score >= risk_config.green_threshold:
            return 'green'
        elif ceci_score >= risk_config.amber_threshold:
            return 'amber'
        else:
            return 'red'

    def _generate_recommendation(
        self,
        risk_band: str,
        temporal_outputs: Dict[str, float],
        child_name: str
    ) -> str:
        """Generate recommendation based on risk band and model outputs"""
        if risk_band == 'green':
            if temporal_outputs['improvementTrend'] > 20:
                return f"{child_name} is showing excellent progress! Performance is improving consistently. Continue current activities."
            return f"{child_name} is developing typically. Regular engagement with learning activities is recommended."

        elif risk_band == 'amber':
            if temporal_outputs['effortInconsistency'] > 50:
                return f"Monitor {child_name} closely. Performance variability suggests inconsistent effort or engagement. Try establishing more consistent routines and reassess in 2-4 weeks."
            return f"{child_name} shows some areas needing attention. Consider more frequent practice sessions and monitor progress closely. Consult with educator if concerns persist."

        else:  # red
            if temporal_outputs['persistentDifficulty'] > 70:
                return f"Strong recommendation for professional assessment. {child_name} shows persistent difficulties across multiple areas. Early intervention can be highly beneficial."
            return f"Recommend consultation with a developmental specialist. {child_name} may benefit from professional evaluation and targeted support."
