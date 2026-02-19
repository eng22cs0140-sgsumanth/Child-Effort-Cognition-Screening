"""
Tests for Temporal Model Stage
"""
import pytest
from ml_pipeline.stages.temporal_model import TemporalModelStage
from ml_pipeline.config import PipelineConfig


class TestTemporalModelStage:
    """Test cases for TemporalModelStage"""

    def setup_method(self):
        """Setup test instance"""
        self.stage = TemporalModelStage()
        self.config = PipelineConfig()

    def test_stage_name(self):
        """Test stage has correct name"""
        assert self.stage.name == "TemporalModel"

    def test_execute_with_improving_trend(self):
        """Test detection of improving performance"""
        features = {
            'accuracy_sequence': [70.0, 75.0, 80.0, 85.0, 90.0],
            'reaction_time_sequence': [600, 580, 560, 540, 520],
            'engagement_sequence': [70, 75, 80, 85, 90],
            'session_count': 5
        }
        context = {'features': features}
        result = self.stage.execute(context, self.config)

        output = result['temporal_model_output']
        assert output['improvementTrend'] > 0
        assert output['persistentDifficulty'] < 50  # Good performance

    def test_execute_with_declining_trend(self):
        """Test detection of declining performance"""
        features = {
            'accuracy_sequence': [90.0, 85.0, 80.0, 75.0, 70.0],
            'reaction_time_sequence': [520, 540, 560, 580, 600],
            'engagement_sequence': [90, 85, 80, 75, 70],
            'session_count': 5
        }
        context = {'features': features}
        result = self.stage.execute(context, self.config)

        output = result['temporal_model_output']
        assert output['improvementTrend'] < 0

    def test_execute_with_insufficient_sessions(self):
        """Test handling of insufficient session data"""
        features = {
            'accuracy_sequence': [75.0],
            'reaction_time_sequence': [500],
            'engagement_sequence': [70],
            'session_count': 1
        }
        context = {'features': features}
        result = self.stage.execute(context, self.config)

        output = result['temporal_model_output']
        assert output['persistentDifficulty'] == 0.0
        assert output['effortInconsistency'] == 0.0
        assert output['improvementTrend'] == 0.0

    def test_persistent_difficulty_detection(self):
        """Test detection of persistent low performance"""
        features = {
            'accuracy_sequence': [35.0, 38.0, 36.0, 37.0, 35.0],
            'reaction_time_sequence': [900, 880, 910, 890, 900],
            'engagement_sequence': [40, 42, 41, 39, 40],
            'session_count': 5
        }
        context = {'features': features}
        result = self.stage.execute(context, self.config)

        output = result['temporal_model_output']
        assert output['persistentDifficulty'] > 60  # High difficulty

    def test_volatility_scoring(self):
        """Test volatility calculation"""
        # High volatility case
        volatile_features = {
            'accuracy_sequence': [50.0, 90.0, 40.0, 85.0, 45.0],
            'reaction_time_sequence': [400, 800, 450, 750, 500],
            'engagement_sequence': [40, 90, 45, 85, 50],
            'session_count': 5
        }
        context1 = {'features': volatile_features}
        result1 = self.stage.execute(context1, self.config)

        # Low volatility case
        stable_features = {
            'accuracy_sequence': [75.0, 76.0, 74.0, 75.0, 76.0],
            'reaction_time_sequence': [500, 505, 495, 500, 505],
            'engagement_sequence': [70, 71, 69, 70, 71],
            'session_count': 5
        }
        context2 = {'features': stable_features}
        result2 = self.stage.execute(context2, self.config)

        # Volatile performance should have higher volatility score
        assert result1['temporal_model_output']['volatilityScore'] > \
               result2['temporal_model_output']['volatilityScore']

    def test_effort_inconsistency_detection(self):
        """Test effort inconsistency calculation"""
        # Inconsistent engagement
        inconsistent_features = {
            'accuracy_sequence': [70.0, 85.0, 60.0, 80.0, 65.0],
            'reaction_time_sequence': [500, 450, 600, 470, 580],
            'engagement_sequence': [40, 90, 35, 85, 45],
            'session_count': 5
        }
        context = {'features': inconsistent_features}
        result = self.stage.execute(context, self.config)

        output = result['temporal_model_output']
        assert output['effortInconsistency'] > 20  # Significant inconsistency expected

    def test_trend_bounds(self):
        """Test that improvement trend is bounded [-100, 100]"""
        features = {
            'accuracy_sequence': [0.0, 100.0],  # Extreme trend
            'reaction_time_sequence': [1000, 100],
            'engagement_sequence': [0, 100],
            'session_count': 2
        }
        context = {'features': features}
        result = self.stage.execute(context, self.config)

        trend = result['temporal_model_output']['improvementTrend']
        assert -100 <= trend <= 100

    def test_empty_features(self):
        """Test handling of missing features"""
        context = {}
        result = self.stage.execute(context, self.config)

        output = result['temporal_model_output']
        assert all(v == 0.0 for v in output.values())

    def test_consistent_high_performance(self):
        """Test handling of consistently high performance"""
        features = {
            'accuracy_sequence': [92.0, 93.0, 94.0, 93.0, 95.0],
            'reaction_time_sequence': [420, 410, 400, 415, 405],
            'engagement_sequence': [90, 92, 93, 91, 94],
            'session_count': 5
        }
        context = {'features': features}
        result = self.stage.execute(context, self.config)

        output = result['temporal_model_output']
        assert output['persistentDifficulty'] < 10
        assert output['volatilityScore'] < 15  # Low volatility
