import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { COLORS } from '../constants';
import { registerDoctor } from '../services/firebaseService';
import { useApp } from '../context/AppContext';

type NavProp = StackNavigationProp<RootStackParamList, 'DoctorRegister'>;

const ROLES = ['Doctor', 'Nurse', 'Therapist'] as const;
const SPECIALTIES = [
  'Developmental Pediatrics',
  'Child Psychiatry',
  'Occupational Therapy',
  'Speech-Language Therapy',
  'Clinical Psychology',
  'Pediatric Neurology',
  'General Pediatrics',
  'Other',
];

export default function DoctorRegisterScreen() {
  const navigation = useNavigation<NavProp>();
  const { setDoctor, setRole } = useApp();

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    doctorId: '',
    role: 'Doctor' as 'Doctor' | 'Nurse' | 'Therapist',
    specialty: '',
    hospital: '',
    department: '',
    licenseNumber: '',
    yearsOfExperience: '',
    qualification: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showSpecialtyPicker, setShowSpecialtyPicker] = useState(false);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) newErrors.email = 'Invalid email';
    if (form.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (form.fullName.trim().length < 2) newErrors.fullName = 'Enter your full name';
    if (!form.doctorId.trim()) newErrors.doctorId = 'Professional ID is required';
    if (!form.specialty) newErrors.specialty = 'Select a specialty';
    if (!form.hospital.trim()) newErrors.hospital = 'Hospital / clinic name is required';
    if (!form.licenseNumber.trim()) newErrors.licenseNumber = 'License number is required';
    if (!form.yearsOfExperience || isNaN(Number(form.yearsOfExperience))) {
      newErrors.yearsOfExperience = 'Enter years of experience';
    }
    if (!form.qualification.trim()) newErrors.qualification = 'Qualification is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const uid = await registerDoctor(form.email.trim().toLowerCase(), form.password, {
        doctorId: form.doctorId.trim(),
        fullName: form.fullName.trim(),
        role: form.role,
        specialty: form.specialty,
        hospital: form.hospital.trim(),
        department: form.department.trim(),
        licenseNumber: form.licenseNumber.trim(),
        yearsOfExperience: Number(form.yearsOfExperience),
        qualification: form.qualification.trim(),
      });
      setRole('doctor');
      navigation.dispatch(
        CommonActions.reset({ index: 0, routes: [{ name: 'DoctorPending' }] })
      );
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        Alert.alert('Email Already Registered', 'An account with this email already exists.');
      } else {
        Alert.alert('Registration Failed', err.message || 'Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const Field = ({
    label,
    field,
    keyboardType = 'default',
    secureTextEntry = false,
    placeholder = '',
  }: {
    label: string;
    field: string;
    keyboardType?: any;
    secureTextEntry?: boolean;
    placeholder?: string;
  }) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, errors[field] ? styles.inputError : null]}
        value={(form as any)[field]}
        onChangeText={(v) => update(field, v)}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        placeholder={placeholder}
        placeholderTextColor={COLORS.gray400}
        autoCapitalize={field === 'email' ? 'none' : 'words'}
      />
      {errors[field] ? <Text style={styles.errorText}>{errors[field]}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>⬅️</Text>
        </TouchableOpacity>

        <Text style={styles.title}>🩺 Professional Registration</Text>
        <Text style={styles.subtitle}>
          Register with your medical credentials. Your account will be reviewed by an
          administrator before you can access the system.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Credentials</Text>
          <Field label="Email Address *" field="email" keyboardType="email-address" placeholder="your@hospital.com" />
          <Field label="Password * (min 8 characters)" field="password" secureTextEntry placeholder="••••••••" />
          <Field label="Confirm Password *" field="confirmPassword" secureTextEntry placeholder="••••••••" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Field label="Full Name *" field="fullName" placeholder="Dr. Jane Smith" />
          <Field label="Professional ID * (e.g. MCI Registration No.)" field="doctorId" placeholder="MCI-123456" />

          <Text style={styles.fieldLabel}>Role *</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleChip, form.role === r && styles.roleChipActive]}
                onPress={() => setForm((prev) => ({ ...prev, role: r }))}
              >
                <Text style={[styles.roleChipText, form.role === r && styles.roleChipTextActive]}>
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Details</Text>

          <Text style={styles.fieldLabel}>Specialty *</Text>
          <TouchableOpacity
            style={[styles.input, styles.pickerBtn, errors.specialty ? styles.inputError : null]}
            onPress={() => setShowSpecialtyPicker(!showSpecialtyPicker)}
          >
            <Text style={form.specialty ? styles.pickerValue : styles.pickerPlaceholder}>
              {form.specialty || 'Select specialty...'}
            </Text>
          </TouchableOpacity>
          {errors.specialty ? <Text style={styles.errorText}>{errors.specialty}</Text> : null}
          {showSpecialtyPicker && (
            <View style={styles.specialtyList}>
              {SPECIALTIES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.specialtyItem, form.specialty === s && styles.specialtyItemActive]}
                  onPress={() => { update('specialty', s); setShowSpecialtyPicker(false); }}
                >
                  <Text style={[styles.specialtyItemText, form.specialty === s && styles.specialtyItemTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Field label="Hospital / Clinic Name *" field="hospital" placeholder="City Children's Hospital" />
          <Field label="Department (optional)" field="department" placeholder="Pediatric Neurology" />
          <Field label="Medical License Number *" field="licenseNumber" placeholder="Reg. No. / License No." />
          <Field
            label="Years of Experience *"
            field="yearsOfExperience"
            keyboardType="numeric"
            placeholder="5"
          />
          <Field
            label="Qualification *"
            field="qualification"
            placeholder="MBBS, MD (Pediatrics), DM (Neurology)"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Registration</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginLink} onPress={() => navigation.goBack()}>
          <Text style={styles.loginLinkText}>Already registered? Login instead</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { paddingHorizontal: 24, paddingVertical: 32, paddingBottom: 60 },
  backBtn: {
    backgroundColor: COLORS.purple100,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    elevation: 4,
  },
  backBtnText: { fontSize: 22 },
  title: { fontSize: 28, fontWeight: '900', color: COLORS.primary, marginBottom: 12 },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray500,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 32,
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 16,
  },
  fieldContainer: { marginBottom: 16 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gray700,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.gray50,
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray700,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputError: { borderColor: '#EF4444' },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '700', marginTop: 4 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  roleChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roleChipActive: { backgroundColor: '#EDE9FE', borderColor: COLORS.primary },
  roleChipText: { fontSize: 14, fontWeight: '700', color: COLORS.gray500 },
  roleChipTextActive: { color: COLORS.primary },
  pickerBtn: { justifyContent: 'center' },
  pickerValue: { fontSize: 16, fontWeight: '600', color: COLORS.gray700 },
  pickerPlaceholder: { fontSize: 16, fontWeight: '600', color: COLORS.gray400 },
  specialtyList: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginTop: 4,
    overflow: 'hidden',
  },
  specialtyItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  specialtyItemActive: { backgroundColor: '#EDE9FE' },
  specialtyItemText: { fontSize: 14, fontWeight: '600', color: COLORS.gray700 },
  specialtyItemTextActive: { color: COLORS.primary, fontWeight: '800' },
  submitBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnText: { color: COLORS.white, fontSize: 18, fontWeight: '900' },
  loginLink: { alignItems: 'center', marginTop: 16 },
  loginLinkText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
