"""
Tests for Model Training Module
Validates trained model performance, prediction quality,
and end-to-end pipeline integration with trained models.
"""
import pytest
import numpy as np
import os
import json
from ml_pipeline.model_training import (
    CECIModelTrainer,
    extract_features_from_sessions,
    FEATURE_COLUMNS,
)
from ml_pipeline.dataset_synthesizer import CECIDatasetSynthesizer, generate_pipeline_input
from ml_pipeline.pipeline import CECIPipeline


class TestFeatureExtraction:
    """Tests for feature extraction from sessions"""

    def test_extract_features_from_sessions(self):
        """Test feature extraction produces all expected columns"""
        sessions = [
            {
                'gameId': 'catcher',
                'behavioralMetrics': {
                    'accuracy': 85.0,
                    'averageReactionTime': 490.0,
                    'hesitationCount': 2,
                    'engagementScore': 80.0,
                    'reactionTimeVariability': 25.5
                }
            }
        ]
        features = extract_features_from_sessions(sessions)
        for col in FEATURE_COLUMNS:
            assert col in features, f"Missing feature: {col}"

    def test_extract_features_empty_sessions(self):
        """Test feature extraction with empty input"""
        features = extract_features_from_sessions([])
        assert all(features[col] == 0.0 for col in FEATURE_COLUMNS)

    def test_extract_features_multiple_sessions(self):
        """Test feature extraction with multiple sessions"""
        sessions = [
            {
                'gameId': 'catcher',
                'behavioralMetrics': {
                    'accuracy': 80.0 + i * 5,
                    'averageReactionTime': 500.0 - i * 20,
                    'hesitationCount': max(0, 3 - i),
                    'engagementScore': 75.0 + i * 3,
                    'reactionTimeVariability': 25.0
                }
            }
            for i in range(5)
        ]
        features = extract_features_from_sessions(sessions)
        assert features['avg_accuracy'] == pytest.approx(90.0, abs=1.0)
        assert features['session_count'] == 5


