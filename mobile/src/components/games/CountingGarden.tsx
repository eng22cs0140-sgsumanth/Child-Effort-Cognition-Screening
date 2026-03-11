
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { ChildProfile } from '../../types';
import { COLORS } from '../../constants';
import { calculateBehavioralMetrics } from '../../ceciAlgorithm';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const GARDEN_ITEMS = ['🌸', '🦋', '🐝', '🌻', '🐞'];
const { width } = Dimensions.get('window');

export default function CountingGarden({ profile, onComplete }: Props) {
  const [count, setCount] = useState(0);
  const [target, setTarget] = useState(0);
  const [items, setItems] = useState<{ x: number; y: number; char: string }[]>([]);
  const [message, setMessage] = useState('');
  const [options, setOptions] = useState<number[]>([]);
  const incorrectRef = useRef(0);
  const reactionTimes = useRef<number[]>([]);
  const gameStartTime = useRef(Date.now());

  useEffect(() => {
    gameStartTime.current = Date.now();
    const num = Math.floor(Math.random() * 5) + (profile.age > 5 ? 5 : 3);
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
  }, []);

  const checkAnswer = (val: number) => {
    if (val === target) {
      reactionTimes.current.push(Date.now() - gameStartTime.current);
      setMessage('Amazing! You can count so well! ✨');
      const behavioralMetrics = calculateBehavioralMetrics(
        reactionTimes.current, 1, incorrectRef.current, 100
      );
      setTimeout(() => onComplete({ score: 100, target, behavioralMetrics }), 2000);
    } else {
      incorrectRef.current++;
      setMessage('Try counting them one more time!');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        How many {items[0]?.char}s are in the garden?
      </Text>

      <View style={styles.garden}>
        {items.map((item, i) => (
          <Text
            key={i}
            style={[
              styles.gardenItem,
              { left: `${item.x}%`, top: `${item.y}%` },
            ]}
          >
            {item.char}
          </Text>
        ))}
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

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
  garden: {
    height: 220,
    backgroundColor: '#F0FDF4',
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#BBF7D0',
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  gardenItem: {
    position: 'absolute',
    fontSize: 40,
  },
  message: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.orange,
    textAlign: 'center',
    marginBottom: 12,
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
