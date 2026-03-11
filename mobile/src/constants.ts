
import { GameMetadata } from './types';

export const GAMES: GameMetadata[] = [
  {
    id: 'catcher',
    title: 'Reaction Time Catcher',
    icon: '🎯',
    description: 'Catch falling stars, butterflies, and more!',
    badge: 'Attention',
    ageRange: [0, 9],
  },
  {
    id: 'memory',
    title: 'Pattern Memory Match',
    icon: '🧩',
    description: 'Remember and repeat the pattern!',
    badge: 'Cognitive',
    ageRange: [2, 9],
  },
  {
    id: 'shapes',
    title: 'Shape Sorter Challenge',
    icon: '🎨',
    description: 'Tap and match each shape to its spot!',
    badge: 'Cognitive',
    ageRange: [0, 6],
  },
  {
    id: 'sound',
    title: 'Animal Sound Quiz',
    icon: '🐾',
    description: 'Match animal sounds to the right animal!',
    badge: 'Language',
    ageRange: [1, 9],
  },
  {
    id: 'leader',
    title: 'Follow the Leader',
    icon: '🏃',
    description: 'Imitate the movements!',
    badge: 'Social',
    ageRange: [0, 9],
  },
  {
    id: 'counting',
    title: 'Counting Garden',
    icon: '🔢',
    description: 'Count items in the garden!',
    badge: 'Cognitive',
    ageRange: [1, 7],
  },
  {
    id: 'emotion',
    title: 'Emotion Detective',
    icon: '😊',
    description: 'Identify the feelings!',
    badge: 'Social',
    ageRange: [2, 9],
  },
  {
    id: 'simon',
    title: 'Simon Says',
    icon: '🎮',
    description: 'Do it only if Simon says so!',
    badge: 'Attention',
    ageRange: [2, 9],
  },
  {
    id: 'maze',
    title: 'Treasure Trail Maze',
    icon: '🗺️',
    description: 'Tap your way from home to the treasure!',
    badge: 'Cognitive',
    ageRange: [1, 7],
  },
  {
    id: 'category',
    title: 'Category Sort Game',
    icon: '🧠',
    description: 'Sort items into groups!',
    badge: 'Attention',
    ageRange: [3, 9],
  },
];

export const COLORS = {
  background: '#FFF9E6',
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryDark: '#5B21B6',
  orange: '#FF9F1C',
  orangeLight: '#FFBF69',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  green: '#22C55E',
  greenLight: '#BBF7D0',
  amber: '#F59E0B',
  amberLight: '#FDE68A',
  red: '#EF4444',
  redLight: '#FECACA',
  blue: '#3B82F6',
  blueLight: '#BFDBFE',
  purple50: '#FAF5FF',
  purple100: '#F3E8FF',
};

export const API_BASE_URL = 'http://10.0.2.2:5000'; // Android emulator localhost (Flask port)
// For real device, use your machine's IP: 'http://192.168.x.x:5000'

export function getAgeGroup(age: number): '0-2' | '3-5' | '6-9' {
  if (age <= 2) return '0-2';
  if (age <= 5) return '3-5';
  return '6-9';
}
