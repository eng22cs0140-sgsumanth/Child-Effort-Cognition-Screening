
import React, { useState, useEffect, useRef, useCallback } from 'react';
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

// Each action shows for this long, then goes blank before the next one
const ACTION_DISPLAY_MS = 1500;
const GAP_BETWEEN_MS = 500;
const STEP_MS = ACTION_DISPLAY_MS + GAP_BETWEEN_MS;

export default function FollowLeader({ profile, onComplete }: Props) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [isShowing, setIsShowing] = useState(false);
  const [activeAction, setActiveAction] = useState<number | null>(null);
  const [round, setRound] = useState(1);
  const [message, setMessage] = useState('Watch Starry dance!');
  const [isGameStarted, setIsGameStarted] = useState(false);
  // Blocks input during celebrations / retry delays
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Refs give async callbacks the latest values without stale closures
  const sequenceRef = useRef<number[]>([]);
  const userSequenceRef = useRef<number[]>([]);
  const transitioningRef = useRef(false);

  // Tap tracking
  const correctRoundsRef = useRef(0);
  const incorrectAttemptsRef = useRef(0);
  const reactionTimesRef = useRef<number[]>([]);
  const turnStartTimeRef = useRef(0);
  const lastTapTimeRef = useRef<number>(Date.now());
  const lastElementTapTimeRef = useRef<number>(0);
  const tapLogRef = useRef<TapEvent[]>([]);
  const emptySpaceTapCountRef = useRef(0);

  // Track all scheduled timeouts so we can cancel them on unmount / round restart
  const timeoutIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  const maxRounds = 4;

  const clearAllTimeouts = () => {
    timeoutIds.current.forEach(clearTimeout);
    timeoutIds.current = [];
  };

  const schedule = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeoutIds.current.push(id);
    return id;
  };

  const startRound = useCallback((currentRound: number) => {
    clearAllTimeouts();

    const len = currentRound + 1;
    const nextSeq = Array.from({ length: len }, () =>
      Math.floor(Math.random() * ACTIONS.length)
    );

    // Update ref immediately — state is for rendering only
    sequenceRef.current = nextSeq;
    userSequenceRef.current = [];
    transitioningRef.current = false;

    setSequence(nextSeq);
    setUserSequence([]);
    setIsTransitioning(false);
    setIsShowing(true);
    setActiveAction(null);
    setMessage('Watch carefully...');

    // Show each action with a visible gap so repeated moves are distinguishable
    nextSeq.forEach((actionIdx, i) => {
      schedule(() => setActiveAction(actionIdx), i * STEP_MS);
      schedule(() => setActiveAction(null), i * STEP_MS + ACTION_DISPLAY_MS);
    });

    // Enable player input after the full sequence has played
    const totalDuration = nextSeq.length * STEP_MS;
    schedule(() => {
      setIsShowing(false);
      setMessage('Your turn! Copy the moves!');
      lastTapTimeRef.current = Date.now();
      turnStartTimeRef.current = Date.now();
    }, totalDuration);
  }, []);

  // Re-run startRound whenever the round counter increments
  useEffect(() => {
    if (!isGameStarted) return;
    const id = setTimeout(() => startRound(round), 800);
    return () => {
      clearTimeout(id);
      clearAllTimeouts();
    };
  }, [round, isGameStarted, startRound]);

  // Clean up on unmount
  useEffect(() => () => clearAllTimeouts(), []);

  const handleAction = (idx: number) => {
    // Block if sequence is playing, game hasn't started, or in a transition delay
    if (isShowing || !isGameStarted || transitioningRef.current) return;

    const now = Date.now();
    const reactionTime = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;
    lastElementTapTimeRef.current = now;

    // Use refs for guaranteed up-to-date values
    const currentSeq = sequenceRef.current;
    const currentUserSeq = userSequenceRef.current;
    const expected = currentSeq[currentUserSeq.length];
    const nextUserSeq = [...currentUserSeq, idx];

    userSequenceRef.current = nextUserSeq;
    setUserSequence(nextUserSeq);

    // Brief visual flash on the pressed button
    setActiveAction(idx);
    schedule(() => setActiveAction(null), 300);

    if (idx !== expected) {
      // Wrong move — lock input then restart the round
      incorrectAttemptsRef.current++;
      tapLogRef.current.push({ timestamp: now, type: 'incorrect', reactionTime });
      transitioningRef.current = true;
      setIsTransitioning(true);
      setMessage("Oh no! Let's try the round again! 🔄");
      schedule(() => startRound(round), 1600);
      return;
    }

    tapLogRef.current.push({ timestamp: now, type: 'correct', reactionTime });

    // Record reaction time on the first move of each turn
    if (currentUserSeq.length === 0) {
      reactionTimesRef.current.push(Math.max(0, now - turnStartTimeRef.current));
    }

    if (nextUserSeq.length === currentSeq.length) {
      // Completed the sequence for this round
      correctRoundsRef.current++;
      transitioningRef.current = true;
      setIsTransitioning(true);

      if (round >= maxRounds) {
        setMessage('You are a dance star! 🌟');
        schedule(() => {
          const behavioralMetrics = calculateBehavioralMetrics(
            reactionTimesRef.current,
            correctRoundsRef.current,
            incorrectAttemptsRef.current,
            (round / maxRounds) * 100,
            { tapEventLog: tapLogRef.current, emptySpaceTapCount: emptySpaceTapCountRef.current }
          );
          onComplete({ score: round * 100, rounds: round, behavioralMetrics });
        }, 1500);
      } else {
        setMessage('Great dancing! 🕺');
        schedule(() => setRound(r => r + 1), 1500);
      }
    }
  };

  const handleEmptySpaceTap = () => {
    const now = Date.now();
    if (now - lastElementTapTimeRef.current > 20) {
      const reactionTime = now - lastTapTimeRef.current;
      lastTapTimeRef.current = now;
      tapLogRef.current.push({ timestamp: now, type: 'empty_space', reactionTime });
      emptySpaceTapCountRef.current++;
    }
  };

  if (!isGameStarted) {
    return (
      <View style={styles.startContainer}>
        <Text style={styles.startTitle}>Follow the Leader</Text>
        <View style={styles.startCard}>
          <Text style={styles.startEmoji}>🕺</Text>
          <Text style={styles.startBody}>
            Watch Starry's moves and then copy them exactly! Ready to dance?
          </Text>
          <TouchableOpacity
            style={styles.startBtn}
            onPress={() => setIsGameStarted(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.startBtnText}>START DANCING! 🚀</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const inputDisabled = isShowing || isTransitioning;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Follow the Leader</Text>
        <View style={styles.roundBadge}>
          <Text style={styles.roundText}>Round {round}/{maxRounds}</Text>
        </View>
      </View>

      <View style={styles.displayBox}>
        {isShowing && (
          <View style={styles.watchBanner}>
            <Text style={styles.watchBannerText}>WATCH! 👀</Text>
          </View>
        )}
        <Text style={styles.displayIcon}>
          {activeAction !== null ? ACTIONS[activeAction].icon : '✨'}
        </Text>
        <Text style={styles.message}>{message}</Text>

        {/* Progress dots during player's turn */}
        {!isShowing && !isTransitioning && userSequence.length > 0 && (
          <View style={styles.progressDots}>
            {sequenceRef.current.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < userSequence.length ? styles.dotFilled : styles.dotEmpty,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <Pressable style={styles.actionsWrapper} onPress={handleEmptySpaceTap}>
        <View style={styles.actionsGrid}>
          {ACTIONS.map((action, i) => (
            <TouchableOpacity
              key={i}
              disabled={inputDisabled}
              onPress={() => handleAction(i)}
              style={[
                styles.actionBtn,
                { backgroundColor: action.bg, borderColor: action.border },
                inputDisabled && styles.actionBtnDisabled,
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
  // ── Start screen ─────────────────────────────────────────────────────
  startContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  startTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.blue,
    marginBottom: 20,
  },
  startCard: {
    backgroundColor: COLORS.white,
    borderRadius: 36,
    padding: 32,
    alignItems: 'center',
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 3,
    borderColor: '#DBEAFE',
  },
  startEmoji: { fontSize: 80 },
  startBody: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.gray600,
    textAlign: 'center',
    lineHeight: 26,
  },
  startBtn: {
    backgroundColor: COLORS.blue,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  startBtnText: { color: COLORS.white, fontWeight: '900', fontSize: 18 },

  // ── Game screen ───────────────────────────────────────────────────────
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
    gap: 10,
  },
  watchBanner: {
    backgroundColor: '#FDE68A',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
  },
  watchBannerText: { fontWeight: '900', fontSize: 14, color: '#92400E' },
  displayIcon: { fontSize: 72 },
  message: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotFilled: { backgroundColor: COLORS.blue },
  dotEmpty: { backgroundColor: '#DBEAFE' },
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
