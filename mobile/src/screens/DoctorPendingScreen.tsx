import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS } from '../constants';
import { useApp } from '../context/AppContext';

type NavProp = StackNavigationProp<RootStackParamList, 'DoctorPending'>;

export default function DoctorPendingScreen() {
  const navigation = useNavigation<NavProp>();
  const { doctor, signOut } = useApp();

  const handleSignOut = async () => {
    await signOut();
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Welcome' }] })
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.icon}>⏳</Text>
        <Text style={styles.title}>Registration Under Review</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thank you for registering!</Text>
          <Text style={styles.cardText}>
            Your professional credentials have been submitted and are currently being reviewed
            by our administrative team.
          </Text>
          <Text style={styles.cardText}>
            You will receive an email notification at{' '}
            <Text style={styles.emailHighlight}>{doctor?.email || 'your registered email'}</Text>{' '}
            once your account has been approved or if additional information is required.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What happens next?</Text>
          <View style={styles.step}>
            <Text style={styles.stepNum}>1</Text>
            <Text style={styles.stepText}>Admin reviews your professional details</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNum}>2</Text>
            <Text style={styles.stepText}>You receive an approval email</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNum}>3</Text>
            <Text style={styles.stepText}>Log in to access child assessment records</Text>
          </View>
        </View>

        {doctor && (
          <View style={styles.profileSummary}>
            <Text style={styles.profileTitle}>Submitted Profile</Text>
            <Text style={styles.profileRow}>
              <Text style={styles.profileKey}>Name: </Text>{doctor.fullName}
            </Text>
            <Text style={styles.profileRow}>
              <Text style={styles.profileKey}>Role: </Text>{doctor.role}
            </Text>
            <Text style={styles.profileRow}>
              <Text style={styles.profileKey}>Hospital: </Text>{doctor.hospital}
            </Text>
            <Text style={styles.profileRow}>
              <Text style={styles.profileKey}>Specialty: </Text>{doctor.specialty}
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF9E6' },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  icon: { fontSize: 80, marginBottom: 16 },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#D97706',
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 12,
  },
  cardText: {
    fontSize: 15,
    color: COLORS.gray700,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 10,
  },
  emailHighlight: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  infoCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#86EFAC',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#15803D',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22C55E',
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 32,
  },
  stepText: { fontSize: 14, fontWeight: '700', color: '#166534', flex: 1 },
  profileSummary: {
    backgroundColor: '#F5F3FF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#DDD6FE',
  },
  profileTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 12,
  },
  profileRow: {
    fontSize: 14,
    color: COLORS.gray700,
    fontWeight: '600',
    marginBottom: 6,
  },
  profileKey: { fontWeight: '900', color: COLORS.primary },
  signOutBtn: {
    backgroundColor: COLORS.gray100,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  signOutBtnText: { color: COLORS.gray600, fontSize: 16, fontWeight: '900' },
});
