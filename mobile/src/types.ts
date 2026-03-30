
export type UserRole = 'child' | 'parent' | 'doctor' | 'admin';

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
  height: number;   // cm
  weight: number;   // kg
  bmi: number;      // auto-calculated

  observations: Observation[];
}

export interface DoctorProfile {
  uid: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;

  // Professional identity
  doctorId: string;
  fullName: string;
  role: 'Doctor' | 'Nurse' | 'Therapist';

  // Specialization
  specialty: string;
  hospital: string;
  department: string;
  licenseNumber: string;
  yearsOfExperience: number;
  qualification: string;

  // Access control
  assignedChildIds: string[];

  // Timestamps
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
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
  consecutiveEmptySpaceTaps: number;
  impulsiveTapCount: number;
  tapEventLog: TapEvent[];

  // --- Within-session emotional variability ---
  withinSessionDegradation: number;
  frustrationBurstCount: number;
  engagementDropRate: number;
  reactionTimeSpikeCount: number;
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

// A single assessment visit (multiple games in one week)
export interface AssessmentSession {
  id: string;
  date: number;
  results: GameResult[];
  sessionAccuracy: number;
  sessionNumber?: number;
  weekKey?: string;
}

// Six neuropsychological domain indices
export interface DomainIndices {
  VMI: number;  // Visual-Motor Integration   [maze, numbersequencer]
  FRI: number;  // Fluid Reasoning Index       [memory, counting]
  LCI: number;  // Language Comprehension Index [sound]
  IFI: number;  // Inhibitory Function Index   [simon, category]
  API: number;  // Attention Processing Index  [catcher]
  ATI: number;  // Attention-Task Integration  [leader, emotion]
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
  // Flask API fields (optional):
  pid?: number;
  peff?: number;
  uncertainty?: number;
  clinicalNote?: string;
  components?: CECIComponents;
  ageGroup?: string;
  nSessions?: number;
  // 3-way classification:
  primaryClassification?: PrimaryClassification;
  emotionalVariabilityScore?: number;
  effortVariabilityScore?: number;
}

export interface ModelOutputs {
  persistentDifficulty: number;
  effortInconsistency: number;
  improvementTrend: number;
  volatilityScore: number;
}
