"""
Data models for the CECI ML Pipeline
"""
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class BehavioralMetrics(BaseModel):
    """Behavioral metrics from game sessions"""
    reactionTimes: List[float] = Field(description="Array of reaction times in milliseconds")
    accuracy: float = Field(description="Percentage of correct responses")
    hesitationCount: int = Field(description="Number of delayed responses")
    engagementScore: float = Field(description="0-100 based on activity level")
    correctAttempts: int
    incorrectAttempts: int
    averageReactionTime: float
    reactionTimeVariability: float
    # Tap tracking (new — defaults preserve backward compatibility)
    totalTapCount: int = 0
    emptySpaceTapCount: int = 0
    consecutiveEmptySpaceTaps: int = 0
    impulsiveTapCount: int = 0
    # Within-session emotional variability
    withinSessionDegradation: float = 0.0
    frustrationBurstCount: int = 0
    engagementDropRate: float = 0.0
    reactionTimeSpikeCount: int = 0


class GameResult(BaseModel):
    """Game result from a single session"""
    gameId: str
    score: float
    data: Optional[dict] = None
    timestamp: int
    behavioralMetrics: Optional[BehavioralMetrics] = None
    sessionNumber: Optional[int] = None


class ModelOutputs(BaseModel):
    """Temporal model outputs"""
    persistentDifficulty: float = Field(ge=0, le=100)
    effortInconsistency: float = Field(ge=0, le=100)
    improvementTrend: float = Field(ge=-100, le=100)
    volatilityScore: float = Field(ge=0, le=100)


class CECIScore(BaseModel):
    """Final CECI assessment score"""
    overall: int = Field(ge=0, le=100)
    riskBand: Literal['green', 'amber', 'red']
    confidence: int = Field(ge=0, le=100)
    treeBasedScore: int = Field(ge=0, le=100)
    temporalScore: int = Field(ge=0, le=100)
    bayesianCalibration: int = Field(ge=0, le=100)
    recommendation: str
    # 3-way classification (optional for backward compat)
    primaryClassification: Optional[Literal[
        'typical', 'emotional_variability', 'effort_variability', 'cognitive_risk'
    ]] = None
    emotionalVariabilityScore: Optional[int] = None   # 0-100
    effortVariabilityScore: Optional[int] = None      # 0-100


class PredictionRequest(BaseModel):
    """Request for CECI prediction"""
    results: List[GameResult]
    childName: str = "Child"


class PredictionResponse(BaseModel):
    """Response containing CECI score and metrics"""
    score: CECIScore
    pipelineMetrics: Optional[dict] = None
