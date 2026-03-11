
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

export function useCECICalculation(
  results: GameResult[],
  childName: string = 'Child',
  childAge: number = 5,
  options: UseCECICalculationOptions = {}
): CECICalculationResult {
  const { useMLPipeline = true, enableFallback = true, autoCalculate = false } = options;

  const [score, setScore] = useState<CECIScore | null>(null);
  const [source, setSource] = useState<'api' | 'local' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState(false);

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
    const interval = setInterval(checkAvailability, 30000);
    return () => clearInterval(interval);
  }, [useMLPipeline]);

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
          const result = await calculateCECIWithFallback(gameResults, name, calculateCECILocal, childAge);
          setScore(result.score);
          setSource(result.source);
          if (result.error) {
            setError(`Using local calculation: ${result.error}`);
          }
        } else if (useMLPipeline) {
          const apiService = getCECIApiService();
          const apiScore = await apiService.calculateCECI(gameResults, name, childAge);
          setScore(apiScore);
          setSource('api');
        } else {
          const localScore = calculateCECILocal(gameResults, name);
          setScore(localScore);
          setSource('local');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        if (enableFallback) {
          try {
            const localScore = calculateCECILocal(gameResults, name);
            setScore(localScore);
            setSource('local');
          } catch {
            setError('Both API and local calculation failed');
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [useMLPipeline, enableFallback, childName, childAge]
  );

  useEffect(() => {
    if (autoCalculate && results.length > 0) {
      calculate(results, childName);
    }
  }, [autoCalculate, results, childName, calculate]);

  const reset = useCallback(() => {
    setScore(null);
    setSource(null);
    setError(null);
    setLoading(false);
  }, []);

  return { score, source, loading, error, apiAvailable, calculate, reset };
}
