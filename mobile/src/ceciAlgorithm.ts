
import { GameResult, BehavioralMetrics, CECIScore, ModelOutputs, RiskBand, TapEvent, PrimaryClassification } from './types';

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
  const rawCeci = 1 - (ceciScore / 100);
  if (rawCeci >= 0.65) return 'red';
  if (rawCeci >= 0.40) return 'amber';
  return 'green';
};

/**
 * Compute Emotional Variability Index (EVI) for a single session.
 * Returns a value 0-1.
 */
export const computeEVI = (metrics: BehavioralMetrics): number => {
  const emptySpaceRatio = (metrics.emptySpaceTapCount ?? 0) /
    Math.max(metrics.totalTapCount ?? 1, 1);

  const evi =
    0.30 * (metrics.withinSessionDegradation ?? 0) +
    0.25 * Math.min((metrics.frustrationBurstCount ?? 0) / 3, 1.0) +
    0.20 * (metrics.engagementDropRate ?? 0) +
    0.15 * Math.min((metrics.reactionTimeSpikeCount ?? 0) / 5, 1.0) +
    0.10 * Math.min(emptySpaceRatio / 0.5, 1.0);

  return Math.min(1, Math.max(0, evi));
};

/**
 * Determine primary classification from risk band and sub-scores.
 */
export const determinePrimaryClassification = (
  riskBand: RiskBand,
  evi: number,              // 0-1
  effortInconsistency: number, // 0-100
  persistentDifficulty: number  // 0-100
): PrimaryClassification => {
  const eviScore = evi * 100;

  if (riskBand === 'green') return 'typical';

  if (riskBand === 'amber') {
    if (eviScore > 40 && effortInconsistency < 40) return 'emotional_variability';
    if (effortInconsistency > 40 && eviScore < 40) return 'effort_variability';
    // When both are elevated or neither threshold met, use the higher one
    return effortInconsistency >= eviScore ? 'effort_variability' : 'emotional_variability';
  }

  // red band
  if (persistentDifficulty > 60 && eviScore < 35) return 'cognitive_risk';
  if (eviScore > 50) return 'emotional_variability';
  return 'cognitive_risk';
};

export const generateRecommendation = (
  riskBand: RiskBand,
  temporalOutputs: ModelOutputs,
  childName: string
): string => {
  if (riskBand === 'green') {
    return 'Developing typically. Continue monitoring across sessions.';
  } else if (riskBand === 'amber') {
    if (temporalOutputs.effortInconsistency > 50) {
      return 'Inconsistent engagement observed across sessions. Reassess under structured conditions.';
    }
    return 'Performance appears influenced by emotional state. Monitor conditions and retry in a calm environment before further assessment.';
  } else {
    if (temporalOutputs.persistentDifficulty > 70) {
      return 'Persistent low performance observed across sessions. Specialist evaluation recommended.';
    }
    return 'Persistent low performance observed across sessions. Specialist evaluation recommended.';
  }
};