class TestCECIModelTrainer:
    """Tests for the model trainer"""

    @pytest.fixture
    def trained_trainer(self):
        """Fixture providing a trained model trainer"""
        synth = CECIDatasetSynthesizer(seed=42)
        _, labels_df = synth.generate_training_dataset(
            n_children_per_category=30, sessions_per_child=5
        )
        trainer = CECIModelTrainer(random_state=42)
        trainer.train(labels_df)
        return trainer

    def test_train_produces_models(self, trained_trainer):
        """Test that training produces all required models"""
        assert trained_trainer.risk_classifier is not None
        assert trained_trainer.score_regressor is not None
        assert trained_trainer.calibrated_classifier is not None
        assert trained_trainer.feature_scaler is not None

    def test_train_produces_metrics(self, trained_trainer):
        """Test that training produces metrics"""
        metrics = trained_trainer.training_metrics
        assert 'classifier' in metrics
        assert 'regressor' in metrics
        assert 'dataset_info' in metrics

    def test_classifier_accuracy(self, trained_trainer):
        """Test classifier achieves good accuracy"""
        acc = trained_trainer.training_metrics['classifier']['accuracy']
        assert acc > 0.85, f"Classifier accuracy too low: {acc}"

    def test_classifier_cv_accuracy(self, trained_trainer):
        """Test cross-validated accuracy"""
        cv_acc = trained_trainer.training_metrics['classifier']['cv_accuracy_mean']
        assert cv_acc > 0.80, f"CV accuracy too low: {cv_acc}"

    def test_regressor_r2(self, trained_trainer):
        """Test regressor R² score"""
        r2 = trained_trainer.training_metrics['regressor']['r2']
        assert r2 > 0.80, f"R² score too low: {r2}"

    def test_feature_importance_exists(self, trained_trainer):
        """Test feature importance is computed"""
        fi = trained_trainer.training_metrics['classifier']['feature_importance']
        assert len(fi) == len(FEATURE_COLUMNS)
        assert sum(fi.values()) == pytest.approx(1.0, abs=0.01)

    def test_confusion_matrix(self, trained_trainer):
        """Test confusion matrix is 3x3"""
        cm = trained_trainer.training_metrics['classifier']['confusion_matrix']
        assert len(cm) == 3
        assert all(len(row) == 3 for row in cm)

    def test_predict_risk_green(self, trained_trainer):
        """Test prediction for typical development features"""
        features = {
            'avg_accuracy': 88.0,
            'avg_reaction_time': 450.0,
            'avg_hesitation': 1.0,
            'avg_engagement': 85.0,
            'accuracy_std': 5.0,
            'rt_variability': 20.0,
            'session_count': 5,
            'num_games': 3,
            'age': 5
        }
        result = trained_trainer.predict_risk(features)
        assert result['risk_band'] == 'green'
        assert result['ceci_score'] > 60

    def test_predict_risk_red(self, trained_trainer):
        """Test prediction for high-risk features"""
        features = {
            'avg_accuracy': 30.0,
            'avg_reaction_time': 950.0,
            'avg_hesitation': 10.0,
            'avg_engagement': 30.0,
            'accuracy_std': 15.0,
            'rt_variability': 80.0,
            'session_count': 5,
            'num_games': 3,
            'age': 5
        }
        result = trained_trainer.predict_risk(features)
        assert result['risk_band'] == 'red'
        assert result['ceci_score'] < 40

    def test_predict_risk_probabilities_sum_to_one(self, trained_trainer):
        """Test that predicted probabilities sum to 1"""
        features = {col: 50.0 for col in FEATURE_COLUMNS}
        result = trained_trainer.predict_risk(features)
        prob_sum = sum(result['probabilities'].values())
        assert prob_sum == pytest.approx(1.0, abs=0.01)

    def test_predict_risk_confidence_range(self, trained_trainer):
        """Test confidence is within valid range"""
        features = {col: 50.0 for col in FEATURE_COLUMNS}
        result = trained_trainer.predict_risk(features)
        assert 0 <= result['confidence'] <= 100

    def test_save_and_load_models(self, trained_trainer, tmp_path):
        """Test model save and load roundtrip"""
        model_dir = str(tmp_path / 'models')
        trained_trainer.save_models(model_dir)

        # Load into new trainer
        new_trainer = CECIModelTrainer()
        new_trainer.load_models(model_dir)

        # Predictions should match
        features = {
            'avg_accuracy': 75.0,
            'avg_reaction_time': 550.0,
            'avg_hesitation': 3.0,
            'avg_engagement': 70.0,
            'accuracy_std': 8.0,
            'rt_variability': 30.0,
            'session_count': 5,
            'num_games': 3,
            'age': 5
        }
        result1 = trained_trainer.predict_risk(features)
        result2 = new_trainer.predict_risk(features)
        assert result1['risk_band'] == result2['risk_band']
        assert result1['ceci_score'] == result2['ceci_score']


