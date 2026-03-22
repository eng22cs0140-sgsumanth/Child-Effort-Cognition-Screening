
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { COLORS } from '../constants';
import { PARENT_CREDS_KEY } from './OnboardingParentScreen';

type NavProp = StackNavigationProp<RootStackParamList, 'Login'>;

const roles = [
  {
    role: 'child' as UserRole,
    icon: '🎮',
    label: 'Child',
    desc: 'I want to play games!',
    bg: '#EFF6FF',
    border: '#3B82F6',
    text: '#2563EB',
  },
  {
    role: 'parent' as UserRole,
    icon: '❤️',
    label: 'Parent',
    desc: 'View child\'s progress',
    bg: '#F5F3FF',
    border: COLORS.primary,
    text: COLORS.primary,
  },
  {
    role: 'doctor' as UserRole,
    icon: '🩺',
    label: 'Doctor',
    desc: 'Analyze health data',
    bg: '#F0FDF4',
    border: '#22C55E',
    text: '#15803D',
  },
];

export default function LoginScreen() {
  const navigation = useNavigation<NavProp>();
  const { setRole, setParent, parent } = useApp();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleRoleSelection = async (selectedRole: UserRole) => {
    setRole(selectedRole);
    if (selectedRole === 'child') {
      navigation.navigate('Assessment');
    } else if (selectedRole === 'doctor') {
      navigation.navigate('Results');
    } else {
      // Parent — check if already registered
      try {
        const stored = await AsyncStorage.getItem(PARENT_CREDS_KEY);
        if (stored) {
          const creds = JSON.parse(stored);
          setParent({ ...parent, name: creds.name, email: creds.email, relationship: '' });
          setLoginEmail('');
          setLoginPassword('');
          setLoginError('');
          setShowLoginModal(true);
        } else {
          navigation.navigate('OnboardingParent');
        }
      } catch {
        navigation.navigate('OnboardingParent');
      }
    }
  };

  const handleLoginConfirm = async () => {
    try {
      const stored = await AsyncStorage.getItem(PARENT_CREDS_KEY);
      if (!stored) { setLoginError('No account found. Please register.'); return; }
      const creds = JSON.parse(stored);
      if (loginEmail.trim().toLowerCase() !== creds.email.toLowerCase()) {
        setLoginError('Email does not match.');
        return;
      }
      if (loginPassword !== creds.password) {
        setLoginError('Incorrect password.');
        return;
      }
      setParent({ ...parent, name: creds.name, email: creds.email, relationship: '' });
      setShowLoginModal(false);
      navigation.navigate('Results');
    } catch {
      setLoginError('Login failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>⬅️</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Who is logging in today?</Text>

        <View style={styles.rolesContainer}>
          {roles.map(r => (
            <TouchableOpacity
              key={r.role}
              style={[styles.roleCard, { borderColor: r.border }]}
              onPress={() => handleRoleSelection(r.role)}
              activeOpacity={0.85}
            >
              <View style={[styles.roleIconContainer, { backgroundColor: r.bg }]}>
                <Text style={styles.roleIcon}>{r.icon}</Text>
              </View>
              <Text style={[styles.roleLabel, { color: r.text }]}>{r.label}</Text>
              <Text style={styles.roleDesc}>{r.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Parent Login Modal */}
      <Modal visible={showLoginModal} animationType="slide" transparent onRequestClose={() => { setShowLoginModal(false); setRole(null); }}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🔐 Parent Login</Text>
            <Text style={styles.modalSubtitle}>Enter your credentials to access the dashboard</Text>

            <TextInput
              style={styles.modalInput}
              value={loginEmail}
              onChangeText={v => { setLoginEmail(v); setLoginError(''); }}
              placeholder="Email address"
              placeholderTextColor={COLORS.gray400}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <TextInput
              style={[styles.modalInput, loginError ? styles.inputError : null]}
              value={loginPassword}
              onChangeText={v => { setLoginPassword(v); setLoginError(''); }}
              placeholder="Password"
              placeholderTextColor={COLORS.gray400}
              secureTextEntry
            />
            {loginError ? <Text style={styles.errorText}>⚠ {loginError}</Text> : null}

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowLoginModal(false); setRole(null); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleLoginConfirm}>
                <Text style={styles.confirmBtnText}>Login</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => { setShowLoginModal(false); navigation.navigate('OnboardingParent'); }}
            >
              <Text style={styles.registerLinkText}>New user? Register here</Text>
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primaryLight,
    textAlign: 'center',
    marginBottom: 40,
  },
  rolesContainer: { width: '100%', gap: 20 },
  roleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 32,
    padding: 28,
    alignItems: 'center',
    borderWidth: 3,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  roleIconContainer: {
    width: 90,
    height: 90,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  roleIcon: { fontSize: 44 },
  roleLabel: { fontSize: 26, fontWeight: '900', marginBottom: 6 },
  roleDesc: { fontSize: 16, color: COLORS.gray500, fontWeight: '600' },

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
  registerLinkText: { color: COLORS.primary, fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
});
