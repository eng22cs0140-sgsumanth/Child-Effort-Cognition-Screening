
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChildProfile } from '../../types';
import { COLORS } from '../../constants';
import { calculateBehavioralMetrics } from '../../ceciAlgorithm';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const SHAPES = [
  { id: 'sq-red', icon: '🟥', type: 'square', color: 'red' },
  { id: 'cr-blue', icon: '🔵', type: 'circle', color: 'blue' },
  { id: 'tr-green', icon: '🔺', type: 'triangle', color: 'green' },
  { id: 'st-yellow', icon: '⭐', type: 'star', color: 'yellow' },
  { id: 'dm-purple', icon: '💎', type: 'diamond', color: 'purple' },
];

export default function ShapeSorter({ profile, onComplete }: Props) {
  const [placed, setPlaced] = useState<string[]>([]);
  const [activeShape, setActiveShape] = useState<string | null>(null);
  const incorrectRef = useRef(0);
  const reactionTimes = useRef<number[]>([]);
  const shapeSelectTime = useRef(Date.now());

  const handleTargetPress = (shapeId: string) => {
    if (!activeShape || placed.includes(shapeId)) return;
    if (activeShape !== shapeId) {
      incorrectRef.current++;
      return;
    }
    reactionTimes.current.push(Date.now() - shapeSelectTime.current);
    const newPlaced = [...placed, shapeId];
    setPlaced(newPlaced);
    setActiveShape(null);
    if (newPlaced.length === SHAPES.length) {
      const behavioralMetrics = calculateBehavioralMetrics(
        reactionTimes.current, SHAPES.length, incorrectRef.current,
        (newPlaced.length / SHAPES.length) * 100
      );
      setTimeout(() => onComplete({ score: 100, shapesSorted: SHAPES.length, behavioralMetrics }), 1000);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Match the Shapes!</Text>

      {/* Targets */}
      <View style={styles.targets}>
        {SHAPES.map(s => (
          <TouchableOpacity
            key={`target-${s.id}`}
            style={[
              styles.target,
              placed.includes(s.id) && styles.targetPlaced,
              activeShape === s.id && styles.targetActive,
            ]}
            onPress={() => handleTargetPress(s.id)}
            activeOpacity={0.8}
          >
            <Text style={styles.targetIcon}>{placed.includes(s.id) ? s.icon : s.icon}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Source pile */}
      <View style={styles.sources}>
        {SHAPES.filter(s => !placed.includes(s.id)).map(s => (
          <TouchableOpacity
            key={`source-${s.id}`}
            style={[
              styles.source,
              activeShape === s.id && styles.sourceActive,
            ]}
            onPress={() => {
              if (s.id !== activeShape) shapeSelectTime.current = Date.now();
              setActiveShape(s.id === activeShape ? null : s.id);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.sourceIcon}>{s.icon}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.hint}>Tap a shape, then tap its matching shadow!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '900', color: COLORS.blue, marginBottom: 24 },
  targets: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 40,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  target: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: COLORS.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.4,
  },
  targetPlaced: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
    opacity: 1,
  },
  targetActive: {
    borderColor: COLORS.blue,
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  targetIcon: { fontSize: 32 },
  sources: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 24,
  },
  source: {
    backgroundColor: COLORS.gray50,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  sourceActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 3,
    borderColor: COLORS.blue,
    transform: [{ scale: 1.15 }],
  },
  sourceIcon: { fontSize: 44 },
  hint: {
    fontSize: 13,
    color: COLORS.gray400,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
