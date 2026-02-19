"""
Tests for Data Validation and Preprocessing
"""
import pytest
from ml_pipeline.validation import (
    DataValidator,
    DataQualityChecker,
    validate_and_preprocess
)


class TestDataValidator:
    """Test cases for DataValidator"""

    def test_validate_valid_results(self, sample_game_results):
        """Test validation with valid data"""
        is_valid, errors = DataValidator.validate_game_results(sample_game_results)
        assert is_valid
        assert len(errors) == 0

    def test_validate_empty_results(self):
        """Test validation with empty list"""
        is_valid, errors = DataValidator.validate_game_results([])
        assert not is_valid
        assert len(errors) > 0
        assert 'empty' in errors[0].lower()

    def test_validate_non_list_input(self):
        """Test validation with non-list input"""
        is_valid, errors = DataValidator.validate_game_results("not a list")
        assert not is_valid
        assert 'must be a list' in errors[0].lower()

    def test_validate_missing_required_fields(self):
        """Test validation with missing required fields"""
        invalid_results = [
            {'gameId': 'test'}  # Missing score and timestamp
        ]
        is_valid, errors = DataValidator.validate_game_results(invalid_results)
        assert not is_valid
        assert any('score' in e.lower() for e in errors)
        assert any('timestamp' in e.lower() for e in errors)

    def test_validate_invalid_timestamp(self):
        """Test validation with invalid timestamp"""
        invalid_results = [
            {
                'gameId': 'test',
                'score': 80,
                'timestamp': -1000  # Negative timestamp
            }
        ]
        is_valid, errors = DataValidator.validate_game_results(invalid_results)
        assert not is_valid
        assert any('timestamp' in e.lower() and 'negative' in e.lower() for e in errors)

    def test_validate_behavioral_metrics_range(self):
        """Test validation of behavioral metrics ranges"""
        invalid_results = [
            {
                'gameId': 'test',
                'score': 80,
                'timestamp': 1000,
                'behavioralMetrics': {
                    'accuracy': 150.0,  # > 100
                    'averageReactionTime': -10.0,  # < 0
                    'hesitationCount': 5,
                    'engagementScore': 70.0
                }
            }
        ]
        is_valid, errors = DataValidator.validate_game_results(invalid_results)
        assert not is_valid
        assert any('accuracy' in e.lower() for e in errors)
        assert any('averagereactiontime' in e.lower() for e in errors)

    def test_validate_missing_behavioral_fields(self):
        """Test validation with missing behavioral metric fields"""
        invalid_results = [
            {
                'gameId': 'test',
                'score': 80,
                'timestamp': 1000,
                'behavioralMetrics': {
                    'accuracy': 75.0
                    # Missing other required fields
                }
            }
        ]
        is_valid, errors = DataValidator.validate_game_results(invalid_results)
        assert not is_valid
        assert len(errors) > 0

    def test_preprocess_empty_results(self):
        """Test preprocessing with empty input"""
        processed = DataValidator.preprocess_results([])
        assert processed == []

    def test_preprocess_sorts_by_timestamp(self):
        """Test that preprocessing sorts results by timestamp"""
        unsorted_results = [
            {'timestamp': 3000, 'gameId': 'test', 'score': 80},
            {'timestamp': 1000, 'gameId': 'test', 'score': 75},
            {'timestamp': 2000, 'gameId': 'test', 'score': 85}
        ]
        processed = DataValidator.preprocess_results(unsorted_results)
        timestamps = [r['timestamp'] for r in processed]
        assert timestamps == [1000, 2000, 3000]

    def test_preprocess_clamps_scores(self):
        """Test that preprocessing clamps scores to valid range"""
        results = [
            {'timestamp': 1000, 'gameId': 'test', 'score': 150},  # > 100
            {'timestamp': 2000, 'gameId': 'test', 'score': -10}   # < 0
        ]
        processed = DataValidator.preprocess_results(results)
        assert processed[0]['score'] == 100
        assert processed[1]['score'] == 0

    def test_preprocess_clamps_behavioral_metrics(self):
        """Test that preprocessing clamps behavioral metrics"""
        results = [
            {
                'timestamp': 1000,
                'gameId': 'test',
                'score': 80,
                'behavioralMetrics': {
                    'accuracy': 150.0,
                    'engagementScore': -10.0,
                    'averageReactionTime': -100.0,
                    'hesitationCount': -5
                }
            }
        ]
        processed = DataValidator.preprocess_results(results)
        metrics = processed[0]['behavioralMetrics']
        assert metrics['accuracy'] == 100.0
        assert metrics['engagementScore'] == 0.0
        assert metrics['averageReactionTime'] == 0.0
        assert metrics['hesitationCount'] == 0

    def test_preprocess_filters_invalid_results(self):
        """Test that preprocessing filters out completely invalid results"""
        results = [
            {'timestamp': 1000, 'gameId': 'test', 'score': 80},
            {'gameId': 'test', 'score': 75},  # Missing timestamp
            {'timestamp': 2000, 'gameId': 'test', 'score': 85}
        ]
        processed = DataValidator.preprocess_results(results)
        assert len(processed) == 2


