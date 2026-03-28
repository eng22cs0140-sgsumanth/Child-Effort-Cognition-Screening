
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Dimensions } from 'react-native';
import { ChildProfile, TapEvent } from '../../types';
import { COLORS } from '../../constants';
import { calculateBehavioralMetrics } from '../../ceciAlgorithm';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const GARDEN_ITEMS = ['🌸', '🦋', '🐝', '🌻', '🐞'];
const { width } = Dimensions.get('window');

export default function CountingGarden({ profile, onComplete }: Props) {
  const isArithmetic = profile.age >= 6;
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(0);
  const [items, setItems] = useState<{ x: number; y: number; char: string; group?: number }[]>([]);
  const [group1Count, setGroup1Count] = useState(0);
  const [group2Count, setGroup2Count] = useState(0);
  const [message, setMessage] = useState('');
  const [options, setOptions] = useState<number[]>([]);
  const [flashItem, setFlashItem] = useState<number | null>(null);
  const incorrectRef = useRef(0);
  const reactionTimes = useRef<number[]>([]);
  const gameStartTime = useRef(Date.now());
  const countingTapCountRef = useRef(0);

  // Tap tracking
  const lastElementTapTimeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(Date.now());
  const tapLog = useRef<TapEvent[]>([]);
  const emptySpaceTapCountRef = useRef(0);

  useEffect(() => {
    gameStartTime.current = Date.now();
    lastTapTimeRef.current = Date.now();

    if (isArithmetic) {
      // Age 6-9: two groups, addition task
      const g1 = Math.floor(Math.random() * 4) + 2; // 2-5
      const g2 = Math.floor(Math.random() * 4) + 2; // 2-5
      const total = g1 + g2;
      setGroup1Count(g1);
      setGroup2Count(g2);
      setTarget(total);

      const char1 = GARDEN_ITEMS[0];
      const char2 = GARDEN_ITEMS[3];
      const newItems = [
        ...Array.from({ length: g1 }, () => ({
          x: 5 + Math.random() * 42,
          y: 5 + Math.random() * 80,
          char: char1,
          group: 1,
        })),
        ...Array.from({ length: g2 }, () => ({
          x: 53 + Math.random() * 42,
          y: 5 + Math.random() * 80,
          char: char2,
          group: 2,
        })),
      ];
      setItems(newItems);

      const opts = [total - 1, total, total + 1, total + 2]
        .filter(n => n > 0)
        .sort(() => 0.5 - Math.random());
      setOptions(opts);
    } else {
      // Age 3-5: count a single group
      const num = Math.floor(Math.random() * 5) + 3; // 3-7
      setTarget(num);
      const char = GARDEN_ITEMS[Math.floor(Math.random() * GARDEN_ITEMS.length)];
      const newItems = Array.from({ length: num }, () => ({
        x: 5 + Math.random() * 80,
        y: 5 + Math.random() * 80,
        char,
      }));
      setItems(newItems);

      const opts = [num - 1, num, num + 1, num + 2]
        .filter(n => n > 0)
        .sort(() => 0.5 - Math.random());
      setOptions(opts);
    }
  }, []);

  const handleItemTap = (idx: number) => {
    const now = Date.now();
    const reactionTime = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;
    lastElementTapTimeRef.current = now;

    // counting_tap: records that child is actively counting
    tapLog.current.push({ timestamp: now, type: 'counting_tap', reactionTime });
    countingTapCountRef.current++;
    setFlashItem(idx);
    setTimeout(() => setFlashItem(null), 300);
  };

  const checkAnswer = (val: number) => {
    const now = Date.now();
    const reactionTime = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;
    lastElementTapTimeRef.current = now;

    if (val === target) {
      reactionTimes.current.push(Date.now() - gameStartTime.current);
      tapLog.current.push({ timestamp: now, type: 'correct', reactionTime });
      setMessage('Amazing! You can count so well! ✨');
      const behavioralMetrics = calculateBehavioralMetrics(
        reactionTimes.current, 1, incorrectRef.current, 100,
        { tapEventLog: tapLog.current, emptySpaceTapCount: emptySpaceTapCountRef.current }
      );
      setTimeout(() => onComplete({
        score: 100, target, behavioralMetrics, countingTapCount: countingTapCountRef.current
      }), 2000);
    } else {
      incorrectRef.current++;
      tapLog.current.push({ timestamp: now, type: 'incorrect', reactionTime });
      setMessage('Try counting them one more time!');
    }
  };

  const handleGardenEmptyTap = () => {
    const now = Date.now();
    if (now - lastElementTapTimeRef.current > 200) {
      const reactionTime = now - lastTapTimeRef.current;
      lastTapTimeRef.current = now;
      tapLog.current.push({ timestamp: now, type: 'empty_space', reactionTime });
      emptySpaceTapCountRef.current++;
    }
  };

  const handleOptionsEmptyTap = () => {
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
      <Text style={styles.title}>
        {isArithmetic
          ? `How many ${items[0]?.char ?? '🌸'} + ${items.find(i => i.group === 2)?.char ?? '🌻'} are there?`
          : `How many ${items[0]?.char}s are in the garden?`
        }
      </Text>

      <Pressable style={styles.gardenWrapper} onPress={handleGardenEmptyTap}>
        <View style={styles.garden}>
          {isArithmetic && (
            <View style={styles.divider} />
          )}
          {items.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.gardenItemTouch, { left: `${item.x}%`, top: `${item.y}%` }]}
              onPress={() => handleItemTap(i)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.gardenItem,
                  flashItem === i && styles.gardenItemFlash,
                ]}
              >
                {item.char}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Pressable style={styles.optionsWrapper} onPress={handleOptionsEmptyTap}>
        <View style={styles.optionsRow}>
          {options.map(num => (
            <TouchableOpacity
              key={num}
              style={styles.optionBtn}
              onPress={() => checkAnswer(num)}
              activeOpacity={0.85}
            >
              <Text style={styles.optionText}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16A34A',
    textAlign: 'center',
    marginBottom: 12,
  },
  gardenWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
  },
  garden: {
    height: 220,
    backgroundColor: '#F0FDF4',
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#BBF7D0',
    position: 'relative',
    overflow: 'hidden',
  },
  divider: {
    position: 'absolute',
    left: '50%',
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: '#86EFAC',
  },
  gardenItemTouch: {
    position: 'absolute',
  },
  gardenItem: {
    fontSize: 40,
  },
  gardenItemFlash: {
    opacity: 0.5,
    transform: [{ scale: 1.2 }],
  },
  message: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.orange,
    textAlign: 'center',
    marginBottom: 12,
  },
  optionsWrapper: {
    padding: 8,
    backgroundColor: COLORS.gray50,
    borderRadius: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  optionBtn: {
    width: 72,
    height: 72,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#BBF7D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#16A34A',
  },
});
