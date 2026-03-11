
import { GameResult, BehavioralMetrics, CECIScore, ModelOutputs, RiskBand } from './types';

const calculateStdDev = (values: number[]): number => {
  if (values.length === 0) return 0;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
};

const calculateAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

export const calculateTreeBasedScore = (results: GameResult[]): number => {
  if (results.length === 0) return 0;

  const metricsArray = results
    .filter(r => r.behavioralMetrics)
    .map(r => r.behavioralMetrics!);

  if (metricsArray.length === 0) return 0;

  const avgAccuracy = calculateAverage(metricsArray.map(m => m.accuracy));
  const avgReactionTime = calculateAverage(metricsArray.map(m => m.averageReactionTime));
  const avgHesitation = calculateAverage(metricsArray.map(m => m.hesitationCount));
  const avgEngagement = calculateAverage(metricsArray.map(m => m.engagementScore));

  const accuracyScore = avgAccuracy;
  const reactionScore = Math.max(0, 100 - (avgReactionTime / 50));
  const hesitationScore = Math.max(0, 100 - (avgHesitation * 10));
  const engagementScore = avgEngagement;

  const weights = {
    accuracy: 0.35,
    reaction: 0.25,
    hesitation: 0.20,
    engagement: 0.20,
  };

  const treeScore =
    accuracyScore * weights.accuracy +
    reactionScore * weights.reaction +
    hesitationScore * weights.hesitation +
    engagementScore * weights.engagement;

  return Math.min(100, Math.max(0, treeScore));
};

export const calculateTemporalModel = (results: GameResult[]): ModelOutputs => {
  if (results.length < 2) {
    return { persistentDifficulty: 0, effortInconsistency: 0, improvementTrend: 0, volatilityScore: 0 };
  }

  const sortedResults = [...results].sort((a, b) => a.timestamp - b.timestamp);
  const metricsArray = sortedResults
    .filter(r => r.behavioralMetrics)
    .map(r => r.behavioralMetrics!);

  if (metricsArray.length < 2) {
    return { persistentDifficulty: 0, effortInconsistency: 0, improvementTrend: 0, volatilityScore: 0 };
  }

  const accuracies = metricsArray.map(m => m.accuracy);
  const improvementTrend = calculateTrend(accuracies);
  const accuracyStdDev = calculateStdDev(accuracies);
  const reactionTimeStdDev = calculateStdDev(metricsArray.map(m => m.averageReactionTime));
  const volatilityScore = Math.min(100, (accuracyStdDev + (reactionTimeStdDev / 10)) * 2);
  const avgAccuracy = calculateAverage(accuracies);
  const persistentDifficulty = Math.max(0, 100 - avgAccuracy);
  const engagementStdDev = calculateStdDev(metricsArray.map(m => m.engagementScore));
  const effortInconsistency = Math.min(100, (volatilityScore + engagementStdDev) / 2);

  return { persistentDifficulty, effortInconsistency, improvementTrend, volatilityScore };
};

const calculateTrend = (values: number[]): number => {
  if (values.length < 2) return 0;

  const n = values.length;
  const xMean = (n - 1) / 2;
  const yMean = calculateAverage(values);

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  return Math.min(100, Math.max(-100, slope * 10));
};

export const calculateBayesianCalibration = (
  treeScore: number,
  temporalOutputs: ModelOutputs,
  dataSize: number
): { calibratedScore: number; confidence: number } => {
  const prior = 0.5;
  const combinedScore = (treeScore + (100 - temporalOutputs.persistentDifficulty)) / 2;
  const likelihood = combinedScore / 100;
  const evidenceStrength = Math.min(1, dataSize / 10);
  const posterior = prior * (1 - evidenceStrength) + likelihood * evidenceStrength;
  const treeNorm = treeScore / 100;
  const temporalNorm = (100 - temporalOutputs.persistentDifficulty) / 100;
  const modelAgreement = 1 - Math.abs(treeNorm - temporalNorm);
  const confidence = Math.min(100, (evidenceStrength * 50 + modelAgreement * 50));
  const calibratedScore = posterior * 100;

  return { calibratedScore, confidence };
};

export const determineRiskBand = (
  ceciScore: number,
  confidence: number,
  temporalOutputs: ModelOutputs
): RiskBand => {
  // Paper thresholds: 0.0-0.40 = green, 0.40-0.65 = amber, 0.65-1.0 = red
  // ceciScore here is already in display scale (0-100, higher = better)
  // Convert back: rawCeci = 1 - (ceciScore/100)
  const rawCeci = 1 - (ceciScore / 100);
  if (rawCeci >= 0.65) return 'red';
  if (rawCeci >= 0.40) return 'amber';
  return 'green';
};

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

export const calculateCECI = (results: GameResult[], childName: string = 'Child'): CECIScore => {
  if (results.length === 0) {
    return {
      overall: 0,
      riskBand: 'amber',
      confidence: 0,
      treeBasedScore: 0,
      temporalScore: 0,
      bayesianCalibration: 0,
      recommendation: 'Insufficient data. Please complete more assessment sessions.',
    };
  }

  const treeBasedScore = calculateTreeBasedScore(results);
  const temporalOutputs = calculateTemporalModel(results);

  // Paper formula: CECI = 0.5×PID + 0.3×(1-Var(Acc)) - 0.2×PEff
  // Map internal metrics to paper variables (0-1 scale)
  const pid = temporalOutputs.persistentDifficulty / 100;
  const accVariance = Math.min(1, temporalOutputs.volatilityScore / 100);
  const peff = Math.min(1, temporalOutputs.effortInconsistency / 100);

  const rawCeci = Math.min(1, Math.max(0,
    0.5 * pid + 0.3 * (1 - accVariance) - 0.2 * peff
  ));

  // Display score: higher = better (inverted from raw)
  const ceciOverall = (1 - rawCeci) * 100;

  const { calibratedScore, confidence } = calculateBayesianCalibration(
    treeBasedScore,
    temporalOutputs,
    results.length
  );

  const temporalScore = Math.round((1 - pid) * 100);
  const riskBand = determineRiskBand(ceciOverall, confidence, temporalOutputs);
  const recommendation = generateRecommendation(riskBand, temporalOutputs, childName);

  return {
    overall: Math.round(ceciOverall),
    riskBand,
    confidence: Math.round(confidence),
    treeBasedScore: Math.round(treeBasedScore),
    temporalScore,
    bayesianCalibration: Math.round(calibratedScore),
    recommendation,
    pid,
    peff,
  };
};

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
    reactionTimeVariability,
  };
};
