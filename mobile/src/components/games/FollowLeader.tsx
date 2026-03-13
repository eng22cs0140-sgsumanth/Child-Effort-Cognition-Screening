
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { ChildProfile, TapEvent } from '../../types';
import { COLORS } from '../../constants';
import { calculateBehavioralMetrics } from '../../ceciAlgorithm';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const ACTIONS = [
  { name: 'Jump', icon: '🏃‍♂️', bg: '#FEE2E2', border: '#FCA5A5' },
  { name: 'Clap', icon: '👏', bg: '#DBEAFE', border: '#93C5FD' },
  { name: 'Spin', icon: '🌀', bg: '#D1FAE5', border: '#6EE7B7' },
  { name: 'Wave', icon: '👋', bg: '#FEF3C7', border: '#FDE68A' },
];

export default function FollowLeader({ profile, onComplete }: Props) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [isShowing, setIsShowing] = useState(false);
  const [activeAction, setActiveAction] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [message, setMessage] = useState('Watch Starry dance!');
  const correctRounds = useRef(0);
  const incorrectAttempts = useRef(0);
  const reactionTimes = useRef<number[]>([]);
  const turnStartTime = useRef(0);

  // Tap tracking
  const lastElementTapTimeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(Date.now());
  const tapLog = useRef<TapEvent[]>([]);
  const emptySpaceTapCountRef = useRef(0);

  const maxRounds = 4;

  const startRound = () => {
    const len = round + 1;
    const nextSeq = Array.from({ length: len }, () =>
      Math.floor(Math.random() * ACTIONS.length)
    );
    setSequence(nextSeq);
    setUserSequence([]);
    setIsShowing(true);
    setMessage('Watch carefully...');

    let i = 0;
    const interval = setInterval(() => {
      if (i >= nextSeq.length) {
        clearInterval(interval);
        setIsShowing(false);
        setActiveAction(null);
        setMessage('Your turn! Copy the moves!');
        lastTapTimeRef.current = Date.now();
        return;
      }
      setActiveAction(nextSeq[i]);
      i++;
    }, 1000);
    turnStartTime.current = Date.now() + nextSeq.length * 1000;
  };

  useEffect(() => {
    const t = setTimeout(startRound, 1000);
    return () => clearTimeout(t);
  }, [round]);

  const handleAction = (idx: number) => {
    if (isShowing) return;

    const now = Date.now();
    const reactionTime = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;
    lastElementTapTimeRef.current = now;

    const nextUserSeq = [...userSequence, idx];
    setUserSequence(nextUserSeq);

    if (idx !== sequence[userSequence.length]) {
      incorrectAttempts.current++;
      tapLog.current.push({ timestamp: now, type: 'incorrect', reactionTime });
      setMessage("Oh no! Let's try the round again!");
      setTimeout(startRound, 1500);
      return;
    }

    tapLog.current.push({ timestamp: now, type: 'correct', reactionTime });

    if (userSequence.length === 0) {
      reactionTimes.current.push(Math.max(0, Date.now() - turnStartTime.current));
    }

    if (nextUserSeq.length === sequence.length) {
      correctRounds.current++;
      if (round >= maxRounds) {
        const behavioralMetrics = calculateBehavioralMetrics(
          reactionTimes.current, correctRounds.current, incorrectAttempts.current,
          (round / maxRounds) * 100,
          { tapEventLog: tapLog.current, emptySpaceTapCount: emptySpaceTapCountRef.current }
        );
        onComplete({ score: round * 100, rounds: round, behavioralMetrics });
      } else {
        setMessage('Great dancing! 🕺');
        setTimeout(() => setRound(r => r + 1), 1000);
      }
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Follow the Leader</Text>
        <View style={styles.roundBadge}>
          <Text style={styles.roundText}>Round {round}/{maxRounds}</Text>
        </View>
      </View>

      <View style={styles.displayBox}>
        <Text style={styles.displayIcon}>
          {activeAction !== null ? ACTIONS[activeAction].icon : '✨'}
        </Text>
        <Text style={styles.message}>{message}</Text>
      </View>

      <Pressable style={styles.actionsWrapper} onPress={handleEmptySpaceTap}>
        <View style={styles.actionsGrid}>
          {ACTIONS.map((action, i) => (
            <TouchableOpacity
              key={i}
              disabled={isShowing}
              onPress={() => handleAction(i)}
              style={[
                styles.actionBtn,
                { backgroundColor: action.bg, borderColor: action.border },
                isShowing && styles.actionBtnDisabled,
              ]}
              activeOpacity={0.85}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionName}>{action.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.blue, marginBottom: 8 },
  roundBadge: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  roundText: { fontSize: 14, fontWeight: '800', color: COLORS.gray500 },
  displayBox: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  displayIcon: { fontSize: 72, marginBottom: 12 },
  message: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
  },
  actionsWrapper: {
    padding: 8,
    backgroundColor: COLORS.gray50,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  actionBtn: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    borderWidth: 3,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionIcon: { fontSize: 36 },
  actionName: { fontSize: 14, fontWeight: '800', color: COLORS.gray600 },
});
