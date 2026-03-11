
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChildProfile } from '../../types';
import { COLORS } from '../../constants';
import { calculateBehavioralMetrics } from '../../ceciAlgorithm';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const EMOTIONS = [
  { name: 'Happy', emoji: '😊', description: 'Everything is great!' },
  { name: 'Sad', emoji: '😢', description: 'I am feeling a bit blue.' },
  { name: 'Angry', emoji: '😠', description: 'Grrr, I am upset!' },
  { name: 'Surprised', emoji: '😲', description: "Wow! I didn't expect that!" },
  { name: 'Scared', emoji: '😨', description: 'Oh no, this is spooky!' },
  { name: 'Thinking', emoji: '🤔', description: 'Hmm, let me see...' },
];

export default function EmotionDetective({ profile, onComplete }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [options, setOptions] = useState<typeof EMOTIONS>([]);
  const [feedback, setFeedback] = useState('');
  const incorrectRef = useRef(0);
  const reactionTimes = useRef<number[]>([]);
  const questionStartRef = useRef(Date.now());

  const targetEmotion = EMOTIONS[currentIdx];

  const generateOptions = () => {
    const others = EMOTIONS.filter((_, i) => i !== currentIdx);
    const shuffled = [...others].sort(() => 0.5 - Math.random()).slice(0, 3);
    return [...shuffled, targetEmotion].sort(() => 0.5 - Math.random());
  };

  useEffect(() => {
    setOptions(generateOptions());
    questionStartRef.current = Date.now();
  }, [currentIdx]);

  const handleSelect = (emotion: typeof EMOTIONS[0]) => {
    if (emotion.name === targetEmotion.name) {
      reactionTimes.current.push(Date.now() - questionStartRef.current);
      setScore(s => s + 1);
      setFeedback('You nailed it! 🕵️✨');
      setTimeout(() => {
        setFeedback('');
        if (currentIdx + 1 < EMOTIONS.length) {
          setCurrentIdx(i => i + 1);
        } else {
          const finalScore = score + 1;
          const behavioralMetrics = calculateBehavioralMetrics(
            reactionTimes.current, finalScore, incorrectRef.current,
            (finalScore / EMOTIONS.length) * 100
          );
          onComplete({ score: finalScore, total: EMOTIONS.length, behavioralMetrics });
        }
      }, 1500);
    } else {
      incorrectRef.current++;
      setFeedback('Not quite... look closer!');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>How is Starry feeling right now?</Text>

      <View style={styles.emojiBox}>
        <Text style={styles.emoji}>{targetEmotion.emoji}</Text>
      </View>

      {feedback ? (
        <Text style={[styles.feedback, feedback.includes('nailed') ? styles.feedbackGood : styles.feedbackBad]}>
          {feedback}
        </Text>
      ) : <View style={styles.feedbackPlaceholder} />}

      <View style={styles.optionsGrid}>
        {options.map((option, i) => (
          <TouchableOpacity
            key={i}
            style={styles.optionBtn}
            onPress={() => handleSelect(option)}
            activeOpacity={0.85}
          >
            <Text style={styles.optionText}>{option.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.tagline}>Becoming a feeling expert! 🌈</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  emojiBox: {
    backgroundColor: '#F5F3FF',
    borderRadius: 32,
    padding: 28,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: '#DDD6FE',
    marginBottom: 12,
  },
  emoji: { fontSize: 80 },
  feedback: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    height: 30,
  },
  feedbackPlaceholder: { height: 30, marginBottom: 12 },
  feedbackGood: { color: '#16A34A' },
  feedbackBad: { color: COLORS.orange },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 16,
  },
  optionBtn: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 16,
    minWidth: 130,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.gray400,
    fontWeight: '600',
    fontStyle: 'italic',
  },
});
