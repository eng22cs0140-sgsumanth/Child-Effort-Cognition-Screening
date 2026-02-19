"""
Base class for pipeline stages
"""
from abc import ABC, abstractmethod
from typing import Any, Dict
from ..config import PipelineConfig


class PipelineStage(ABC):
    """Base class for all pipeline stages"""

    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def execute(self, context: Dict[str, Any], config: PipelineConfig) -> Dict[str, Any]:
        """
        Execute the stage

        Args:
            context: Pipeline context containing all intermediate results
            config: Pipeline configuration

        Returns:
            Updated context with stage outputs
        """
        pass
