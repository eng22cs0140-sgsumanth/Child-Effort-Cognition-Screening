"""
Monitoring and metrics tracking for CECI ML Pipeline
"""
import time
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path
from collections import defaultdict, deque
import threading


class MetricsCollector:
    """Collects and aggregates pipeline metrics"""

    def __init__(self, max_history: int = 1000):
        """
        Initialize metrics collector

        Args:
            max_history: Maximum number of predictions to keep in history
        """
        self.max_history = max_history
        self.predictions = deque(maxlen=max_history)
        self.stage_metrics = defaultdict(list)
        self.errors = deque(maxlen=100)
        self.lock = threading.Lock()

        # Counters
        self.total_predictions = 0
        self.risk_band_counts = defaultdict(int)
        self.error_count = 0

    def record_prediction(
        self,
        ceci_score: Dict[str, Any],
        pipeline_metrics: List[Dict[str, Any]],
        session_count: int
    ) -> None:
        """
        Record a prediction and its metrics

        Args:
            ceci_score: CECI score result
            pipeline_metrics: Execution metrics from pipeline stages
            session_count: Number of sessions in input data
        """
        with self.lock:
            timestamp = datetime.now().isoformat()

            record = {
                'timestamp': timestamp,
                'overall_score': ceci_score['overall'],
                'risk_band': ceci_score['riskBand'],
                'confidence': ceci_score['confidence'],
                'session_count': session_count,
                'execution_time': sum(m['execution_time'] for m in pipeline_metrics)
            }

            self.predictions.append(record)
            self.total_predictions += 1
            self.risk_band_counts[ceci_score['riskBand']] += 1

            # Record stage metrics
            for metric in pipeline_metrics:
                self.stage_metrics[metric['stage_name']].append({
                    'timestamp': timestamp,
                    'execution_time': metric['execution_time']
                })

    def record_error(self, error_type: str, error_message: str, context: Optional[Dict] = None) -> None:
        """
        Record an error

        Args:
            error_type: Type of error
            error_message: Error message
            context: Additional context
        """
        with self.lock:
            self.errors.append({
                'timestamp': datetime.now().isoformat(),
                'type': error_type,
                'message': error_message,
                'context': context or {}
            })
            self.error_count += 1

    def get_summary(self) -> Dict[str, Any]:
        """Get summary statistics"""
        with self.lock:
            if not self.predictions:
                return {
                    'total_predictions': 0,
                    'error_count': 0,
                    'message': 'No predictions recorded yet'
                }

            # Calculate averages
            recent = list(self.predictions)[-100:]  # Last 100 predictions

            avg_score = sum(p['overall_score'] for p in recent) / len(recent)
            avg_confidence = sum(p['confidence'] for p in recent) / len(recent)
            avg_execution_time = sum(p['execution_time'] for p in recent) / len(recent)

            # Stage performance
            stage_performance = {}
            for stage_name, metrics in self.stage_metrics.items():
                recent_stage = metrics[-100:] if len(metrics) > 100 else metrics
                if recent_stage:
                    avg_time = sum(m['execution_time'] for m in recent_stage) / len(recent_stage)
                    stage_performance[stage_name] = {
                        'avg_execution_time_ms': avg_time * 1000,
                        'call_count': len(metrics)
                    }

            return {
                'total_predictions': self.total_predictions,
                'error_count': self.error_count,
                'risk_band_distribution': dict(self.risk_band_counts),
                'averages': {
                    'overall_score': round(avg_score, 2),
                    'confidence': round(avg_confidence, 2),
                    'execution_time_ms': round(avg_execution_time * 1000, 2)
                },
                'stage_performance': stage_performance,
                'recent_errors': list(self.errors)[-10:]
            }

    def get_performance_report(self) -> Dict[str, Any]:
        """Get detailed performance report"""
        with self.lock:
            if not self.predictions:
                return {'message': 'No data available'}

            recent = list(self.predictions)[-100:]

            # Score distribution
            score_buckets = defaultdict(int)
            for p in recent:
                bucket = (p['overall_score'] // 10) * 10
                score_buckets[f"{bucket}-{bucket+10}"] += 1

            # Execution time stats
            exec_times = [p['execution_time'] * 1000 for p in recent]
            exec_times.sort()

            return {
                'total_predictions': len(recent),
                'score_distribution': dict(score_buckets),
                'risk_band_distribution': dict(self.risk_band_counts),
                'execution_time_stats': {
                    'min_ms': round(min(exec_times), 2),
                    'max_ms': round(max(exec_times), 2),
                    'median_ms': round(exec_times[len(exec_times)//2], 2),
                    'p95_ms': round(exec_times[int(len(exec_times) * 0.95)], 2),
                    'p99_ms': round(exec_times[int(len(exec_times) * 0.99)], 2)
                }
            }

    def export_metrics(self, filepath: str) -> None:
        """
        Export metrics to JSON file

        Args:
            filepath: Path to output file
        """
        with self.lock:
            data = {
                'export_timestamp': datetime.now().isoformat(),
                'summary': self.get_summary(),
                'performance_report': self.get_performance_report(),
                'recent_predictions': list(self.predictions)[-100:]
            }

            Path(filepath).parent.mkdir(parents=True, exist_ok=True)
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)

    def reset(self) -> None:
        """Reset all metrics"""
        with self.lock:
            self.predictions.clear()
            self.stage_metrics.clear()
            self.errors.clear()
            self.total_predictions = 0
            self.risk_band_counts.clear()
            self.error_count = 0


class PerformanceMonitor:
    """Context manager for monitoring performance"""

    def __init__(self, operation_name: str, collector: Optional[MetricsCollector] = None):
        """
        Initialize performance monitor

        Args:
            operation_name: Name of operation being monitored
            collector: Optional metrics collector to record to
        """
        self.operation_name = operation_name
        self.collector = collector
        self.start_time = None
        self.end_time = None

    def __enter__(self):
        """Start timing"""
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Stop timing and record"""
        self.end_time = time.time()
        duration = self.end_time - self.start_time

        if exc_type is not None and self.collector:
            self.collector.record_error(
                error_type=exc_type.__name__,
                error_message=str(exc_val),
                context={'operation': self.operation_name}
            )

        return False  # Don't suppress exceptions

    @property
    def duration(self) -> float:
        """Get duration in seconds"""
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return 0.0


class HealthChecker:
    """Health check utility for the pipeline"""

    def __init__(self, collector: MetricsCollector):
        """
        Initialize health checker

        Args:
            collector: Metrics collector to use
        """
        self.collector = collector

    def check_health(self) -> Dict[str, Any]:
        """
        Perform health check

        Returns:
            Health status report
        """
        summary = self.collector.get_summary()

        # Determine health status
        issues = []
        status = 'healthy'

        # Check error rate
        if summary['total_predictions'] > 0:
            error_rate = summary['error_count'] / summary['total_predictions']
            if error_rate > 0.1:  # More than 10% errors
                issues.append(f"High error rate: {error_rate*100:.1f}%")
                status = 'degraded'
            elif error_rate > 0.05:
                issues.append(f"Elevated error rate: {error_rate*100:.1f}%")
                status = 'warning'

        # Check average execution time
        if 'averages' in summary:
            avg_time = summary['averages']['execution_time_ms']
            if avg_time > 100:  # More than 100ms
                issues.append(f"Slow execution time: {avg_time:.1f}ms")
                if status == 'healthy':
                    status = 'warning'

        return {
            'status': status,
            'timestamp': datetime.now().isoformat(),
            'checks': {
                'total_predictions': summary['total_predictions'],
                'error_count': summary['error_count'],
                'recent_errors': len(summary.get('recent_errors', [])),
            },
            'issues': issues,
            'details': summary
        }


# Global metrics collector instance
_global_collector: Optional[MetricsCollector] = None


def get_metrics_collector() -> MetricsCollector:
    """Get or create global metrics collector"""
    global _global_collector
    if _global_collector is None:
        _global_collector = MetricsCollector()
    return _global_collector


def get_health_checker() -> HealthChecker:
    """Get health checker instance"""
    return HealthChecker(get_metrics_collector())
