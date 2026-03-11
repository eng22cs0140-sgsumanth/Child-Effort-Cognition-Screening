
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { ChildProfile } from '../../types';
import { COLORS } from '../../constants';
import { calculateBehavioralMetrics } from '../../ceciAlgorithm';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const GRID_SIZE = 4;
const TARGET = 15;
const { width } = Dimensions.get('window');
const CELL_SIZE = Math.min(64, (width - 100) / GRID_SIZE);

export default function ColorMaze({ profile, onComplete }: Props) {
  const [path, setPath] = useState<number[]>([0]);
  const invalidTaps = useRef(0);
  const gameStartTime = useRef(Date.now());

  const handleCellClick = (idx: number) => {
    const last = path[path.length - 1];
    const row = Math.floor(last / GRID_SIZE);
    const col = last % GRID_SIZE;
    const targetRow = Math.floor(idx / GRID_SIZE);
    const targetCol = idx % GRID_SIZE;

    const isAdjacent = Math.abs(row - targetRow) + Math.abs(col - targetCol) === 1;

    if (isAdjacent && !path.includes(idx)) {
      const newPath = [...path, idx];
      setPath(newPath);
      if (idx === TARGET) {
        const totalTime = Date.now() - gameStartTime.current;
        const behavioralMetrics = calculateBehavioralMetrics(
          [totalTime], newPath.length - 1, invalidTaps.current, 100
        );
        setTimeout(() => onComplete({ score: 100, pathLength: newPath.length, behavioralMetrics }), 1000);
      }
    } else if (idx !== path[path.length - 1]) {
      invalidTaps.current++;
    }
  };

  const getCellStyle = (i: number) => {
    if (i === 0) return { backgroundColor: '#22C55E', borderColor: '#16A34A' };
    if (i === TARGET) return { backgroundColor: '#EF4444', borderColor: '#DC2626' };
    if (path.includes(i)) return { backgroundColor: '#EAB308', borderColor: '#CA8A04' };
    return { backgroundColor: COLORS.white, borderColor: COLORS.gray200 };
  };

  const getCellContent = (i: number) => {
    if (i === 0) return '🏠';
    if (i === TARGET) return '💰';
    if (path.includes(i)) return '👣';
    return '';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find the Way to the Treasure! 🏴‍☠️</Text>

      <View style={styles.gridContainer}>
        <View style={styles.grid}>
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.cell, getCellStyle(i), { width: CELL_SIZE, height: CELL_SIZE }]}
              onPress={() => handleCellClick(i)}
              activeOpacity={0.85}
            >
              <Text style={styles.cellIcon}>{getCellContent(i)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.hint}>Tap neighboring blocks to make a path!</Text>
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
    width: (CELL_SIZE + 6) * GRID_SIZE,
  },
  cell: {
    borderRadius: 12,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellIcon: { fontSize: 20 },
  hint: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
});
