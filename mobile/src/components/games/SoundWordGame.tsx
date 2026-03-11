
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChildProfile } from '../../types';
import { COLORS } from '../../constants';
import { calculateBehavioralMetrics } from '../../ceciAlgorithm';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const ITEMS = [
  { sound: 'Moo!', animal: 'Cow', icon: '🐮' },
  { sound: 'Woof!', animal: 'Dog', icon: '🐶' },
  { sound: 'Meow!', animal: 'Cat', icon: '🐱' },
  { sound: 'Oink!', animal: 'Pig', icon: '🐷' },
  { sound: 'Roar!', animal: 'Lion', icon: '🦁' },
  { sound: 'Tweet!', animal: 'Bird', icon: '🐦' },
];

export default function SoundWordGame({ profile, onComplete }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [options, setOptions] = useState<typeof ITEMS>([]);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const incorrectRef = useRef(0);
  const reactionTimes = useRef<number[]>([]);
  const questionStartRef = useRef(Date.now());

  const target = ITEMS[currentIdx];

  useEffect(() => {
    questionStartRef.current = Date.now();
    const others = ITEMS.filter((_, i) => i !== currentIdx)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    setOptions([...others, target].sort(() => 0.5 - Math.random()));
  }, [currentIdx]);

  const handleSelect = (item: typeof ITEMS[0]) => {
    if (item.animal === target.animal) {
      reactionTimes.current.push(Date.now() - questionStartRef.current);
      setScore(s => s + 1);
      setFeedback('Correct! Well done! 🌟');
      setTimeout(() => {
        setFeedback('');
        if (currentIdx + 1 < ITEMS.length) {
          setCurrentIdx(i => i + 1);
        } else {
          const finalScore = score + 1;
          const behavioralMetrics = calculateBehavioralMetrics(
            reactionTimes.current, finalScore, incorrectRef.current,
            (finalScore / ITEMS.length) * 100
          );
          onComplete({ score: finalScore, total: ITEMS.length, behavioralMetrics });
        }
      }, 1500);
    } else {
      incorrectRef.current++;
      setFeedback('Not that one, try again!');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Which animal says "{target.sound}"?</Text>

      <View style={styles.soundBox}>
        <Text style={styles.soundIcon}>📢</Text>
        <Text style={styles.soundText}>"{target.sound}"</Text>
      </View>

      {feedback ? (
        <Text style={[styles.feedback, feedback.includes('Correct') ? styles.feedbackGood : styles.feedbackBad]}>
          {feedback}
        </Text>
      ) : <View style={styles.fbPlaceholder} />}

      <View style={styles.optionsGrid}>
        {options.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.optionBtn}
            onPress={() => handleSelect(item)}
            activeOpacity={0.85}
          >
            <Text style={styles.optionIcon}>{item.icon}</Text>
            <Text style={styles.optionLabel}>{item.animal}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 26,
  },
  soundBox: {
    backgroundColor: '#F5F3FF',
    borderRadius: 60,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  soundIcon: { fontSize: 44 },
  soundText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
  },
  feedback: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    height: 26,
  },
  fbPlaceholder: { height: 26, marginBottom: 12 },
  feedbackGood: { color: '#16A34A' },
  feedbackBad: { color: COLORS.orange },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  optionBtn: {
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: '#FED7AA',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionIcon: { fontSize: 40 },
  optionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.orange,
  },
});
