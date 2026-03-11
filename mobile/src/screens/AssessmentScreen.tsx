
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useApp } from '../context/AppContext';
import { GAMES, COLORS } from '../constants';
import { GameType, GameResult } from '../types';

import ReactionCatcher from '../components/games/ReactionCatcher';
import PatternMemory from '../components/games/PatternMemory';
import EmotionDetective from '../components/games/EmotionDetective';
import ShapeSorter from '../components/games/ShapeSorter';
import CountingGarden from '../components/games/CountingGarden';
import SoundWordGame from '../components/games/SoundWordGame';
import FollowLeader from '../components/games/FollowLeader';
import SimonSays from '../components/games/SimonSays';
import ColorMaze from '../components/games/ColorMaze';
import CategorySort from '../components/games/CategorySort';

type NavProp = StackNavigationProp<RootStackParamList, 'Assessment'>;

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  Attention: { bg: '#EDE9FE', text: COLORS.primary },
  Cognitive: { bg: '#FEF3C7', text: '#92400E' },
  Language: { bg: '#D1FAE5', text: '#065F46' },
  Social: { bg: '#FCE7F3', text: '#9D174D' },
};

export default function AssessmentScreen() {
  const navigation = useNavigation<NavProp>();
  const { child, role, addResult } = useApp();
  const [activeGame, setActiveGame] = useState<GameType | null>(null);

  const handleGameEnd = (data: any) => {
    if (activeGame) {
      const result: GameResult = {
        gameId: activeGame,
        score: data.score || 0,
        data,
        timestamp: Date.now(),
      };
      addResult(result);
      setActiveGame(null);
      if (role === 'child') {
        navigation.navigate('Results');
      }
    }
  };

  const renderActiveGame = () => {
    const props = { profile: child, onComplete: handleGameEnd };
    switch (activeGame) {
      case 'catcher': return <ReactionCatcher {...props} />;
      case 'memory': return <PatternMemory {...props} />;
      case 'emotion': return <EmotionDetective {...props} />;
      case 'shapes': return <ShapeSorter {...props} />;
      case 'counting': return <CountingGarden {...props} />;
      case 'sound': return <SoundWordGame {...props} />;
      case 'leader': return <FollowLeader {...props} />;
      case 'simon': return <SimonSays {...props} />;
      case 'maze': return <ColorMaze {...props} />;
      case 'category': return <CategorySort {...props} />;
      default: return null;
    }
  };

  if (activeGame) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.gameContainer}>
          <TouchableOpacity style={styles.backFromGame} onPress={() => setActiveGame(null)}>
            <View style={styles.backCircle}>
              <Text style={styles.backCircleText}>←</Text>
            </View>
            <Text style={styles.backFromGameText}>Pick Another Adventure</Text>
          </TouchableOpacity>
          <View style={styles.gameBox}>
            {renderActiveGame()}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>⬅️</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          Hey, <Text style={styles.titleAccent}>{child.name || 'Explorer'}!</Text> 👋
        </Text>
        <Text style={styles.subtitle}>Pick a game and collect your badge!</Text>

        <View style={styles.gamesGrid}>
          {GAMES.map(game => {
            const badgeColor = BADGE_COLORS[game.badge] || BADGE_COLORS.Attention;
            return (
              <TouchableOpacity
                key={game.id}
                style={styles.gameCard}
                onPress={() => setActiveGame(game.id)}
                activeOpacity={0.85}
              >
                <Text style={styles.gameIcon}>{game.icon}</Text>
                <Text style={styles.gameTitle}>{game.title}</Text>
                <Text style={styles.gameDesc}>{game.description}</Text>
                <View style={styles.gameMeta}>
                  <View style={[styles.badge, { backgroundColor: badgeColor.bg }]}>
                    <Text style={[styles.badgeText, { color: badgeColor.text }]}>{game.badge}</Text>
                  </View>
                  <Text style={styles.ageRange}>Ages {game.ageRange[0]}-{game.ageRange[1]}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 48 - 16) / 2;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  backBtn: {
    backgroundColor: COLORS.purple100,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  backBtnText: { fontSize: 22 },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  titleAccent: { color: COLORS.orange },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryLight,
    textAlign: 'center',
    marginBottom: 28,
  },
  gamesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  gameCard: {
    backgroundColor: COLORS.white,
    borderRadius: 32,
    padding: 20,
    width: cardWidth,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.purple100,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  gameIcon: {
    fontSize: 52,
    marginBottom: 12,
  },
  gameTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 22,
  },
  gameDesc: {
    fontSize: 12,
    color: COLORS.gray400,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  gameMeta: {
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  ageRange: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.gray400,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  // Active game styles
  gameContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backFromGame: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backCircle: {
    backgroundColor: COLORS.white,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  backCircleText: {
    fontSize: 22,
    color: COLORS.primary,
    fontWeight: '900',
  },
  backFromGameText: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
  },
  gameBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 32,
    padding: 16,
    borderWidth: 3,
    borderColor: COLORS.purple100,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
});
