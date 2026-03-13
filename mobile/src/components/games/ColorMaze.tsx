
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet, Dimensions } from 'react-native';
import { ChildProfile, TapEvent } from '../../types';
import { COLORS } from '../../constants';
import { calculateBehavioralMetrics } from '../../ceciAlgorithm';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const { width } = Dimensions.get('window');

// Adaptive grid: 4×4 for age 3-5, 6×6 for age 6-9
const getGridConfig = (age: number) => {
  if (age >= 6) {
    const size = 6;
    const target = size * size - 1; // 35
    const cellSize = Math.min(50, (width - 100) / size);
    // Wall cells for 6×6 to create dead-end paths
    const walls = new Set([7, 13, 14, 21, 27, 28]);
    return { size, target, cellSize, walls };
  } else {
    const size = 4;
    const target = size * size - 1; // 15
    const cellSize = Math.min(64, (width - 100) / size);
    // Wall cells for 4×4 to create planning challenge
    const walls = new Set([5, 9]);
    return { size, target, cellSize, walls };
  }
};

export default function ColorMaze({ profile, onComplete }: Props) {
  const config = getGridConfig(profile.age);
  const { size: GRID_SIZE, target: TARGET, cellSize: CELL_SIZE, walls: WALLS } = config;

  const [path, setPath] = useState<number[]>([0]);
  const invalidTaps = useRef(0);
  const gameStartTime = useRef(Date.now());

  // Tap tracking
  const lastElementTapTimeRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(Date.now());
  const tapLog = useRef<TapEvent[]>([]);
  const emptySpaceTapCountRef = useRef(0);

  const handleCellClick = (idx: number) => {
    const now = Date.now();
    const reactionTime = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;
    lastElementTapTimeRef.current = now;

    // Wall cells cannot be traversed
    if (WALLS.has(idx)) {
      invalidTaps.current++;
      tapLog.current.push({ timestamp: now, type: 'incorrect', reactionTime });
      return;
    }

    const last = path[path.length - 1];
    const row = Math.floor(last / GRID_SIZE);
    const col = last % GRID_SIZE;
    const targetRow = Math.floor(idx / GRID_SIZE);
    const targetCol = idx % GRID_SIZE;

    const isAdjacent = Math.abs(row - targetRow) + Math.abs(col - targetCol) === 1;

    if (isAdjacent && !path.includes(idx)) {
      tapLog.current.push({ timestamp: now, type: 'correct', reactionTime });
      const newPath = [...path, idx];
      setPath(newPath);
      if (idx === TARGET) {
        const totalTime = Date.now() - gameStartTime.current;
        const behavioralMetrics = calculateBehavioralMetrics(
          [totalTime], newPath.length - 1, invalidTaps.current, 100,
          { tapEventLog: tapLog.current, emptySpaceTapCount: emptySpaceTapCountRef.current }
        );
        setTimeout(() => onComplete({ score: 100, pathLength: newPath.length, behavioralMetrics }), 1000);
      }
    } else if (idx !== path[path.length - 1]) {
      invalidTaps.current++;
      tapLog.current.push({ timestamp: now, type: 'incorrect', reactionTime });
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

  const getCellStyle = (i: number) => {
    if (WALLS.has(i)) return { backgroundColor: '#374151', borderColor: '#111827' };
    if (i === 0) return { backgroundColor: '#22C55E', borderColor: '#16A34A' };
    if (i === TARGET) return { backgroundColor: '#EF4444', borderColor: '#DC2626' };
    if (path.includes(i)) return { backgroundColor: '#EAB308', borderColor: '#CA8A04' };
    return { backgroundColor: COLORS.white, borderColor: COLORS.gray200 };
  };

  const getCellContent = (i: number) => {
    if (WALLS.has(i)) return '⛔';
    if (i === 0) return '🏠';
    if (i === TARGET) return '💰';
    if (path.includes(i)) return '👣';
    return '';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find the Way to the Treasure! 🏴‍☠️</Text>

      <Pressable style={styles.gridContainer} onPress={handleEmptySpaceTap}>
        <View style={[styles.grid, { width: (CELL_SIZE + 6) * GRID_SIZE }]}>
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.cell, getCellStyle(i), { width: CELL_SIZE, height: CELL_SIZE }]}
              onPress={() => handleCellClick(i)}
              activeOpacity={0.85}
            >
              <Text style={[styles.cellIcon, CELL_SIZE < 55 && styles.cellIconSmall]}>
                {getCellContent(i)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>

      <Text style={styles.hint}>Tap neighboring blocks to make a path! Avoid ⛔ walls.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.blue,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 26,
  },
  gridContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 24,
    padding: 12,
    borderWidth: 3,
    borderColor: '#BFDBFE',
    marginBottom: 20,
    flex: 1,
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  cell: {
    borderRadius: 12,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellIcon: { fontSize: 20 },
  cellIconSmall: { fontSize: 14 },
  hint: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
});
