
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants';
import { createChildProfile, updateChildProfile } from '../services/firebaseService';

type NavProp = StackNavigationProp<RootStackParamList, 'OnboardingChild'>;

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function OnboardingChildScreen() {
  const navigation = useNavigation<NavProp>();
  const { child, childId, setChild, setChildId, firebaseUid, calculateAge, calculateBMI } = useApp();

  const [name, setName] = useState(child.name);
  const [dob, setDob] = useState(child.dob);
  const [sex, setSex] = useState<'male' | 'female' | 'other' | ''>(child.sex);
  const [isPremature, setIsPremature] = useState<boolean | null>(child.isPremature);
  const [gestationalAgeWeeks, setGestationalAgeWeeks] = useState(
    child.gestationalAgeWeeks > 0 ? String(child.gestationalAgeWeeks) : ''
  );
  const [familyHistoryOfDD, setFamilyHistoryOfDD] = useState<boolean | null>(child.familyHistoryOfDD);
  const [knownConditions, setKnownConditions] = useState(child.knownConditions);
  const [bloodGroup, setBloodGroup] = useState(child.bloodGroup);
  const [height, setHeight] = useState(child.height > 0 ? String(child.height) : '');
  const [weight, setWeight] = useState(child.weight > 0 ? String(child.weight) : '');
  const [showBGPicker, setShowBGPicker] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; dob?: string; gestationalAge?: string }>({});

  const heightNum = parseFloat(height) || 0;
  const weightNum = parseFloat(weight) || 0;
  const bmi = calculateBMI(heightNum, weightNum);
  const age = calculateAge(dob);

  const isValidName = (n: string) => n.trim().length >= 2 && /[a-zA-Z]/.test(n);

  const handleSave = () => {
    const errs: typeof errors = {};
    if (!isValidName(name)) errs.name = 'Please enter the child\'s name (at least 2 letters).';
    if (!dob) {
      errs.dob = 'Date of birth is required.';
    } else {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const dobDate = new Date(dob);
      if (dobDate > today) errs.dob = 'Date of birth cannot be in the future.';
    }
    if (isPremature) {
      const ga = parseInt(gestationalAgeWeeks) || 0;
      if (ga < 22 || ga > 36) errs.gestationalAge = 'Gestational age must be between 22 and 36 weeks.';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const updatedChild = {
      ...child,
      name: name.trim(),
      dob,
      age,
      sex,
      isPremature,
      gestationalAgeWeeks: isPremature ? (parseInt(gestationalAgeWeeks) || 0) : 0,
      familyHistoryOfDD,
      knownConditions,
      bloodGroup,
      height: heightNum,
      weight: weightNum,
      bmi,
    };

    setChild(updatedChild);

    // Sync to Firestore
    if (firebaseUid) {
      try {
        if (childId) {
          // Update existing child document
          await updateChildProfile(childId, updatedChild);
        } else {
          // Create new child document
          const { observations, ...childData } = updatedChild;
          const newChildId = await createChildProfile(firebaseUid, childData);
          setChildId(newChildId);
        }
      } catch (e) {
        console.warn('Firestore child save failed (offline?):', e);
      }
    }

    navigation.navigate('Results');
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
            <Text style={styles.title}>Child Profile</Text>
            <Text style={styles.subtitle}>This information helps calibrate assessment norms accurately.</Text>

            {/* ── Section 1: Basic Information ── */}
            <Text style={styles.sectionHeader}>BASIC INFORMATION</Text>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>CHILD'S NAME *</Text>
                <TextInput
                  style={[styles.input, errors.name ? styles.inputError : null]}
                  value={name}
                  onChangeText={v => { setName(v); setErrors(e => ({ ...e, name: undefined })); }}
                  placeholder="Enter name"
                  placeholderTextColor={COLORS.gray400}
                />
                {errors.name ? <Text style={styles.errorText}>⚠ {errors.name}</Text> : null}
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>DATE OF BIRTH *</Text>
                <TextInput
                  style={[styles.input, errors.dob ? styles.inputError : null]}
                  value={dob}
                  onChangeText={v => { setDob(v); setErrors(e => ({ ...e, dob: undefined })); }}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.gray400}
                  keyboardType="numbers-and-punctuation"
                />
                {errors.dob ? <Text style={styles.errorText}>⚠ {errors.dob}</Text> : null}
              </View>
            </View>

            {/* Sex selector */}
            <View style={styles.field}>
              <Text style={styles.label}>SEX *</Text>
              <View style={styles.toggleRow}>
                {(['male', 'female', 'other'] as const).map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.toggleBtn, sex === s && styles.toggleBtnActive]}
                    onPress={() => setSex(s)}
                  >
                    <Text style={[styles.toggleBtnText, sex === s && styles.toggleBtnTextActive]}>
                      {s === 'male' ? '👦 Boy' : s === 'female' ? '👧 Girl' : '⚧ Other'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Age display */}
            {dob ? (
              <View style={styles.bmiCard}>
                <View>
                  <Text style={styles.bmiLabel}>CURRENT AGE</Text>
                  <Text style={styles.bmiValue}>{age} <Text style={styles.ageSuffix}>yrs</Text></Text>
                </View>
              </View>
            ) : null}

            {/* ── Section 2: Birth History ── */}
            <Text style={styles.sectionHeader}>BIRTH HISTORY</Text>

            <View style={styles.field}>
              <Text style={styles.label}>WAS THE CHILD BORN PREMATURE (BEFORE 37 WEEKS)?</Text>
              <View style={styles.toggleRow}>
                {[{ label: 'Yes', val: true }, { label: 'No', val: false }].map(opt => (
                  <TouchableOpacity
                    key={String(opt.val)}
                    style={[styles.toggleBtn, isPremature === opt.val && styles.toggleBtnOrange]}
                    onPress={() => {
                      setIsPremature(opt.val);
                      if (!opt.val) setGestationalAgeWeeks('');
                    }}
                  >
                    <Text style={[styles.toggleBtnText, isPremature === opt.val && styles.toggleBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {isPremature && (
              <View style={styles.field}>
                <Text style={styles.label}>GESTATIONAL AGE AT BIRTH (WEEKS) *</Text>
                <TextInput
                  style={[styles.input, errors.gestationalAge ? styles.inputError : null]}
                  value={gestationalAgeWeeks}
                  onChangeText={v => { setGestationalAgeWeeks(v); setErrors(e => ({ ...e, gestationalAge: undefined })); }}
                  placeholder="e.g. 32  (22–36)"
                  placeholderTextColor={COLORS.gray400}
                  keyboardType="numeric"
                />
                {errors.gestationalAge
                  ? <Text style={styles.errorText}>⚠ {errors.gestationalAge}</Text>
                  : <Text style={styles.hintText}>Used to compute the child's corrected developmental age for accurate scoring.</Text>
                }
              </View>
            )}

            {/* ── Section 3: Family & Medical Background ── */}
            <Text style={styles.sectionHeader}>FAMILY & MEDICAL BACKGROUND</Text>

            <View style={styles.field}>
              <Text style={styles.label}>FAMILY HISTORY OF ASD, ADHD, INTELLECTUAL DISABILITY, OR LEARNING DISORDERS?</Text>
              <Text style={styles.hintText}>(in a parent or sibling)</Text>
              <View style={[styles.toggleRow, { marginTop: 8 }]}>
                {[{ label: 'Yes', val: true }, { label: 'No / Unknown', val: false }].map(opt => (
                  <TouchableOpacity
                    key={String(opt.val)}
                    style={[styles.toggleBtn, familyHistoryOfDD === opt.val && styles.toggleBtnActive]}
                    onPress={() => setFamilyHistoryOfDD(opt.val)}
                  >
                    <Text style={[styles.toggleBtnText, familyHistoryOfDD === opt.val && styles.toggleBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>KNOWN MEDICAL CONDITIONS OR DIAGNOSES</Text>
              <TextInput
                style={styles.input}
                value={knownConditions}
                onChangeText={setKnownConditions}
                placeholder="e.g. None / Epilepsy / Hearing impairment"
                placeholderTextColor={COLORS.gray400}
              />
              <Text style={styles.hintText}>Leave blank if none. Diagnosed conditions affect how results are interpreted.</Text>
            </View>

            {/* ── Section 4: Physical Metrics (optional) ── */}
            <Text style={styles.sectionHeader}>PHYSICAL METRICS (OPTIONAL)</Text>

            <View style={styles.field}>
              <Text style={styles.label}>BLOOD GROUP</Text>
              <TouchableOpacity
                style={[styles.input, styles.pickerBtn]}
                onPress={() => setShowBGPicker(!showBGPicker)}
              >
                <Text style={[styles.pickerBtnText, !bloodGroup && { color: COLORS.gray400 }]}>
                  {bloodGroup || 'Select Blood Group'}
                </Text>
                <Text style={styles.pickerArrow}>{showBGPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {showBGPicker && (
                <View style={styles.pickerDropdown}>
                  {BLOOD_GROUPS.map(bg => (
                    <TouchableOpacity
                      key={bg}
                      style={styles.pickerOption}
                      onPress={() => { setBloodGroup(bg); setShowBGPicker(false); }}
                    >
                      <Text style={[styles.pickerOptionText, bloodGroup === bg && styles.pickerSelected]}>
                        {bg}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>HEIGHT (CM)</Text>
                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="cm"
                  placeholderTextColor={COLORS.gray400}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>WEIGHT (KG)</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="kg"
                  placeholderTextColor={COLORS.gray400}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {heightNum > 0 && weightNum > 0 && (
              <View style={styles.bmiCard}>
                <View>
                  <Text style={styles.bmiLabel}>CALCULATED BMI</Text>
                  <Text style={styles.bmiValue}>{bmi || '--'}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.btn, (!name || !dob) && styles.btnDisabled]}
              disabled={!name || !dob}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>Save & View Report ➜</Text>
            </TouchableOpacity>
            <Text style={styles.requiredNote}>* Required fields</Text>
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
    padding: 28,
    width: '100%',
    borderWidth: 3,
    borderColor: COLORS.purple100,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray400,
    textAlign: 'center',
    marginBottom: 28,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 14,
    marginTop: 8,
    opacity: 0.7,
  },
  row: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  halfField: { flex: 1, marginBottom: 20 },
  field: { marginBottom: 20 },
  label: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.gray400,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 1.5,
  },
  hintText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray400,
    marginTop: 4,
    marginLeft: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: COLORS.gray50,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray700,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  inputError: { borderColor: '#EF4444' },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  toggleBtnOrange: {
    backgroundColor: COLORS.orange,
    borderColor: COLORS.orange,
  },
  toggleBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.gray500,
  },
  toggleBtnTextActive: {
    color: COLORS.white,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray700,
  },
  pickerArrow: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  pickerDropdown: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.gray50,
  },
  pickerOptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray600,
  },
  pickerSelected: { color: COLORS.primary },
  bmiCard: {
    backgroundColor: COLORS.purple50,
    borderRadius: 28,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: COLORS.purple100,
  },
  bmiLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.primaryLight,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  bmiValue: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.primary,
  },
  ageSuffix: { fontSize: 14, fontWeight: '700' },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  requiredNote: {
    textAlign: 'center',
    color: COLORS.gray400,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
});
