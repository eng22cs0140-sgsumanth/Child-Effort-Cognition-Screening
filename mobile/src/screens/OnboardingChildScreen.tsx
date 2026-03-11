
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

type NavProp = StackNavigationProp<RootStackParamList, 'OnboardingChild'>;

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function OnboardingChildScreen() {
  const navigation = useNavigation<NavProp>();
  const { child, setChild, calculateAge, calculateBMI } = useApp();

  const [name, setName] = useState(child.name);
  const [dob, setDob] = useState(child.dob);
  const [bloodGroup, setBloodGroup] = useState(child.bloodGroup);
  const [height, setHeight] = useState(child.height > 0 ? String(child.height) : '');
  const [weight, setWeight] = useState(child.weight > 0 ? String(child.weight) : '');
  const [showBGPicker, setShowBGPicker] = useState(false);

  const heightNum = parseFloat(height) || 0;
  const weightNum = parseFloat(weight) || 0;
  const bmi = calculateBMI(heightNum, weightNum);
  const age = calculateAge(dob);

  const handleSave = () => {
    setChild({
      ...child,
      name,
      dob,
      age,
      bloodGroup,
      height: heightNum,
      weight: weightNum,
      bmi,
    });
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
            <Text style={styles.title}>Child Super Profile</Text>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>CHILD'S NAME</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter name"
                  placeholderTextColor={COLORS.gray400}
                />
              </View>
              <View style={styles.halfField}>
                <Text style={styles.label}>DATE OF BIRTH (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={dob}
                  onChangeText={text => setDob(text)}
                  placeholder="2020-01-01"
                  placeholderTextColor={COLORS.gray400}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

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

            <View style={styles.bmiCard}>
              <View>
                <Text style={styles.bmiLabel}>CALCULATED BMI</Text>
                <Text style={styles.bmiValue}>{bmi || '--'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.ageLabel}>CURRENT AGE</Text>
                <Text style={styles.ageValue}>
                  {age} <Text style={styles.ageSuffix}>Years</Text>
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, (!name || !dob) && styles.btnDisabled]}
              disabled={!name || !dob}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>Save & View Report ➜</Text>
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
    marginBottom: 28,
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
  pickerSelected: {
    color: COLORS.primary,
  },
  bmiCard: {
    backgroundColor: COLORS.purple50,
    borderRadius: 28,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.primary,
  },
  ageLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.gray400,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  ageValue: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.gray700,
  },
  ageSuffix: {
    fontSize: 14,
    fontWeight: '700',
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    paddingVertical: 20,
    alignItems: 'center',
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
});
