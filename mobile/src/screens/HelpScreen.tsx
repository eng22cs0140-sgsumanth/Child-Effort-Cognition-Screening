
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
import { useApp } from '../context/AppContext';
import { COLORS } from '../constants';

export default function HelpScreen() {
  const navigation = useNavigation();
  const { role } = useApp();

  if (role === 'doctor') {
    return <DoctorHelp />;
  }
  return <ParentHelp />;
}

// ── Parent / Tutorial Help ────────────────────────────────────────────────────
function ParentHelp() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>⬅️</Text>
        </TouchableOpacity>

        {/* Hero */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>🌟</Text>
          <Text style={styles.heroTitle}>Welcome to KidsScreen</Text>
          <Text style={styles.heroDesc}>
            A fun, game-based tool to help identify early signs of developmental differences in children aged{' '}
            <Text style={styles.boldPurple}>3 to 9 years</Text>. No tests, no stress — just play!
          </Text>
        </View>

        {/* How it works */}
        <Text style={styles.sectionTitle}>How Does It Work?</Text>
        {[
          { step: '1', icon: '🎮', title: 'Child Plays Games', desc: 'Your child plays short, colourful games — matching patterns, sorting shapes, catching targets, and following simple instructions. Each game takes 2–5 minutes.' },
          { step: '2', icon: '📊', title: 'App Tracks Behaviour', desc: 'The app quietly records how the child responds — how fast, how accurately, how consistently, and how engaged they stay throughout each session.' },
          { step: '3', icon: '📋', title: 'You See the Report', desc: 'After a few sessions, you get a simple, easy-to-read report showing your child\'s strengths and any areas that may need extra attention or a doctor\'s review.' },
        ].map(s => (
          <View key={s.step} style={styles.stepCard}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{s.step}</Text>
            </View>
            <Text style={styles.stepEmoji}>{s.icon}</Text>
            <Text style={styles.stepTitle}>{s.title}</Text>
            <Text style={styles.stepDesc}>{s.desc}</Text>
          </View>
        ))}

        {/* What it tracks */}
        <Text style={styles.sectionTitleOrange}>What Does the App Track?</Text>
        {[
          { icon: '⚡', title: 'Reaction Speed', color: COLORS.primary, desc: 'How quickly your child responds to something on screen. Slower or inconsistent responses may signal attention or processing differences.' },
          { icon: '🎯', title: 'Accuracy', color: COLORS.orange, desc: 'How often your child picks the correct answer. We look at whether accuracy improves across sessions — not just a single score.' },
          { icon: '⏳', title: 'Attention & Consistency', color: COLORS.blue, desc: 'Whether your child can stay focused throughout the game. We measure if performance drops off in the second half of a session.' },
          { icon: '🎮', title: 'Engagement', color: COLORS.green, desc: 'How actively your child interacts with the game. Low engagement can indicate disinterest or difficulty understanding the task.' },
        ].map(t => (
          <View key={t.title} style={styles.trackCard}>
            <Text style={[styles.trackIcon, { color: t.color }]}>{t.icon}</Text>
            <View style={styles.trackContent}>
              <Text style={[styles.trackTitle, { color: t.color }]}>{t.title}</Text>
              <Text style={styles.trackDesc}>{t.desc}</Text>
            </View>
          </View>
        ))}

        {/* Results explained */}
        <Text style={styles.sectionTitle}>Understanding the Results</Text>
        {[
          { band: '✅ On Track', color: '#22C55E', bg: '#F0FDF4', desc: 'Responses are consistent and age-appropriate. Keep up regular play sessions!' },
          { band: '⚠️ Needs Attention', color: '#F59E0B', bg: '#FFFBEB', desc: 'Some variation detected. Consider focused practice and monitoring progress.' },
          { band: '🔴 Seek Support', color: '#EF4444', bg: '#FEF2F2', desc: 'Persistent difficulty patterns detected. We recommend speaking with your paediatrician.' },
        ].map(b => (
          <View key={b.band} style={[styles.bandCard, { backgroundColor: b.bg, borderColor: b.color + '44' }]}>
            <Text style={[styles.bandLabel, { color: b.color }]}>{b.band}</Text>
            <Text style={styles.bandDesc}>{b.desc}</Text>
          </View>
        ))}

        {/* Age milestones */}
        <Text style={styles.sectionTitle}>Milestones: Ages 3–9</Text>
        <View style={styles.milestoneRow}>
          <View style={[styles.milestoneCard, { borderTopColor: '#3B82F6' }]}>
            <Text style={[styles.milestoneAge, { color: '#3B82F6' }]}>🧒 Ages 3–5</Text>
            {['Matches colours & shapes', 'Follows 2–3 step instructions', 'Counts up to 10', 'Engages in simple pretend play'].map(m => (
              <Text key={m} style={styles.milestoneItem}>✨ {m}</Text>
            ))}
          </View>
          <View style={[styles.milestoneCard, { borderTopColor: COLORS.primary }]}>
            <Text style={[styles.milestoneAge, { color: COLORS.primary }]}>🏃 Ages 6–9</Text>
            {['Reads simple sentences', 'Solves basic math problems', 'Understands game rules', 'Focuses for 10–20 minutes'].map(m => (
              <Text key={m} style={styles.milestoneItem}>✨ {m}</Text>
            ))}
          </View>
        </View>

        {/* When to seek support */}
        <Text style={styles.sectionTitleOrange}>When to Seek Support</Text>
        <View style={styles.supportRow}>
          <View style={[styles.supportCard, { borderLeftColor: COLORS.orange }]}>
            <Text style={styles.supportCategory}>Attention & Learning</Text>
            {['Difficulty focusing', 'Delayed speech', 'Struggles past age 6 with numbers/letters'].map(s => (
              <Text key={s} style={styles.supportItem}>• {s}</Text>
            ))}
          </View>
          <View style={[styles.supportCard, { borderLeftColor: COLORS.orange }]}>
            <Text style={styles.supportCategory}>Cognitive & Social</Text>
            {['Memory difficulties', 'Problem-solving delays', 'Social interaction avoidance'].map(s => (
              <Text key={s} style={styles.supportItem}>• {s}</Text>
            ))}
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>🔔 Important</Text>
          <Text style={styles.disclaimerText}>
            KidsScreen is a <Text style={styles.bold}>screening tool — not a diagnosis</Text>.
            A result showing concern means you should speak to your doctor, who will do a proper clinical evaluation.
            Think of it like a thermometer: it tells you something may be wrong, but a doctor confirms what it is.
          </Text>
        </View>

        {/* Professional resources */}
        <Text style={styles.sectionTitleGreen}>Professional Resources</Text>
        <View style={styles.resourcesGrid}>
          {[
            { title: 'Paediatric Developmental Specialist', desc: 'Comprehensive evaluation of cognitive and behavioural development in children aged 3–9.' },
            { title: 'Child Psychologist', desc: 'Supports children with attention, learning, emotional regulation, and social development.' },
            { title: 'Speech & Language Therapist', desc: 'Helps with communication, vocabulary, and comprehension delays.' },
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

// ── Doctor Help ───────────────────────────────────────────────────────────────
function DoctorHelp() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>⬅️</Text>
        </TouchableOpacity>

        <View style={[styles.heroCard, { backgroundColor: '#1E293B' }]}>
          <Text style={styles.heroEmoji}>🩺</Text>
          <Text style={[styles.heroTitle, { color: '#fff' }]}>Clinical Reference Guide</Text>
          <Text style={[styles.heroDesc, { color: '#94A3B8' }]}>
            KidsScreen provides game-based developmental screening for children aged 3–9.
            It is a decision-support tool — not a standalone diagnostic instrument.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>What Does KidsScreen Provide?</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            KidsScreen generates a <Text style={styles.boldPurple}>CECI (Child Effort-Cognition Index)</Text> score from multiple interactive play sessions. The CECI quantifies three clinically relevant parameters:
          </Text>
          {[
            { label: 'PID — Persistent Intellectual Difficulty', color: '#EF4444', desc: 'Mean session accuracy across sessions. Low, stable PID indicates consistent performance deficits unlikely to be effort-related.' },
            { label: 'Var(Acc) — Accuracy Variability', color: '#3B82F6', desc: 'Cross-session variance. High Var(Acc) suggests inconsistent performance consistent with attention disorders or emotional dysregulation.' },
            { label: 'Peff — Effort Index', color: '#22C55E', desc: 'Derived from engagement metrics. Adjusts CECI to account for sessions where low performance may reflect disengagement.' },
          ].map(m => (
            <View key={m.label} style={[styles.metricCard, { borderColor: m.color + '44', backgroundColor: m.color + '11' }]}>
              <Text style={[styles.metricLabel, { color: m.color }]}>{m.label}</Text>
              <Text style={styles.metricDesc}>{m.desc}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Domain Assessment Indices</Text>
        {[
          { label: 'VMI — Visual-Motor Integration', color: '#3B82F6', games: 'Treasure Maze, Number Sequencer', desc: 'Coordinate visual input with motor responses. Low VMI suggests fine motor planning, visual tracking, or spatial reasoning deficits — relevant for dyspraxia.' },
          { label: 'FRI — Fluid Reasoning Index', color: '#7C3AED', games: 'Memory Match, Counting Garden', desc: 'Non-verbal problem-solving and working memory. Low FRI is associated with intellectual disability and executive function impairment.' },
          { label: 'LCI — Language Comprehension', color: '#10B981', games: 'Sound & Words', desc: 'Receptive language — understanding spoken words and associating with visual stimuli. Low LCI may indicate language delay or autism spectrum traits.' },
          { label: 'IFI — Inhibitory Function', color: '#F59E0B', games: 'Simon Says, Category Sort', desc: 'Impulse control and response inhibition. High impulsive tap rates and low IFI are characteristic of ADHD.' },
          { label: 'API — Attention Processing', color: '#EF4444', games: 'Reaction Catcher', desc: 'Sustained attention and reaction speed consistency. Highly variable reaction times with low API suggest attention difficulties.' },
          { label: 'ATI — Attention-Task Integration', color: '#6366F1', games: 'Follow the Leader, Emotion Detective', desc: 'Joint attention and social cognition. Low ATI may indicate autism spectrum traits or social-emotional learning difficulties.' },
        ].map(d => (
          <View key={d.label} style={styles.domainCard}>
            <Text style={[styles.domainLabel, { color: d.color }]}>{d.label}</Text>
            <Text style={styles.domainGames}>Games: {d.games}</Text>
            <Text style={styles.domainDesc}>{d.desc}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Risk Band Classification</Text>
        {[
          { band: '🟢 Green — Typical Development', color: '#22C55E', desc: 'CECI ≤ 0.35. Consistent with age-appropriate development. Standard monitoring applies.' },
          { band: '🟡 Amber — Monitor Closely', color: '#F59E0B', desc: 'CECI 0.35–0.65. Subclinical difficulty detected. Re-screen in 4–6 weeks; consider formal assessment if pattern persists.' },
          { band: '🔴 Red — Referral Recommended', color: '#EF4444', desc: 'CECI > 0.65. Consistent deficits across multiple domains. Recommend comprehensive neuropsychological assessment.' },
        ].map(b => (
          <View key={b.band} style={[styles.bandCard, { backgroundColor: b.color + '11', borderColor: b.color + '44' }]}>
            <Text style={[styles.bandLabel, { color: b.color }]}>{b.band}</Text>
            <Text style={styles.bandDesc}>{b.desc}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>How to Use in Clinical Practice</Text>
        {[
          { step: '1', title: 'Review CECI Score & Risk Band', desc: 'Start with the overall risk band and primary classification for the clinical summary.' },
          { step: '2', title: 'Examine Domain Indices', desc: 'Look for domain-specific weaknesses. Multi-domain deficits are more clinically significant.' },
          { step: '3', title: 'Cross-reference Parent Observations', desc: 'Patterns appearing in both game data and parent-reported behaviour carry greater clinical weight.' },
          { step: '4', title: 'Consider Session Count', desc: 'Single-session results are preliminary. CECI is most reliable with 3–5 sessions.' },
          { step: '5', title: 'Document Clinical Findings', desc: 'Use the assessment form to document examination findings, tentative diagnosis, and recommendations.' },
        ].map(s => (
          <View key={s.step} style={styles.practiceCard}>
            <View style={styles.practiceNum}><Text style={styles.practiceNumText}>{s.step}</Text></View>
            <View style={styles.practiceContent}>
              <Text style={styles.practiceTitle}>{s.title}</Text>
              <Text style={styles.practiceDesc}>{s.desc}</Text>
            </View>
          </View>
        ))}

        {/* Disclaimer */}
        <View style={[styles.disclaimerCard, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
          <Text style={[styles.disclaimerTitle, { color: '#92400E' }]}>⚠️ Clinical Disclaimer</Text>
          <Text style={[styles.disclaimerText, { color: '#78350F' }]}>
            KidsScreen is a screening application, not a diagnostic tool. CECI scores are not equivalent to IQ scores or DSM/ICD diagnostic criteria. Results must always be interpreted in the context of the child's full history, parent report, and clinical examination. A single "Red" band result is not sufficient grounds for diagnosis.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24 },
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

  // Hero
  heroCard: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    padding: 28,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: COLORS.purple100,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  heroEmoji: { fontSize: 48, marginBottom: 12 },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  heroDesc: {
    fontSize: 15,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
  },

  // Section titles
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 14,
    marginTop: 8,
  },
  sectionTitleOrange: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.orange,
    textAlign: 'center',
    marginBottom: 14,
    marginTop: 8,
  },
  sectionTitleGreen: {
    fontSize: 20,
    fontWeight: '800',
    color: '#15803D',
    textAlign: 'center',
    marginBottom: 14,
    marginTop: 8,
  },

  // Steps
  stepCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    alignItems: 'center',
    borderTopWidth: 5,
    borderTopColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepNumText: { color: COLORS.white, fontWeight: '900', fontSize: 16 },
  stepEmoji: { fontSize: 36, marginBottom: 8 },
  stepTitle: { fontSize: 18, fontWeight: '800', color: COLORS.gray700, marginBottom: 6, textAlign: 'center' },
  stepDesc: { fontSize: 14, color: COLORS.gray500, textAlign: 'center', lineHeight: 22, fontWeight: '500' },

  // Tracks
  trackCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  trackIcon: { fontSize: 28, marginTop: 2 },
  trackContent: { flex: 1 },
  trackTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  trackDesc: { fontSize: 13, color: COLORS.gray500, lineHeight: 20, fontWeight: '500' },

  // Bands
  bandCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 2,
  },
  bandLabel: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  bandDesc: { fontSize: 13, color: COLORS.gray600, lineHeight: 20, fontWeight: '500' },

  // Milestones
  milestoneRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  milestoneCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    borderTopWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  milestoneAge: { fontSize: 14, fontWeight: '800', marginBottom: 10 },
  milestoneItem: { fontSize: 12, color: COLORS.gray600, marginBottom: 5, lineHeight: 18, fontWeight: '500' },

  // Support
  supportRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  supportCard: {
    flex: 1,
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 5,
  },
  supportCategory: { fontSize: 14, fontWeight: '800', color: COLORS.orange, marginBottom: 8 },
  supportItem: { fontSize: 12, color: COLORS.gray600, marginBottom: 5, lineHeight: 18, fontWeight: '500' },

  // Disclaimer
  disclaimerCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  disclaimerTitle: { fontSize: 16, fontWeight: '800', color: '#1E40AF', marginBottom: 8 },
  disclaimerText: { fontSize: 13, color: '#1E40AF', lineHeight: 22, fontWeight: '500' },
  bold: { fontWeight: '800' },
  boldPurple: { fontWeight: '800', color: COLORS.primary },

  // Resources
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
  resourceTitle: { fontSize: 15, fontWeight: '800', color: '#15803D', marginBottom: 4 },
  resourceDesc: { fontSize: 13, color: COLORS.gray500, fontWeight: '500' },

  // Info card (doctor)
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  infoText: { fontSize: 14, color: COLORS.gray600, lineHeight: 22, fontWeight: '500', marginBottom: 16 },
  metricCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
  },
  metricLabel: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  metricDesc: { fontSize: 12, color: COLORS.gray600, lineHeight: 18, fontWeight: '500' },

  // Domain (doctor)
  domainCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  domainLabel: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  domainGames: { fontSize: 11, fontWeight: '700', color: COLORS.gray400, marginBottom: 6, textTransform: 'uppercase' },
  domainDesc: { fontSize: 13, color: COLORS.gray600, lineHeight: 20, fontWeight: '500' },

  // Practice steps (doctor)
  practiceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  practiceNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  practiceNumText: { color: COLORS.white, fontWeight: '900', fontSize: 15 },
  practiceContent: { flex: 1 },
  practiceTitle: { fontSize: 15, fontWeight: '800', color: COLORS.gray700, marginBottom: 4 },
  practiceDesc: { fontSize: 13, color: COLORS.gray500, lineHeight: 20, fontWeight: '500' },
});
