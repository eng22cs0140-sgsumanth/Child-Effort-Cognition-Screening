
export type UserRole = 'child' | 'parent' | 'doctor' | 'admin';

export type Section =
  | 'loading'
  | 'welcome'
  | 'login'
  | 'onboarding-parent'
  | 'onboarding-child'
  | 'tutorial'
  | 'assessment'
  | 'results'
  | 'doctor-register'
  | 'doctor-pending'
  | 'doctor-dashboard'
  | 'admin-dashboard'
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

  // Essential for normative scoring
  sex: 'male' | 'female' | 'other' | '';

  // Prematurity — critical for corrected-age calculation (ASQ-3, Bayley-4)
  isPremature: boolean | null;
  gestationalAgeWeeks: number;  // 0 if full-term or unknown

  // Clinical context — affects score interpretation
  familyHistoryOfDD: boolean | null;   // family history of ASD, ADHD, ID, or learning disorders
  knownConditions: string;             // any diagnosed conditions (free text)

  // Physical metrics (synced from mobile)
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
  doctorId: string;           // self-reported professional registration number
  fullName: string;
  role: 'Doctor' | 'Nurse' | 'Therapist';

  // Specialization
  specialty: string;          // e.g. "Developmental Pediatrics"
  hospital: string;           // hospital or clinic name
  department: string;         // e.g. "Pediatric Neurology"
  licenseNumber: string;      // medical council license number
  yearsOfExperience: number;
  qualification: string;      // e.g. "MBBS, MD (Pediatrics)"

  // Access control
  assignedChildIds: string[];

  // Timestamps
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;        // admin uid
}

export interface TapEvent {
  timestamp: number;
  type: 'correct' | 'incorrect' | 'empty_space' | 'counting_tap';
  reactionTime: number;   // ms since previous tap or stimulus display
}

export interface BehavioralMetrics {
  // Core metrics
  reactionTimes: number[];
  accuracy: number;
  hesitationCount: number;
  engagementScore: number;
  correctAttempts: number;
  incorrectAttempts: number;
  averageReactionTime: number;
  reactionTimeVariability: number;

  // Tap tracking
  totalTapCount: number;
  emptySpaceTapCount: number;
  consecutiveEmptySpaceTaps: number;
  impulsiveTapCount: number;
  tapEventLog: TapEvent[];

  // Emotional variability (EVI sub-components)
  withinSessionDegradation: number;
  frustrationBurstCount: number;
  engagementDropRate: number;
  reactionTimeSpikeCount: number;
}

export interface GameResult {
  gameId: string;
  score: number;        // 0-100 aggregate score
  data: any;
  timestamp: number;
  sessionNumber?: number;
  telemetry?: {
    avgResponseTime: number;
    hesitationPeriod: number;
    completionRate: number;
    trialAccuracies: number[];
  };
  behavioralMetrics?: BehavioralMetrics;
}

// A single assessment visit (multiple games played in one session)
export interface AssessmentSession {
  id: string;
  date: number;              // epoch ms
  results: GameResult[];
  sessionAccuracy: number;   // mean score/100 across games
  sessionNumber?: number;
  weekKey?: string;          // e.g. "2025-W12"
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
  overall: number;             // 0-100 display score (inverted: higher = better)
  riskBand: RiskBand;
  confidence: number;          // 0-100
  treeBasedScore: number;
  temporalScore: number;
  bayesianCalibration: number;
  recommendation: string;
  // Optional extended fields
  pid?: number;
  peff?: number;
  uncertainty?: number;
  clinicalNote?: string;
  components?: CECIComponents;
  ageGroup?: string;
  nSessions?: number;
  primaryClassification?: PrimaryClassification;
  emotionalVariabilityScore?: number;
  effortVariabilityScore?: number;
}

// Legacy alias kept for backward compatibility with existing App.tsx call sites
export interface CECIResult extends CECIScore {}