class TestDataQualityChecker:
    """Test cases for DataQualityChecker"""

    def test_quality_check_empty_data(self):
        """Test quality check with empty data"""
        report = DataQualityChecker.check_data_quality([])
        assert not report['has_data']
        assert report['session_count'] == 0
        assert report['quality_score'] == 0
        assert len(report['warnings']) > 0

    def test_quality_check_sufficient_sessions(self, sample_game_results):
        """Test quality check with sufficient sessions"""
        report = DataQualityChecker.check_data_quality(sample_game_results)
        assert report['has_data']
        assert report['session_count'] == 3
        assert report['quality_score'] > 50

    def test_quality_check_insufficient_sessions(self, single_session_result):
        """Test quality check warns about insufficient sessions"""
        report = DataQualityChecker.check_data_quality(single_session_result)
        assert any('session' in w.lower() for w in report['warnings'])

    def test_quality_check_missing_metrics(self):
        """Test quality check detects missing behavioral metrics"""
        results = [
            {'timestamp': 1000, 'gameId': 'test', 'score': 80},
            {'timestamp': 2000, 'gameId': 'test', 'score': 85}
        ]
        report = DataQualityChecker.check_data_quality(results)
        assert report['has_behavioral_metrics'] == 0
        assert any('metrics' in w.lower() for w in report['warnings'])

    def test_quality_check_completeness(self, sample_game_results):
        """Test quality check calculates completeness"""
        report = DataQualityChecker.check_data_quality(sample_game_results)
        assert 'completeness' in report
        assert 0 <= report['completeness'] <= 1
        assert report['completeness'] == 1.0  # All samples have complete data

    def test_quality_score_increases_with_sessions(self):
        """Test that quality score increases with more sessions"""
        few_sessions = [
            {
                'timestamp': i * 1000,
                'gameId': 'test',
                'score': 80,
                'behavioralMetrics': {
                    'accuracy': 80.0,
                    'averageReactionTime': 500.0,
                    'hesitationCount': 2,
                    'engagementScore': 75.0
                }
            }
            for i in range(2)
        ]
        many_sessions = [
            {
                'timestamp': i * 1000,
                'gameId': 'test',
                'score': 80,
                'behavioralMetrics': {
                    'accuracy': 80.0,
                    'averageReactionTime': 500.0,
                    'hesitationCount': 2,
                    'engagementScore': 75.0
                }
            }
            for i in range(10)
        ]

        report_few = DataQualityChecker.check_data_quality(few_sessions)
        report_many = DataQualityChecker.check_data_quality(many_sessions)

        assert report_many['quality_score'] > report_few['quality_score']


class TestValidateAndPreprocess:
    """Test cases for convenience function"""

    def test_validate_and_preprocess_valid_data(self, sample_game_results):
        """Test with valid data"""
        processed, report = validate_and_preprocess(sample_game_results)
        assert len(processed) == 3
        assert report['has_data']
        assert report['quality_score'] > 0

    def test_validate_and_preprocess_invalid_strict(self):
        """Test strict mode raises exception on invalid data"""
        invalid_results = [
            {'gameId': 'test'}  # Missing required fields
        ]
        with pytest.raises(ValueError):
            validate_and_preprocess(invalid_results, strict=True)

    def test_validate_and_preprocess_invalid_lenient(self):
        """Test lenient mode continues with warnings"""
        invalid_results = [
            {
                'timestamp': 1000,
                'gameId': 'test',
                'score': 150,  # Will be clamped
                'behavioralMetrics': {
                    'accuracy': 200.0  # Will be clamped
                }
            }
        ]
        processed, report = validate_and_preprocess(invalid_results, strict=False)
        assert len(processed) >= 0  # Should not raise exception

    def test_validate_and_preprocess_cleans_data(self):
        """Test that function both validates and preprocesses"""
        results = [
            {
                'timestamp': 2000,
                'gameId': 'test',
                'score': 150,  # Should be clamped
                'behavioralMetrics': {
                    'accuracy': 80.0,
                    'averageReactionTime': 500.0,
                    'hesitationCount': 2,
                    'engagementScore': 75.0
                }
            },
            {
                'timestamp': 1000,
                'gameId': 'test',
                'score': 80,
                'behavioralMetrics': {
                    'accuracy': 75.0,
                    'averageReactionTime': 550.0,
                    'hesitationCount': 3,
                    'engagementScore': 70.0
                }
            }
        ]
        processed, report = validate_and_preprocess(results)

        # Should be sorted
        assert processed[0]['timestamp'] < processed[1]['timestamp']

        # Should be clamped
        assert processed[1]['score'] == 100

        # Should have quality report
        assert report['session_count'] == 2