const getRecommendationForClassification = (
  classification: PrimaryClassification
): string => {
  switch (classification) {
    case 'typical':
      return 'Developing typically. Continue monitoring across sessions.';
    case 'emotional_variability':
      return 'Performance appears influenced by emotional state. Monitor conditions and retry in a calm environment before further assessment.';
    case 'effort_variability':
      return 'Inconsistent engagement observed across sessions. Reassess under structured conditions.';
    case 'cognitive_risk':
      return 'Persistent low performance observed across sessions. Specialist evaluation recommended.';
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

  // Compute EVI across all sessions
  const metricsArray = results
    .filter(r => r.behavioralMetrics)
    .map(r => r.behavioralMetrics!);

  const avgEVI = metricsArray.length > 0
    ? metricsArray.reduce((sum, m) => sum + computeEVI(m), 0) / metricsArray.length
    : 0;

  // Updated CECI formula: w1×P_ID + w2×(1-Var(Acc)) - w3×P_Eff - w4×P_Emot
  // Weights: w1=0.45, w2=0.25, w3=0.15, w4=0.15
  const pid = temporalOutputs.persistentDifficulty / 100;
  const accVariance = Math.min(1, temporalOutputs.volatilityScore / 100);
  const peff = Math.min(1, temporalOutputs.effortInconsistency / 100);
  const pemot = avgEVI;

  const rawCeci = Math.min(1, Math.max(0,
    0.45 * pid + 0.25 * (1 - accVariance) - 0.15 * peff - 0.15 * pemot
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

  const primaryClassification = determinePrimaryClassification(
    riskBand,
    avgEVI,
    temporalOutputs.effortInconsistency,
    temporalOutputs.persistentDifficulty
  );

  const recommendation = getRecommendationForClassification(primaryClassification);

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
    primaryClassification,
    emotionalVariabilityScore: Math.round(avgEVI * 100),
    effortVariabilityScore: Math.round(temporalOutputs.effortInconsistency),
  };
};

export const calculateBehavioralMetrics = (
  reactionTimes: number[],
  correctAttempts: number,
  incorrectAttempts: number,
  engagementScore: number,
  tapData?: {
    tapEventLog?: TapEvent[];
    emptySpaceTapCount?: number;
  }
): BehavioralMetrics => {
  const totalAttempts = correctAttempts + incorrectAttempts;
  const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;
  const avgReactionTime = calculateAverage(reactionTimes);
  const reactionTimeVariability = calculateStdDev(reactionTimes);
  const hesitationThreshold = avgReactionTime * 1.5;
  const hesitationCount = reactionTimes.filter(rt => rt > hesitationThreshold).length;

  // Tap tracking
  const tapEventLog = tapData?.tapEventLog ?? [];
  const emptySpaceTapCount = tapData?.emptySpaceTapCount ?? 0;
  const totalTapCount = correctAttempts + incorrectAttempts + emptySpaceTapCount;

  // Consecutive empty space taps (max run)
  let maxRun = 0, curRun = 0;
  for (const tap of tapEventLog) {
    if (tap.type === 'empty_space') {
      curRun++;
      maxRun = Math.max(maxRun, curRun);
    } else {
      curRun = 0;
    }
  }
  const consecutiveEmptySpaceTaps = maxRun;

  // Impulsive taps (RT < 200ms)
  const impulsiveTapCount = tapEventLog.filter(t => t.reactionTime < 200).length;

  // Within-session degradation: (first_half_acc - second_half_acc) / max(first_half_acc, 1)
  const actionTaps = tapEventLog.filter(t => t.type === 'correct' || t.type === 'incorrect');
  let withinSessionDegradation = 0;
  if (actionTaps.length >= 4) {
    const half = Math.floor(actionTaps.length / 2);
    const firstHalf = actionTaps.slice(0, half);
    const secondHalf = actionTaps.slice(half);
    const firstAcc = firstHalf.filter(t => t.type === 'correct').length / firstHalf.length;
    const secondAcc = secondHalf.filter(t => t.type === 'correct').length / secondHalf.length;
    withinSessionDegradation = Math.min(1, Math.max(0,
      (firstAcc - secondAcc) / Math.max(firstAcc, 0.01)
    ));
  }

  // Frustration burst count: runs of ≥3 consecutive incorrect+empty taps
  let frustrationBurstCount = 0;
  let frustRun = 0;
  for (const tap of tapEventLog) {
    if (tap.type === 'incorrect' || tap.type === 'empty_space') {
      frustRun++;
      if (frustRun === 3) frustrationBurstCount++;
    } else {
      frustRun = 0;
    }
  }

  // Reaction time spike count (RT > 3× session average)
  const reactionTimeSpikeCount = avgReactionTime > 0
    ? reactionTimes.filter(rt => rt > avgReactionTime * 3).length
    : 0;

  // Engagement drop rate: compare correct tap density in first vs last quarter
  let engagementDropRate = 0;
  if (tapEventLog.length >= 8) {
    const quarter = Math.floor(tapEventLog.length / 4);
    const firstQ = tapEventLog.slice(0, quarter);
    const lastQ = tapEventLog.slice(-quarter);
    const firstCorrectRate = firstQ.filter(t => t.type === 'correct').length / quarter;
    const lastCorrectRate = lastQ.filter(t => t.type === 'correct').length / quarter;
    const peak = Math.max(firstCorrectRate, 0.01);
    engagementDropRate = Math.max(0, Math.min(1, (peak - lastCorrectRate) / peak));
  }

  return {
    reactionTimes,
    accuracy,
    hesitationCount,
    engagementScore,
    correctAttempts,
    incorrectAttempts,
    averageReactionTime: avgReactionTime,
    reactionTimeVariability,
    totalTapCount,
    emptySpaceTapCount,
    consecutiveEmptySpaceTaps,
    impulsiveTapCount,
    tapEventLog,
    withinSessionDegradation,
    frustrationBurstCount,
    engagementDropRate,
    reactionTimeSpikeCount,
  };
};
