"""
Tests for Tree-Based Model Stage
"""
import pytest
from ml_pipeline.stages.tree_model import TreeBasedModelStage
from ml_pipeline.config import PipelineConfig


class TestTreeBasedModelStage:
    """Test cases for TreeBasedModelStage"""

    def setup_method(self):
        """Setup test instance"""
        self.stage = TreeBasedModelStage()
        self.config = PipelineConfig()

    def test_stage_name(self):
        """Test stage has correct name"""
        assert self.stage.name == "TreeBasedModel"

    def test_execute_with_good_features(self):
        """Test scoring with good performance features"""
        features = {
            'avg_accuracy': 90.0,
            'avg_reaction_time': 450.0,
            'avg_hesitation': 1.0,
            'avg_engagement': 85.0,
            'session_count': 5
        }
        context = {'features': features}
        result = self.stage.execute(context, self.config)

        assert 'tree_model_output' in result
        score = result['tree_model_output']
        assert 70 <= score <= 100  # Should be in green band

    def test_execute_with_poor_features(self):
        """Test scoring with poor performance features"""
        features = {
            'avg_accuracy': 40.0,
            'avg_reaction_time': 900.0,
            'avg_hesitation': 10.0,
            'avg_engagement': 35.0,
            'session_count': 5
        }
        context = {'features': features}
        result = self.stage.execute(context, self.config)

        score = result['tree_model_output']
        assert 0 <= score < 50  # Should be in red/amber band

    def test_execute_with_empty_features(self):
        """Test handling of empty features"""
        context = {'features': {'session_count': 0}}
        result = self.stage.execute(context, self.config)

        assert result['tree_model_output'] == 0.0

    def test_execute_without_features(self):
        """Test handling when features are missing"""
        context = {}
        result = self.stage.execute(context, self.config)

        assert result['tree_model_output'] == 0.0

    def test_score_bounds(self):
        """Test that score is always within [0, 100]"""
        # Test extreme values
        extreme_features = {
            'avg_accuracy': 150.0,  # Unrealistic high
            'avg_reaction_time': -100.0,  # Unrealistic low
            'avg_hesitation': 0.0,
            'avg_engagement': 120.0,  # Unrealistic high
            'session_count': 1
        }
        context = {'features': extreme_features}
        result = self.stage.execute(context, self.config)

        score = result['tree_model_output']
        assert 0 <= score <= 100

    def test_weights_influence(self):
        """Test that feature weights correctly influence score"""
        # High accuracy should have strong positive influence (35% weight)
        high_accuracy = {
            'avg_accuracy': 100.0,
            'avg_reaction_time': 500.0,
            'avg_hesitation': 5.0,
            'avg_engagement': 50.0,
            'session_count': 1
        }
        context1 = {'features': high_accuracy}
        result1 = self.stage.execute(context1, self.config)

        # Low accuracy
        low_accuracy = high_accuracy.copy()
        low_accuracy['avg_accuracy'] = 50.0
        context2 = {'features': low_accuracy}
        result2 = self.stage.execute(context2, self.config)

        # High accuracy should produce higher score
        assert result1['tree_model_output'] > result2['tree_model_output']

    def test_reaction_time_normalization(self):
        """Test reaction time scoring and normalization"""
        fast_reaction = {
            'avg_accuracy': 70.0,
            'avg_reaction_time': 200.0,  # Very fast
            'avg_hesitation': 2.0,
            'avg_engagement': 70.0,
            'session_count': 1
        }
        slow_reaction = fast_reaction.copy()
        slow_reaction['avg_reaction_time'] = 1000.0  # Very slow

        result1 = self.stage.execute({'features': fast_reaction}, self.config)
        result2 = self.stage.execute({'features': slow_reaction}, self.config)

        # Fast reaction should score higher
        assert result1['tree_model_output'] > result2['tree_model_output']

    def test_hesitation_penalty(self):
        """Test hesitation penalty application"""
        low_hesitation = {
            'avg_accuracy': 70.0,
            'avg_reaction_time': 500.0,
            'avg_hesitation': 0.0,
            'avg_engagement': 70.0,
            'session_count': 1
        }
        high_hesitation = low_hesitation.copy()
        high_hesitation['avg_hesitation'] = 10.0

        result1 = self.stage.execute({'features': low_hesitation}, self.config)
        result2 = self.stage.execute({'features': high_hesitation}, self.config)

        # Low hesitation should score higher
        assert result1['tree_model_output'] > result2['tree_model_output']
