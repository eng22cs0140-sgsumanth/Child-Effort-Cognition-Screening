
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';
import { COLORS } from '../constants';

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
    desc: 'Manage child profile',
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
  const { setRole } = useApp();

  const handleRoleSelection = (selectedRole: UserRole) => {
    setRole(selectedRole);
    if (selectedRole === 'child') {
      navigation.navigate('Assessment');
    } else if (selectedRole === 'doctor') {
      navigation.navigate('Results');
    } else {
      navigation.navigate('OnboardingParent');
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
  backBtnText: {
    fontSize: 22,
  },
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
  rolesContainer: {
    width: '100%',
    gap: 20,
  },
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
  roleIcon: {
    fontSize: 44,
  },
  roleLabel: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 6,
  },
  roleDesc: {
    fontSize: 16,
    color: COLORS.gray500,
    fontWeight: '600',
  },
});
