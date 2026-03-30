import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS } from '../constants';
import { useApp } from '../context/AppContext';
import { getChildrenForDoctor, getSessionsForChild } from '../services/firebaseService';
import { ChildProfile, AssessmentSession } from '../types';

type NavProp = StackNavigationProp<RootStackParamList, 'DoctorDashboard'>;

interface ChildWithSessions extends ChildProfile {
  id: string;
  sessions: AssessmentSession[];
  latestCECIBand?: 'green' | 'amber' | 'red';
}

const BAND_COLORS = {
  green: { bg: '#F0FDF4', text: '#15803D', border: '#86EFAC', label: 'Typical' },
  amber: { bg: '#FFFBEB', text: '#D97706', border: '#FCD34D', label: 'Monitor' },
  red: { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5', label: 'High Risk' },
};

export default function DoctorDashboardScreen() {
  const navigation = useNavigation<NavProp>();
  const { doctor, signOut, firebaseUid } = useApp();
  const [children, setChildren] = useState<ChildWithSessions[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChild, setSelectedChild] = useState<ChildWithSessions | null>(null);

  const loadChildren = async () => {
    if (!firebaseUid) return;
    try {
      const kids = await getChildrenForDoctor(firebaseUid);
      const withSessions = await Promise.all(
        kids.map(async (kid) => {
          const sessions = await getSessionsForChild(kid.id);
          const lastSession = sessions[sessions.length - 1];
          const latestCECIBand = (lastSession as any)?.ceciScore?.riskBand;
          return { ...kid, sessions, latestCECIBand };
        })
      );
      setChildren(withSessions);
    } catch (e) {
      console.warn('Failed to load children:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadChildren(); }, [firebaseUid]);

  const handleSignOut = async () => {
    await signOut();
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Welcome' }] }));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading patient records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Child detail view
  if (selectedChild) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedChild(null)}>
            <Text style={styles.backBtnText}>⬅️ Back</Text>
          </TouchableOpacity>

          <Text style={styles.childName}>{selectedChild.name}</Text>
          <Text style={styles.childMeta}>
            Age {selectedChild.age} • {selectedChild.sex} •{' '}
            {selectedChild.latestCECIBand
              ? BAND_COLORS[selectedChild.latestCECIBand].label
              : 'No assessment yet'}
          </Text>

          {/* Profile card */}
          <View style={styles.profileCard}>
            <Text style={styles.sectionTitle}>Child Profile</Text>
            <InfoRow label="Date of Birth" value={selectedChild.dob} />
            <InfoRow label="Sex" value={selectedChild.sex} />
            <InfoRow label="Blood Group" value={selectedChild.bloodGroup || '—'} />
            <InfoRow
              label="Height / Weight"
              value={`${selectedChild.height || '—'} cm / ${selectedChild.weight || '—'} kg`}
            />
            <InfoRow label="BMI" value={selectedChild.bmi?.toFixed(1) || '—'} />
            <InfoRow label="Premature" value={selectedChild.isPremature ? 'Yes' : 'No'} />
            {selectedChild.isPremature && (
              <InfoRow
                label="Gestational Age"
                value={`${selectedChild.gestationalAgeWeeks} weeks`}
              />
            )}
            <InfoRow
              label="Family History of DD"
              value={selectedChild.familyHistoryOfDD ? 'Yes' : 'No'}
            />
            {selectedChild.knownConditions ? (
              <InfoRow label="Known Conditions" value={selectedChild.knownConditions} />
            ) : null}
          </View>

          {/* Sessions */}
          <Text style={styles.sectionTitle}>Assessment Sessions ({selectedChild.sessions.length})</Text>
          {selectedChild.sessions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No sessions recorded yet.</Text>
            </View>
          ) : (
            selectedChild.sessions.map((session) => {
              const band = (session as any)?.ceciScore?.riskBand as 'green' | 'amber' | 'red' | undefined;
              const bandStyle = band ? BAND_COLORS[band] : null;
              return (
                <View key={session.id} style={styles.sessionCard}>
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionNum}>Session {session.sessionNumber}</Text>
                    {bandStyle && (
                      <View style={[styles.bandBadge, { backgroundColor: bandStyle.bg, borderColor: bandStyle.border }]}>
                        <Text style={[styles.bandText, { color: bandStyle.text }]}>
                          {bandStyle.label}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.sessionDate}>
                    Week: {session.weekKey} •{' '}
                    {session.results.length} game{session.results.length !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.sessionAccuracy}>
                    Accuracy: {Math.round(session.sessionAccuracy * 100)}%
                  </Text>

                  {session.results.map((r, i) => (
                    <View key={i} style={styles.gameRow}>
                      <Text style={styles.gameId}>{r.gameId}</Text>
                      <Text style={styles.gameScore}>{Math.round(r.score)}%</Text>
                    </View>
                  ))}
                </View>
              );
            })
          )}

          {/* Observations */}
          {selectedChild.observations?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Parent Observations</Text>
              {selectedChild.observations.map((obs) => (
                <View key={obs.id} style={styles.obsCard}>
                  <Text style={styles.obsText}>{obs.text}</Text>
                  <Text style={styles.obsDate}>
                    {new Date(obs.timestamp).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main list view
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadChildren(); }} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good day,</Text>
            <Text style={styles.doctorName}>{doctor?.role} {doctor?.fullName}</Text>
            <Text style={styles.doctorDetails}>{doctor?.specialty} • {doctor?.hospital}</Text>
          </View>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>
          My Patients ({children.length})
        </Text>

        {children.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>👶</Text>
            <Text style={styles.emptyTitle}>No patients assigned yet</Text>
            <Text style={styles.emptyText}>
              Ask parents to link their child to your professional ID:{' '}
              <Text style={styles.doctorIdHighlight}>{doctor?.doctorId}</Text>
            </Text>
          </View>
        ) : (
          children.map((child) => {
            const band = child.latestCECIBand;
            const bandStyle = band ? BAND_COLORS[band] : null;
            const lastSession = child.sessions[child.sessions.length - 1];
            return (
              <TouchableOpacity
                key={child.id}
                style={styles.childCard}
                onPress={() => setSelectedChild(child)}
                activeOpacity={0.85}
              >
                <View style={styles.childCardLeft}>
                  <Text style={styles.childAvatar}>
                    {child.sex === 'male' ? '👦' : child.sex === 'female' ? '👧' : '🧒'}
                  </Text>
                </View>
                <View style={styles.childCardBody}>
                  <Text style={styles.childCardName}>{child.name}</Text>
                  <Text style={styles.childCardMeta}>
                    Age {child.age} • {child.sessions.length} session{child.sessions.length !== 1 ? 's' : ''}
                  </Text>
                  {lastSession && (
                    <Text style={styles.childCardLastSession}>
                      Last: {lastSession.weekKey}
                    </Text>
                  )}
                </View>
                {bandStyle && (
                  <View style={[styles.bandBadge, { backgroundColor: bandStyle.bg, borderColor: bandStyle.border }]}>
                    <Text style={[styles.bandText, { color: bandStyle.text }]}>{bandStyle.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF9E6' },
  container: { paddingHorizontal: 20, paddingVertical: 24, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: { fontSize: 16, fontWeight: '700', color: COLORS.gray500 },
  doctorName: { fontSize: 22, fontWeight: '900', color: COLORS.primary, marginTop: 2 },
  doctorDetails: { fontSize: 13, fontWeight: '600', color: COLORS.gray500, marginTop: 2 },
  signOutBtn: {
    backgroundColor: COLORS.gray100,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  signOutText: { color: COLORS.gray600, fontWeight: '700', fontSize: 13 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 16,
    marginTop: 8,
  },
  childCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  childCardLeft: { marginRight: 16 },
  childAvatar: { fontSize: 44 },
  childCardBody: { flex: 1 },
  childCardName: { fontSize: 18, fontWeight: '900', color: COLORS.gray700 },
  childCardMeta: { fontSize: 13, fontWeight: '600', color: COLORS.gray500, marginTop: 2 },
  childCardLastSession: { fontSize: 12, fontWeight: '600', color: COLORS.gray400, marginTop: 2 },
  bandBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 2,
  },
  bandText: { fontSize: 12, fontWeight: '900' },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: COLORS.gray700, marginBottom: 8 },
  emptyText: { fontSize: 14, fontWeight: '600', color: COLORS.gray500, textAlign: 'center', lineHeight: 20 },
  doctorIdHighlight: { fontWeight: '900', color: COLORS.primary },

  // Child detail view
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtnText: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  childName: { fontSize: 30, fontWeight: '900', color: COLORS.primary, marginBottom: 4 },
  childMeta: { fontSize: 15, fontWeight: '700', color: COLORS.gray500, marginBottom: 24 },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  infoLabel: { fontSize: 13, fontWeight: '700', color: COLORS.gray500 },
  infoValue: { fontSize: 13, fontWeight: '700', color: COLORS.gray700 },
  sessionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    elevation: 2,
  },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sessionNum: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  sessionDate: { fontSize: 13, fontWeight: '600', color: COLORS.gray400, marginBottom: 4 },
  sessionAccuracy: { fontSize: 14, fontWeight: '800', color: COLORS.gray700, marginBottom: 8 },
  gameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  gameId: { fontSize: 13, fontWeight: '600', color: COLORS.gray500 },
  gameScore: { fontSize: 13, fontWeight: '800', color: COLORS.gray700 },
  obsCard: {
    backgroundColor: '#FEFCE8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FCD34D',
  },
  obsText: { fontSize: 14, fontWeight: '600', color: COLORS.gray700, lineHeight: 20 },
  obsDate: { fontSize: 11, fontWeight: '700', color: COLORS.gray400, marginTop: 6 },
});
