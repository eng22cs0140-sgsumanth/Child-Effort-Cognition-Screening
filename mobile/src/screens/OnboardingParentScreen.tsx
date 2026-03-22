
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants';

type NavProp = StackNavigationProp<RootStackParamList, 'OnboardingParent'>;

export const PARENT_CREDS_KEY = 'ceci_parent_credentials';

export default function OnboardingParentScreen() {
  const navigation = useNavigation<NavProp>();
  const { parent, setParent } = useApp();
  const [name, setName] = useState(parent.name);
  const [email, setEmail] = useState(parent.email);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirm?: string }>({});

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const isValidName = (n: string) => n.trim().length >= 2 && /[a-zA-Z]/.test(n);

  const handleContinue = async () => {
    const errs: typeof errors = {};
    if (!isValidName(name)) errs.name = 'Please enter your full name (at least 2 letters).';
    if (!isValidEmail(email)) errs.email = 'Please enter a valid email address.';
    if (!password || password.length < 4) errs.password = 'Password must be at least 4 characters.';
    if (password !== confirmPassword) errs.confirm = 'Passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      await AsyncStorage.setItem(PARENT_CREDS_KEY, JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }));
    } catch (e) {
      Alert.alert('Error', 'Could not save credentials. Please try again.');
      return;
    }

    setParent({ ...parent, name: name.trim(), email: email.trim() });
    navigation.navigate('OnboardingChild');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>⬅️</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <View style={styles.colorBar} />
            <Text style={styles.title}>Create Account 👋</Text>
            <Text style={styles.subtitle}>Set up your parent profile to access the dashboard.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>YOUR FULL NAME *</Text>
              <TextInput
                style={[styles.input, errors.name ? styles.inputError : null]}
                value={name}
                onChangeText={v => { setName(v); setErrors(e => ({ ...e, name: undefined })); }}
                placeholder="Your full name"
                placeholderTextColor={COLORS.gray400}
              />
              {errors.name ? <Text style={styles.errorText}>⚠ {errors.name}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>EMAIL ADDRESS *</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : null]}
                value={email}
                onChangeText={v => { setEmail(v); setErrors(e => ({ ...e, email: undefined })); }}
                placeholder="you@email.com"
                placeholderTextColor={COLORS.gray400}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {errors.email ? <Text style={styles.errorText}>⚠ {errors.email}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>CREATE PASSWORD *</Text>
              <TextInput
                style={[styles.input, errors.password ? styles.inputError : null]}
                value={password}
                onChangeText={v => { setPassword(v); setErrors(e => ({ ...e, password: undefined })); }}
                placeholder="Min. 4 characters"
                placeholderTextColor={COLORS.gray400}
                secureTextEntry
              />
              {errors.password ? <Text style={styles.errorText}>⚠ {errors.password}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>CONFIRM PASSWORD *</Text>
              <TextInput
                style={[styles.input, errors.confirm ? styles.inputError : null]}
                value={confirmPassword}
                onChangeText={v => { setConfirmPassword(v); setErrors(e => ({ ...e, confirm: undefined })); }}
                placeholder="Re-enter password"
                placeholderTextColor={COLORS.gray400}
                secureTextEntry
              />
              {errors.confirm ? <Text style={styles.errorText}>⚠ {errors.confirm}</Text> : null}
            </View>

            <TouchableOpacity
              style={styles.btn}
              onPress={handleContinue}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>Continue to Child Setup ➜</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 40,
    padding: 32,
    width: '100%',
    borderWidth: 3,
    borderColor: COLORS.purple100,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  colorBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray400,
    textAlign: 'center',
    marginBottom: 28,
  },
  field: { marginBottom: 20 },
  label: {
    fontSize: 11,
    fontWeight: '900',
    color: COLORS.gray400,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 1.5,
  },
  input: {
    backgroundColor: COLORS.gray50,
    borderRadius: 24,
    padding: 18,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray700,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    marginLeft: 4,
  },
  btn: {
    backgroundColor: COLORS.orange,
    borderRadius: 28,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  btnText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
