
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
  { char: '🐱', color: '#EF4444' },
  { char: '🐶', color: '#3B82F6' },
  { char: '🐰', color: '#22C55E' },
  { char: '🦁', color: '#EAB308' },
  { char: '🐼', color: '#A855F7' },
];

export default function PatternMemory({ profile, onComplete }: Props) {
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [isShowing, setIsShowing] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [message, setMessage] = useState('Get ready!');
  const correctSeqs = useRef(0);
  const incorrectAttempts = useRef(0);
  const reactionTimes = useRef<number[]>([]);
  const turnStartTime = useRef(0);

  const maxLevel = 5;
  const sequenceLength = Math.min(level + 1 + Math.floor(profile.age / 4), 8);

  const startLevel = () => {
    const newSequence = Array.from({ length: sequenceLength }, () =>
      Math.floor(Math.random() * ITEMS.length)
    );
    setSequence(newSequence);
    setUserSequence([]);
    setIsShowing(true);
    setMessage('Watch carefully!');

    let i = 0;
    const interval = setInterval(() => {
      if (i >= newSequence.length) {
        clearInterval(interval);
        setIsShowing(false);
        setActiveIdx(null);
        setMessage('Now you repeat!');
        return;
      }
      setActiveIdx(newSequence[i]);
      i++;
    }, 1000);
    turnStartTime.current = Date.now() + newSequence.length * 1000;
  };

  useEffect(() => {
    const t = setTimeout(startLevel, 1000);
    return () => clearTimeout(t);
  }, [level]);

  const handleItemClick = (idx: number) => {
    if (isShowing) return;

    const nextSequence = [...userSequence, idx];
    setUserSequence(nextSequence);

    if (idx !== sequence[userSequence.length]) {
      incorrectAttempts.current++;
      setMessage("Oops! Let's try that again.");
      setTimeout(startLevel, 1500);
      return;
    }

    if (userSequence.length === 0) {
      reactionTimes.current.push(Math.max(0, Date.now() - turnStartTime.current));
    }

    if (nextSequence.length === sequence.length) {
      correctSeqs.current++;
      if (level >= maxLevel) {
        const behavioralMetrics = calculateBehavioralMetrics(
          reactionTimes.current, correctSeqs.current, incorrectAttempts.current,
          (level / maxLevel) * 100
        );
        onComplete({ level, score: level * 100, behavioralMetrics });
      } else {
        setMessage('Great job!');
        setTimeout(() => setLevel(l => l + 1), 1000);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.levelText}>Level: {level} / {maxLevel}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>

      <View style={styles.sequenceDisplay}>
        {userSequence.map((idx, i) => (
          <View key={i} style={[styles.seqItem, { backgroundColor: ITEMS[idx].color }]}>
            <Text style={styles.seqItemChar}>{ITEMS[idx].char}</Text>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {ITEMS.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            onPress={() => handleItemClick(idx)}
            disabled={isShowing}
            style={[
              styles.btn,
              { backgroundColor: item.color },
              activeIdx === idx && styles.btnActive,
              isShowing && styles.btnDisabled,
            ]}
            activeOpacity={0.85}
          >
            <Text style={styles.btnChar}>{item.char}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  levelText: { fontSize: 16, fontWeight: '800', color: COLORS.blue },
  message: { fontSize: 14, color: COLORS.gray600, fontWeight: '600', flex: 1, textAlign: 'right' },
  sequenceDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 60,
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 16,
    justifyContent: 'center',
  },
  seqItem: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seqItemChar: { fontSize: 24 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    flex: 1,
    alignContent: 'center',
  },
  btn: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  btnActive: {
    transform: [{ scale: 1.2 }],
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  btnDisabled: { opacity: 0.7 },
  btnChar: { fontSize: 36 },
});
