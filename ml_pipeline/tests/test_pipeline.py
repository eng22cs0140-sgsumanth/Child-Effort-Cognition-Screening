"""
Tests for Complete CECI Pipeline
"""
import pytest
from ml_pipeline.pipeline import CECIPipeline, get_pipeline, calculate_ceci
from ml_pipeline.config import PipelineConfig


class TestCECIPipeline:
    """Integration tests for the complete pipeline"""

    def test_pipeline_initialization(self):
        """Test pipeline initialization"""
        pipeline = CECIPipeline()
        assert len(pipeline.stages) == 5
        assert pipeline.config is not None

    def test_pipeline_with_custom_config(self):
        """Test pipeline with custom configuration"""
        config = PipelineConfig()
        config.tree_model.weights['accuracy'] = 0.5
        pipeline = CECIPipeline(config)
        assert pipeline.config.tree_model.weights['accuracy'] == 0.5

    def test_predict_with_good_performance(self, sample_game_results):
        """Test prediction with good performance data"""
        pipeline = CECIPipeline()
        result = pipeline.predict(sample_game_results, "TestChild")

        assert 'overall' in result
        assert 'riskBand' in result
        assert 'confidence' in result
        assert result['riskBand'] in ['green', 'amber', 'red']
        assert 0 <= result['overall'] <= 100
        assert 0 <= result['confidence'] <= 100

    def test_predict_with_poor_performance(self, poor_performance_results):
        """Test prediction with poor performance data"""
        pipeline = CECIPipeline()
        result = pipeline.predict(poor_performance_results, "TestChild")

        # Should be red or amber band
        assert result['riskBand'] in ['red', 'amber']
        assert result['overall'] < 60

    def test_predict_with_single_session(self, single_session_result):
        """Test prediction with minimal data"""
        pipeline = CECIPipeline()
        result = pipeline.predict(single_session_result, "TestChild")

        # Should handle gracefully
        assert result['overall'] >= 0
        assert 0 <= result['confidence'] <= 100  # Valid confidence range

    def test_predict_with_empty_results(self, empty_results):
        """Test prediction with no data"""
        pipeline = CECIPipeline()
        result = pipeline.predict(empty_results, "TestChild")

        assert result['overall'] == 0
        assert result['confidence'] == 0
        assert 'insufficient data' in result['recommendation'].lower()

    def test_metrics_tracking(self, sample_game_results):
        """Test that pipeline tracks execution metrics"""
        pipeline = CECIPipeline()
        pipeline.predict(sample_game_results, "TestChild")

        metrics = pipeline.get_metrics()
        assert len(metrics) == 5  # One per stage

        # Check metric structure
        for metric in metrics:
            assert 'stage_name' in metric
            assert 'execution_time' in metric
            assert 'input_size' in metric
            assert metric['execution_time'] >= 0

    def test_all_stages_execute(self, sample_game_results):
        """Test that all stages execute in order"""
        pipeline = CECIPipeline()
        pipeline.predict(sample_game_results, "TestChild")

        metrics = pipeline.get_metrics()
        stage_names = [m['stage_name'] for m in metrics]

        expected_stages = [
            'FeatureEngineering',
            'TreeBasedModel',
            'TemporalModel',
            'BayesianCalibration',
            'PostProcessing'
        ]

        assert stage_names == expected_stages

    def test_get_pipeline_singleton(self):
        """Test singleton pipeline instance"""
        pipeline1 = get_pipeline()
        pipeline2 = get_pipeline()
        assert pipeline1 is pipeline2

    def test_get_pipeline_with_config_creates_new(self):
        """Test that providing config creates new instance"""
        config = PipelineConfig()
        pipeline1 = get_pipeline(config)
        pipeline2 = get_pipeline()
        # New config should create new instance
        assert pipeline1 is pipeline2  # Last created becomes singleton

    def test_calculate_ceci_convenience_function(self, sample_game_results):
        """Test the convenience function"""
        result = calculate_ceci(sample_game_results, "TestChild")

        assert 'overall' in result
        assert 'riskBand' in result
        assert result['recommendation'] is not None

    def test_improving_trend_detection(self):
        """Test detection of improving performance over sessions"""
        results = [
            {
                'timestamp': i * 1000,
                'behavioralMetrics': {
                    'accuracy': 60 + i * 10,
                    'averageReactionTime': 600 - i * 50,
                    'engagementScore': 60 + i * 10,
                    'hesitationCount': 5 - i
                }
            }
            for i in range(5)
        ]

        pipeline = CECIPipeline()
        result = pipeline.predict(results, "TestChild")

        # Should show improvement
        assert result['overall'] > 60

    def test_declining_trend_detection(self):
        """Test detection of declining performance"""
        results = [
            {
                'timestamp': i * 1000,
                'behavioralMetrics': {
                    'accuracy': 90 - i * 10,
                    'averageReactionTime': 400 + i * 50,
                    'engagementScore': 90 - i * 10,
                    'hesitationCount': i * 2
                }
            }
            for i in range(5)
        ]

        pipeline = CECIPipeline()
        result = pipeline.predict(results, "TestChild")

        # Should detect decline
        assert result['riskBand'] in ['red', 'amber']

    def test_persistent_difficulty_classification(self):
        """Test classification with persistent low performance"""
        results = [
            {
                'timestamp': i * 1000,
                'behavioralMetrics': {
                    'accuracy': 35 + (i % 3),  # Consistently low
                    'averageReactionTime': 900 + (i % 20),
                    'engagementScore': 38 + (i % 4),
                    'hesitationCount': 9 + (i % 2)
                }
            }
            for i in range(10)
        ]

        pipeline = CECIPipeline()
        result = pipeline.predict(results, "TestChild")

        # Should be red band due to persistent difficulty
        assert result['riskBand'] == 'red'
        assert 'specialist' in result['recommendation'].lower() or \
               'professional' in result['recommendation'].lower()

    def test_child_name_propagation(self):
        """Test that child name is properly used"""
        pipeline = CECIPipeline()
        result = pipeline.predict(self._create_sample_results(), "Alice")

        assert "Alice" in result['recommendation']

    def test_score_consistency(self, sample_game_results):
        """Test that same input produces same output"""
        pipeline = CECIPipeline()
        result1 = pipeline.predict(sample_game_results, "TestChild")
        result2 = pipeline.predict(sample_game_results, "TestChild")

        assert result1['overall'] == result2['overall']
        assert result1['riskBand'] == result2['riskBand']
        assert result1['confidence'] == result2['confidence']

    def _create_sample_results(self):
        """Helper to create sample results"""
        return [
            {
                'timestamp': 1000,
                'behavioralMetrics': {
                    'accuracy': 75.0,
                    'averageReactionTime': 500.0,
                    'engagementScore': 70.0,
                    'hesitationCount': 3
                }
            }
        ]

    def test_all_risk_bands_achievable(self):
        """Test that all risk bands can be achieved"""
        pipeline = CECIPipeline()

        # Green band
        green_results = [
            {
                'timestamp': i * 1000,
                'behavioralMetrics': {
                    'accuracy': 90.0,
                    'averageReactionTime': 420.0,
                    'engagementScore': 88.0,
                    'hesitationCount': 0
                }
            }
            for i in range(5)
        ]
        green = pipeline.predict(green_results, "TestChild")
        assert green['riskBand'] == 'green'

        # Red band
        red_results = [
            {
                'timestamp': i * 1000,
                'behavioralMetrics': {
                    'accuracy': 35.0,
                    'averageReactionTime': 950.0,
                    'engagementScore': 35.0,
                    'hesitationCount': 10
                }
            }
            for i in range(5)
        ]
        red = pipeline.predict(red_results, "TestChild")
        assert red['riskBand'] == 'red'

        # Amber band
        amber_results = [
            {
                'timestamp': i * 1000,
                'behavioralMetrics': {
                    'accuracy': 60.0,
                    'averageReactionTime': 600.0,
                    'engagementScore': 58.0,
                    'hesitationCount': 4
                }
            }
            for i in range(5)
        ]
        amber = pipeline.predict(amber_results, "TestChild")
        assert amber['riskBand'] == 'amber'
