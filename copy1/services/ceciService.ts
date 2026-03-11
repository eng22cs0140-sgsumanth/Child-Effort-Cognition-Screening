import { AssessmentSession, DomainIndices, GameResult } from '../types';

export interface CECIComponents {
  pid: {
    value: number;
    weight: number;
    contribution: number;
    interpretation: string;
  };
  consistency: {
    value: number;
    variance: number;
    weight: number;
    contribution: number;
    interpretation: string;
  };
  effort: {
    value: number;
    weight: number;
    adjustment: number;
    interpretation: string;
  };
}

export interface CECIResult {
  ceciScore: number;
  riskBand: 'green' | 'amber' | 'red';
  riskLabel: string;
  riskColor: string;
  components: CECIComponents;
  clinicalNote: string;
}

const DEFAULT_WEIGHTS = {
  w1: 0.50,  // PID weight (persistent cognitive difficulty)
  w2: 0.30,  // Consistency weight (1 - Var(Acc))
  w3: 0.20,  // PEff weight (low effort penalty reduction)
};

const RISK_BANDS = {
  green: { min: 0.0, max: 0.40, label: "Low Risk", color: "#22c55e" },
  amber: { min: 0.40, max: 0.65, label: "Moderate Risk - Monitor", color: "#f59e0b" },
  red:   { min: 0.65, max: 1.0, label: "High Risk - Refer", color: "#ef4444" },
};

export const computeCECI = (
  pid: number,
  varAcc: number,
  peff: number
): number => {
  const w = DEFAULT_WEIGHTS;
  const ceci = w.w1 * pid + w.w2 * (1.0 - varAcc) - w.w3 * peff;
  return Math.max(0, Math.min(1, ceci));
};

export const classifyRiskBand = (ceci: number): typeof RISK_BANDS['green'] & { band: 'green' | 'amber' | 'red' } => {
  if (ceci >= RISK_BANDS.red.min) return { ...RISK_BANDS.red, band: 'red' };
  if (ceci >= RISK_BANDS.amber.min) return { ...RISK_BANDS.amber, band: 'amber' };
  return { ...RISK_BANDS.green, band: 'green' };
};

const interpretPID = (pid: number): string => {
  if (pid > 0.7) return "Strong indicators of persistent cognitive difficulty across sessions";
  if (pid > 0.4) return "Moderate indicators of cognitive difficulty; further monitoring recommended";
  return "Low indicators of persistent cognitive difficulty";
};

const interpretConsistency = (varAcc: number): string => {
  if (varAcc > 0.05) return "High session-to-session variability suggests inconsistent performance";
  if (varAcc > 0.02) return "Moderate consistency across sessions";
  return "Highly consistent performance across sessions";
};

const interpretEffort = (peff: number): string => {
  if (peff > 0.6) return "Strong signs of inconsistent effort or engagement fluctuation";
  if (peff > 0.3) return "Some variability in effort and engagement detected";
  return "Effort and engagement appear consistent";
};

const generateClinicalNote = (
  ceci: number,
  pid: number,
  varAcc: number,
  peff: number,
  band: string
): string => {
  if (band === "red") {
    return `CECI score of ${ceci.toFixed(2)} indicates HIGH RISK. Persistent cognitive difficulty probability (${(pid * 100).toFixed(0)}%) is elevated with ${varAcc < 0.03 ? 'stable' : 'variable'} performance patterns. Referral for comprehensive assessment is recommended.`;
  } else if (band === "amber") {
    return `CECI score of ${ceci.toFixed(2)} indicates MODERATE RISK. Continued monitoring through additional game sessions is advised. ${peff > 0.4 ? 'Effort variability detected — poor performance may partly reflect engagement issues.' : 'Performance patterns warrant further observation.'}`;
  } else {
    return `CECI score of ${ceci.toFixed(2)} indicates LOW RISK. Performance is within expected range. ${peff > 0.3 ? 'Note: some effort fluctuation detected.' : 'Engagement appears consistent.'}`;
  }
};

// ── Domain Index Mapping (paper's game categories → neuropsychological indices) ──
const DOMAIN_GAMES: Record<keyof DomainIndices, string[]> = {
  VMI: ['maze', 'shapes'],      // Visual-Motor Integration
  FRI: ['memory', 'counting'],  // Fluid Reasoning Index
  LCI: ['sound'],               // Language Comprehension Index
  IFI: ['simon', 'category'],   // Inhibitory Function Index
  API: ['catcher'],             // Attention Processing Index
  ATI: ['leader', 'emotion'],   // Attention-Task Integration
};

