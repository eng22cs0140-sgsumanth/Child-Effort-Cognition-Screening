"""
Model Training Module for CECI Assessment System

Trains actual ML models:
1. Random Forest classifier for risk band prediction
2. Gradient Boosting regressor for CECI score estimation
3. Temporal feature extractor with statistical methods
4. Bayesian calibrator using logistic regression with probability calibration

All models are trained on synthesized data and saved as joblib artifacts.
"""

import numpy as np
import pandas as pd
import os
import json
import joblib
from typing import Dict, Any, Tuple, List, Optional
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score,
    mean_absolute_error, mean_squared_error, r2_score
)

from .dataset_synthesizer import CECIDatasetSynthesizer, generate_pipeline_input, GAME_CONFIGS


# Feature columns used for model training
FEATURE_COLUMNS = [
    'avg_accuracy', 'avg_reaction_time', 'avg_hesitation',
    'avg_engagement', 'accuracy_std', 'rt_variability',
    'session_count', 'num_games', 'age'
]


def extract_features_from_sessions(sessions: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Extract the feature vector from raw sessions, matching FEATURE_COLUMNS.
    Used at inference time to convert raw game data into model input.
    """
    metrics = [s['behavioralMetrics'] for s in sessions if 'behavioralMetrics' in s]

    if not metrics:
        return {col: 0.0 for col in FEATURE_COLUMNS}

    accuracies = [m['accuracy'] for m in metrics]
    reaction_times = [m['averageReactionTime'] for m in metrics]
    hesitations = [m['hesitationCount'] for m in metrics]
    engagements = [m['engagementScore'] for m in metrics]

    return {
        'avg_accuracy': float(np.mean(accuracies)),
        'avg_reaction_time': float(np.mean(reaction_times)),
        'avg_hesitation': float(np.mean(hesitations)),
        'avg_engagement': float(np.mean(engagements)),
        'accuracy_std': float(np.std(accuracies)) if len(accuracies) > 1 else 0.0,
        'rt_variability': float(np.mean([m['reactionTimeVariability'] for m in metrics])),
        'session_count': len(sessions),
        'num_games': len(set(s.get('gameId', '') for s in sessions)),
        'age': 5.0,  # default; overridden at call site when age is known
    }


class CECIModelTrainer:
    """
    Trains and evaluates ML models for the CECI pipeline.

    Models:
    1. risk_classifier: RandomForest for green/amber/red classification
    2. score_regressor: GradientBoosting for CECI score (0-100) regression
    3. calibrated_classifier: CalibratedClassifierCV for calibrated probabilities
    4. feature_scaler: StandardScaler for feature normalization
    """

    def __init__(self, random_state: int = 42):
        self.random_state = random_state
        self.risk_classifier = None
        self.score_regressor = None
        self.calibrated_classifier = None
        self.feature_scaler = None
        self.training_metrics = {}

    def prepare_training_data(
        self,
        labels_df: pd.DataFrame
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Prepare features and labels from the labels dataframe.

        Returns:
            (X, y_class, y_score) - features, classification labels, score targets
        """
        X = labels_df[FEATURE_COLUMNS].values.astype(np.float64)
        y_class = labels_df['risk_label'].values  # 0=green, 1=amber, 2=red

        # Generate target scores: green=70-100, amber=40-69, red=0-39
        y_score = np.zeros(len(labels_df))
        for i, row in labels_df.iterrows():
            if row['risk_label'] == 0:  # green
                y_score[i] = 70 + row['avg_accuracy'] * 0.3
            elif row['risk_label'] == 1:  # amber
                y_score[i] = 40 + row['avg_accuracy'] * 0.29
            else:  # red
                y_score[i] = row['avg_accuracy'] * 0.39
        y_score = np.clip(y_score, 0, 100)

        return X, y_class, y_score

    def train(self, labels_df: pd.DataFrame) -> Dict[str, Any]:
        """
        Train all models on the provided dataset.

        Returns training metrics dictionary.
        """
        X, y_class, y_score = self.prepare_training_data(labels_df)

        # Scale features
        self.feature_scaler = StandardScaler()
        X_scaled = self.feature_scaler.fit_transform(X)

        # 1. Train Risk Classifier (Random Forest)
        self.risk_classifier = RandomForestClassifier(
            n_estimators=100,
            max_depth=8,
            min_samples_split=5,
            min_samples_leaf=3,
            class_weight='balanced',
            random_state=self.random_state
        )
        self.risk_classifier.fit(X_scaled, y_class)

        # Cross-validation for classifier
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=self.random_state)
        clf_cv_scores = cross_val_score(
            self.risk_classifier, X_scaled, y_class, cv=cv, scoring='accuracy'
        )

        # Classification metrics
        y_pred_class = self.risk_classifier.predict(X_scaled)
        clf_report = classification_report(
            y_class, y_pred_class,
            target_names=['green', 'amber', 'red'],
            output_dict=True
        )
        conf_matrix = confusion_matrix(y_class, y_pred_class).tolist()

        # Feature importance
        feature_importance = dict(zip(
            FEATURE_COLUMNS,
            self.risk_classifier.feature_importances_.tolist()
        ))

        # 2. Train Score Regressor (Gradient Boosting)
        self.score_regressor = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            min_samples_split=5,
            min_samples_leaf=3,
            random_state=self.random_state
        )
        self.score_regressor.fit(X_scaled, y_score)

        # Regression metrics
        y_pred_score = self.score_regressor.predict(X_scaled)
        reg_mae = mean_absolute_error(y_score, y_pred_score)
        reg_mse = mean_squared_error(y_score, y_pred_score)
        reg_r2 = r2_score(y_score, y_pred_score)

        # Cross-validation for regressor
        reg_cv_scores = cross_val_score(
            self.score_regressor, X_scaled, y_score, cv=5, scoring='r2'
        )

        # 3. Train Calibrated Classifier (for Bayesian-style probabilities)
        base_lr = LogisticRegression(
            max_iter=1000,
            random_state=self.random_state
        )
        self.calibrated_classifier = CalibratedClassifierCV(
            estimator=base_lr,
            cv=5,
            method='isotonic'
        )
        self.calibrated_classifier.fit(X_scaled, y_class)

        # Store metrics
        self.training_metrics = {
            'classifier': {
                'accuracy': float(accuracy_score(y_class, y_pred_class)),
                'cv_accuracy_mean': float(clf_cv_scores.mean()),
                'cv_accuracy_std': float(clf_cv_scores.std()),
                'classification_report': clf_report,
                'confusion_matrix': conf_matrix,
                'feature_importance': feature_importance
            },
            'regressor': {
                'mae': float(reg_mae),
                'mse': float(reg_mse),
                'rmse': float(np.sqrt(reg_mse)),
                'r2': float(reg_r2),
                'cv_r2_mean': float(reg_cv_scores.mean()),
                'cv_r2_std': float(reg_cv_scores.std())
            },
            'dataset_info': {
                'total_samples': len(labels_df),
                'class_distribution': labels_df['risk_label'].value_counts().to_dict(),
                'feature_columns': FEATURE_COLUMNS
            }
        }

        return self.training_metrics

    def predict_risk(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Predict risk band and score from features.

        Returns dict with risk_band, ceci_score, confidence, probabilities.
        """
        if self.risk_classifier is None:
            raise RuntimeError("Models not trained. Call train() first or load_models().")

        # Prepare input
        X = np.array([[features.get(col, 0.0) for col in FEATURE_COLUMNS]])
        X_scaled = self.feature_scaler.transform(X)

        # Risk classification
        risk_class = int(self.risk_classifier.predict(X_scaled)[0])
        risk_band = {0: 'green', 1: 'amber', 2: 'red'}[risk_class]

        # CECI score
        ceci_score = float(np.clip(self.score_regressor.predict(X_scaled)[0], 0, 100))

        # Calibrated probabilities
        probas = self.calibrated_classifier.predict_proba(X_scaled)[0]

        # Confidence: based on max probability and margin
        max_prob = float(np.max(probas))
        sorted_probs = np.sort(probas)[::-1]
        margin = float(sorted_probs[0] - sorted_probs[1])
        confidence = min(100, max_prob * 70 + margin * 30)

        # Feature importance for this prediction
        rf_importances = self.risk_classifier.feature_importances_

        return {
            'risk_band': risk_band,
            'ceci_score': round(ceci_score),
            'confidence': round(confidence),
            'probabilities': {
                'green': round(float(probas[0]), 4),
                'amber': round(float(probas[1]), 4),
                'red': round(float(probas[2]), 4)
            },
            'feature_importance': dict(zip(
                FEATURE_COLUMNS,
                rf_importances.tolist()
            ))
        }

    def save_models(self, output_dir: str):
        """Save all trained models and metadata"""
        os.makedirs(output_dir, exist_ok=True)

        joblib.dump(self.risk_classifier, os.path.join(output_dir, 'risk_classifier.joblib'))
        joblib.dump(self.score_regressor, os.path.join(output_dir, 'score_regressor.joblib'))
        joblib.dump(self.calibrated_classifier, os.path.join(output_dir, 'calibrated_classifier.joblib'))
        joblib.dump(self.feature_scaler, os.path.join(output_dir, 'feature_scaler.joblib'))

        # Save training metrics
        with open(os.path.join(output_dir, 'training_metrics.json'), 'w') as f:
            json.dump(self.training_metrics, f, indent=2, default=str)

        # Save feature columns for reference
        with open(os.path.join(output_dir, 'feature_columns.json'), 'w') as f:
            json.dump(FEATURE_COLUMNS, f)

        print(f"Models saved to {output_dir}/")
        print(f"  - risk_classifier.joblib (RandomForest)")
        print(f"  - score_regressor.joblib (GradientBoosting)")
        print(f"  - calibrated_classifier.joblib (CalibratedLR)")
        print(f"  - feature_scaler.joblib (StandardScaler)")
        print(f"  - training_metrics.json")
        print(f"  - feature_columns.json")

    def load_models(self, model_dir: str):
        """Load previously trained models"""
        self.risk_classifier = joblib.load(os.path.join(model_dir, 'risk_classifier.joblib'))
        self.score_regressor = joblib.load(os.path.join(model_dir, 'score_regressor.joblib'))
        self.calibrated_classifier = joblib.load(os.path.join(model_dir, 'calibrated_classifier.joblib'))
        self.feature_scaler = joblib.load(os.path.join(model_dir, 'feature_scaler.joblib'))

        metrics_path = os.path.join(model_dir, 'training_metrics.json')
        if os.path.exists(metrics_path):
            with open(metrics_path, 'r') as f:
                self.training_metrics = json.load(f)

        print(f"Models loaded from {model_dir}/")


def train_and_save_models(
    data_dir: str = None,
    model_dir: str = None,
    n_children: int = 50,
    sessions: int = 5
) -> Dict[str, Any]:
    """
    End-to-end: synthesize data, train models, save everything.

    Args:
        data_dir: Where to save dataset (default: ml_pipeline/data/)
        model_dir: Where to save models (default: ml_pipeline/trained_models/)
        n_children: Children per risk category
        sessions: Sessions per child

    Returns:
        Training metrics dictionary
    """
    base_dir = os.path.dirname(__file__)
    if data_dir is None:
        data_dir = os.path.join(base_dir, 'data')
    if model_dir is None:
        model_dir = os.path.join(base_dir, 'trained_models')

    print("=" * 60)
    print("CECI Model Training Pipeline")
    print("=" * 60)

    # Step 1: Synthesize data
    print("\n[1/4] Synthesizing training dataset...")
    synthesizer = CECIDatasetSynthesizer(seed=42)
    dataset, labels_df, scenarios = synthesizer.save_dataset(
        output_dir=data_dir,
        n_children=n_children,
        sessions=sessions
    )

    print(f"\nDataset shape: {labels_df.shape}")
    print(f"Class distribution:\n{labels_df['risk_category'].value_counts().to_string()}")

    # Step 2: Train models
    print("\n[2/4] Training models...")
    trainer = CECIModelTrainer(random_state=42)
    metrics = trainer.train(labels_df)

    print(f"\nClassifier accuracy: {metrics['classifier']['accuracy']:.4f}")
    print(f"Classifier CV accuracy: {metrics['classifier']['cv_accuracy_mean']:.4f} "
          f"(+/- {metrics['classifier']['cv_accuracy_std']:.4f})")
    print(f"Regressor R²: {metrics['regressor']['r2']:.4f}")
    print(f"Regressor MAE: {metrics['regressor']['mae']:.2f}")
    print(f"Regressor CV R²: {metrics['regressor']['cv_r2_mean']:.4f} "
          f"(+/- {metrics['regressor']['cv_r2_std']:.4f})")

    print("\nFeature Importance:")
    for feat, imp in sorted(
        metrics['classifier']['feature_importance'].items(),
        key=lambda x: x[1], reverse=True
    ):
        print(f"  {feat:25s}: {imp:.4f}")

    # Step 3: Save models
    print("\n[3/4] Saving models...")
    trainer.save_models(model_dir)

    # Step 4: Validate on test scenarios
    print("\n[4/4] Validating on test scenarios...")
    for scenario_name, sessions_data in scenarios.items():
        features = extract_features_from_sessions(sessions_data)
        prediction = trainer.predict_risk(features)
        print(f"  {scenario_name:30s} -> {prediction['risk_band']:6s} "
              f"(score={prediction['ceci_score']:3d}, conf={prediction['confidence']:3d}%)")

    print("\n" + "=" * 60)
    print("Training complete!")
    print("=" * 60)

    return metrics


if __name__ == '__main__':
    train_and_save_models()
