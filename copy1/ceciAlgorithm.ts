import { GameResult, BehavioralMetrics, CECIScore, ModelOutputs, RiskBand } from './types';

/**
 * CECI Algorithm Implementation
 * Composite Early Childhood Indicator
 *
 * Hybrid approach combining:
 * 1. Tree-Based Model (RF/XGBoost simulation) - Feature importance
 * 2. Temporal Model (LSTM/GRU simulation) - Trend analysis
 * 3. Bayesian Calibration - Uncertainty quantification
 */

// Helper: Calculate standard deviation
const calculateStdDev = (values: number[]): number => {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
};

// Helper: Calculate average
const calculateAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

/**
 * Tree-Based Model Simulation (RF/XGBoost)
 * Analyzes aggregated behavioral features
 * Returns baseline risk score based on feature importance
 */
export const calculateTreeBasedScore = (results: GameResult[]): number => {
  if (results.length === 0) return 0;

  const metricsArray = results
    .filter(r => r.behavioralMetrics)
    .map(r => r.behavioralMetrics!);

  if (metricsArray.length === 0) return 0;

  // Feature extraction
  const avgAccuracy = calculateAverage(metricsArray.map(m => m.accuracy));
  const avgReactionTime = calculateAverage(metricsArray.map(m => m.averageReactionTime));
  const avgHesitation = calculateAverage(metricsArray.map(m => m.hesitationCount));
  const avgEngagement = calculateAverage(metricsArray.map(m => m.engagementScore));

  // Weighted scoring (simulating feature importance from Random Forest)
  // Higher accuracy and engagement = better score
  // Lower reaction time and hesitation = better score
  const accuracyScore = avgAccuracy;
  const reactionScore = Math.max(0, 100 - (avgReactionTime / 50)); // Normalize reaction time
  const hesitationScore = Math.max(0, 100 - (avgHesitation * 10)); // Penalize hesitation
  const engagementScore = avgEngagement;

  // Feature importance weights (derived from typical RF analysis)
  const weights = {
    accuracy: 0.35,
    reaction: 0.25,
    hesitation: 0.20,
    engagement: 0.20
  };

  const treeScore =
    accuracyScore * weights.accuracy +
    reactionScore * weights.reaction +
    hesitationScore * weights.hesitation +
    engagementScore * weights.engagement;

  return Math.min(100, Math.max(0, treeScore));
};

/**
 * Temporal Model Simulation (LSTM/GRU)
 * Analyzes session-by-session trends
 * Returns model outputs for persistent difficulty and effort inconsistency
 */
export const calculateTemporalModel = (results: GameResult[]): ModelOutputs => {
  if (results.length < 2) {
    return {
      persistentDifficulty: 0,
      effortInconsistency: 0,
      improvementTrend: 0,
      volatilityScore: 0
    };
  }

  // Sort by timestamp to maintain temporal order
  const sortedResults = [...results].sort((a, b) => a.timestamp - b.timestamp);
  const metricsArray = sortedResults
    .filter(r => r.behavioralMetrics)
    .map(r => r.behavioralMetrics!);

  if (metricsArray.length < 2) {
    return {
      persistentDifficulty: 0,
      effortInconsistency: 0,
      improvementTrend: 0,
      volatilityScore: 0
    };
  }

  // Calculate improvement trend (linear regression slope)
  const accuracies = metricsArray.map(m => m.accuracy);
  const scores = sortedResults.map(r => r.score);

  const improvementTrend = calculateTrend(accuracies);

  // Calculate volatility (consistency of performance)
  const accuracyStdDev = calculateStdDev(accuracies);
  const reactionTimeStdDev = calculateStdDev(metricsArray.map(m => m.averageReactionTime));

  const volatilityScore = Math.min(100, (accuracyStdDev + (reactionTimeStdDev / 10)) * 2);

  // Persistent difficulty: consistently low scores
  const avgAccuracy = calculateAverage(accuracies);
  const persistentDifficulty = Math.max(0, 100 - avgAccuracy);

  // Effort inconsistency: high volatility + variable engagement
  const engagementStdDev = calculateStdDev(metricsArray.map(m => m.engagementScore));
  const effortInconsistency = Math.min(100, (volatilityScore + engagementStdDev) / 2);

  return {
    persistentDifficulty,
    effortInconsistency,
    improvementTrend,
    volatilityScore
  };
};

/**
 * Calculate trend using simple linear regression
 * Positive = improving, Negative = declining, Zero = stable
 */
const calculateTrend = (values: number[]): number => {
  if (values.length < 2) return 0;

  const n = values.length;
  const xMean = (n - 1) / 2; // Time indices
  const yMean = calculateAverage(values);

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;

  // Normalize to -100 to 100 range
  return Math.min(100, Math.max(-100, slope * 10));
};

/**
 * Bayesian Calibration Layer
 * Provides uncertainty-aware probability estimation
 * Particularly important for borderline cases
 */
