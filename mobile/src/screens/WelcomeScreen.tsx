
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS } from '../constants';
import CECILogo from '../components/CECILogo';

type NavProp = StackNavigationProp<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen() {
  const navigation = useNavigation<NavProp>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <CECILogo size={120} />

        <Text style={styles.greeting}>
          Hi! I'm <Text style={styles.greetingAccent}>Starry!</Text>
        </Text>
        <Text style={styles.subtitle}>Ready to explore your super powers?</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Early Childhood{' '}
            <Text style={styles.cardTitleAccent}>Intellectual Disability</Text>
            {' '}Screening
          </Text>
          <Text style={styles.cardBody}>
            This project uses simple interactive games to understand how young children think and
            learn. By observing how a child plays — such as{' '}
            <Text style={styles.bold}>response time</Text>, mistakes, and improvement over repeated
            sessions — the system can identify{' '}
            <Text style={styles.boldPurple}>consistent learning difficulties</Text> and separate
            them from temporary low effort or mood changes. This game-based approach is
            non-stressful, child-friendly, and supportive of early screening.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.playButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.playButtonText}>LET'S PLAY! 🚀</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tutorialButton}
          onPress={() => navigation.navigate('Help')}
          activeOpacity={0.85}
        >
          <Text style={styles.tutorialButtonText}>TUTORIAL</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  greeting: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  greetingAccent: {
    color: COLORS.orange,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primaryLight,
    textAlign: 'center',
    marginBottom: 32,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 40,
    padding: 32,
    marginBottom: 32,
    width: '100%',
    borderWidth: 3,
    borderColor: COLORS.purple100,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#5B21B6',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  cardTitleAccent: {
    color: COLORS.orange,
  },
  cardBody: {
    fontSize: 16,
    color: COLORS.gray600,
    lineHeight: 26,
    fontWeight: '500',
  },
  bold: {
    color: COLORS.blue,
    fontWeight: '700',
  },
  boldPurple: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  playButton: {
    backgroundColor: COLORS.orange,
    borderRadius: 40,
    paddingVertical: 22,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  playButtonText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tutorialButton: {
    backgroundColor: COLORS.white,
    borderRadius: 40,
    paddingVertical: 22,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  tutorialButtonText: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '900',
  },
});
