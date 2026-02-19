"""
Data validation and preprocessing utilities
"""
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from .models import GameResult, BehavioralMetrics
import logging

logger = logging.getLogger(__name__)


class DataValidator:
    """Validates and preprocesses game result data"""

    @staticmethod
    def validate_game_results(results: List[Dict[str, Any]]) -> Tuple[bool, List[str]]:
        """
        Validate game results data

        Args:
            results: List of game result dictionaries

        Returns:
            Tuple of (is_valid, list of error messages)
        """
        errors = []

        if not isinstance(results, list):
            return False, ["Results must be a list"]

        if len(results) == 0:
            errors.append("Results list is empty")
            return False, errors

        for idx, result in enumerate(results):
            result_errors = DataValidator._validate_single_result(result, idx)
            errors.extend(result_errors)

        is_valid = len(errors) == 0
        return is_valid, errors

    @staticmethod
    def _validate_single_result(result: Dict[str, Any], idx: int) -> List[str]:
        """Validate a single game result"""
        errors = []

        # Check required fields
        required_fields = ['gameId', 'score', 'timestamp']
        for field in required_fields:
            if field not in result:
                errors.append(f"Result {idx}: Missing required field '{field}'")

        # Validate timestamp
        if 'timestamp' in result:
            if not isinstance(result['timestamp'], (int, float)):
                errors.append(f"Result {idx}: Timestamp must be a number")
            elif result['timestamp'] < 0:
                errors.append(f"Result {idx}: Timestamp cannot be negative")

        # Validate score
        if 'score' in result:
            if not isinstance(result['score'], (int, float)):
                errors.append(f"Result {idx}: Score must be a number")

        # Validate behavioral metrics if present
        if 'behavioralMetrics' in result:
            metrics_errors = DataValidator._validate_behavioral_metrics(
                result['behavioralMetrics'], idx
            )
            errors.extend(metrics_errors)

        return errors

    @staticmethod
    def _validate_behavioral_metrics(metrics: Dict[str, Any], result_idx: int) -> List[str]:
        """Validate behavioral metrics"""
        errors = []

        required_fields = {
            'accuracy': (float, 0, 100),
            'averageReactionTime': (float, 0, 10000),
            'hesitationCount': (int, 0, None),
            'engagementScore': (float, 0, 100)
        }

        for field, (expected_type, min_val, max_val) in required_fields.items():
            if field not in metrics:
                errors.append(f"Result {result_idx}: Missing behavioral metric '{field}'")
                continue

            value = metrics[field]

            # Type check
            if not isinstance(value, (expected_type, int, float)):
                errors.append(
                    f"Result {result_idx}: '{field}' must be a number"
                )
                continue

            # Range check
            if min_val is not None and value < min_val:
                errors.append(
                    f"Result {result_idx}: '{field}' cannot be less than {min_val}"
                )

            if max_val is not None and value > max_val:
                errors.append(
                    f"Result {result_idx}: '{field}' cannot be greater than {max_val}"
                )

        # Validate reaction times array
        if 'reactionTimes' in metrics:
            if not isinstance(metrics['reactionTimes'], list):
                errors.append(f"Result {result_idx}: 'reactionTimes' must be a list")
            elif len(metrics['reactionTimes']) > 0:
                if not all(isinstance(rt, (int, float)) for rt in metrics['reactionTimes']):
                    errors.append(
                        f"Result {result_idx}: All reaction times must be numbers"
                    )
                if any(rt < 0 for rt in metrics['reactionTimes']):
                    errors.append(
                        f"Result {result_idx}: Reaction times cannot be negative"
                    )

        return errors

    @staticmethod
    def preprocess_results(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Preprocess and clean game results

        Args:
            results: Raw game results

        Returns:
            Cleaned and preprocessed results
        """
        if not results:
            return []

        processed = []

        for result in results:
            try:
                cleaned_result = DataValidator._preprocess_single_result(result)
                if cleaned_result:
                    processed.append(cleaned_result)
            except Exception as e:
                logger.warning(f"Failed to preprocess result: {e}")
                continue

        # Sort by timestamp
        processed.sort(key=lambda x: x['timestamp'])

        return processed

    @staticmethod
    def _preprocess_single_result(result: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Preprocess a single game result"""
        cleaned = result.copy()

        # Ensure timestamp is present
        if 'timestamp' not in cleaned:
            return None

        # Clamp score to valid range
        if 'score' in cleaned:
            cleaned['score'] = max(0, min(100, float(cleaned['score'])))

        # Process behavioral metrics
        if 'behavioralMetrics' in cleaned:
            cleaned['behavioralMetrics'] = DataValidator._preprocess_behavioral_metrics(
                cleaned['behavioralMetrics']
            )

        return cleaned

    @staticmethod
    def _preprocess_behavioral_metrics(metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Preprocess behavioral metrics"""
        cleaned = metrics.copy()

        # Clamp values to valid ranges
        if 'accuracy' in cleaned:
            cleaned['accuracy'] = max(0.0, min(100.0, float(cleaned['accuracy'])))

        if 'engagementScore' in cleaned:
            cleaned['engagementScore'] = max(0.0, min(100.0, float(cleaned['engagementScore'])))

        if 'averageReactionTime' in cleaned:
            cleaned['averageReactionTime'] = max(0.0, float(cleaned['averageReactionTime']))

        if 'hesitationCount' in cleaned:
            cleaned['hesitationCount'] = max(0, int(cleaned['hesitationCount']))

        # Clean reaction times array
        if 'reactionTimes' in cleaned and isinstance(cleaned['reactionTimes'], list):
            cleaned['reactionTimes'] = [
                max(0.0, float(rt))
                for rt in cleaned['reactionTimes']
                if isinstance(rt, (int, float))
            ]

        # Ensure correct/incorrect attempts are non-negative
        for field in ['correctAttempts', 'incorrectAttempts']:
            if field in cleaned:
                cleaned[field] = max(0, int(cleaned[field]))

        return cleaned


class DataQualityChecker:
    """Checks data quality and provides warnings"""

    @staticmethod
    def check_data_quality(results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze data quality and return report

        Args:
            results: Game results to analyze

        Returns:
            Dictionary with quality metrics and warnings
        """
        if not results:
            return {
                'has_data': False,
                'session_count': 0,
                'warnings': ['No data provided'],
                'quality_score': 0
            }

        warnings = []
        session_count = len(results)

        # Check minimum sessions
        if session_count < 3:
            warnings.append(
                f"Only {session_count} session(s) available. "
                "At least 3 sessions recommended for reliable assessment."
            )

        # Check for behavioral metrics
        has_metrics = sum(1 for r in results if 'behavioralMetrics' in r)
        metrics_ratio = has_metrics / session_count

        if metrics_ratio < 1.0:
            warnings.append(
                f"Only {has_metrics}/{session_count} sessions have behavioral metrics. "
                "Missing metrics may reduce assessment accuracy."
            )

        # Check temporal distribution
        timestamps = [r['timestamp'] for r in results if 'timestamp' in r]
        if len(timestamps) > 1:
            time_gaps = np.diff(sorted(timestamps))
            avg_gap = np.mean(time_gaps)
            max_gap = np.max(time_gaps)

            # Check for very irregular spacing
            if max_gap > avg_gap * 5:
                warnings.append(
                    "Sessions have irregular time spacing. "
                    "Regular assessment intervals recommended."
                )

        # Check data completeness
        complete_sessions = sum(
            1 for r in results
            if 'behavioralMetrics' in r and
            'accuracy' in r['behavioralMetrics'] and
            'averageReactionTime' in r['behavioralMetrics']
        )

        completeness = complete_sessions / session_count

        # Calculate quality score
        quality_score = DataQualityChecker._calculate_quality_score(
            session_count, metrics_ratio, completeness
        )

        return {
            'has_data': True,
            'session_count': session_count,
            'has_behavioral_metrics': has_metrics,
            'metrics_ratio': metrics_ratio,
            'completeness': completeness,
            'quality_score': quality_score,
            'warnings': warnings
        }

    @staticmethod
    def _calculate_quality_score(
        session_count: int,
        metrics_ratio: float,
        completeness: float
    ) -> float:
        """Calculate overall data quality score (0-100)"""
        # Session count contribution (max 40 points)
        session_score = min(40, session_count * 4)

        # Metrics presence contribution (30 points)
        metrics_score = metrics_ratio * 30

        # Completeness contribution (30 points)
        completeness_score = completeness * 30

        return session_score + metrics_score + completeness_score


def validate_and_preprocess(
    results: List[Dict[str, Any]],
    strict: bool = False
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Convenience function to validate and preprocess data

    Args:
        results: Raw game results
        strict: If True, raise exception on validation errors

    Returns:
        Tuple of (processed results, quality report)

    Raises:
        ValueError: If strict=True and validation fails
    """
    # Validate
    is_valid, errors = DataValidator.validate_game_results(results)

    if not is_valid and strict:
        error_msg = "Data validation failed:\n" + "\n".join(errors)
        raise ValueError(error_msg)

    if errors:
        logger.warning(f"Validation warnings: {errors}")

    # Preprocess
    processed = DataValidator.preprocess_results(results)

    # Quality check
    quality_report = DataQualityChecker.check_data_quality(processed)

    return processed, quality_report
