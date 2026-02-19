"""
Tests for Dataset Synthesizer
Validates that synthesized data matches expected schemas,
distributions, and game-specific parameters.
"""
import pytest
import numpy as np
from ml_pipeline.dataset_synthesizer import (
    CECIDatasetSynthesizer,
    GAME_CONFIGS,
    generate_pipeline_input
)


class TestCECIDatasetSynthesizer:
    """Tests for the dataset synthesizer"""

    def setup_method(self):
        self.synth = CECIDatasetSynthesizer(seed=42)

    def test_generate_child_profile_green(self):
        """Test green risk child profile generation"""
        child = self.synth.generate_child_profile('green', age=5)
        assert child.risk_category == 'green'
        assert child.age == 5
        assert child.child_id.startswith('child_')
        assert len(child.name) > 0

    def test_generate_child_profile_amber(self):
        """Test amber risk child profile generation"""
        child = self.synth.generate_child_profile('amber')
        assert child.risk_category == 'amber'
        assert 1 <= child.age <= 8

    def test_generate_child_profile_red(self):
        """Test red risk child profile generation"""
        child = self.synth.generate_child_profile('red', age=3)
        assert child.risk_category == 'red'
        assert child.age == 3

    def test_unique_child_ids(self):
        """Test that each child gets a unique ID"""
        ids = set()
        for _ in range(50):
            child = self.synth.generate_child_profile('green')
            ids.add(child.child_id)
        assert len(ids) == 50

    def test_session_schema(self):
        """Test that generated sessions match the expected schema"""
        child = self.synth.generate_child_profile('green', age=5)
        sessions = self.synth.generate_child_sessions(child, num_sessions=3, games=['catcher'])

        for session in sessions:
            assert 'gameId' in session
            assert 'score' in session
            assert 'timestamp' in session
            assert 'sessionNumber' in session
            assert 'behavioralMetrics' in session

            metrics = session['behavioralMetrics']
            assert 'reactionTimes' in metrics
            assert 'accuracy' in metrics
            assert 'hesitationCount' in metrics
            assert 'engagementScore' in metrics
            assert 'correctAttempts' in metrics
            assert 'incorrectAttempts' in metrics
            assert 'averageReactionTime' in metrics
            assert 'reactionTimeVariability' in metrics

    def test_session_value_ranges(self):
        """Test that session values are within valid ranges"""
        child = self.synth.generate_child_profile('green', age=5)
        sessions = self.synth.generate_child_sessions(child, num_sessions=5, games=['catcher'])

        for session in sessions:
            assert 0 <= session['score'] <= 100
            assert session['timestamp'] > 0
            assert session['sessionNumber'] >= 1

            metrics = session['behavioralMetrics']
            assert 0 <= metrics['accuracy'] <= 100
            assert 0 <= metrics['engagementScore'] <= 100
            assert metrics['hesitationCount'] >= 0
            assert metrics['averageReactionTime'] > 0
            assert metrics['reactionTimeVariability'] >= 0
            assert metrics['correctAttempts'] >= 0
            assert metrics['incorrectAttempts'] >= 0
            assert all(rt > 0 for rt in metrics['reactionTimes'])

    def test_timestamps_are_ordered(self):
        """Test that sessions are ordered by timestamp"""
        child = self.synth.generate_child_profile('green', age=5)
        sessions = self.synth.generate_child_sessions(child, num_sessions=5, games=['catcher'])

        timestamps = [s['timestamp'] for s in sessions]
        assert timestamps == sorted(timestamps)

    def test_green_higher_accuracy_than_red(self):
        """Test that green children have higher accuracy on average"""
        green = self.synth.generate_child_profile('green', age=5)
        red = self.synth.generate_child_profile('red', age=5)

        green_sessions = self.synth.generate_child_sessions(green, num_sessions=10, games=['catcher'])
        red_sessions = self.synth.generate_child_sessions(red, num_sessions=10, games=['catcher'])

        green_acc = np.mean([s['behavioralMetrics']['accuracy'] for s in green_sessions])
        red_acc = np.mean([s['behavioralMetrics']['accuracy'] for s in red_sessions])

        assert green_acc > red_acc

    def test_red_higher_hesitation_than_green(self):
        """Test that red children have more hesitation on average"""
        green = self.synth.generate_child_profile('green', age=5)
        red = self.synth.generate_child_profile('red', age=5)

        green_sessions = self.synth.generate_child_sessions(green, num_sessions=10, games=['catcher'])
        red_sessions = self.synth.generate_child_sessions(red, num_sessions=10, games=['catcher'])

        green_hes = np.mean([s['behavioralMetrics']['hesitationCount'] for s in green_sessions])
        red_hes = np.mean([s['behavioralMetrics']['hesitationCount'] for s in red_sessions])

        assert red_hes > green_hes

    def test_all_games_configurable(self):
        """Test that all 10 games are properly configured"""
        expected_games = ['catcher', 'memory', 'shapes', 'sound', 'leader',
                         'counting', 'emotion', 'simon', 'maze', 'category']
        assert set(GAME_CONFIGS.keys()) == set(expected_games)

    def test_game_session_durations(self):
        """Test that each game has a defined session duration"""
        for gid, config in GAME_CONFIGS.items():
            assert config.session_duration_seconds > 0, f"{gid} missing duration"
            assert config.min_items_per_session > 0, f"{gid} missing min items"
            assert config.max_items_per_session >= config.min_items_per_session

    def test_game_age_ranges(self):
        """Test that all games have valid age ranges"""
        for gid, config in GAME_CONFIGS.items():
            assert config.age_range[0] >= 0
            assert config.age_range[1] >= config.age_range[0]
            assert config.age_range[1] <= 9

    def test_generate_training_dataset(self):
        """Test full training dataset generation"""
        dataset, labels_df = self.synth.generate_training_dataset(
            n_children_per_category=10, sessions_per_child=3
        )

        assert len(dataset) == 30  # 10 * 3 categories
        assert len(labels_df) == 30
        assert set(labels_df['risk_category'].unique()) == {'green', 'amber', 'red'}

    def test_training_labels_features(self):
        """Test that training labels contain all expected features"""
        _, labels_df = self.synth.generate_training_dataset(
            n_children_per_category=5, sessions_per_child=3
        )

        expected_cols = [
            'child_id', 'age', 'risk_category', 'risk_label',
            'avg_accuracy', 'avg_reaction_time', 'avg_hesitation',
            'avg_engagement', 'accuracy_std', 'rt_variability',
            'session_count', 'num_games'
        ]
        for col in expected_cols:
            assert col in labels_df.columns, f"Missing column: {col}"

    def test_generate_test_scenarios(self):
        """Test that test scenarios are generated"""
        scenarios = self.synth.generate_test_scenarios()

        expected_scenarios = [
            'typical_development', 'improving_child', 'persistent_difficulty',
            'single_session', 'high_variability', 'very_young_typical',
            'older_at_risk', 'comprehensive_all_games',
            'declining_performance', 'perfect_performer'
        ]
        for name in expected_scenarios:
            assert name in scenarios, f"Missing scenario: {name}"
            assert len(scenarios[name]) > 0, f"Empty scenario: {name}"

    def test_pipeline_input_conversion(self):
        """Test conversion to pipeline input format"""
        child = self.synth.generate_child_profile('green', age=5)
        sessions = self.synth.generate_child_sessions(child, num_sessions=3, games=['catcher'])
        pipeline_input = generate_pipeline_input(sessions)

        for item in pipeline_input:
            assert 'gameId' in item
            assert 'score' in item
            assert 'timestamp' in item
            assert 'behavioralMetrics' in item

    def test_reproducibility(self):
        """Test that same seed produces same data"""
        synth1 = CECIDatasetSynthesizer(seed=42)
        synth2 = CECIDatasetSynthesizer(seed=42)

        child1 = synth1.generate_child_profile('green', age=5)
        child2 = synth2.generate_child_profile('green', age=5)

        sessions1 = synth1.generate_child_sessions(child1, num_sessions=3, games=['catcher'])
        sessions2 = synth2.generate_child_sessions(child2, num_sessions=3, games=['catcher'])

        for s1, s2 in zip(sessions1, sessions2):
            assert s1['score'] == s2['score']
            assert s1['behavioralMetrics']['accuracy'] == s2['behavioralMetrics']['accuracy']

    def test_age_appropriate_game_selection(self):
        """Test that only age-appropriate games are selected"""
        child = self.synth.generate_child_profile('green', age=1)
        sessions = self.synth.generate_child_sessions(child, num_sessions=3)

        game_ids = set(s['gameId'] for s in sessions)
        for gid in game_ids:
            config = GAME_CONFIGS[gid]
            assert config.age_range[0] <= 1 <= config.age_range[1], \
                f"Game {gid} not age-appropriate for age 1"


class TestGameConfigs:
    """Tests for game configuration parameters"""

    def test_catcher_config(self):
        """Test Reaction Catcher game config"""
        config = GAME_CONFIGS['catcher']
        assert config.session_duration_seconds == 30
        assert config.badge == 'Attention'
        assert config.age_range == (0, 9)

    def test_memory_config(self):
        """Test Pattern Memory game config"""
        config = GAME_CONFIGS['memory']
        assert config.session_duration_seconds == 90
        assert config.badge == 'Cognitive'

    def test_simon_config(self):
        """Test Simon Says game config"""
        config = GAME_CONFIGS['simon']
        assert config.session_duration_seconds == 50
        assert config.badge == 'Attention'

    def test_leader_config(self):
        """Test Follow the Leader game config"""
        config = GAME_CONFIGS['leader']
        assert config.session_duration_seconds == 45
        assert config.badge == 'Social'

    def test_all_games_have_reaction_time_range(self):
        """Test all games have valid reaction time ranges"""
        for gid, config in GAME_CONFIGS.items():
            low, high = config.typical_reaction_time_range
            assert low > 0
            assert high > low
            assert config.at_risk_reaction_time_multiplier > 1.0
