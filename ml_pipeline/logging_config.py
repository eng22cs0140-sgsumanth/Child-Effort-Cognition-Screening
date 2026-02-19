"""
Logging configuration for CECI ML Pipeline
"""
import logging
import logging.handlers
import sys
from pathlib import Path
from typing import Optional
from datetime import datetime


class ColoredFormatter(logging.Formatter):
    """Custom formatter with color support for console output"""

    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',     # Cyan
        'INFO': '\033[32m',      # Green
        'WARNING': '\033[33m',   # Yellow
        'ERROR': '\033[31m',     # Red
        'CRITICAL': '\033[35m',  # Magenta
        'RESET': '\033[0m'       # Reset
    }

    def format(self, record):
        """Format log record with colors"""
        if sys.stdout.isatty():  # Only use colors if output is a terminal
            levelname = record.levelname
            if levelname in self.COLORS:
                record.levelname = (
                    f"{self.COLORS[levelname]}{levelname}{self.COLORS['RESET']}"
                )
        return super().format(record)


class PipelineLogger:
    """Centralized logging configuration for the pipeline"""

    _initialized = False

    @classmethod
    def setup_logging(
        cls,
        log_level: str = "INFO",
        log_file: Optional[str] = None,
        log_dir: Optional[str] = None,
        enable_console: bool = True,
        enable_file: bool = True,
        max_file_size: int = 10 * 1024 * 1024,  # 10 MB
        backup_count: int = 5
    ) -> None:
        """
        Setup logging configuration for the entire pipeline

        Args:
            log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            log_file: Specific log file name
            log_dir: Directory for log files (default: logs/)
            enable_console: Enable console logging
            enable_file: Enable file logging
            max_file_size: Maximum size of log file before rotation
            backup_count: Number of backup files to keep
        """
        if cls._initialized:
            return

        # Create root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(getattr(logging, log_level.upper()))

        # Remove existing handlers
        root_logger.handlers.clear()

        # Console handler
        if enable_console:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(getattr(logging, log_level.upper()))

            console_format = ColoredFormatter(
                fmt='%(levelname)s | %(name)s | %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            console_handler.setFormatter(console_format)
            root_logger.addHandler(console_handler)

        # File handler
        if enable_file:
            if log_dir is None:
                log_dir = "logs"

            log_path = Path(log_dir)
            log_path.mkdir(parents=True, exist_ok=True)

            if log_file is None:
                timestamp = datetime.now().strftime("%Y%m%d")
                log_file = f"ceci_pipeline_{timestamp}.log"

            log_filepath = log_path / log_file

            # Rotating file handler
            file_handler = logging.handlers.RotatingFileHandler(
                log_filepath,
                maxBytes=max_file_size,
                backupCount=backup_count,
                encoding='utf-8'
            )
            file_handler.setLevel(logging.DEBUG)  # Always log DEBUG to file

            file_format = logging.Formatter(
                fmt='%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            file_handler.setFormatter(file_format)
            root_logger.addHandler(file_handler)

        cls._initialized = True

        # Log initialization
        logger = logging.getLogger(__name__)
        logger.info(f"Logging initialized - Level: {log_level}")
        if enable_file:
            logger.info(f"Log file: {log_filepath}")

    @classmethod
    def get_logger(cls, name: str) -> logging.Logger:
        """
        Get a logger instance

        Args:
            name: Logger name (typically __name__)

        Returns:
            Logger instance
        """
        if not cls._initialized:
            cls.setup_logging()

        return logging.getLogger(name)

    @classmethod
    def set_level(cls, level: str) -> None:
        """
        Change logging level for all handlers

        Args:
            level: New logging level
        """
        log_level = getattr(logging, level.upper())
        root_logger = logging.getLogger()
        root_logger.setLevel(log_level)

        for handler in root_logger.handlers:
            if isinstance(handler, logging.StreamHandler):
                handler.setLevel(log_level)

    @classmethod
    def add_request_id(cls, request_id: str) -> logging.LoggerAdapter:
        """
        Create a logger adapter with request ID for tracing

        Args:
            request_id: Unique request identifier

        Returns:
            LoggerAdapter with request ID
        """
        logger = logging.getLogger('ml_pipeline')
        return logging.LoggerAdapter(logger, {'request_id': request_id})


class LogContext:
    """Context manager for temporary logging configuration"""

    def __init__(self, logger: logging.Logger, level: str):
        """
        Initialize context

        Args:
            logger: Logger to modify
            level: Temporary log level
        """
        self.logger = logger
        self.new_level = getattr(logging, level.upper())
        self.old_level = None

    def __enter__(self):
        """Enter context - change log level"""
        self.old_level = self.logger.level
        self.logger.setLevel(self.new_level)
        return self.logger

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context - restore log level"""
        self.logger.setLevel(self.old_level)


def log_execution_time(logger: logging.Logger):
    """
    Decorator to log function execution time

    Args:
        logger: Logger instance to use

    Returns:
        Decorator function
    """
    import time
    from functools import wraps

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                logger.debug(
                    f"{func.__name__} executed in {execution_time:.4f} seconds"
                )
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(
                    f"{func.__name__} failed after {execution_time:.4f} seconds: {e}"
                )
                raise
        return wrapper
    return decorator


def log_pipeline_stage(logger: logging.Logger):
    """
    Decorator to log pipeline stage execution

    Args:
        logger: Logger instance to use

    Returns:
        Decorator function
    """
    import time
    from functools import wraps

    def decorator(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            stage_name = getattr(self, 'name', func.__name__)
            logger.info(f"Starting stage: {stage_name}")

            start_time = time.time()
            try:
                result = func(self, *args, **kwargs)
                execution_time = time.time() - start_time
                logger.info(
                    f"Stage {stage_name} completed in {execution_time:.4f}s"
                )
                return result
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(
                    f"Stage {stage_name} failed after {execution_time:.4f}s: {e}",
                    exc_info=True
                )
                raise
        return wrapper
    return decorator


# Initialize default logging on module import
PipelineLogger.setup_logging()
