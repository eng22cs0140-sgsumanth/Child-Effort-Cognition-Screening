/**
 * CECI ML Pipeline API Service
 * Handles communication with the Python ML Pipeline backend
 */

import { GameResult, CECIScore } from '../types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_TIMEOUT = 10000; // 10 seconds

// API Response Types
interface PredictionRequest {
  results: GameResult[];
  childName: string;
}

interface PredictionResponse {
  score: CECIScore;
  pipelineMetrics?: {
    stages: Array<{
      stage_name: string;
      execution_time: number;
      input_size: number;
    }>;
    total_execution_time: number;
  };
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  pipeline_stages: number;
  config?: any;
}

interface ConfigResponse {
  feature_engineering: any;
  tree_model: any;
  temporal_model: any;
  bayesian: any;
  risk_assessment: any;
}

/**
 * CECI API Client
 */
export class CECIApiService {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = API_BASE_URL, timeout: number = API_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Make HTTP request with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - ML Pipeline is not responding');
      }
      throw error;
    }
  }

  /**
   * Check if API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get API health status
   */
  async getHealth(): Promise<HealthResponse> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/health`);

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get pipeline configuration
   */
  async getConfig(): Promise<ConfigResponse> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/config`);

    if (!response.ok) {
      throw new Error(`Failed to get config: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Calculate CECI score using ML Pipeline
   */
  async calculateCECI(
    results: GameResult[],
    childName: string = 'Child'
  ): Promise<CECIScore> {
    const requestData: PredictionRequest = {
      results,
      childName,
    };

    const response = await this.fetchWithTimeout(`${this.baseUrl}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Prediction failed: ${errorText}`);
    }

    const data: PredictionResponse = await response.json();
    return data.score;
  }

  /**
   * Calculate CECI score with detailed metrics
   */
  async calculateCECIWithMetrics(
    results: GameResult[],
    childName: string = 'Child'
  ): Promise<PredictionResponse> {
    const requestData: PredictionRequest = {
      results,
      childName,
    };

    const response = await this.fetchWithTimeout(`${this.baseUrl}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Prediction failed: ${errorText}`);
    }

    return response.json();
  }
}

// Singleton instance
let apiServiceInstance: CECIApiService | null = null;

/**
 * Get or create API service instance
 */
export function getCECIApiService(): CECIApiService {
  if (!apiServiceInstance) {
    apiServiceInstance = new CECIApiService();
  }
  return apiServiceInstance;
}

/**
 * Calculate CECI score with automatic fallback
 * Tries API first, falls back to local calculation if API unavailable
 */
export async function calculateCECIWithFallback(
  results: GameResult[],
  childName: string = 'Child',
  localCalculator: (results: GameResult[], name: string) => CECIScore
): Promise<{ score: CECIScore; source: 'api' | 'local'; error?: string }> {
  const apiService = getCECIApiService();

  try {
    // Try API first
    const isAvailable = await apiService.isAvailable();

    if (isAvailable) {
      const score = await apiService.calculateCECI(results, childName);
      return { score, source: 'api' };
    } else {
      // API not available, use local
      console.warn('ML Pipeline API not available, using local calculation');
      const score = localCalculator(results, childName);
      return {
        score,
        source: 'local',
        error: 'API not available',
      };
    }
  } catch (error) {
    // API error, fallback to local
    console.error('ML Pipeline API error:', error);
    const score = localCalculator(results, childName);
    return {
      score,
      source: 'local',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export default instance
export default getCECIApiService();
