
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

  // Sex — essential for normative scoring
  sex: 'male' | 'female' | 'other' | '';

  // Prematurity — critical for corrected-age calculation
  isPremature: boolean | null;
  gestationalAgeWeeks: number;

  // Clinical context — affects score interpretation
  familyHistoryOfDD: boolean | null;
  knownConditions: string;

  // Physical metrics
  bloodGroup: string;
  height: number;
  weight: number;
  bmi: number;

  observations: Observation[];
}

export interface TapEvent {
  timestamp: number;      // epoch ms
  type: 'correct' | 'incorrect' | 'empty_space' | 'counting_tap';
  reactionTime: number;   // ms since previous tap or stimulus display
}

export interface BehavioralMetrics {
  // --- Core metrics ---
  reactionTimes: number[];
  accuracy: number;
  hesitationCount: number;
  engagementScore: number;
  correctAttempts: number;
  incorrectAttempts: number;
  averageReactionTime: number;
  reactionTimeVariability: number;

  // --- Tap tracking ---
  totalTapCount: number;
  emptySpaceTapCount: number;
  consecutiveEmptySpaceTaps: number;    // Max run of consecutive empty-space taps
  impulsiveTapCount: number;            // Taps with reactionTime < 200ms
  tapEventLog: TapEvent[];              // Full ordered tap log

  // --- Within-session emotional variability ---
  withinSessionDegradation: number;     // (first_half_acc - second_half_acc) / max(first_half_acc, 1) [0-1]
  frustrationBurstCount: number;        // Count of runs of ≥3 consecutive incorrect+empty taps
  engagementDropRate: number;           // (peak_engagement - final_engagement) / max(peak_engagement, 1) [0-1]
  reactionTimeSpikeCount: number;       // Count of RTs > 3× session average
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
  | 'numbersequencer'
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

export type PrimaryClassification =
  | 'typical'
  | 'emotional_variability'
  | 'effort_variability'
  | 'cognitive_risk';

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
  // Flask API fields (optional for backward compat):
  pid?: number;
  peff?: number;
  uncertainty?: number;
  clinicalNote?: string;
  components?: CECIComponents;
  ageGroup?: string;
  nSessions?: number;
  // 3-way classification:
  primaryClassification?: PrimaryClassification;
  emotionalVariabilityScore?: number;   // 0-100 (EVI × 100)
  effortVariabilityScore?: number;      // 0-100
}

export interface ModelOutputs {
  persistentDifficulty: number;
  effortInconsistency: number;
  improvementTrend: number;
  volatilityScore: number;
}
