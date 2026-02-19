"""
Tree-Based Model Stage
Uses trained Random Forest / GradientBoosting models when available,
falls back to weighted feature scoring otherwise.
"""
import os
import logging
from typing import Dict, Any
from .base import PipelineStage
from ..config import PipelineConfig

logger = logging.getLogger(__name__)

# Try to load trained models
_trained_models = None


def _load_trained_models():
    """Lazily load trained models"""
    global _trained_models
    if _trained_models is not None:
        return _trained_models

    try:
        import joblib
        model_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'trained_models')

        if os.path.exists(os.path.join(model_dir, 'score_regressor.joblib')):
            _trained_models = {
                'score_regressor': joblib.load(os.path.join(model_dir, 'score_regressor.joblib')),
                'risk_classifier': joblib.load(os.path.join(model_dir, 'risk_classifier.joblib')),
                'feature_scaler': joblib.load(os.path.join(model_dir, 'feature_scaler.joblib')),
            }
            logger.info("Trained tree-based models loaded successfully")
            return _trained_models
    except Exception as e:
        logger.warning(f"Could not load trained models, using fallback: {e}")

    _trained_models = {}
    return _trained_models


class TreeBasedModelStage(PipelineStage):
    """
    Analyzes aggregated behavioral features to produce a baseline risk score.

    Uses trained RandomForest/GradientBoosting when available,
    falls back to weighted feature scoring otherwise.
    """

    def __init__(self):
        super().__init__("TreeBasedModel")

    def execute(self, context: Dict[str, Any], config: PipelineConfig) -> Dict[str, Any]:
        features = context.get('features')

        if not features or features.get('session_count', 0) == 0:
            context['tree_model_output'] = 0.0
            context['tree_model_mode'] = 'empty'
            return context

        # Try using trained models first
        models = _load_trained_models()
        if models and 'score_regressor' in models:
            score = self._predict_with_trained_model(features, models)
            context['tree_model_output'] = score
            context['tree_model_mode'] = 'trained'

            # Also store RF risk classification for downstream use
            try:
                import numpy as np
                feature_cols = [
                    'avg_accuracy', 'avg_reaction_time', 'avg_hesitation',
                    'avg_engagement', 'accuracy_std', 'rt_variability',
                    'session_count', 'num_games', 'age'
                ]
                X = [[
                    features.get('avg_accuracy', 0),
                    features.get('avg_reaction_time', 0),
                    features.get('avg_hesitation', 0),
                    features.get('avg_engagement', 0),
                    features.get('volatility', 0),  # maps to accuracy_std
                    self._calc_rt_variability(features),
                    features.get('session_count', 1),
                    self._count_unique_games(context),
                    context.get('child_age', 5),
                ]]
                X_scaled = models['feature_scaler'].transform(X)
                rf_pred = models['risk_classifier'].predict(X_scaled)[0]
                rf_proba = models['risk_classifier'].predict_proba(X_scaled)[0]
                context['tree_model_rf_class'] = int(rf_pred)
                context['tree_model_rf_proba'] = rf_proba.tolist()
                context['tree_model_feature_importance'] = dict(zip(
                    feature_cols,
                    models['risk_classifier'].feature_importances_.tolist()
                ))
            except Exception as e:
                logger.debug(f"RF classification supplement failed: {e}")

            return context

        # Fallback: weighted feature scoring (original simulated behavior)
        score = self._fallback_scoring(features, config)
        context['tree_model_output'] = score
        context['tree_model_mode'] = 'fallback'
        return context

    def _predict_with_trained_model(self, features: Dict[str, Any], models: Dict) -> float:
        """Use trained GradientBoosting regressor for score prediction"""
        import numpy as np

        X = [[
            features.get('avg_accuracy', 0),
            features.get('avg_reaction_time', 0),
            features.get('avg_hesitation', 0),
            features.get('avg_engagement', 0),
            features.get('volatility', 0),  # accuracy_std equivalent
            self._calc_rt_variability(features),
            features.get('session_count', 1),
            self._count_unique_games_from_features(features),
            5,  # default age
        ]]

        X_scaled = models['feature_scaler'].transform(X)
        raw_score = models['score_regressor'].predict(X_scaled)[0]

        return float(max(0.0, min(100.0, raw_score)))

    def _calc_rt_variability(self, features: Dict[str, Any]) -> float:
        """Calculate reaction time variability from sequence"""
        import numpy as np
        rt_seq = features.get('reaction_time_sequence', [])
        if len(rt_seq) > 1:
            return float(np.std(rt_seq))
        return 0.0

    def _count_unique_games(self, context: Dict[str, Any]) -> int:
        """Count unique games from raw data"""
        raw = context.get('raw_data', [])
        return len(set(r.get('gameId', '') for r in raw))

    def _count_unique_games_from_features(self, features: Dict[str, Any]) -> int:
        """Estimate unique games from feature data"""
        return max(1, features.get('session_count', 1))

    def _fallback_scoring(self, features: Dict[str, Any], config: PipelineConfig) -> float:
        """Original weighted feature scoring (fallback when no trained model)"""
        weights = config.tree_model.weights
        reaction_norm = config.tree_model.reaction_time_normalization
        hesitation_penalty = config.tree_model.hesitation_penalty

        accuracy_score = features['avg_accuracy']
        reaction_score = max(0.0, 100.0 - (features['avg_reaction_time'] / reaction_norm))
        hesitation_score = max(0.0, 100.0 - (features['avg_hesitation'] * hesitation_penalty))
        engagement_score = features['avg_engagement']

        tree_score = (
            accuracy_score * weights['accuracy'] +
            reaction_score * weights['reaction'] +
            hesitation_score * weights['hesitation'] +
            engagement_score * weights['engagement']
        )

        return max(0.0, min(100.0, tree_score))
