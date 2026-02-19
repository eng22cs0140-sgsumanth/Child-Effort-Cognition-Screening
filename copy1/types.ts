
export type UserRole = 'child' | 'parent' | 'doctor';

export type Section = 
  | 'welcome' 
  | 'login'
  | 'onboarding-parent' 
  | 'onboarding-child' 
  | 'tutorial' 
  | 'assessment' 
  | 'results' 
  | 'help';

export interface ParentProfile {
  name: string;
  email: string;
  relationship: string;
}

export interface Observation {
  id: string;
  text: string;
  timestamp: number;
}

export interface ChildProfile {
  name: string;
  dob: string;
  age: number;
  bloodGroup: string;
  height: number; // in cm
  weight: number; // in kg
  bmi: number;
  conditions: string;
  observations: Observation[];
}

export interface BehavioralMetrics {
  reactionTimes: number[]; // Array of reaction times in milliseconds
  accuracy: number; // Percentage of correct responses
  hesitationCount: number; // Number of delayed responses
  engagementScore: number; // 0-100 based on activity level
  correctAttempts: number;
  incorrectAttempts: number;
  averageReactionTime: number;
  reactionTimeVariability: number; // Standard deviation
}

export interface SessionData {
  sessionNumber: number;
  date: number; // Timestamp
  metrics: BehavioralMetrics;
}

export interface GameResult {
  gameId: string;
  score: number;
  data: any;
  timestamp: number;
  behavioralMetrics?: BehavioralMetrics; // Enhanced behavioral data
  sessionNumber?: number; // Track multiple sessions
}

export type GameType = 
  | 'catcher' 
  | 'memory' 
  | 'shapes' 
  | 'sound' 
  | 'leader' 
  | 'counting' 
  | 'emotion' 
  | 'simon' 
  | 'maze' 
  | 'category';

export interface GameMetadata {
  id: GameType;
  title: string;
  icon: string;
  description: string;
  badge: string;
  ageRange: [number, number];
}

// CECI Algorithm Types
export type RiskBand = 'green' | 'amber' | 'red';

export interface CECIScore {
  overall: number; // 0-100
  riskBand: RiskBand;
  confidence: number; // 0-100, uncertainty measure
  treeBasedScore: number; // RF/XGBoost simulation
  temporalScore: number; // LSTM/GRU simulation
  bayesianCalibration: number; // Calibrated probability
  recommendation: string;
}

export interface ModelOutputs {
  persistentDifficulty: number; // 0-100
  effortInconsistency: number; // 0-100
  improvementTrend: number; // -100 to 100
  volatilityScore: number; // 0-100
}
