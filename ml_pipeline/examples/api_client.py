"""
Example API client for CECI ML Pipeline
Demonstrates how to interact with the FastAPI server
"""
import requests
import json
from typing import List, Dict, Any


class CECIAPIClient:
    """Client for interacting with CECI ML Pipeline API"""

    def __init__(self, base_url: str = "http://localhost:8000"):
        """
        Initialize API client

        Args:
            base_url: Base URL of the API server
        """
        self.base_url = base_url.rstrip('/')

    def health_check(self) -> Dict[str, Any]:
        """Check API health status"""
        response = requests.get(f"{self.base_url}/health")
        response.raise_for_status()
        return response.json()

    def get_config(self) -> Dict[str, Any]:
        """Get pipeline configuration"""
        response = requests.get(f"{self.base_url}/config")
        response.raise_for_status()
        return response.json()

    def predict(
        self,
        results: List[Dict[str, Any]],
        child_name: str = "Child"
    ) -> Dict[str, Any]:
        """
        Get CECI prediction

        Args:
            results: List of game results
            child_name: Name of the child

        Returns:
            Prediction response with CECI score
        """
        payload = {
            "results": results,
            "childName": child_name
        }

        response = requests.post(
            f"{self.base_url}/predict",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        return response.json()


def main():
    """Demonstrate API client usage"""
    print("=== CECI ML Pipeline API Client Example ===\n")

    # Initialize client
    client = CECIAPIClient("http://localhost:8000")

    try:
        # Health check
        print("1. Health Check:")
        health = client.health_check()
        print(f"   Status: {health['status']}")
        print(f"   Pipeline stages: {health['pipeline_stages']}")
        print()

        # Get configuration
        print("2. Pipeline Configuration:")
        config = client.get_config()
        print(f"   Tree model weights: {config['tree_model']['weights']}")
        print(f"   Risk thresholds: Green={config['risk_assessment']['green_threshold']}, "
              f"Amber={config['risk_assessment']['amber_threshold']}")
        print()

        # Make prediction
        print("3. CECI Prediction:")
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
                'score': 90,
                'timestamp': 1640086400000,
                'sessionNumber': 2,
                'behavioralMetrics': {
                    'reactionTimes': [430, 500, 460, 490, 470],
                    'accuracy': 90.0,
                    'hesitationCount': 1,
                    'engagementScore': 88.0,
                    'correctAttempts': 22,
                    'incorrectAttempts': 3,
                    'averageReactionTime': 470.0,
                    'reactionTimeVariability': 22.1
                }
            }
        ]

        prediction = client.predict(game_results, child_name="Alex")

        score = prediction['score']
        print(f"   Overall Score: {score['overall']}/100")
        print(f"   Risk Band: {score['riskBand'].upper()}")
        print(f"   Confidence: {score['confidence']}%")
        print(f"   Recommendation: {score['recommendation']}")

        if 'pipelineMetrics' in prediction:
            metrics = prediction['pipelineMetrics']
            print(f"\n   Pipeline Execution Time: {metrics['total_execution_time']*1000:.2f}ms")

    except requests.exceptions.ConnectionError:
        print("ERROR: Cannot connect to API server.")
        print("Make sure the server is running:")
        print("  python -m ml_pipeline.api")
        print("  OR")
        print("  cd ml_pipeline && python api.py")
    except requests.exceptions.HTTPError as e:
        print(f"ERROR: API request failed: {e}")
        print(f"Response: {e.response.text}")
    except Exception as e:
        print(f"ERROR: {e}")


if __name__ == '__main__':
    main()
