
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../constants';

export default function HelpScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>⬅️</Text>
        </TouchableOpacity>

        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>About Developmental Screening</Text>
          <Text style={styles.headerDesc}>
            Developmental screening is a joyful part of well-child care! It helps identify how your
            child is growing, making sure they get the right support early on.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Age-Appropriate Milestones</Text>

        <View style={styles.milestoneRow}>
          <View style={[styles.milestoneCard, { borderTopColor: '#3B82F6' }]}>
            <Text style={[styles.milestoneAge, { color: '#3B82F6' }]}>👶 Ages 0-3</Text>
            {['Sits without support', 'Imitates simple sounds', 'Follows moving objects', 'Explores toys with hands'].map(m => (
              <Text key={m} style={styles.milestoneItem}>✨ {m}</Text>
            ))}
          </View>
          <View style={[styles.milestoneCard, { borderTopColor: COLORS.primary }]}>
            <Text style={[styles.milestoneAge, { color: COLORS.primary }]}>🏃 Ages 4-9</Text>
            {['Hops and jumps confidently', 'Solves simple puzzles', 'Understands rules of games', 'Expresses complex emotions'].map(m => (
              <Text key={m} style={styles.milestoneItem}>✨ {m}</Text>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitleOrange}>When to Seek Support</Text>

        <View style={styles.supportRow}>
          <View style={[styles.supportCard, { borderLeftColor: COLORS.orange }]}>
            <Text style={styles.supportCategory}>Attention & Language</Text>
            {['Difficulty focusing on tasks', 'Delayed speech or vocabulary', 'Trouble following instructions'].map(s => (
              <Text key={s} style={styles.supportItem}>• {s}</Text>
            ))}
          </View>
          <View style={[styles.supportCard, { borderLeftColor: COLORS.orange }]}>
            <Text style={styles.supportCategory}>Cognitive & Social</Text>
            {['Challenges with memory', 'Problem-solving delays', 'Social interaction avoidance'].map(s => (
              <Text key={s} style={styles.supportItem}>• {s}</Text>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitleGreen}>Professional Resources</Text>

        <View style={styles.resourcesGrid}>
          {[
            { title: 'Pediatric Specialist', desc: 'Early assessment for developmental growth' },
            { title: 'Early Learning', desc: 'Support services for children 0-5 years' },
            { title: 'Language Support', desc: 'Communication and vocabulary development' },
          ].map(r => (
            <View key={r.title} style={styles.resourceCard}>
              <Text style={styles.resourceTitle}>{r.title}</Text>
              <Text style={styles.resourceDesc}>{r.desc}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  backBtn: {
    backgroundColor: COLORS.purple100,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  backBtnText: { fontSize: 22 },
  headerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 28,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: COLORS.purple100,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  headerDesc: {
    fontSize: 15,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 16,
  },
  sectionTitleOrange: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.orange,
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitleGreen: {
    fontSize: 22,
    fontWeight: '800',
    color: '#15803D',
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  milestoneRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  milestoneCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    borderTopWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  milestoneAge: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  milestoneItem: {
    fontSize: 13,
    color: COLORS.gray600,
    marginBottom: 6,
    lineHeight: 20,
    fontWeight: '500',
  },
  supportRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  supportCard: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    padding: 18,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  supportCategory: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.orange,
    marginBottom: 10,
  },
  supportItem: {
    fontSize: 13,
    color: COLORS.gray600,
    marginBottom: 6,
    lineHeight: 20,
    fontWeight: '500',
  },
  resourcesGrid: { gap: 10, marginBottom: 20 },
  resourceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    borderBottomWidth: 4,
    borderBottomColor: '#BBF7D0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#15803D',
    marginBottom: 4,
  },
  resourceDesc: {
    fontSize: 14,
    color: COLORS.gray500,
    fontWeight: '500',
  },
});
