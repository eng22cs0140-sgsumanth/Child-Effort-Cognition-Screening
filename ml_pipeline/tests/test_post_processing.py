"""
Tests for Post-Processing Stage
"""
import pytest
from ml_pipeline.stages.post_processing import PostProcessingStage
from ml_pipeline.config import PipelineConfig


class TestPostProcessingStage:
    """Test cases for PostProcessingStage"""

    def setup_method(self):
        """Setup test instance"""
        self.stage = PostProcessingStage()
        self.config = PipelineConfig()

    def _make_context(self, tree_output, temporal_output, bayesian_output, child_name='TestChild'):
        """Helper to build a well-formed context dict"""
        return {
            'tree_model_output': tree_output,
            'temporal_model_output': temporal_output,
            'bayesian_output': bayesian_output,
            'child_name': child_name,
            # features included so post-processing can inspect if needed
            'features': {'session_count': 5},
        }

    def test_stage_name(self):
        """Test stage has correct name"""
        assert self.stage.name == "PostProcessing"

    def test_execute_green_band(self):
        """Test classification into green risk band"""
        context = self._make_context(
            tree_output=85.0,
            temporal_output={
                'persistentDifficulty': 15.0,
                'effortInconsistency': 20.0,
                'improvementTrend': 25.0
            },
            bayesian_output={
                'calibratedScore': 82.0,
                'confidence': 75.0
            }
        )
        result = self.stage.execute(context, self.config)

        score = result['final_score']
        assert score['riskBand'] == 'green'
        assert score['overall'] >= 70
        assert 'developing typically' in score['recommendation'].lower() or \
               'excellent progress' in score['recommendation'].lower()

    def test_execute_amber_band(self):
        """Test classification into amber risk band"""
        context = self._make_context(
            tree_output=60.0,
            temporal_output={
                'persistentDifficulty': 45.0,
                'effortInconsistency': 55.0,
                'improvementTrend': -5.0
            },
            bayesian_output={
                'calibratedScore': 58.0,
                'confidence': 50.0
            }
        )
        result = self.stage.execute(context, self.config)

        score = result['final_score']
        assert score['riskBand'] == 'amber'
        assert 40 <= score['overall'] < 70
        assert 'monitor' in score['recommendation'].lower()

    def test_execute_red_band(self):
        """Test classification into red risk band"""
        context = self._make_context(
            tree_output=35.0,
            temporal_output={
                'persistentDifficulty': 70.0,
                'effortInconsistency': 40.0,
                'improvementTrend': -15.0
            },
            bayesian_output={
                'calibratedScore': 32.0,
                'confidence': 60.0
            }
        )
        result = self.stage.execute(context, self.config)

        score = result['final_score']
        assert score['riskBand'] == 'red'
        assert score['overall'] < 40
        assert 'specialist' in score['recommendation'].lower() or \
               'professional' in score['recommendation'].lower()

    def test_persistent_difficulty_overrides_score(self):
        """Test that high persistent difficulty can override good scores"""
        context = self._make_context(
            tree_output=60.0,
            temporal_output={
                'persistentDifficulty': 65.0,  # High persistent difficulty
                'effortInconsistency': 30.0,
                'improvementTrend': -25.0  # Declining
            },
            bayesian_output={
                'calibratedScore': 58.0,
                'confidence': 70.0
            }
        )
        result = self.stage.execute(context, self.config)

        # Should be classified as red due to persistent difficulty
        assert result['final_score']['riskBand'] == 'red'

    def test_low_confidence_amber_classification(self):
        """Test that low confidence with borderline scores yields amber"""
        context = self._make_context(
            tree_output=55.0,
            temporal_output={
                'persistentDifficulty': 40.0,
                'effortInconsistency': 45.0,
                'improvementTrend': 5.0
            },
            bayesian_output={
                'calibratedScore': 54.0,
                'confidence': 35.0  # Low confidence
            }
        )
        result = self.stage.execute(context, self.config)

        # Low confidence with borderline score should be amber
        assert result['final_score']['riskBand'] == 'amber'

    def test_improvement_recommendation(self):
        """Test recommendation with strong improvement trend"""
        context = self._make_context(
            tree_output=85.0,
            temporal_output={
                'persistentDifficulty': 12.0,
                'effortInconsistency': 18.0,
                'improvementTrend': 30.0  # Strong improvement
            },
            bayesian_output={
                'calibratedScore': 83.0,
                'confidence': 80.0
            }
        )
        result = self.stage.execute(context, self.config)

        recommendation = result['final_score']['recommendation']
        assert 'excellent progress' in recommendation.lower() or \
               'improving consistently' in recommendation.lower()

    def test_inconsistency_recommendation(self):
        """Test recommendation highlighting effort inconsistency"""
        context = self._make_context(
            tree_output=58.0,
            temporal_output={
                'persistentDifficulty': 38.0,
                'effortInconsistency': 65.0,  # High inconsistency
                'improvementTrend': 0.0
            },
            bayesian_output={
                'calibratedScore': 60.0,
                'confidence': 55.0
            }
        )
        result = self.stage.execute(context, self.config)

        recommendation = result['final_score']['recommendation']
        assert 'variability' in recommendation.lower() or \
               'inconsistent' in recommendation.lower()

    def test_execute_with_missing_inputs(self):
        """Test handling of missing inputs"""
        context = {}
        result = self.stage.execute(context, self.config)

        score = result['final_score']
        assert score['overall'] == 0
        assert score['riskBand'] == 'amber'
        assert score['confidence'] == 0
        assert 'insufficient data' in score['recommendation'].lower()

    def test_child_name_in_recommendation(self):
        """Test that child name is included in recommendation"""
        context = self._make_context(
            tree_output=75.0,
            temporal_output={
                'persistentDifficulty': 25.0,
                'effortInconsistency': 20.0,
                'improvementTrend': 10.0
            },
            bayesian_output={
                'calibratedScore': 74.0,
                'confidence': 70.0
            },
            child_name='Alice'
        )
        result = self.stage.execute(context, self.config)

        assert 'Alice' in result['final_score']['recommendation']

    def test_score_components_rounded(self):
        """Test that all score components are properly rounded"""
        context = self._make_context(
            tree_output=85.7,
            temporal_output={
                'persistentDifficulty': 15.3,
                'effortInconsistency': 20.8,
                'improvementTrend': 12.4
            },
            bayesian_output={
                'calibratedScore': 82.6,
                'confidence': 75.9
            }
        )
        result = self.stage.execute(context, self.config)

        score = result['final_score']
        # All values should be integers
        assert isinstance(score['overall'], int)
        assert isinstance(score['confidence'], int)
        assert isinstance(score['treeBasedScore'], int)
        assert isinstance(score['temporalScore'], int)
        assert isinstance(score['bayesianCalibration'], int)

    def test_fusion_weights(self):
        """Test that fusion properly combines model outputs"""
        context = self._make_context(
            tree_output=90.0,
            temporal_output={
                'persistentDifficulty': 10.0,  # = 90 temporal score
                'effortInconsistency': 20.0,
                'improvementTrend': 15.0
            },
            bayesian_output={
                'calibratedScore': 90.0,
                'confidence': 80.0
            }
        )
        result = self.stage.execute(context, self.config)

        # With all models agreeing at ~90, overall should be close to 90
        overall = result['final_score']['overall']
        assert 85 <= overall <= 95