export const calculateBayesianCalibration = (
  treeScore: number,
  temporalOutputs: ModelOutputs,
  dataSize: number
): { calibratedScore: number; confidence: number } => {
  // Prior probability (baseline assumption)
  const prior = 0.5;

  // Likelihood based on model outputs
  const combinedScore = (treeScore + (100 - temporalOutputs.persistentDifficulty)) / 2;
  const likelihood = combinedScore / 100;

  // Evidence strength based on data size
  const evidenceStrength = Math.min(1, dataSize / 10); // More sessions = more confidence

  // Posterior probability (Bayesian update)
  const posterior = prior * (1 - evidenceStrength) + likelihood * evidenceStrength;

  // Confidence based on data size and model agreement
  const treeNorm = treeScore / 100;
  const temporalNorm = (100 - temporalOutputs.persistentDifficulty) / 100;
  const modelAgreement = 1 - Math.abs(treeNorm - temporalNorm);

  const confidence = Math.min(100, (evidenceStrength * 50 + modelAgreement * 50));

  const calibratedScore = posterior * 100;

  return { calibratedScore, confidence };
};

/**
 * Determine Risk Band based on CECI score
 * Green: Likely effort variability (normal)
 * Amber: Monitor closely
 * Red: Recommend specialist referral
 */
export const determineRiskBand = (
  ceciScore: number,
  confidence: number,
  temporalOutputs: ModelOutputs
): RiskBand => {
  // High persistent difficulty + low improvement trend = higher risk
  if (temporalOutputs.persistentDifficulty > 60 && temporalOutputs.improvementTrend < -20) {
    return 'red';
  }

  // Low confidence with borderline scores = amber
  if (confidence < 40 && ceciScore > 30 && ceciScore < 70) {
    return 'amber';
  }

  // CECI score thresholds
  if (ceciScore >= 70) {
    return 'green'; // Likely typical development
  } else if (ceciScore >= 40) {
    return 'amber'; // Monitor closely
  } else {
    return 'red'; // Recommend specialist
  }
};

/**
 * Generate recommendation based on risk band and model outputs
 */
export const generateRecommendation = (
  riskBand: RiskBand,
  temporalOutputs: ModelOutputs,
  childName: string
): string => {
  if (riskBand === 'green') {
    if (temporalOutputs.improvementTrend > 20) {
      return `${childName} is showing excellent progress! Performance is improving consistently. Continue current activities.`;
    }
    return `${childName} is developing typically. Regular engagement with learning activities is recommended.`;
  } else if (riskBand === 'amber') {
    if (temporalOutputs.effortInconsistency > 50) {
      return `Monitor ${childName} closely. Performance variability suggests inconsistent effort or engagement. Try establishing more consistent routines and reassess in 2-4 weeks.`;
    }
    return `${childName} shows some areas needing attention. Consider more frequent practice sessions and monitor progress closely. Consult with educator if concerns persist.`;
  } else {
    if (temporalOutputs.persistentDifficulty > 70) {
      return `Strong recommendation for professional assessment. ${childName} shows persistent difficulties across multiple areas. Early intervention can be highly beneficial.`;
    }
    return `Recommend consultation with a developmental specialist. ${childName} may benefit from professional evaluation and targeted support.`;
  }
};

/**
 * Main CECI Algorithm
 * Combines all models to produce final score and recommendation
 */
export const calculateCECI = (results: GameResult[], childName: string = 'Child'): CECIScore => {
  if (results.length === 0) {
    return {
      overall: 0,
      riskBand: 'amber',
      confidence: 0,
      treeBasedScore: 0,
      temporalScore: 0,
      bayesianCalibration: 0,
      recommendation: 'Insufficient data. Please complete more assessment sessions.'
    };
  }

  // Step 1: Tree-Based Model
  const treeBasedScore = calculateTreeBasedScore(results);

  // Step 2: Temporal Model
  const temporalOutputs = calculateTemporalModel(results);
  const temporalScore = 100 - temporalOutputs.persistentDifficulty;

  // Step 3: Bayesian Calibration
  const { calibratedScore, confidence } = calculateBayesianCalibration(
    treeBasedScore,
    temporalOutputs,
    results.length
  );

  // Step 4: Fusion into CECI
  // Weighted combination with emphasis on calibrated score
  const ceciOverall = (
    treeBasedScore * 0.3 +
    temporalScore * 0.3 +
    calibratedScore * 0.4
  );

  // Step 5: Determine Risk Band
  const riskBand = determineRiskBand(ceciOverall, confidence, temporalOutputs);

  // Step 6: Generate Recommendation
  const recommendation = generateRecommendation(riskBand, temporalOutputs, childName);

  return {
    overall: Math.round(ceciOverall),
    riskBand,
    confidence: Math.round(confidence),
    treeBasedScore: Math.round(treeBasedScore),
    temporalScore: Math.round(temporalScore),
    bayesianCalibration: Math.round(calibratedScore),
    recommendation
  };
};

/**
 * Calculate behavioral metrics from raw game data
 */
export const calculateBehavioralMetrics = (
  reactionTimes: number[],
  correctAttempts: number,
  incorrectAttempts: number,
  engagementScore: number
): BehavioralMetrics => {
  const totalAttempts = correctAttempts + incorrectAttempts;
  const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;

  const avgReactionTime = calculateAverage(reactionTimes);
  const reactionTimeVariability = calculateStdDev(reactionTimes);

  // Hesitation: reaction times significantly above average
  const hesitationThreshold = avgReactionTime * 1.5;
  const hesitationCount = reactionTimes.filter(rt => rt > hesitationThreshold).length;

  return {
    reactionTimes,
    accuracy,
    hesitationCount,
    engagementScore,
    correctAttempts,
    incorrectAttempts,
    averageReactionTime: avgReactionTime,
    reactionTimeVariability
  };
};
