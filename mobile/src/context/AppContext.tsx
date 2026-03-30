
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserRole,
  ChildProfile,
  ParentProfile,
  DoctorProfile,
  GameResult,
  Observation,
  AssessmentSession,
  DomainIndices,
} from '../types';
import {
  onAuthChange,
  getUserRole,
  getParentProfile,
  getDoctorProfile,
  getChildrenForParent,
  getWeekKey,
  signOut as firebaseSignOut,
} from '../services/firebaseService';

const SESSION_STORAGE_KEY = 'ceci_game_results';
const CHILD_PROFILE_KEY = 'ceci_child_profile';

interface AppState {
  // Auth
  authLoading: boolean;
  firebaseUid: string | null;
  role: UserRole | null;

  // Profiles
  parent: ParentProfile;
  doctor: DoctorProfile | null;
  child: ChildProfile;
  childId: string | null;       // Firestore document ID for current child

  // Game data (in-memory during session, synced to Firestore on complete)
  results: GameResult[];

  // Actions
  setRole: (role: UserRole | null) => void;
  setParent: (p: ParentProfile) => void;
  setDoctor: (d: DoctorProfile | null) => void;
  setChild: (c: ChildProfile) => void;
  setChildId: (id: string | null) => void;
  addResult: (result: GameResult) => void;
  clearResults: () => void;
  addObservation: (text: string) => void;
  calculateAge: (dob: string) => number;
  calculateBMI: (heightCm: number, weightKg: number) => number;
  resetApp: () => void;
  signOut: () => Promise<void>;
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
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [parent, setParentState] = useState<ParentProfile>(defaultParent);
  const [doctor, setDoctorState] = useState<DoctorProfile | null>(null);
  const [child, setChildState] = useState<ChildProfile>(defaultChild);
  const [childId, setChildIdState] = useState<string | null>(null);
  const [results, setResults] = useState<GameResult[]>([]);

  // ---------------------------------------------------------------------------
  // Firebase Auth listener — runs once on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        setFirebaseUid(user.uid);
        try {
          const userRole = await getUserRole(user.uid);
          setRoleState(userRole as UserRole);

          if (userRole === 'parent') {
            const profile = await getParentProfile(user.uid);
            if (profile) setParentState(profile);

            // Load first child for this parent
            const kids = await getChildrenForParent(user.uid);
            if (kids.length > 0) {
              const { id, ...childData } = kids[0];
              setChildState(childData as ChildProfile);
              setChildIdState(id);
            }
            // If no children, needsChildSetup flag handled in LoginScreen
          } else if (userRole === 'doctor' || userRole === 'admin') {
            const docProfile = await getDoctorProfile(user.uid);
            if (docProfile) setDoctorState(docProfile);
          }
        } catch (e) {
          console.warn('AppContext auth load error:', e);
        }
      } else {
        // User signed out — reset to defaults
        setFirebaseUid(null);
        setRoleState(null);
        setParentState(defaultParent);
        setDoctorState(null);
        setChildState(defaultChild);
        setChildIdState(null);
        setResults([]);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ---------------------------------------------------------------------------
  // Offline fallback: persist game results to AsyncStorage
  // ---------------------------------------------------------------------------
  useEffect(() => {
    AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(results)).catch(() => {});
  }, [results]);

  // Load cached results on mount (for offline use)
  useEffect(() => {
    const loadCached = async () => {
      try {
        const saved = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (saved) setResults(JSON.parse(saved));
      } catch {}
    };
    loadCached();
  }, []);

  // ---------------------------------------------------------------------------
  // Utility functions
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // State setters with persistence
  // ---------------------------------------------------------------------------

  const setRole = (r: UserRole | null) => setRoleState(r);

  const setParent = (p: ParentProfile) => setParentState(p);

  const setDoctor = (d: DoctorProfile | null) => setDoctorState(d);

  const setChild = (c: ChildProfile) => {
    setChildState(c);
    AsyncStorage.setItem(CHILD_PROFILE_KEY, JSON.stringify(c)).catch(() => {});
  };

  const setChildId = (id: string | null) => setChildIdState(id);

  const addResult = (result: GameResult) => {
    // Assign session number based on calendar week
    const thisWeekKey = getWeekKey(result.timestamp);
    const orderedUniqueWeeks = results
      .map((r) => getWeekKey(r.timestamp))
      .filter((w, i, arr) => arr.indexOf(w) === i);
    const weekIndex = orderedUniqueWeeks.indexOf(thisWeekKey);
    const sessionNumber =
      weekIndex >= 0 ? weekIndex + 1 : orderedUniqueWeeks.length + 1;

    const enhancedResult: GameResult = {
      ...result,
      behavioralMetrics: result.data?.behavioralMetrics,
      sessionNumber,
    };
    setResults((prev) => [...prev, enhancedResult]);
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

  const signOut = async () => {
    await firebaseSignOut();
    setFirebaseUid(null);
    setRoleState(null);
    setParentState(defaultParent);
    setDoctorState(null);
    setChildState(defaultChild);
    setChildIdState(null);
    setResults([]);
    await AsyncStorage.multiRemove([SESSION_STORAGE_KEY, CHILD_PROFILE_KEY]);
  };

  const resetApp = () => {
    signOut().catch(() => {});
  };

  return (
    <AppContext.Provider
      value={{
        authLoading,
        firebaseUid,
        role,
        parent,
        doctor,
        child,
        childId,
        results,
        setRole,
        setParent,
        setDoctor,
        setChild,
        setChildId,
        addResult,
        clearResults,
        addObservation,
        calculateAge,
        calculateBMI,
        resetApp,
        signOut,
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
