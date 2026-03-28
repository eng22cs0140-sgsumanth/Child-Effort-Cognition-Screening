
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
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

const OBJECTS = ['⭐', '🦋', '🎈', '🌟', '🍎', '🍓'];
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const GAME_W = SCREEN_W - 64;
const GAME_H = SCREEN_H * 0.55;

export default function ReactionCatcher({ profile, onComplete }: Props) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [items, setItems] = useState<{ id: number; x: number; y: number; char: string; startTime: number }[]>([]);
  const gameActive = useRef(true);
  const reactionTimes = useRef<number[]>([]);
  const correctCatches = useRef(0);
  const missedItems = useRef(0);
  const clickCount = useRef(0);
  const gameStartTime = useRef(Date.now());

  // Tap tracking
  const lastElementTapTimeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(Date.now());
  const tapLog = useRef<TapEvent[]>([]);
  const emptySpaceTapCountRef = useRef(0);

  const spawnRate = Math.max(800, 2000 - (profile.age * 150));
  const fallSpeed = Math.min(6, 3 + (profile.age / 2));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          gameActive.current = false;
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const spawner = setInterval(() => {
      if (!gameActive.current) return;
      const x = Math.random() * (GAME_W - 60);
      setItems(prev => [...prev, {
        id: Date.now() + Math.random(),
        x,
        y: -50,
        char: OBJECTS[Math.floor(Math.random() * OBJECTS.length)],
        startTime: Date.now(),
      }]);
    }, spawnRate);

    return () => {
      clearInterval(timer);
      clearInterval(spawner);
    };
  }, [spawnRate]);

  useEffect(() => {
    if (timeLeft === 0) {
      const gameDuration = (Date.now() - gameStartTime.current) / 1000;
      const clicksPerSecond = clickCount.current / gameDuration;
      const engagementScore = Math.min(100, (clicksPerSecond / 2) * 100);
      const behavioralMetrics = calculateBehavioralMetrics(
        reactionTimes.current,
        correctCatches.current,
        missedItems.current,
        engagementScore,
        { tapEventLog: tapLog.current, emptySpaceTapCount: emptySpaceTapCountRef.current }
      );
      onComplete({ score, age: profile.age, behavioralMetrics });
    }
  }, [timeLeft]);

  useEffect(() => {
    const moveItems = setInterval(() => {
      setItems(prev => {
        const updated = prev.map(item => ({ ...item, y: item.y + fallSpeed }));
        updated.forEach(item => {
          if (item.y >= GAME_H + 50) missedItems.current++;
        });
        return updated.filter(item => item.y < GAME_H + 50);
      });
    }, 50);
    return () => clearInterval(moveItems);
  }, [fallSpeed]);

  const handleCatch = (id: number, startTime: number) => {
    const now = Date.now();
    const reactionTime = now - startTime;
    lastElementTapTimeRef.current = now;
    lastTapTimeRef.current = now;
    reactionTimes.current.push(reactionTime);
    tapLog.current.push({ timestamp: now, type: 'correct', reactionTime });
    correctCatches.current++;
    clickCount.current++;
    setScore(s => s + 10);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleEmptySpaceTap = () => {
    const now = Date.now();
    if (now - lastElementTapTimeRef.current > 200) {
      const reactionTime = now - lastTapTimeRef.current;
      lastTapTimeRef.current = now;
      tapLog.current.push({ timestamp: now, type: 'empty_space', reactionTime });
      emptySpaceTapCountRef.current++;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.scoreBar}>
        <Text style={styles.scoreText}>Score: {score}</Text>
        <Text style={styles.timeText}>Time: {timeLeft}s</Text>
      </View>

      <Pressable style={styles.gameArea} onPress={handleEmptySpaceTap}>
        {timeLeft > 25 && (
          <View style={styles.instructions}>
            <Text style={styles.instructionTitle}>Tap the falling toys!</Text>
            <Text style={styles.instructionSub}>Catch as many as you can!</Text>
          </View>
        )}
        {items.map(item => (
          <TouchableOpacity
            key={item.id}
            style={[styles.fallingItem, { left: item.x, top: item.y }]}
            onPress={() => handleCatch(item.id, item.startTime)}
            activeOpacity={0.7}
          >
            <Text style={styles.itemChar}>{item.char}</Text>
          </TouchableOpacity>
        ))}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scoreBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  scoreText: { fontSize: 18, fontWeight: '800', color: COLORS.orange },
  timeText: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  gameArea: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#BFDBFE',
    overflow: 'hidden',
    position: 'relative',
    minHeight: GAME_H,
  },
  fallingItem: {
    position: 'absolute',
  },
  itemChar: { fontSize: 40 },
  instructions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  instructionSub: { fontSize: 15, color: COLORS.gray600, textAlign: 'center', fontWeight: '600' },
});
