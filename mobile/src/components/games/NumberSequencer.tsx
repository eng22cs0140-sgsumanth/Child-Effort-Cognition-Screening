
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { ChildProfile, TapEvent } from '../../types';
import { calculateBehavioralMetrics } from '../../ceciAlgorithm';
import { COLORS } from '../../constants';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const { width } = Dimensions.get('window');

type Phase = 'show' | 'recall' | 'done';

export default function NumberSequencer({ profile, onComplete }: Props) {
  const N = profile.age >= 6 ? 9 : 5;
  const COLS = N === 9 ? 3 : 3;
  const CELL_SIZE = Math.min(72, (width - 80) / COLS);

  const [phase, setPhase] = useState<Phase>('show');
  const [showIndex, setShowIndex] = useState(0);     // Which number is highlighted (1-based)
  const [nextExpected, setNextExpected] = useState(1); // Next number to tap in recall
  const [tapped, setTapped] = useState<Set<number>>(new Set()); // Numbers tapped correctly
  const [incorrectFlash, setIncorrectFlash] = useState<number | null>(null);
  const [message, setMessage] = useState('Watch the numbers appear!');

  // Shuffled positions: positions[i] = the number (1..N) at grid index i
  const positions = useRef<number[]>([]);
  const correctAttempts = useRef(0);
  const incorrectAttempts = useRef(0);
  const reactionTimes = useRef<number[]>([]);
  const gameStartTime = useRef(Date.now());
  const lastElementTapTimeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(Date.now());
  const tapLog = useRef<TapEvent[]>([]);
  const emptySpaceTapCountRef = useRef(0);

  // Build shuffled positions once
  useEffect(() => {
    const nums = Array.from({ length: N }, (_, i) => i + 1);
    // Shuffle
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    positions.current = nums;
  }, [N]);

  // Show phase: highlight each number 1..N in sequence
  useEffect(() => {
    if (phase !== 'show') return;

    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setShowIndex(idx);
      if (idx >= N) {
        clearInterval(interval);
        setTimeout(() => {
          setShowIndex(0);
          setPhase('recall');
          setMessage('Now tap the numbers in order: 1, 2, 3...');
          lastTapTimeRef.current = Date.now();
        }, 800);
      }
    }, 700);

    return () => clearInterval(interval);
  }, [phase, N]);

  const handleNumberTap = (num: number) => {
    if (phase !== 'recall') return;

    const now = Date.now();
    const reactionTime = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;
    lastElementTapTimeRef.current = now;

    if (num === nextExpected) {
      // Correct
      reactionTimes.current.push(reactionTime);
      correctAttempts.current++;
      tapLog.current.push({ timestamp: now, type: 'correct', reactionTime });

      const newTapped = new Set(tapped);
      newTapped.add(num);
      setTapped(newTapped);

      if (num === N) {
        // All done
        const totalTime = Date.now() - gameStartTime.current;
        const engagementScore = Math.min(100, (correctAttempts.current / N) * 100);
        const behavioralMetrics = calculateBehavioralMetrics(
          reactionTimes.current,
          correctAttempts.current,
          incorrectAttempts.current,
          engagementScore,
          { tapEventLog: tapLog.current, emptySpaceTapCount: emptySpaceTapCountRef.current }
        );
        setMessage('Amazing! You got them all!');
        setPhase('done');
        setTimeout(() => onComplete({ score: 100, N, totalTime, behavioralMetrics }), 1500);
      } else {
        setNextExpected(num + 1);
      }
    } else {
      // Incorrect
      incorrectAttempts.current++;
      tapLog.current.push({ timestamp: now, type: 'incorrect', reactionTime });
      setIncorrectFlash(num);
      setMessage(`Not quite! Look for ${nextExpected}`);
      setTimeout(() => setIncorrectFlash(null), 500);
    }
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

  const getCellStyle = (num: number) => {
    const isShowing = phase === 'show' && showIndex === num;
    const isTapped = tapped.has(num);
    const isWrong = incorrectFlash === num;
    if (isWrong) return { backgroundColor: '#EF4444', borderColor: '#DC2626' };
    if (isTapped) return { backgroundColor: '#22C55E', borderColor: '#16A34A' };
    if (isShowing) return { backgroundColor: COLORS.orange, borderColor: '#EA580C' };
    return { backgroundColor: COLORS.white, borderColor: COLORS.purple100 };
  };

  const getTextStyle = (num: number) => {
    const isShowing = phase === 'show' && showIndex === num;
    const isTapped = tapped.has(num);
    const isWrong = incorrectFlash === num;
    if (isShowing || isTapped || isWrong) return { color: COLORS.white };
    return { color: COLORS.primary };
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Number Sequencer</Text>
        <Text style={styles.progress}>{tapped.size}/{N}</Text>
      </View>

      <Text style={styles.message}>{message}</Text>

      <Pressable style={styles.gridWrapper} onPress={handleEmptySpaceTap}>
        <View style={[styles.grid, { width: (CELL_SIZE + 10) * COLS }]}>
          {positions.current.map((num, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.cell,
                getCellStyle(num),
                { width: CELL_SIZE, height: CELL_SIZE },
              ]}
              onPress={() => handleNumberTap(num)}
              disabled={phase !== 'recall' || tapped.has(num)}
              activeOpacity={0.85}
            >
              <Text style={[styles.cellText, getTextStyle(num)]}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>

      {phase === 'recall' && (
        <Text style={styles.hint}>
          Tap: <Text style={styles.hintBold}>{nextExpected}</Text> next
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
  },
  progress: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.orange,
  },
  message: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: 16,
    minHeight: 24,
  },
  gridWrapper: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#BFDBFE',
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  cell: {
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  cellText: {
    fontSize: 28,
    fontWeight: '900',
  },
  hint: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.gray500,
    fontWeight: '600',
  },
  hintBold: {
    color: COLORS.orange,
    fontWeight: '900',
    fontSize: 20,
  },
});
