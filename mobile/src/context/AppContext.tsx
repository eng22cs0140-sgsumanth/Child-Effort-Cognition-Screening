
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserRole, ChildProfile, ParentProfile, GameResult, Observation } from '../types';

const SESSION_STORAGE_KEY = 'ceci_game_results';
const CHILD_PROFILE_KEY = 'ceci_child_profile';

interface AppState {
  role: UserRole | null;
  parent: ParentProfile;
  child: ChildProfile;
  results: GameResult[];
  setRole: (role: UserRole | null) => void;
  setParent: (p: ParentProfile) => void;
  setChild: (c: ChildProfile) => void;
  addResult: (result: GameResult) => void;
  clearResults: () => void;
  addObservation: (text: string) => void;
  calculateAge: (dob: string) => number;
  calculateBMI: (heightCm: number, weightKg: number) => number;
  resetApp: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

const defaultChild: ChildProfile = {
  name: '',
  dob: '',
  age: 0,
  sex: '',
  isPremature: null,
  gestationalAgeWeeks: 0,
  familyHistoryOfDD: null,
  knownConditions: '',
  bloodGroup: '',
  height: 0,
  weight: 0,
  bmi: 0,
  observations: [],
};

const defaultParent: ParentProfile = {
  name: '',
  email: '',
  relationship: '',
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [parent, setParent] = useState<ParentProfile>(defaultParent);
  const [child, setChildState] = useState<ChildProfile>(defaultChild);
  const [results, setResults] = useState<GameResult[]>([]);

  // Load persisted data on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [savedResults, savedChild] = await Promise.all([
          AsyncStorage.getItem(SESSION_STORAGE_KEY),
          AsyncStorage.getItem(CHILD_PROFILE_KEY),
        ]);
        if (savedResults) setResults(JSON.parse(savedResults));
        if (savedChild) setChildState(JSON.parse(savedChild));
      } catch {}
    };
    load();
  }, []);

  // Persist results whenever they change
  useEffect(() => {
    AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(results)).catch(() => {});
  }, [results]);

  const setChild = (c: ChildProfile) => {
    setChildState(c);
    AsyncStorage.setItem(CHILD_PROFILE_KEY, JSON.stringify(c)).catch(() => {});
  };

  const calculateAge = (dob: string): number => {
    if (!dob) return 0;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return Math.max(0, Math.min(9, age));
  };

  const calculateBMI = (heightCm: number, weightKg: number): number => {
    if (heightCm <= 0 || weightKg <= 0) return 0;
    const heightM = heightCm / 100;
    return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
  };

  const addResult = (result: GameResult) => {
    const gameSessionNumber = results.filter(r => r.gameId === result.gameId).length + 1;
    const enhancedResult: GameResult = {
      ...result,
      behavioralMetrics: result.data?.behavioralMetrics,
      sessionNumber: gameSessionNumber,
    };
    setResults(prev => [...prev, enhancedResult]);
  };

  const clearResults = () => {
    setResults([]);
    AsyncStorage.removeItem(SESSION_STORAGE_KEY).catch(() => {});
  };

  const addObservation = (text: string) => {
    const newObs: Observation = {
      id: Date.now().toString(),
      text,
      timestamp: Date.now(),
    };
    setChild({ ...child, observations: [newObs, ...child.observations] });
  };

  const resetApp = () => {
    setRole(null);
    setParent(defaultParent);
    setChildState(defaultChild);
    setResults([]);
    AsyncStorage.multiRemove([SESSION_STORAGE_KEY, CHILD_PROFILE_KEY]).catch(() => {});
  };

  return (
    <AppContext.Provider
      value={{
        role,
        parent,
        child,
        results,
        setRole,
        setParent,
        setChild,
        addResult,
        clearResults,
        addObservation,
        calculateAge,
        calculateBMI,
        resetApp,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppState => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