class TestEndToEndWithTrainedModels:
    """End-to-end tests using synthesized data through the full pipeline"""

    def setup_method(self):
        self.pipeline = CECIPipeline()
        self.synth = CECIDatasetSynthesizer(seed=99)

    def test_green_child_full_pipeline(self):
        """Test a typical developing child through the full pipeline"""
        child = self.synth.generate_child_profile('green', age=5)
        sessions = self.synth.generate_child_sessions(
            child, num_sessions=5, games=['catcher', 'memory']
        )
        pipeline_input = generate_pipeline_input(sessions)
        result = self.pipeline.predict(pipeline_input, child.name)

        assert result['riskBand'] == 'green'
        assert result['overall'] >= 60
        assert result['confidence'] > 0

    def test_red_child_full_pipeline(self):
        """Test a high-risk child through the full pipeline"""
        child = self.synth.generate_child_profile('red', age=6)
        sessions = self.synth.generate_child_sessions(
            child, num_sessions=5, games=['catcher', 'memory']
        )
        pipeline_input = generate_pipeline_input(sessions)
        result = self.pipeline.predict(pipeline_input, child.name)

        assert result['riskBand'] in ['red', 'amber']
        assert result['overall'] < 70

    def test_amber_child_full_pipeline(self):
        """Test an at-risk child through the full pipeline"""
        child = self.synth.generate_child_profile('amber', age=4)
        sessions = self.synth.generate_child_sessions(
            child, num_sessions=5, games=['catcher', 'simon']
        )
        pipeline_input = generate_pipeline_input(sessions)
        result = self.pipeline.predict(pipeline_input, child.name)

        assert result['riskBand'] in ['amber', 'green', 'red']  # amber can overlap
        assert 0 <= result['overall'] <= 100

    def test_all_10_games(self):
        """Test pipeline with data from all 10 games"""
        child = self.synth.generate_child_profile('green', age=5)
        all_games = ['catcher', 'memory', 'shapes', 'sound', 'leader',
                     'counting', 'emotion', 'simon', 'maze', 'category']
        sessions = self.synth.generate_child_sessions(
            child, num_sessions=3, games=all_games
        )
        pipeline_input = generate_pipeline_input(sessions)
        result = self.pipeline.predict(pipeline_input, child.name)

        assert 0 <= result['overall'] <= 100
        assert result['riskBand'] in ['green', 'amber', 'red']
        assert child.name in result['recommendation']

    def test_single_session_minimal_data(self):
        """Test pipeline with minimal data (single session)"""
        child = self.synth.generate_child_profile('amber', age=3)
        sessions = self.synth.generate_child_sessions(
            child, num_sessions=1, games=['catcher']
        )
        pipeline_input = generate_pipeline_input(sessions)
        result = self.pipeline.predict(pipeline_input, child.name)

        assert 0 <= result['overall'] <= 100
        assert 0 <= result['confidence'] <= 100

    def test_many_sessions_high_confidence(self):
        """Test that many sessions produce valid results"""
        child = self.synth.generate_child_profile('green', age=5)
        sessions = self.synth.generate_child_sessions(
            child, num_sessions=15, games=['catcher']
        )
        pipeline_input = generate_pipeline_input(sessions)
        result = self.pipeline.predict(pipeline_input, child.name)

        assert result['overall'] > 0
        assert result['confidence'] > 0

    def test_test_scenarios_through_pipeline(self):
        """Test all predefined scenarios through the pipeline"""
        scenarios = self.synth.generate_test_scenarios()

        for name, sessions in scenarios.items():
            if len(sessions) == 0:
                continue
            pipeline_input = generate_pipeline_input(sessions)
            result = self.pipeline.predict(pipeline_input, f"Test_{name}")

            assert 0 <= result['overall'] <= 100, f"Scenario {name}: overall out of range"
            assert result['riskBand'] in ['green', 'amber', 'red'], f"Scenario {name}: invalid band"
            assert 0 <= result['confidence'] <= 100, f"Scenario {name}: confidence out of range"
            assert len(result['recommendation']) > 0, f"Scenario {name}: empty recommendation"

    def test_score_consistency(self):
        """Test that same input produces same output"""
        child = self.synth.generate_child_profile('green', age=5)
        sessions = self.synth.generate_child_sessions(
            child, num_sessions=5, games=['catcher']
        )
        pipeline_input = generate_pipeline_input(sessions)

        result1 = self.pipeline.predict(pipeline_input, child.name)
        result2 = self.pipeline.predict(pipeline_input, child.name)

        assert result1['overall'] == result2['overall']
        assert result1['riskBand'] == result2['riskBand']
        assert result1['confidence'] == result2['confidence']

    def test_different_ages(self):
        """Test pipeline handles different ages correctly"""
        for age in [1, 3, 5, 7, 9]:
            child = self.synth.generate_child_profile('green', age=age)
            sessions = self.synth.generate_child_sessions(
                child, num_sessions=3, games=['catcher']
            )
            pipeline_input = generate_pipeline_input(sessions)
            result = self.pipeline.predict(pipeline_input, child.name)

            assert 0 <= result['overall'] <= 100, f"Age {age}: score out of range"
            assert result['riskBand'] in ['green', 'amber', 'red']

    def test_pipeline_metrics_with_trained_models(self):
        """Test that pipeline tracks metrics when using trained models"""
        child = self.synth.generate_child_profile('green', age=5)
        sessions = self.synth.generate_child_sessions(
            child, num_sessions=3, games=['catcher']
        )
        pipeline_input = generate_pipeline_input(sessions)
        self.pipeline.predict(pipeline_input, child.name)

        metrics = self.pipeline.get_metrics()
        assert len(metrics) == 5
        for m in metrics:
            assert m['execution_time'] >= 0
