"""
Pytest configuration and fixtures for ML Pipeline tests
"""
import pytest
from typing import List, Dict, Any


@pytest.fixture
def sample_game_results() -> List[Dict[str, Any]]:
    """Sample game results for testing"""
    return [
        {
            'gameId': 'reaction-catcher',
            'score': 85,
            'timestamp': 1640000000000,
            'sessionNumber': 1,
            'behavioralMetrics': {
                'reactionTimes': [450, 520, 480, 510, 490],
                'accuracy': 85.0,
                'hesitationCount': 2,
                'engagementScore': 80.0,
                'correctAttempts': 17,
                'incorrectAttempts': 3,
                'averageReactionTime': 490.0,
                'reactionTimeVariability': 25.5
            }
        },
        {
            'gameId': 'reaction-catcher',
            'score': 88,
            'timestamp': 1640086400000,
            'sessionNumber': 2,
            'behavioralMetrics': {
                'reactionTimes': [430, 500, 460, 490, 470],
                'accuracy': 88.0,
                'hesitationCount': 1,
                'engagementScore': 85.0,
                'correctAttempts': 22,
                'incorrectAttempts': 3,
                'averageReactionTime': 470.0,
                'reactionTimeVariability': 22.1
            }
        },
        {
            'gameId': 'reaction-catcher',
            'score': 92,
            'timestamp': 1640172800000,
            'sessionNumber': 3,
            'behavioralMetrics': {
                'reactionTimes': [410, 480, 440, 470, 450],
                'accuracy': 92.0,
                'hesitationCount': 0,
                'engagementScore': 90.0,
                'correctAttempts': 23,
                'incorrectAttempts': 2,
                'averageReactionTime': 450.0,
                'reactionTimeVariability': 24.8
            }
        }
    ]


@pytest.fixture
def poor_performance_results() -> List[Dict[str, Any]]:
    """Sample results showing poor performance"""
    return [
        {
            'gameId': 'reaction-catcher',
            'score': 45,
            'timestamp': 1640000000000,
            'sessionNumber': 1,
            'behavioralMetrics': {
                'reactionTimes': [850, 920, 880, 910, 890],
                'accuracy': 45.0,
                'hesitationCount': 8,
                'engagementScore': 40.0,
                'correctAttempts': 9,
                'incorrectAttempts': 11,
                'averageReactionTime': 890.0,
                'reactionTimeVariability': 28.3
            }
        },
        {
            'gameId': 'reaction-catcher',
            'score': 42,
            'timestamp': 1640086400000,
            'sessionNumber': 2,
            'behavioralMetrics': {
                'reactionTimes': [870, 940, 900, 930, 910],
                'accuracy': 42.0,
                'hesitationCount': 9,
                'engagementScore': 38.0,
                'correctAttempts': 8,
                'incorrectAttempts': 11,
                'averageReactionTime': 910.0,
                'reactionTimeVariability': 27.1
            }
        },
        {
            'gameId': 'reaction-catcher',
            'score': 40,
            'timestamp': 1640172800000,
            'sessionNumber': 3,
            'behavioralMetrics': {
                'reactionTimes': [890, 960, 920, 950, 930],
                'accuracy': 40.0,
                'hesitationCount': 10,
                'engagementScore': 35.0,
                'correctAttempts': 8,
                'incorrectAttempts': 12,
                'averageReactionTime': 930.0,
                'reactionTimeVariability': 29.8
            }
        }
    ]


@pytest.fixture
def single_session_result() -> List[Dict[str, Any]]:
    """Single session for testing minimum data scenarios"""
    return [
        {
            'gameId': 'reaction-catcher',
            'score': 75,
            'timestamp': 1640000000000,
            'sessionNumber': 1,
            'behavioralMetrics': {
                'reactionTimes': [500, 550, 520, 540, 530],
                'accuracy': 75.0,
                'hesitationCount': 3,
                'engagementScore': 70.0,
                'correctAttempts': 15,
                'incorrectAttempts': 5,
                'averageReactionTime': 528.0,
                'reactionTimeVariability': 18.7
            }
        }
    ]


@pytest.fixture
def empty_results() -> List[Dict[str, Any]]:
    """Empty results for edge case testing"""
    return []
