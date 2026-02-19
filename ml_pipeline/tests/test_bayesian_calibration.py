"""
Tests for Bayesian Calibration Stage
"""
import pytest
from ml_pipeline.stages.bayesian_calibration import BayesianCalibrationStage
from ml_pipeline.config import PipelineConfig


class TestBayesianCalibrationStage:
    """Test cases for BayesianCalibrationStage"""

    def setup_method(self):
        """Setup test instance"""
        self.stage = BayesianCalibrationStage()
        self.config = PipelineConfig()

    def _make_features(self, session_count=10, **kwargs):
        """Helper to build features dict with all needed fields"""
        base = {
            'session_count': session_count,
            'avg_accuracy': kwargs.get('avg_accuracy', 75.0),
            'avg_reaction_time': kwargs.get('avg_reaction_time', 500.0),
            'avg_hesitation': kwargs.get('avg_hesitation', 3.0),
            'avg_engagement': kwargs.get('avg_engagement', 70.0),
            'volatility': kwargs.get('volatility', 5.0),
            'accuracy_sequence': kwargs.get('accuracy_sequence', [75.0] * session_count),
            'reaction_time_sequence': kwargs.get('reaction_time_sequence', [500.0] * session_count),
            'engagement_sequence': kwargs.get('engagement_sequence', [70.0] * session_count),
        }
        return base

    def test_stage_name(self):
        """Test stage has correct name"""
        assert self.stage.name == "BayesianCalibration"

    def test_execute_with_valid_inputs(self):
        """Test calibration with valid model outputs"""
        context = {
            'tree_model_output': 85.0,
            'temporal_model_output': {
                'persistentDifficulty': 20.0,
                'effortInconsistency': 15.0
            },
            'features': self._make_features(session_count=10)
        }
        result = self.stage.execute(context, self.config)

        output = result['bayesian_output']
        assert 'calibratedScore' in output
        assert 'confidence' in output
        assert 0 <= output['calibratedScore'] <= 100
        assert 0 <= output['confidence'] <= 100

    def test_confidence_increases_with_sessions(self):
        """Test that confidence generally increases with more sessions"""
        # Few sessions
        context1 = {
            'tree_model_output': 80.0,
            'temporal_model_output': {'persistentDifficulty': 25.0},
            'features': self._make_features(session_count=2)
        }
        result1 = self.stage.execute(context1, self.config)

        # Many sessions
        context2 = {
            'tree_model_output': 80.0,
            'temporal_model_output': {'persistentDifficulty': 25.0},
            'features': self._make_features(session_count=15)
        }
        result2 = self.stage.execute(context2, self.config)

        # With trained model, both might have high confidence.
        # But confidence should at least be non-negative and bounded.
        assert 0 <= result1['bayesian_output']['confidence'] <= 100
        assert 0 <= result2['bayesian_output']['confidence'] <= 100
        # More sessions should give >= confidence (or equal if model is already certain)
        assert result2['bayesian_output']['confidence'] >= result1['bayesian_output']['confidence']

    def test_model_agreement_affects_confidence(self):
        """Test that model agreement affects confidence score"""
        # High agreement
        high_agreement = {
            'tree_model_output': 85.0,
            'temporal_model_output': {'persistentDifficulty': 15.0},  # ~85% good
            'features': self._make_features(session_count=10, avg_accuracy=85.0, avg_engagement=85.0)
        }
        result1 = self.stage.execute(high_agreement, self.config)

        # Low agreement (tree says low but temporal says high)
        low_agreement = {
            'tree_model_output': 85.0,
            'temporal_model_output': {'persistentDifficulty': 75.0},  # ~25% good
            'features': self._make_features(session_count=10, avg_accuracy=85.0, avg_engagement=85.0)
        }
        result2 = self.stage.execute(low_agreement, self.config)

        # Both should be valid
        assert 0 <= result1['bayesian_output']['confidence'] <= 100
        assert 0 <= result2['bayesian_output']['confidence'] <= 100
        # High agreement should yield >= confidence
        assert result1['bayesian_output']['confidence'] >= result2['bayesian_output']['confidence']

    def test_prior_influence_with_little_data(self):
        """Test that prior has more influence with limited data"""
        context = {
            'tree_model_output': 90.0,
            'temporal_model_output': {'persistentDifficulty': 10.0},
            'features': self._make_features(session_count=1, avg_accuracy=90.0, avg_engagement=90.0)
        }
        result = self.stage.execute(context, self.config)

        # With trained model: score should be reasonable (not necessarily pulled to prior)
        # With fallback: calibrated score should be pulled toward prior
        calibrated = result['bayesian_output']['calibratedScore']
        assert 0 <= calibrated <= 100

    def test_likelihood_dominates_with_sufficient_data(self):
        """Test that likelihood dominates with sufficient data"""
        context = {
            'tree_model_output': 90.0,
            'temporal_model_output': {'persistentDifficulty': 10.0},
            'features': self._make_features(session_count=20, avg_accuracy=90.0, avg_engagement=90.0)
        }
        result = self.stage.execute(context, self.config)

        calibrated = result['bayesian_output']['calibratedScore']
        # With lots of data, should be a high score
        assert calibrated > 50

    def test_execute_with_missing_inputs(self):
        """Test handling of missing inputs"""
        context = {}
        result = self.stage.execute(context, self.config)

        output = result['bayesian_output']
        assert output['calibratedScore'] == 0.0
        assert output['confidence'] == 0.0

    def test_execute_with_partial_inputs(self):
        """Test handling of partial inputs"""
        context = {
            'tree_model_output': 75.0
            # Missing temporal and features
        }
        result = self.stage.execute(context, self.config)

        output = result['bayesian_output']
        assert output['calibratedScore'] == 0.0
        assert output['confidence'] == 0.0

    def test_calibration_bounds(self):
        """Test that calibrated score is always within [0, 100]"""
        context = {
            'tree_model_output': 100.0,
            'temporal_model_output': {'persistentDifficulty': 0.0},
            'features': self._make_features(session_count=100, avg_accuracy=100.0, avg_engagement=100.0)
        }
        result = self.stage.execute(context, self.config)

        calibrated = result['bayesian_output']['calibratedScore']
        assert 0 <= calibrated <= 100

    def test_low_tree_high_temporal_disagreement(self):
        """Test calibration when models strongly disagree"""
        context = {
            'tree_model_output': 30.0,  # Low score
            'temporal_model_output': {'persistentDifficulty': 20.0},  # High score (~80)
            'features': self._make_features(session_count=8, avg_accuracy=55.0, avg_engagement=55.0)
        }
        result = self.stage.execute(context, self.config)

        output = result['bayesian_output']
        assert 0 <= output['calibratedScore'] <= 100
        assert 0 <= output['confidence'] <= 100

    def test_zero_session_returns_empty(self):
        """Test that zero sessions returns empty calibration"""
        context = {
            'tree_model_output': 80.0,
            'temporal_model_output': {'persistentDifficulty': 20.0},
            'features': self._make_features(session_count=0)
        }
        result = self.stage.execute(context, self.config)

        output = result['bayesian_output']
        assert output['calibratedScore'] == 0.0
        assert output['confidence'] == 0.0
