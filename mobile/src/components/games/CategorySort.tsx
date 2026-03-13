
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { ChildProfile, TapEvent } from '../../types';
import { COLORS } from '../../constants';
import { calculateBehavioralMetrics } from '../../ceciAlgorithm';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const ITEMS = [
  { icon: '🍎', category: 'Food' },
  { icon: '🐘', category: 'Animal' },
  { icon: '🍕', category: 'Food' },
  { icon: '🦁', category: 'Animal' },
  { icon: '🍌', category: 'Food' },
  { icon: '🦒', category: 'Animal' },
];

export default function CategorySort({ profile, onComplete }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const incorrectRef = useRef(0);
  const reactionTimes = useRef<number[]>([]);
  const questionStartRef = useRef(Date.now());

  // Tap tracking
  const lastElementTapTimeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(Date.now());
  const tapLog = useRef<TapEvent[]>([]);
  const emptySpaceTapCountRef = useRef(0);

  const target = ITEMS[currentIdx];

  const handleSort = (cat: string) => {
    const now = Date.now();
    const reactionTime = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;
    lastElementTapTimeRef.current = now;

    reactionTimes.current.push(Date.now() - questionStartRef.current);

    if (cat === target.category) {
      tapLog.current.push({ timestamp: now, type: 'correct', reactionTime });
      setScore(s => s + 1);
      setFeedback('Great sorting! 📦');
    } else {
      incorrectRef.current++;
      tapLog.current.push({ timestamp: now, type: 'incorrect', reactionTime });
      setFeedback('Think again! Is it a food or an animal?');
    }

    setTimeout(() => {
      questionStartRef.current = Date.now();
      lastTapTimeRef.current = Date.now();
      setFeedback('');
      if (currentIdx + 1 < ITEMS.length) {
        setCurrentIdx(i => i + 1);
      } else {
        const finalScore = score + (cat === target.category ? 1 : 0);
        const behavioralMetrics = calculateBehavioralMetrics(
          reactionTimes.current, finalScore, incorrectRef.current,
          (finalScore / ITEMS.length) * 100,
          { tapEventLog: tapLog.current, emptySpaceTapCount: emptySpaceTapCountRef.current }
        );
        onComplete({ score: finalScore, total: ITEMS.length, behavioralMetrics });
      }
    }, 1500);
  };

  const handleEmptySpaceTap = () => {
    const now = Date.now();
    if (now - lastElementTapTimeRef.current > 20) {
      const reactionTime = now - lastTapTimeRef.current;
      lastTapTimeRef.current = now;
      tapLog.current.push({ timestamp: now, type: 'empty_space', reactionTime });
      emptySpaceTapCountRef.current++;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>What group does this belong to?</Text>

      <View style={styles.itemBox}>
        <Text style={styles.itemIcon}>{target.icon}</Text>
      </View>

      {feedback ? (
        <Text style={[styles.feedback, feedback.includes('Great') ? styles.feedbackGood : styles.feedbackBad]}>
          {feedback}
        </Text>
      ) : <View style={styles.fbPlaceholder} />}

      <Pressable style={styles.buttonsWrapper} onPress={handleEmptySpaceTap}>
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={[styles.catBtn, { backgroundColor: '#EAB308' }]}
            onPress={() => handleSort('Food')}
            activeOpacity={0.85}
          >
            <Text style={styles.catBtnText}>🍎 Food</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.catBtn, { backgroundColor: '#3B82F6' }]}
            onPress={() => handleSort('Animal')}
            activeOpacity={0.85}
          >
            <Text style={styles.catBtnText}>🐘 Animal</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#16A34A',
    textAlign: 'center',
    marginBottom: 24,
  },
  itemBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 60,
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  itemIcon: { fontSize: 72 },
  feedback: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
    height: 26,
  },
  fbPlaceholder: { height: 26, marginBottom: 20 },
  feedbackGood: { color: '#16A34A' },
  feedbackBad: { color: COLORS.orange },
  buttonsWrapper: {
    width: '100%',
    padding: 8,
    backgroundColor: COLORS.gray50,
    borderRadius: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  catBtn: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  catBtnText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900',
  },
});
