
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

  // Essential for normative scoring
  sex: 'male' | 'female' | 'other' | '';

  // Prematurity — critical for corrected-age calculation (ASQ-3, Bayley-4)
  isPremature: boolean;
  gestationalAgeWeeks: number;  // 0 if full-term or unknown

  // Clinical context — affects score interpretation
  primaryLanguage: string;              // language spoken at home
  familyHistoryOfDD: boolean;          // family history of ASD, ADHD, ID, or learning disorders
  knownConditions: string;             // any diagnosed conditions (free text)

  observations: Observation[];
}

export interface GameResult {
  gameId: string;
  score: number;        // 0-100 aggregate score
  data: any;
  timestamp: number;
  telemetry?: {
    avgResponseTime: number;   // avg ms per trial response
    hesitationPeriod: number;  // avg ms from prompt to first interaction
    completionRate: number;    // fraction of trials completed (0-1)
    trialAccuracies: number[]; // binary correctness per trial [0|1]
  };
}

// A single assessment visit (multiple games played in one session)
export interface AssessmentSession {
  id: string;
  date: number;              // epoch ms
  results: GameResult[];
  sessionAccuracy: number;   // Acc_j per paper Eq.(1): mean score/100 across games
}

// Six neuropsychological domain indices per paper's Scoring & Indices layer
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
