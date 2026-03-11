
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole, ChildProfile, ParentProfile, GameResult, Observation } from '../types';

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
  bloodGroup: '',
  height: 0,
  weight: 0,
  bmi: 0,
  conditions: '',
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
  const [child, setChild] = useState<ChildProfile>(defaultChild);
  const [results, setResults] = useState<GameResult[]>([]);

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

  const clearResults = () => setResults([]);

  const addObservation = (text: string) => {
    const newObs: Observation = {
      id: Date.now().toString(),
      text,
      timestamp: Date.now(),
    };
    setChild(prev => ({ ...prev, observations: [newObs, ...prev.observations] }));
  };

  const resetApp = () => {
    setRole(null);
    setParent(defaultParent);
    setChild(defaultChild);
    setResults([]);
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
