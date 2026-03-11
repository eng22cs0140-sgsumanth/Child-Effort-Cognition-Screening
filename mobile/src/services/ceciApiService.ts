
import axios from 'axios';
import { GameResult, CECIScore } from '../types';
import { API_BASE_URL, getAgeGroup } from '../constants';

// Flask API session format
interface FlaskSession {
  accuracy: number;
  mean_reaction_time: number;
  hesitation_ratio: number;
  task_completion_rate: number;
  error_burst_rate: number;
  engagement_score: number;
}

interface FlaskPredictRequest {
  sessions: FlaskSession[];
  child_id: number;
  age_group: '0-2' | '3-5' | '6-9';
}

interface FlaskPredictResponse {
  ceci_score: number;
  risk_band: string;
  confidence: number;
  tree_baseline_proba: number;
  components: {
    pid: { value: number; weight: number; contribution: number; interpretation: string };
    consistency: { value: number; variance: number; weight: number; contribution: number; interpretation: string };
    effort: { value: number; weight: number; adjustment: number; interpretation: string };
  };
  uncertainty: number;
  clinical_note: string;
  age_group: string;
  n_sessions: number;
}

function gameResultsToSessions(results: GameResult[]): FlaskSession[] {
  return results
    .filter(r => r.behavioralMetrics)
    .map(r => {
      const m = r.behavioralMetrics!;
      const totalAttempts = m.correctAttempts + m.incorrectAttempts;
      const accuracy = (m.accuracy ?? 0) / 100;
      const hesitationRatio = totalAttempts > 0 ? m.hesitationCount / totalAttempts : 0;
      const errorBurstRate = totalAttempts > 0 ? (m.incorrectAttempts / totalAttempts) * 0.5 : 0;

      return {
        accuracy,
        mean_reaction_time: (m.averageReactionTime ?? 0) / 1000,
        hesitation_ratio: Math.min(1, hesitationRatio),
        task_completion_rate: accuracy,
        error_burst_rate: Math.min(1, errorBurstRate),
        engagement_score: (m.engagementScore ?? 0) / 100,
      };
    });
}

function flaskResponseToCECIScore(resp: FlaskPredictResponse): CECIScore {
  const riskBand = (resp.risk_band === 'red' || resp.risk_band === 'amber' || resp.risk_band === 'green')
    ? resp.risk_band
    : 'amber';

  return {
    overall: Math.round((1 - resp.ceci_score) * 100),
    riskBand,
    confidence: Math.round(resp.confidence * 100),
    treeBasedScore: Math.round((1 - resp.tree_baseline_proba) * 100),
    temporalScore: Math.round((1 - resp.components.pid.value) * 100),
    bayesianCalibration: Math.round((1 - resp.ceci_score) * 100),
    recommendation: resp.clinical_note,
    pid: resp.components.pid.value,
    peff: resp.components.effort.value,
    uncertainty: resp.uncertainty,
    clinicalNote: resp.clinical_note,
    components: resp.components,
    ageGroup: resp.age_group,
    nSessions: resp.n_sessions,
  };
}

export class CECIApiService {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = API_BASE_URL, timeout: number = 10000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/`, { timeout: this.timeout });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async calculateCECI(
    results: GameResult[],
    childName: string = 'Child',
    childAge: number = 5
  ): Promise<CECIScore> {
    const sessions = gameResultsToSessions(results);
    if (sessions.length === 0) {
      throw new Error('No valid sessions with behavioral metrics');
    }

    const requestData: FlaskPredictRequest = {
      sessions,
      child_id: 1,
      age_group: getAgeGroup(childAge),
    };

    const response = await axios.post<FlaskPredictResponse>(
      `${this.baseUrl}/api/predict`,
      requestData,
      { timeout: this.timeout }
    );

    return flaskResponseToCECIScore(response.data);
  }
}

let apiServiceInstance: CECIApiService | null = null;

export function getCECIApiService(): CECIApiService {
  if (!apiServiceInstance) {
    apiServiceInstance = new CECIApiService();
  }
  return apiServiceInstance;
}

export async function calculateCECIWithFallback(
  results: GameResult[],
  childName: string = 'Child',
  localCalculator: (results: GameResult[], name: string) => CECIScore,
  childAge: number = 5
): Promise<{ score: CECIScore; source: 'api' | 'local'; error?: string }> {
  const apiService = getCECIApiService();

  try {
    const isAvailable = await apiService.isAvailable();
    if (isAvailable) {
      const score = await apiService.calculateCECI(results, childName, childAge);
      return { score, source: 'api' };
    } else {
      const score = localCalculator(results, childName);
      return { score, source: 'local', error: 'API not available' };
    }
  } catch (error) {
    const score = localCalculator(results, childName);
    return {
      score,
      source: 'local',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export default getCECIApiService();
