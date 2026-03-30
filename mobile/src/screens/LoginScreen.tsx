import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants';
import { loginParent, loginDoctor, getDoctorProfile, getUserRole, getChildrenForParent } from '../services/firebaseService';

type NavProp = StackNavigationProp<RootStackParamList, 'Login'>;

export default function LoginScreen() {
  const navigation = useNavigation<NavProp>();
  const { setRole, setParent, setDoctor, role: currentRole, firebaseUid } = useApp();

  // Parent login modal
  const [showParentModal, setShowParentModal] = useState(false);
  const [parentEmail, setParentEmail] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [parentError, setParentError] = useState('');
  const [parentLoading, setParentLoading] = useState(false);

  // Doctor login modal
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [doctorEmail, setDoctorEmail] = useState('');
  const [doctorPassword, setDoctorPassword] = useState('');
  const [doctorError, setDoctorError] = useState('');
  const [doctorLoading, setDoctorLoading] = useState(false);

  const resetToHome = (screen: keyof RootStackParamList) => {
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: screen }] })
    );
  };

  const handleParentPress = () => {
    if (firebaseUid && currentRole === 'parent') {
      resetToHome('Results');
      return;
    }
    setParentEmail('');
    setParentPassword('');
    setParentError('');
    setShowParentModal(true);
  };

  const handleDoctorPress = () => {
    setDoctorEmail('');
    setDoctorPassword('');
    setDoctorError('');
    setShowDoctorModal(true);
  };

  // ---------------------------------------------------------------------------
  // Parent login with Firebase Auth
  // ---------------------------------------------------------------------------
  const handleParentLogin = async () => {
    if (!parentEmail.trim() || !parentPassword) {
      setParentError('Please enter your email and password.');
      return;
    }
    setParentLoading(true);
    setParentError('');
    try {
      const uid = await loginParent(parentEmail.trim().toLowerCase(), parentPassword);
      setRole('parent');
      setShowParentModal(false);
      // Check if parent has a child profile yet
      const kids = await getChildrenForParent(uid);
      if (kids.length === 0) {
        resetToHome('OnboardingChild');
      } else {
        resetToHome('Results');
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setParentError('Incorrect email or password.');
      } else if (code === 'auth/invalid-email') {
        setParentError('Invalid email address.');
      } else {
        setParentError('Login failed. Please try again.');
      }
    } finally {
      setParentLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Doctor login with Firebase Auth + status check
  // ---------------------------------------------------------------------------
  const handleDoctorLogin = async () => {
    if (!doctorEmail.trim() || !doctorPassword) {
      setDoctorError('Please enter your email and password.');
      return;
    }
    setDoctorLoading(true);
    setDoctorError('');
    try {
      const uid = await loginDoctor(doctorEmail.trim().toLowerCase(), doctorPassword);
      const userRole = await getUserRole(uid);

      // Admin logging in through doctor modal
      if (userRole === 'admin') {
        setRole('admin');
        setShowDoctorModal(false);
        resetToHome('AdminDashboard');
        return;
      }

      const docProfile = await getDoctorProfile(uid);
      if (!docProfile) {
        setDoctorError('No professional profile found. Please register first.');
        return;
      }

      setDoctor(docProfile);
      setRole('doctor');
      setShowDoctorModal(false);

      if (docProfile.status === 'pending') {
        resetToHome('DoctorPending');
      } else if (docProfile.status === 'rejected') {
        Alert.alert(
          'Registration Rejected',
          `Your registration was not approved.\nReason: ${docProfile.rejectionReason || 'No reason provided.'}`,
          [{ text: 'OK' }]
        );
      } else {
        resetToHome('DoctorDashboard');
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setDoctorError('Incorrect email or password.');
      } else {
        setDoctorError('Login failed. Please try again.');
      }
    } finally {
      setDoctorLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>⬅️</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={styles.title}>Who are you?</Text>
        <Text style={styles.subtitle}>Select your role to continue</Text>

        {/* Parent Card */}
        <TouchableOpacity
          style={[styles.roleCard, styles.parentCard]}
          onPress={handleParentPress}
          activeOpacity={0.85}
        >
          <View style={styles.roleIconWrap}>
            <Text style={styles.roleIcon}>❤️</Text>
          </View>
          <View style={styles.roleTextWrap}>
            <Text style={[styles.roleLabel, { color: COLORS.primary }]}>I'm a Parent</Text>
            <Text style={styles.roleDesc}>
              Log in to view your child's progress and play assessment games together.
            </Text>
            <Text style={[styles.roleArrow, { color: COLORS.primary }]}>Get Started →</Text>
          </View>
        </TouchableOpacity>

        {/* Doctor Card */}
        <TouchableOpacity
          style={[styles.roleCard, styles.doctorCard]}
          onPress={handleDoctorPress}
          activeOpacity={0.85}
        >
          <View style={[styles.roleIconWrap, { backgroundColor: '#F0FDF4' }]}>
            <Text style={styles.roleIcon}>🩺</Text>
          </View>
          <View style={styles.roleTextWrap}>
            <Text style={[styles.roleLabel, { color: '#15803D' }]}>I'm a Doctor</Text>
            <Text style={styles.roleDesc}>
              Log in as a registered healthcare professional to access assigned patient records.
            </Text>
            <Text style={[styles.roleArrow, { color: '#15803D' }]}>Get Started →</Text>
          </View>
        </TouchableOpacity>

        {/* Register links */}
        <View style={styles.registerRow}>
          <Text style={styles.registerPrompt}>New here? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('OnboardingParent')}>
            <Text style={styles.registerLinkPurple}>Create parent account</Text>
          </TouchableOpacity>
          <Text style={styles.registerPrompt}> or </Text>
          <TouchableOpacity onPress={() => navigation.navigate('DoctorRegister')}>
            <Text style={styles.registerLinkGreen}>Register as professional</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ------------------------------------------------------------------ */}
      {/* Parent Login Modal                                                  */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        visible={showParentModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowParentModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🔐 Parent Login</Text>
            <Text style={styles.modalSubtitle}>Enter your credentials to access the dashboard</Text>

            <TextInput
              style={styles.modalInput}
              value={parentEmail}
              onChangeText={v => { setParentEmail(v); setParentError(''); }}
              placeholder="Email address"
              placeholderTextColor={COLORS.gray400}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <TextInput
              style={[styles.modalInput, parentError ? styles.inputError : null]}
              value={parentPassword}
              onChangeText={v => { setParentPassword(v); setParentError(''); }}
              placeholder="Password"
              placeholderTextColor={COLORS.gray400}
              secureTextEntry
            />
            {parentError ? <Text style={styles.errorText}>⚠ {parentError}</Text> : null}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowParentModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, parentLoading && { opacity: 0.7 }]}
                onPress={handleParentLogin}
                disabled={parentLoading}
              >
                {parentLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Login</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => { setShowParentModal(false); navigation.navigate('OnboardingParent'); }}
            >
              <Text style={styles.registerLinkText}>New user? Register here</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* Doctor Login Modal                                                  */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        visible={showDoctorModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDoctorModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🩺 Professional Login</Text>
            <Text style={styles.modalSubtitle}>Login with your registered professional credentials</Text>

            <TextInput
              style={styles.modalInput}
              value={doctorEmail}
              onChangeText={v => { setDoctorEmail(v); setDoctorError(''); }}
              placeholder="Professional email"
              placeholderTextColor={COLORS.gray400}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <TextInput
              style={[styles.modalInput, doctorError ? styles.inputError : null]}
              value={doctorPassword}
              onChangeText={v => { setDoctorPassword(v); setDoctorError(''); }}
              placeholder="Password"
              placeholderTextColor={COLORS.gray400}
              secureTextEntry
            />
            {doctorError ? <Text style={styles.errorText}>⚠ {doctorError}</Text> : null}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDoctorModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: '#22C55E' }, doctorLoading && { opacity: 0.7 }]}
                onPress={handleDoctorLogin}
                disabled={doctorLoading}
              >
                {doctorLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Login</Text>}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => { setShowDoctorModal(false); navigation.navigate('DoctorRegister'); }}
            >
              <Text style={[styles.registerLinkText, { color: '#22C55E' }]}>New professional? Register here</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.purple100,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  backBtnText: { fontSize: 22 },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray400,
    textAlign: 'center',
    marginBottom: 36,
  },

  // Role cards
  roleCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 32,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
    borderWidth: 3,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  parentCard: { borderColor: COLORS.purple100 },
  doctorCard: { borderColor: '#BBF7D0' },
  roleIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: COLORS.purple100,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  roleIcon: { fontSize: 40 },
  roleTextWrap: { flex: 1 },
  roleLabel: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  roleDesc: {
    fontSize: 13,
    color: COLORS.gray500,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 10,
  },
  roleArrow: {
    fontSize: 13,
    fontWeight: '900',
  },

  // Register row
  registerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 8,
    gap: 2,
  },
  registerPrompt: { fontSize: 13, color: COLORS.gray400, fontWeight: '600' },
  registerLinkPurple: { fontSize: 13, color: COLORS.primary, fontWeight: '800', textDecorationLine: 'underline' },
  registerLinkGreen: { fontSize: 13, color: '#15803D', fontWeight: '800', textDecorationLine: 'underline' },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    padding: 32,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray400,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: COLORS.gray50,
    borderRadius: 20,
    padding: 18,
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.gray700,
    borderWidth: 3,
    borderColor: 'transparent',
    marginBottom: 14,
  },
  inputError: { borderColor: '#EF4444' },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    marginLeft: 4,
  },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    backgroundColor: COLORS.gray100,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.gray600, fontSize: 17, fontWeight: '900' },
  confirmBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '900' },
  registerLink: { alignItems: 'center', marginTop: 16 },
  registerLinkText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
