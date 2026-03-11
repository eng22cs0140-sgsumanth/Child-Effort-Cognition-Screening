
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

type NavProp = StackNavigationProp<RootStackParamList, 'OnboardingParent'>;

export default function OnboardingParentScreen() {
  const navigation = useNavigation<NavProp>();
  const { parent, setParent } = useApp();
  const [name, setName] = useState(parent.name);
  const [email, setEmail] = useState(parent.email);

  const handleContinue = () => {
    setParent({ ...parent, name, email });
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
            <Text style={styles.title}>Hello, Parent! 👋</Text>

            <View style={styles.field}>
              <Text style={styles.label}>YOUR FULL NAME</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Super Parent Name"
                placeholderTextColor={COLORS.gray400}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                placeholderTextColor={COLORS.gray400}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, (!name || !email) && styles.btnDisabled]}
              disabled={!name || !email}
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
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 8,
  },
  field: { marginBottom: 24 },
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
  btnDisabled: { opacity: 0.5 },
  btnText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
