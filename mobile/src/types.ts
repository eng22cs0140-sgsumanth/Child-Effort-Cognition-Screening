
export type UserRole = 'child' | 'parent' | 'doctor';

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
  height: number;
  weight: number;
  bmi: number;
  conditions: string;
  observations: Observation[];
}

export interface BehavioralMetrics {
  reactionTimes: number[];
  accuracy: number;
  hesitationCount: number;
  engagementScore: number;
  correctAttempts: number;
  incorrectAttempts: number;
  averageReactionTime: number;
  reactionTimeVariability: number;
}

export interface SessionData {
  sessionNumber: number;
  date: number;
  metrics: BehavioralMetrics;
}

export interface GameResult {
  gameId: string;
  score: number;
  data: any;
  timestamp: number;
  behavioralMetrics?: BehavioralMetrics;
  sessionNumber?: number;
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

export type RiskBand = 'green' | 'amber' | 'red';

export interface CECIComponentPID {
  value: number;
  weight: number;
  contribution: number;
  interpretation: string;
}

export interface CECIComponentConsistency {
  value: number;
  variance: number;
  weight: number;
  contribution: number;
  interpretation: string;
}

export interface CECIComponentEffort {
  value: number;
  weight: number;
  adjustment: number;
  interpretation: string;
}

export interface CECIComponents {
  pid: CECIComponentPID;
  consistency: CECIComponentConsistency;
  effort: CECIComponentEffort;
}

export interface CECIScore {
  overall: number;           // 0-100 display score (inverted: higher = better)
  riskBand: RiskBand;
  confidence: number;        // 0-100
  treeBasedScore: number;
  temporalScore: number;
  bayesianCalibration: number;
  recommendation: string;
  // New fields from Flask API (optional for backward compat with local fallback):
  pid?: number;              // Probability of persistent cognitive difficulty (0-1)
  peff?: number;             // Probability of low effort (0-1)
  uncertainty?: number;      // 0-1
  clinicalNote?: string;
  components?: CECIComponents;
  ageGroup?: string;
  nSessions?: number;
}

export interface ModelOutputs {
  persistentDifficulty: number;
  effortInconsistency: number;
  improvementTrend: number;
  volatilityScore: number;
}
