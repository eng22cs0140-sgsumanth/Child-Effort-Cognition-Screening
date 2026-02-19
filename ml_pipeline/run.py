#!/usr/bin/env python
"""
Run script for CECI ML Pipeline
Provides easy command-line interface for starting the pipeline
"""
import argparse
import sys
import uvicorn
from ml_pipeline.logging_config import PipelineLogger


def run_server(host: str = "0.0.0.0", port: int = 8000, workers: int = 1, reload: bool = False):
    """
    Run the FastAPI server

    Args:
        host: Host address
        port: Port number
        workers: Number of worker processes
        reload: Enable auto-reload for development
    """
    print(f"""
╔══════════════════════════════════════════════════════════╗
║           CECI ML Pipeline API Server                   ║
║                                                          ║
║  Server starting on: http://{host}:{port}              ║
║  Interactive docs:   http://{host}:{port}/docs         ║
║  Alternative docs:   http://{host}:{port}/redoc        ║
╚══════════════════════════════════════════════════════════╝
    """)

    uvicorn.run(
        "ml_pipeline.api:app",
        host=host,
        port=port,
        workers=workers,
        reload=reload,
        log_level="info"
    )


def run_tests(coverage: bool = False, verbose: bool = False):
    """
    Run the test suite

    Args:
        coverage: Enable coverage reporting
        verbose: Enable verbose output
    """
    import pytest

    args = []

    if verbose:
        args.append("-v")

    if coverage:
        args.extend(["--cov=ml_pipeline", "--cov-report=html", "--cov-report=term"])

    print("Running CECI ML Pipeline Tests...")
    sys.exit(pytest.main(args))


def run_example(example_name: str):
    """
    Run an example script

    Args:
        example_name: Name of the example to run
    """
    import importlib.util

    example_path = f"examples/{example_name}.py"

    try:
        spec = importlib.util.spec_from_file_location(example_name, example_path)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
        else:
            print(f"Error: Could not load example '{example_name}'")
            sys.exit(1)
    except FileNotFoundError:
        print(f"Error: Example '{example_name}' not found")
        print("\nAvailable examples:")
        import os
        examples = [f[:-3] for f in os.listdir("examples") if f.endswith(".py")]
        for ex in examples:
            print(f"  - {ex}")
        sys.exit(1)


def show_info():
    """Show pipeline information"""
    from ml_pipeline import __version__
    from ml_pipeline.pipeline import get_pipeline

    pipeline = get_pipeline()
    config = pipeline.get_config()

    print(f"""
╔══════════════════════════════════════════════════════════╗
║           CECI ML Pipeline Information                  ║
╚══════════════════════════════════════════════════════════╝

Version: {__version__}

Pipeline Stages ({len(pipeline.stages)}):
""")

    for i, stage in enumerate(pipeline.stages, 1):
        print(f"  {i}. {stage.name}")

    print(f"""
Configuration:
  Tree Model Weights:
    - Accuracy:    {config.tree_model.weights['accuracy']}
    - Reaction:    {config.tree_model.weights['reaction']}
    - Hesitation:  {config.tree_model.weights['hesitation']}
    - Engagement:  {config.tree_model.weights['engagement']}

  Risk Thresholds:
    - Green:  ≥ {config.risk_assessment.green_threshold}%
    - Amber:  ≥ {config.risk_assessment.amber_threshold}%
    - Red:    < {config.risk_assessment.amber_threshold}%

  Bayesian Settings:
    - Prior: {config.bayesian.prior}
    - Confidence Threshold: {config.bayesian.confidence_session_threshold} sessions
    """)


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="CECI ML Pipeline - Run script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run.py server                    # Start API server
  python run.py server --reload           # Start with auto-reload (development)
  python run.py test                      # Run tests
  python run.py test --coverage           # Run tests with coverage
  python run.py example basic_usage       # Run basic usage example
  python run.py info                      # Show pipeline information
        """
    )

    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Server command
    server_parser = subparsers.add_parser("server", help="Start API server")
    server_parser.add_argument("--host", default="0.0.0.0", help="Host address")
    server_parser.add_argument("--port", type=int, default=8000, help="Port number")
    server_parser.add_argument("--workers", type=int, default=1, help="Number of workers")
    server_parser.add_argument("--reload", action="store_true", help="Enable auto-reload")

    # Test command
    test_parser = subparsers.add_parser("test", help="Run tests")
    test_parser.add_argument("--coverage", action="store_true", help="Enable coverage")
    test_parser.add_argument("-v", "--verbose", action="store_true", help="Verbose output")

    # Example command
    example_parser = subparsers.add_parser("example", help="Run an example")
    example_parser.add_argument("name", help="Example name")

    # Info command
    subparsers.add_parser("info", help="Show pipeline information")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    # Execute command
    if args.command == "server":
        run_server(args.host, args.port, args.workers, args.reload)
    elif args.command == "test":
        run_tests(args.coverage, args.verbose)
    elif args.command == "example":
        run_example(args.name)
    elif args.command == "info":
        show_info()


if __name__ == "__main__":
    main()
