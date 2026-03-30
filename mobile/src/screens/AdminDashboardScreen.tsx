import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS } from '../constants';
import { useApp } from '../context/AppContext';
import {
  getPendingDoctors,
  getApprovedDoctors,
  approveDoctor,
  rejectDoctor,
} from '../services/firebaseService';
import { DoctorProfile } from '../types';

type NavProp = StackNavigationProp<RootStackParamList, 'AdminDashboard'>;

export default function AdminDashboardScreen() {
  const navigation = useNavigation<NavProp>();
  const { firebaseUid, signOut } = useApp();

  const [pendingDoctors, setPendingDoctors] = useState<DoctorProfile[]>([]);
  const [approvedDoctors, setApprovedDoctors] = useState<DoctorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

  // Reject modal
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<DoctorProfile | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadDoctors = async () => {
    try {
      const [pending, approved] = await Promise.all([
        getPendingDoctors(),
        getApprovedDoctors(),
      ]);
      setPendingDoctors(pending);
      setApprovedDoctors(approved);
    } catch (e) {
      Alert.alert('Error', 'Failed to load doctor registrations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadDoctors(); }, []);

  const handleApprove = async (doctor: DoctorProfile) => {
    if (!firebaseUid) return;
    Alert.alert(
      'Approve Doctor',
      `Approve ${doctor.fullName} (${doctor.specialty}, ${doctor.hospital})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setActionLoading(doctor.uid);
            try {
              await approveDoctor(doctor.uid, firebaseUid);
              await loadDoctors();
            } catch {
              Alert.alert('Error', 'Failed to approve. Please try again.');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setActionLoading(rejectTarget.uid);
    try {
      await rejectDoctor(rejectTarget.uid, rejectReason.trim());
      setRejectModal(false);
      setRejectTarget(null);
      setRejectReason('');
      await loadDoctors();
    } catch {
      Alert.alert('Error', 'Failed to reject. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Welcome' }] }));
  };

  const DoctorCard = ({ doctor, isPending }: { doctor: DoctorProfile; isPending: boolean }) => (
    <View style={styles.doctorCard}>
      <View style={styles.doctorHeader}>
        <Text style={styles.doctorName}>{doctor.fullName}</Text>
        <Text style={styles.doctorRole}>{doctor.role}</Text>
      </View>
      <Text style={styles.doctorDetail}>🏥 {doctor.hospital}</Text>
      <Text style={styles.doctorDetail}>🔬 {doctor.specialty}</Text>
      {doctor.department ? <Text style={styles.doctorDetail}>🏢 {doctor.department}</Text> : null}
      <Text style={styles.doctorDetail}>🪪 License: {doctor.licenseNumber}</Text>
      <Text style={styles.doctorDetail}>🎓 {doctor.qualification}</Text>
      <Text style={styles.doctorDetail}>📅 {doctor.yearsOfExperience} year(s) experience</Text>
      <Text style={styles.doctorDetail}>🔑 Professional ID: {doctor.doctorId}</Text>
      <Text style={styles.doctorDetail}>📧 {doctor.email}</Text>

      {isPending && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.approveBtn, actionLoading === doctor.uid && { opacity: 0.6 }]}
            onPress={() => handleApprove(doctor)}
            disabled={actionLoading === doctor.uid}
          >
            {actionLoading === doctor.uid ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.approveBtnText}>✓ Approve</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => { setRejectTarget(doctor); setRejectReason(''); setRejectModal(true); }}
          >
            <Text style={styles.rejectBtnText}>✗ Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading registrations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadDoctors(); }}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>⚙️ Admin Dashboard</Text>
            <Text style={styles.subtitle}>Manage professional registrations</Text>
          </View>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: '#FFFBEB' }]}>
            <Text style={[styles.statNum, { color: '#D97706' }]}>{pendingDoctors.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
            <Text style={[styles.statNum, { color: '#15803D' }]}>{approvedDoctors.length}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
              Pending ({pendingDoctors.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'approved' && styles.tabActive]}
            onPress={() => setActiveTab('approved')}
          >
            <Text style={[styles.tabText, activeTab === 'approved' && styles.tabTextActive]}>
              Approved ({approvedDoctors.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'pending' ? (
          pendingDoctors.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyText}>No pending registrations</Text>
            </View>
          ) : (
            pendingDoctors.map((d) => (
              <DoctorCard key={d.uid} doctor={d} isPending={true} />
            ))
          )
        ) : (
          approvedDoctors.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No approved doctors yet</Text>
            </View>
          ) : (
            approvedDoctors.map((d) => (
              <DoctorCard key={d.uid} doctor={d} isPending={false} />
            ))
          )
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={rejectModal}
        animationType="slide"
        transparent
        onRequestClose={() => setRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject Registration</Text>
            <Text style={styles.modalSubtitle}>
              Provide a reason for rejecting {rejectTarget?.fullName}:
            </Text>
            <TextInput
              style={styles.reasonInput}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="e.g. Invalid license number, incomplete information..."
              placeholderTextColor={COLORS.gray400}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setRejectModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rejectConfirmBtn, (!rejectReason.trim() || actionLoading !== null) && { opacity: 0.6 }]}
                onPress={handleRejectConfirm}
                disabled={!rejectReason.trim() || actionLoading !== null}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.rejectConfirmBtnText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
  title: { fontSize: 24, fontWeight: '900', color: COLORS.primary },
  subtitle: { fontSize: 13, fontWeight: '600', color: COLORS.gray500, marginTop: 2 },
  signOutBtn: {
    backgroundColor: COLORS.gray100,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  signOutText: { color: COLORS.gray600, fontWeight: '700', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  statNum: { fontSize: 36, fontWeight: '900' },
  statLabel: { fontSize: 13, fontWeight: '700', color: COLORS.gray500, marginTop: 4 },
  tabRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabActive: { backgroundColor: '#EDE9FE', borderColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '700', color: COLORS.gray500 },
  tabTextActive: { color: COLORS.primary },
  doctorCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  doctorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  doctorName: { fontSize: 18, fontWeight: '900', color: COLORS.gray700, flex: 1 },
  doctorRole: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  doctorDetail: { fontSize: 13, fontWeight: '600', color: COLORS.gray500, marginBottom: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  approveBtn: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  approveBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FCA5A5',
  },
  rejectBtnText: { color: '#DC2626', fontWeight: '900', fontSize: 15 },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    elevation: 2,
  },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 15, fontWeight: '700', color: COLORS.gray500 },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 28,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#DC2626', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, fontWeight: '600', color: COLORS.gray500, marginBottom: 16 },
  reasonInput: {
    backgroundColor: COLORS.gray50,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray700,
    borderWidth: 2,
    borderColor: '#FCA5A5',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.gray100,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.gray600, fontWeight: '900', fontSize: 15 },
  rejectConfirmBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  rejectConfirmBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
