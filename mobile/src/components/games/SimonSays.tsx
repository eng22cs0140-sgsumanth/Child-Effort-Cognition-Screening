
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChildProfile } from '../../types';
import { COLORS } from '../../constants';
import { calculateBehavioralMetrics } from '../../ceciAlgorithm';

interface Props {
  profile: ChildProfile;
  onComplete: (data: any) => void;
}

const COMMANDS = [
  { text: 'Simon says, Touch your nose!', icon: '👃', requiresSimon: true },
  { text: 'Simon says, Raise your hand!', icon: '✋', requiresSimon: true },
  { text: 'Touch your ears!', icon: '👂', requiresSimon: false },
  { text: 'Simon says, Stick out your tongue!', icon: '👅', requiresSimon: true },
  { text: 'Clap your hands!', icon: '👏', requiresSimon: false },
];

export default function SimonSays({ profile, onComplete }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [rounds, setRounds] = useState(0);
  const correctRef = useRef(0);
  const incorrectRef = useRef(0);
  const reactionTimes = useRef<number[]>([]);
  const commandStartTime = useRef(Date.now());

  const command = COMMANDS[currentIdx];

  const handleDecision = (doAction: boolean) => {
    const isCorrect = doAction === command.requiresSimon;
    reactionTimes.current.push(Date.now() - commandStartTime.current);
    if (isCorrect) {
      correctRef.current++;
      setScore(s => s + 20);
      setFeedback('You listened well! ✅');
    } else {
      incorrectRef.current++;
      setFeedback("Simon didn't say! ❌");
    }

    setTimeout(() => {
      commandStartTime.current = Date.now();
      setFeedback('');
      const nextRounds = rounds + 1;
      setRounds(nextRounds);
      if (nextRounds >= 5) {
        const finalScore = Math.max(0, score + (isCorrect ? 20 : 0));
        const behavioralMetrics = calculateBehavioralMetrics(
          reactionTimes.current, correctRef.current, incorrectRef.current,
          (correctRef.current / 5) * 100
        );
        onComplete({ score: finalScore, rounds: 5, behavioralMetrics });
      } else {
        setCurrentIdx(Math.floor(Math.random() * COMMANDS.length));
      }
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Simon Says Musical</Text>

      <View style={styles.commandBox}>
        <Text style={styles.musicIcon}>🎶</Text>
        <Text style={styles.commandText}>"{command.text}"</Text>
        {feedback ? (
          <Text style={[styles.feedback, feedback.includes('listened') ? styles.feedbackGood : styles.feedbackBad]}>
            {feedback}
          </Text>
        ) : null}
      </View>

      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.doBtn, { backgroundColor: '#22C55E' }]}
          onPress={() => handleDecision(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.doBtnText}>Do It! 👍</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.doBtn, { backgroundColor: '#EF4444' }]}
          onPress={() => handleDecision(false)}
          activeOpacity={0.85}
        >
          <Text style={styles.doBtnText}>Don't Do It! 🛑</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        Listen carefully! Only do it if Starry says "Simon says"!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#EF4444',
    marginBottom: 20,
  },
  commandBox: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    flex: 1,
    justifyContent: 'center',
  },
  musicIcon: { fontSize: 64, marginBottom: 16 },
  commandText: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 12,
  },
  feedback: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  feedbackGood: { color: '#16A34A' },
  feedbackBad: { color: '#EF4444' },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  doBtn: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  doBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: COLORS.gray400,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
