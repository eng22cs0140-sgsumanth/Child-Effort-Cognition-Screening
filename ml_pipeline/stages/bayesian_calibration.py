"""
Bayesian Calibration Stage
Uses trained CalibratedClassifierCV for probability estimation when available,
falls back to analytical Bayesian update otherwise.
"""
import os
import logging
from typing import Dict, Any
from .base import PipelineStage
from ..config import PipelineConfig

logger = logging.getLogger(__name__)

# Try to load calibrated model
_calibrated_model = None


def _load_calibrated_model():
    """Lazily load the calibrated classifier"""
    global _calibrated_model
    if _calibrated_model is not None:
        return _calibrated_model

    try:
        import joblib
        model_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'trained_models')

        if os.path.exists(os.path.join(model_dir, 'calibrated_classifier.joblib')):
            _calibrated_model = {
                'classifier': joblib.load(os.path.join(model_dir, 'calibrated_classifier.joblib')),
                'scaler': joblib.load(os.path.join(model_dir, 'feature_scaler.joblib')),
            }
            logger.info("Calibrated Bayesian model loaded successfully")
            return _calibrated_model
    except Exception as e:
        logger.warning(f"Could not load calibrated model, using fallback: {e}")

    _calibrated_model = {}
    return _calibrated_model


class BayesianCalibrationStage(PipelineStage):
    """
    Combines model outputs with prior knowledge and quantifies uncertainty.

    Uses CalibratedClassifierCV (isotonic regression) when available,
    falls back to analytical Bayesian update otherwise.
    """

    def __init__(self):
        super().__init__("BayesianCalibration")

    def execute(self, context: Dict[str, Any], config: PipelineConfig) -> Dict[str, Any]:
        tree_output = context.get('tree_model_output')
        temporal_output = context.get('temporal_model_output')
        features = context.get('features')

        if (tree_output is None or not temporal_output or not features
                or features.get('session_count', 0) == 0):
            context['bayesian_output'] = {
                'calibratedScore': 0.0,
                'confidence': 0.0
            }
            context['bayesian_mode'] = 'empty'
            return context

        # Try using trained calibrated model
        cal_model = _load_calibrated_model()
        if cal_model and 'classifier' in cal_model:
            result = self._predict_with_calibrated_model(
                features, tree_output, temporal_output, cal_model, config
            )
            context['bayesian_output'] = result
            context['bayesian_mode'] = 'trained'
            return context

        # Fallback: analytical Bayesian update
        result = self._fallback_bayesian(
            tree_output, temporal_output, features, config
        )
        context['bayesian_output'] = result
        context['bayesian_mode'] = 'fallback'
        return context

    def _predict_with_calibrated_model(
        self,
        features: Dict[str, Any],
        tree_output: float,
        temporal_output: Dict[str, float],
        cal_model: Dict,
        config: PipelineConfig
    ) -> Dict[str, float]:
        """Use trained CalibratedClassifierCV for calibrated probabilities"""
        import numpy as np

        X = [[
            features.get('avg_accuracy', 0),
            features.get('avg_reaction_time', 0),
            features.get('avg_hesitation', 0),
            features.get('avg_engagement', 0),
            features.get('volatility', 0),
            self._calc_rt_variability(features),
            features.get('session_count', 1),
            max(1, features.get('session_count', 1)),
            5,  # default age
        ]]

        X_scaled = cal_model['scaler'].transform(X)
        probas = cal_model['classifier'].predict_proba(X_scaled)[0]
        # probas[0]=green, probas[1]=amber, probas[2]=red

        # Calibrated score: weighted by probability of good outcome
        # green=high score, amber=mid, red=low
        calibrated_score = probas[0] * 85 + probas[1] * 55 + probas[2] * 20

        # Confidence calculation:
        # Based on calibration certainty + session count + model agreement
        session_count = features.get('session_count', 1)
        evidence_strength = min(1.0, session_count / config.bayesian.confidence_session_threshold)

        # Model agreement between tree and temporal
        tree_norm = tree_output / 100.0
        temporal_norm = (100.0 - temporal_output['persistentDifficulty']) / 100.0
        model_agreement = 1.0 - abs(tree_norm - temporal_norm)

        # Probability margin (how decisive the calibration is)
        sorted_probs = np.sort(probas)[::-1]
        prob_margin = sorted_probs[0] - sorted_probs[1]

        confidence = min(100.0,
            evidence_strength * 30 +
            model_agreement * 30 +
            prob_margin * 40 * 100
        )

        return {
            'calibratedScore': float(calibrated_score),
            'confidence': float(confidence),
            'probabilities': {
                'green': float(probas[0]),
                'amber': float(probas[1]),
                'red': float(probas[2])
            }
        }

    def _calc_rt_variability(self, features: Dict[str, Any]) -> float:
        """Calculate reaction time variability"""
        import numpy as np
        rt_seq = features.get('reaction_time_sequence', [])
        if len(rt_seq) > 1:
            return float(np.std(rt_seq))
        return 0.0

    def _fallback_bayesian(
        self,
        tree_output: float,
        temporal_output: Dict[str, float],
        features: Dict[str, Any],
        config: PipelineConfig
    ) -> Dict[str, float]:
        """Original analytical Bayesian update (fallback)"""
        prior = config.bayesian.prior
        confidence_threshold = config.bayesian.confidence_session_threshold

        combined_score = (tree_output + (100.0 - temporal_output['persistentDifficulty'])) / 2
        likelihood = combined_score / 100.0

        session_count = features['session_count']
        evidence_strength = min(1.0, session_count / confidence_threshold)

        posterior = prior * (1 - evidence_strength) + likelihood * evidence_strength

        tree_norm = tree_output / 100.0
        temporal_norm = (100.0 - temporal_output['persistentDifficulty']) / 100.0
        model_agreement = 1.0 - abs(tree_norm - temporal_norm)

        confidence = min(100.0, evidence_strength * 50 + model_agreement * 50)

        calibrated_score = posterior * 100.0

        return {
            'calibratedScore': calibrated_score,
            'confidence': confidence
        }