// Compute the six domain indices from current session results
export const computeDomainIndices = (results: GameResult[]): DomainIndices => {
  const avg = (gameIds: string[]): number => {
    const relevant = results.filter(r => gameIds.includes(r.gameId));
    if (relevant.length === 0) return 0;
    return Math.round(relevant.reduce((sum, r) => sum + Math.min(100, r.score), 0) / relevant.length);
  };
  return {
    VMI: avg(DOMAIN_GAMES.VMI),
    FRI: avg(DOMAIN_GAMES.FRI),
    LCI: avg(DOMAIN_GAMES.LCI),
    IFI: avg(DOMAIN_GAMES.IFI),
    API: avg(DOMAIN_GAMES.API),
    ATI: avg(DOMAIN_GAMES.ATI),
  };
};

// Multi-session CECI parameter estimation per paper Eq.(1) and Eq.(3)
// Acc_j = mean score/100 across games in session j
// Var(Acc) = (1/S) Σ(Acc_j − μ_Acc)²
export const estimateCECIParametersFromSessions = (
  prevSessions: AssessmentSession[],
  currentResults: GameResult[]
): { pid: number; varAcc: number; peff: number; insufficientData: boolean } => {
  const sessionAccuracies: number[] = prevSessions.map(s => s.sessionAccuracy);
  if (currentResults.length > 0) {
    const currentAcc = currentResults.reduce((sum, r) => sum + r.score / 100, 0) / currentResults.length;
    sessionAccuracies.push(currentAcc);
  }

  const S = sessionAccuracies.length;
  if (S < 2) {
    const fallback = estimateCECIParameters(currentResults.length > 0 ? currentResults : prevSessions.flatMap(s => s.results));
    return { ...fallback, insufficientData: true };
  }

  // Paper's Eq.(3)
  const mu = sessionAccuracies.reduce((a, b) => a + b, 0) / S;
  const varAcc = sessionAccuracies.reduce((sum, acc) => sum + Math.pow(acc - mu, 2), 0) / S;

  const pid = Math.max(0, Math.min(1, 1 - mu));
  const peff = (varAcc > 0.05 || mu < 0.3) ? 0.4 : 0.1;

  return { pid, varAcc: Math.min(1, varAcc * 2), peff, insufficientData: false };
};

export const getCECIBreakdown = async (
  pid: number,
  varAcc: number,
  peff: number,
  sessionAccuracies?: number[]
): Promise<CECIResult> => {
  try {
    const response = await fetch('/api/ceci/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid, var_acc: varAcc, peff, session_accuracies: sessionAccuracies }),
    });

    if (!response.ok) {
      throw new Error('Backend analysis failed');
    }

    const data = await response.json();

    return {
      ceciScore: data.ceci_score,
      riskBand: data.risk_band,
      riskLabel: data.risk_label,
      riskColor: data.risk_color,
      components: data.components,
      clinicalNote: data.clinical_note,
    };
  } catch (error) {
    console.error('Error calling Python CECI model:', error);
    // Fallback logic if backend is unavailable
    const w = DEFAULT_WEIGHTS;
    const ceci = Math.max(0, Math.min(1, w.w1 * pid + w.w2 * (1.0 - varAcc) - w.w3 * peff));
    const risk = classifyRiskBand(ceci);

    return {
      ceciScore: ceci,
      riskBand: risk.band,
      riskLabel: risk.label,
      riskColor: risk.color,
      components: {
        pid: { value: pid, weight: w.w1, contribution: w.w1 * pid, interpretation: interpretPID(pid) },
        consistency: { value: 1.0 - varAcc, variance: varAcc, weight: w.w2, contribution: w.w2 * (1.0 - varAcc), interpretation: interpretConsistency(varAcc) },
        effort: { value: peff, weight: w.w3, adjustment: w.w3 * peff, interpretation: interpretEffort(peff) },
      },
      clinicalNote: generateClinicalNote(ceci, pid, varAcc, peff, risk.band),
    };
  }
};

/**
 * Heuristic-based estimation of PID and PEff for demo purposes
 * In a real app, these would come from a trained ML model.
 */
export const estimateCECIParameters = (results: any[]) => {
  if (results.length < 2) {
    // We need at least 2 sessions to calculate variance/consistency meaningfully
    // If 0 or 1 session, we can estimate PID but consistency is unknown
    const avgScore = results.length === 1 ? results[0].score / 100 : 0;
    return {
      pid: results.length === 1 ? Math.max(0, 1 - avgScore) : 0,
      varAcc: 0.5, // Default to middle-ground variance if unknown
      peff: 0.2,
      insufficientData: results.length < 2
    };
  }

  const scores = results.map(r => r.score / 100);

  // PID: Persistent difficulty is higher if scores are consistently low
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const pid = Math.max(0, 1 - avgScore);

  // VarAcc: Variance of accuracy across sessions
  const mean = avgScore;
  const variance = scores.length > 1
    ? scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (scores.length - 1)
    : 0;
  const varAcc = Math.min(1, variance * 2); // Scale variance for sensitivity

  // PEff: Probability of low effort
  // Heuristic: High variance or very low scores in simple games might indicate low effort
  const peff = (variance > 0.05 || avgScore < 0.3) ? 0.4 : 0.1;

  return { pid, varAcc, peff };
};
