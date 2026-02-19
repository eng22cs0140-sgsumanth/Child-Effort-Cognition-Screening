/**
 * Custom React Hook for CECI Calculation
 * Manages ML Pipeline integration with fallback to local calculation
 */

import { useState, useEffect, useCallback } from 'react';
import { GameResult, CECIScore } from '../types';
import { calculateCECIWithFallback, getCECIApiService } from '../services/ceciApiService';
import { calculateCECI as calculateCECILocal } from '../ceciAlgorithm';

interface UseCECICalculationOptions {
  useMLPipeline?: boolean;
  enableFallback?: boolean;
  autoCalculate?: boolean;
}

interface CECICalculationResult {
  score: CECIScore | null;
  source: 'api' | 'local' | null;
  loading: boolean;
  error: string | null;
  apiAvailable: boolean;
  calculate: (results: GameResult[], childName?: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for CECI calculation with ML Pipeline integration
 */
export function useCECICalculation(
  results: GameResult[],
  childName: string = 'Child',
  options: UseCECICalculationOptions = {}
): CECICalculationResult {
  const {
    useMLPipeline = import.meta.env.VITE_USE_ML_PIPELINE === 'true',
    enableFallback = import.meta.env.VITE_ENABLE_FALLBACK !== 'false',
    autoCalculate = false,
  } = options;

  const [score, setScore] = useState<CECIScore | null>(null);
  const [source, setSource] = useState<'api' | 'local' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState(false);

  // Check API availability
  useEffect(() => {
    if (!useMLPipeline) return;

    const checkAvailability = async () => {
      try {
        const apiService = getCECIApiService();
        const available = await apiService.isAvailable();
        setApiAvailable(available);
      } catch {
        setApiAvailable(false);
      }
    };

    checkAvailability();
    // Re-check every 30 seconds
    const interval = setInterval(checkAvailability, 30000);

    return () => clearInterval(interval);
  }, [useMLPipeline]);

  // Calculate CECI score
  const calculate = useCallback(
    async (gameResults: GameResult[], name: string = childName) => {
      if (gameResults.length === 0) {
        setScore(null);
        setSource(null);
        setError('No game results available');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        if (useMLPipeline && enableFallback) {
          // Use API with fallback
          const result = await calculateCECIWithFallback(
            gameResults,
            name,
            calculateCECILocal
          );
          setScore(result.score);
          setSource(result.source);
          if (result.error) {
            setError(`Using local calculation: ${result.error}`);
          }
        } else if (useMLPipeline) {
          // Use API only (no fallback)
          const apiService = getCECIApiService();
          const apiScore = await apiService.calculateCECI(gameResults, name);
          setScore(apiScore);
          setSource('api');
        } else {
          // Use local calculation only
          const localScore = calculateCECILocal(gameResults, name);
          setScore(localScore);
          setSource('local');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);

        // Fallback to local if enabled
        if (enableFallback) {
          try {
            const localScore = calculateCECILocal(gameResults, name);
            setScore(localScore);
            setSource('local');
          } catch (localErr) {
            setError('Both API and local calculation failed');
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [useMLPipeline, enableFallback, childName]
  );

  // Auto-calculate when results change
  useEffect(() => {
    if (autoCalculate && results.length > 0) {
      calculate(results, childName);
    }
  }, [autoCalculate, results, childName, calculate]);

  // Reset function
  const reset = useCallback(() => {
    setScore(null);
    setSource(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    score,
    source,
    loading,
    error,
    apiAvailable,
    calculate,
    reset,
  };
}

/**
 * Simpler hook that just returns the calculated score
 */
export function useCECIScore(
  results: GameResult[],
  childName: string = 'Child'
): CECIScore | null {
  const { score } = useCECICalculation(results, childName, { autoCalculate: true });
  return score;
}
