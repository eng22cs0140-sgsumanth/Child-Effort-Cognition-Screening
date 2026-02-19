# CECI ML Pipeline Makefile

.PHONY: help install test coverage run dev docker-build docker-up docker-down clean lint format

help:
	@echo "CECI ML Pipeline - Available Commands"
	@echo ""
	@echo "Setup:"
	@echo "  make install       Install dependencies"
	@echo ""
	@echo "Development:"
	@echo "  make dev           Run server with auto-reload"
	@echo "  make run           Run production server"
	@echo ""
	@echo "Testing:"
	@echo "  make test          Run test suite"
	@echo "  make coverage      Run tests with coverage report"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build  Build Docker image"
	@echo "  make docker-up     Start Docker containers"
	@echo "  make docker-down   Stop Docker containers"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint          Run linter"
	@echo "  make format        Format code"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean         Clean up generated files"
	@echo "  make info          Show pipeline information"

install:
	pip install -r requirements.txt

test:
	pytest

coverage:
	pytest --cov=ml_pipeline --cov-report=html --cov-report=term
	@echo ""
	@echo "Coverage report generated in htmlcov/index.html"

run:
	python run.py server

dev:
	python run.py server --reload

docker-build:
	docker-compose build

docker-up:
	docker-compose up -d
	@echo ""
	@echo "CECI Pipeline is running!"
	@echo "API: http://localhost:8000"
	@echo "Docs: http://localhost:8000/docs"

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

lint:
	@echo "Running flake8..."
	-flake8 ml_pipeline tests --max-line-length=100 --ignore=E501,W503
	@echo ""
	@echo "Running mypy..."
	-mypy ml_pipeline --ignore-missing-imports

format:
	@echo "Formatting code with black..."
	-black ml_pipeline tests examples --line-length=100
	@echo ""
	@echo "Sorting imports with isort..."
	-isort ml_pipeline tests examples

clean:
	@echo "Cleaning up..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache .coverage htmlcov .mypy_cache
	rm -rf logs/*.log
	@echo "Clean complete!"

info:
	python run.py info

example-basic:
	python run.py example basic_usage

example-api:
	python run.py example api_client

.DEFAULT_GOAL := help
