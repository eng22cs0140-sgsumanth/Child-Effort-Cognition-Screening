"""
Tests for Feature Engineering Stage
"""
import pytest
from ml_pipeline.stages.feature_engineering import FeatureEngineeringStage
from ml_pipeline.config import PipelineConfig


class TestFeatureEngineeringStage:
    """Test cases for FeatureEngineeringStage"""

    def setup_method(self):
        """Setup test instance"""
        self.stage = FeatureEngineeringStage()
        self.config = PipelineConfig()

    def test_stage_name(self):
        """Test stage has correct name"""
        assert self.stage.name == "FeatureEngineering"

    def test_execute_with_valid_data(self, sample_game_results):
        """Test feature extraction from valid game results"""
        context = {'raw_data': sample_game_results}
        result = self.stage.execute(context, self.config)

        assert 'features' in result
        features = result['features']

        # Check all required features exist
        assert 'avg_accuracy' in features
        assert 'avg_reaction_time' in features
        assert 'avg_hesitation' in features
        assert 'avg_engagement' in features
        assert 'accuracy_trend' in features
        assert 'session_count' in features

        # Validate feature values
        assert features['session_count'] == 3
        assert 80 < features['avg_accuracy'] < 95
        assert features['accuracy_trend'] > 0  # Improving trend

    def test_execute_with_empty_data(self, empty_results):
        """Test handling of empty input"""
        context = {'raw_data': empty_results}
        result = self.stage.execute(context, self.config)

        assert 'features' in result
        features = result['features']
        assert features['session_count'] == 0
        assert features['avg_accuracy'] == 0.0

    def test_execute_with_single_session(self, single_session_result):
        """Test with minimum data (single session)"""
        context = {'raw_data': single_session_result}
        result = self.stage.execute(context, self.config)

        features = result['features']
        assert features['session_count'] == 1
        assert features['avg_accuracy'] == 75.0
        assert features['accuracy_trend'] == 0.0  # No trend with single session

    def test_improvement_rate_calculation(self, sample_game_results):
        """Test improvement rate calculation"""
        context = {'raw_data': sample_game_results}
        result = self.stage.execute(context, self.config)

        features = result['features']
        # Accuracy improves from 85 to 92, so improvement rate should be positive
        assert features['improvement_rate'] > 0

    def test_consistency_score(self, sample_game_results):
        """Test consistency score calculation"""
        context = {'raw_data': sample_game_results}
        result = self.stage.execute(context, self.config)

        features = result['features']
        # Should have reasonable consistency
        assert 0 <= features['consistency_score'] <= 100

    def test_temporal_sequences_preserved(self, sample_game_results):
        """Test that temporal sequences are correctly extracted"""
        context = {'raw_data': sample_game_results}
        result = self.stage.execute(context, self.config)

        features = result['features']
        assert len(features['accuracy_sequence']) == 3
        assert len(features['reaction_time_sequence']) == 3
        assert len(features['engagement_sequence']) == 3

        # Verify ordering (should be sorted by timestamp)
        assert features['accuracy_sequence'] == [85.0, 88.0, 92.0]

    def test_volatility_calculation(self, sample_game_results):
        """Test volatility score calculation"""
        context = {'raw_data': sample_game_results}
        result = self.stage.execute(context, self.config)

        features = result['features']
        assert features['volatility'] >= 0

    def test_declining_performance(self):
        """Test feature extraction with declining performance"""
        declining_results = [
            {
                'timestamp': i,
                'behavioralMetrics': {
                    'accuracy': 90 - i * 10,
                    'averageReactionTime': 500 + i * 50,
                    'engagementScore': 85 - i * 5,
                    'hesitationCount': i
                }
            }
            for i in range(3)
        ]

        context = {'raw_data': declining_results}
        result = self.stage.execute(context, self.config)

        features = result['features']
        assert features['accuracy_trend'] < 0  # Negative trend
        assert features['improvement_rate'] < 0
