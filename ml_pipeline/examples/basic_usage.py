"""
Basic usage example for CECI ML Pipeline
"""
from ml_pipeline import calculate_ceci, get_pipeline
from ml_pipeline.logging_config import PipelineLogger
from ml_pipeline.validation import validate_and_preprocess

# Setup logging
logger = PipelineLogger.get_logger(__name__)


def main():
    """Demonstrate basic pipeline usage"""
    logger.info("=== CECI ML Pipeline - Basic Usage Example ===")

    # Sample game results
    game_results = [
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

    # Method 1: Quick calculation
    logger.info("\n--- Method 1: Quick Calculation ---")
    ceci_score = calculate_ceci(game_results, child_name="Emma")
    print_ceci_score(ceci_score)

    # Method 2: With validation and preprocessing
    logger.info("\n--- Method 2: With Validation ---")
    processed_results, quality_report = validate_and_preprocess(game_results)

    logger.info(f"Data Quality Score: {quality_report['quality_score']:.1f}/100")
    logger.info(f"Sessions: {quality_report['session_count']}")

    if quality_report['warnings']:
        logger.warning("Data Quality Warnings:")
        for warning in quality_report['warnings']:
            logger.warning(f"  - {warning}")

    ceci_score = calculate_ceci(processed_results, child_name="Emma")
    print_ceci_score(ceci_score)

    # Method 3: Direct pipeline access with metrics
    logger.info("\n--- Method 3: With Performance Metrics ---")
    pipeline = get_pipeline()
    ceci_score = pipeline.predict(game_results, child_name="Emma")
    print_ceci_score(ceci_score)

    # Print pipeline execution metrics
    metrics = pipeline.get_metrics()
    logger.info("\nPipeline Execution Metrics:")
    total_time = 0
    for metric in metrics:
        exec_time_ms = metric['execution_time'] * 1000
        logger.info(f"  {metric['stage_name']}: {exec_time_ms:.2f}ms")
        total_time += metric['execution_time']

    logger.info(f"  Total: {total_time * 1000:.2f}ms")


def print_ceci_score(score: dict):
    """Pretty print CECI score"""
    print("\n" + "=" * 60)
    print(f"CECI Assessment Score")
    print("=" * 60)
    print(f"Overall Score:        {score['overall']}/100")
    print(f"Risk Band:            {get_risk_band_emoji(score['riskBand'])} {score['riskBand'].upper()}")
    print(f"Confidence:           {score['confidence']}%")
    print("-" * 60)
    print("Model Breakdown:")
    print(f"  Tree-Based Model:   {score['treeBasedScore']}/100")
    print(f"  Temporal Model:     {score['temporalScore']}/100")
    print(f"  Bayesian Calibration: {score['bayesianCalibration']}/100")
    print("-" * 60)
    print(f"Recommendation:")
    print(f"  {score['recommendation']}")
    print("=" * 60 + "\n")


def get_risk_band_emoji(risk_band: str) -> str:
    """Get emoji for risk band"""
    emojis = {
        'green': '🟢',
        'amber': '🟡',
        'red': '🔴'
    }
    return emojis.get(risk_band, '⚪')


if __name__ == '__main__':
    main()
