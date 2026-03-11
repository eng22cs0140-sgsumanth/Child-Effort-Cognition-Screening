
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useApp } from '../context/AppContext';
import { useCECICalculation } from '../hooks/useCECICalculation';
import { calculateCECI } from '../ceciAlgorithm';
import { COLORS } from '../constants';

type NavProp = StackNavigationProp<RootStackParamList, 'Results'>;

export default function ResultsScreen() {
  const navigation = useNavigation<NavProp>();
  const { child, role, results, resetApp, addObservation } = useApp();
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [diaryInput, setDiaryInput] = useState('');

  const getCategoryScores = () => {
    const categories = {
      cognitive: { games: ['memory', 'shapes', 'counting', 'maze'], total: 0, count: 0 },
      social: { games: ['emotion', 'leader'], total: 0, count: 0 },
      language: { games: ['sound'], total: 0, count: 0 },
      attention: { games: ['simon', 'category', 'catcher'], total: 0, count: 0 },
    };

    results.forEach(res => {
      Object.keys(categories).forEach(catKey => {
        const cat = categories[catKey as keyof typeof categories];
        if (cat.games.includes(res.gameId)) {
          cat.total += Math.min(100, res.score);
          cat.count++;
        }
      });
    });

    const getAvg = (cat: { total: number; count: number }) =>
      cat.count > 0 ? Math.round(cat.total / cat.count) : 0;

    return {
      cognitive: getAvg(categories.cognitive),
      social: getAvg(categories.social),
      language: getAvg(categories.language),
      attention: getAvg(categories.attention),
    };
  };

  const scores = getCategoryScores();
  const overallScore =
    results.length > 0
      ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 4)
      : 0;

  const {
    score: apiCeciScore,
    source: ceciSource,
    loading: ceciLoading,
    error: ceciError,
    apiAvailable,
  } = useCECICalculation(results, child.name || 'Child', child.age || 5, { autoCalculate: true });

  const ceciScore = apiCeciScore || calculateCECI(results, child.name || 'Child');

  const riskColor =
    ceciScore.riskBand === 'green'
      ? { bg: '#F0FDF4', border: '#86EFAC', badge: '#DCFCE7', badgeText: '#15803D' }
      : ceciScore.riskBand === 'amber'
      ? { bg: '#FFFBEB', border: '#FDE68A', badge: '#FEF3C7', badgeText: '#92400E' }
      : { bg: '#FFF1F2', border: '#FCA5A5', badge: '#FEE2E2', badgeText: '#991B1B' };

  const riskLabel =
    ceciScore.riskBand === 'green'
      ? '✓ Typical Development'
      : ceciScore.riskBand === 'amber'
      ? '⚠ Monitor Closely'
      : '⚡ Specialist Recommended';

  // Radar chart SVG
  const svgSize = 260;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const maxR = 90;

  const getPoint = (val: number, angle: number) => {
    const r = (Math.max(5, val) / 100) * maxR;
    return {
      x: cx + r * Math.sin((angle * Math.PI) / 180),
      y: cy - r * Math.cos((angle * Math.PI) / 180),
    };
  };

  const radarPoints = [
    getPoint(scores.cognitive, 0),
    getPoint(scores.social, 90),
    getPoint(scores.language, 180),
    getPoint(scores.attention, 270),
  ];

  const radarPath = radarPoints.map(p => `${p.x},${p.y}`).join(' ');

  const handleAddDiaryEntry = () => {
    if (diaryInput.trim()) {
      addObservation(diaryInput.trim());
      setDiaryInput('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>⬅️</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Development Report</Text>
            <Text style={styles.pageSubtitle}>
              {role === 'doctor'
                ? `Analyzing: ${child.name || 'Anonymous'}`
                : `Tracking ${child.name || 'your child'}'s progress`}
            </Text>
          </View>
          {role === 'parent' && (
            <TouchableOpacity
              style={styles.updateBtn}
              onPress={() => navigation.navigate('OnboardingChild')}
            >
              <Text style={styles.updateBtnText}>⚙️ Update</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          {[
            { label: 'Age', value: `${child.age} yrs`, icon: '🎂', bg: '#EFF6FF', color: '#2563EB' },
            { label: 'Blood Group', value: child.bloodGroup || 'N/A', icon: '🩸', bg: '#FFF1F2', color: '#DC2626' },
            { label: 'BMI Score', value: String(child.bmi || 'N/A'), icon: '⚖️', bg: '#F0FDF4', color: '#16A34A' },
            { label: 'Height/Weight', value: `${child.height || 0}cm / ${child.weight || 0}kg`, icon: '📏', bg: '#F5F3FF', color: COLORS.primary },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: stat.bg }]}>
                <Text style={styles.statIcon}>{stat.icon}</Text>
              </View>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            </View>
          ))}
        </ScrollView>

        {/* CECI Score Card */}
        <View style={[styles.ceciCard, { borderColor: riskColor.border, backgroundColor: riskColor.bg }]}>
          <View style={styles.ceciHeader}>
            <Text style={styles.ceciTitle}>CECI Assessment</Text>
            <View style={[styles.riskBadge, { backgroundColor: riskColor.badge }]}>
              <Text style={[styles.riskBadgeText, { color: riskColor.badgeText }]}>
                {riskLabel}
              </Text>
            </View>
          </View>

          <Text style={styles.ceciRec}>{ceciScore.recommendation}</Text>

          <View style={styles.ceciScoreRow}>
            <View style={[styles.ceciScoreBox, { backgroundColor: COLORS.purple50 }]}>
              <Text style={styles.ceciScoreLabel}>OVERALL SCORE</Text>
              <Text style={[styles.ceciScoreNum, { color: COLORS.primary }]}>{ceciScore.overall}%</Text>
            </View>
            <View style={[styles.ceciScoreBox, { backgroundColor: '#EFF6FF' }]}>
              <Text style={styles.ceciScoreLabel}>CONFIDENCE</Text>
              <Text style={[styles.ceciScoreNum, { color: '#2563EB' }]}>{ceciScore.confidence}%</Text>
            </View>
          </View>

          {/* Model Bars */}
          <View style={styles.modelsSection}>
            <Text style={styles.modelsTitle}>Model Analysis</Text>
            {[
              { label: 'Feature-Based Model', value: ceciScore.treeBasedScore, color: COLORS.primary },
              { label: 'Temporal Model', value: ceciScore.temporalScore, color: '#2563EB' },
              { label: 'Bayesian Calibration', value: ceciScore.bayesianCalibration, color: '#16A34A' },
            ].map(m => (
              <View key={m.label} style={styles.modelBar}>
                <View style={styles.modelBarHeader}>
                  <Text style={styles.modelBarLabel}>{m.label}</Text>
                  <Text style={[styles.modelBarValue, { color: m.color }]}>{m.value}%</Text>
                </View>
                <View style={styles.modelBarBg}>
                  <View style={[styles.modelBarFill, { width: `${m.value}%` as any, backgroundColor: m.color }]} />
                </View>
              </View>
            ))}

            {ceciScore.pid !== undefined && (
              <>
                <View style={styles.modelBar}>
                  <View style={styles.modelBarHeader}>
                    <Text style={styles.modelBarLabel}>PID — Cognitive Difficulty</Text>
                    <Text style={[styles.modelBarValue, { color: COLORS.red }]}>
                      {Math.round(ceciScore.pid * 100)}%
                    </Text>
                  </View>
                  <View style={styles.modelBarBg}>
                    <View style={[styles.modelBarFill, { width: `${Math.round(ceciScore.pid * 100)}%` as any, backgroundColor: COLORS.red }]} />
                  </View>
                </View>
                <View style={styles.modelBar}>
                  <View style={styles.modelBarHeader}>
                    <Text style={styles.modelBarLabel}>PEff — Effort Inconsistency</Text>
                    <Text style={[styles.modelBarValue, { color: COLORS.amber }]}>
                      {Math.round((ceciScore.peff ?? 0) * 100)}%
                    </Text>
                  </View>
                  <View style={styles.modelBarBg}>
                    <View style={[styles.modelBarFill, { width: `${Math.round((ceciScore.peff ?? 0) * 100)}%` as any, backgroundColor: COLORS.amber }]} />
                  </View>
                </View>
              </>
            )}

            <View style={styles.sourceRow}>
              <View style={[styles.sourceBadge, {
                backgroundColor: ceciSource === 'api' ? '#DCFCE7' : '#F3F4F6',
              }]}>
                <Text style={[styles.sourceBadgeText, {
                  color: ceciSource === 'api' ? '#15803D' : COLORS.gray600,
                }]}>
                  {ceciLoading ? '⏳ Calculating...' : ceciSource === 'api' ? '✓ ML Pipeline' : '⚠ Local Mode'}
                </Text>
              </View>
              <Text style={styles.sessionsText}>Sessions: {results.length}</Text>
              {ceciScore.uncertainty !== undefined && (
                <View style={[styles.sourceBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.sourceBadgeText, { color: '#92400E' }]}>
                    ±{Math.round(ceciScore.uncertainty * 100)}%
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Radar Chart */}
        <View style={styles.radarCard}>
          <Text style={styles.radarTitle}>Development Performance Graph</Text>
          <View style={styles.radarContainer}>
            <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
              {[20, 40, 60, 80, 100].map(r => (
                <Circle
                  key={r}
                  cx={cx}
                  cy={cy}
                  r={(r / 100) * maxR}
                  fill="none"
                  stroke="#F1F5F9"
                  strokeWidth="1.5"
                />
              ))}
              {[0, 90, 180, 270].map(a => {
                const p = getPoint(100, a);
                return <Line key={a} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#F1F5F9" strokeWidth="1.5" />;
              })}
              <Polygon
                points={radarPath}
                fill="rgba(34, 211, 238, 0.25)"
                stroke="#22d3ee"
                strokeWidth="4"
                strokeLinejoin="round"
              />
              {radarPoints.map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r={5} fill="#22d3ee" />
              ))}
              <SvgText x={cx} y={10} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#5B21B6">
                Cognitive {scores.cognitive}%
              </SvgText>
              <SvgText x={svgSize - 4} y={cy + 4} textAnchor="end" fontSize="11" fontWeight="bold" fill="#5B21B6">
                Social {scores.social}%
              </SvgText>
              <SvgText x={cx} y={svgSize - 2} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#5B21B6">
                Language {scores.language}%
              </SvgText>
              <SvgText x={4} y={cy + 4} textAnchor="start" fontSize="11" fontWeight="bold" fill="#5B21B6">
                Attention {scores.attention}%
              </SvgText>
            </Svg>
          </View>
        </View>

        {/* Summary Metrics */}
        <View style={styles.metricsCard}>
          <Text style={styles.metricsTitle}>Summary Metrics</Text>
          {[
            { label: 'Overall Growth', score: overallScore, color: COLORS.orange },
            { label: 'Health Index', score: child.bmi > 0 ? 92 : 0, color: '#22C55E' },
          ].map((m, i) => (
            <View key={i} style={styles.metricItem}>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>{m.label}</Text>
                <Text style={[styles.metricScore, { color: COLORS.primary }]}>{m.score}%</Text>
              </View>
              <View style={styles.metricBarBg}>
                <View style={[styles.metricBarFill, { width: `${m.score}%` as any, backgroundColor: m.color }]} />
              </View>
            </View>
          ))}
        </View>

        {/* Doctor Notes / Parent Tip */}
        {role === 'doctor' ? (
          <View style={styles.doctorCard}>
            <Text style={styles.doctorTitle}>Doctor's Clinical Notes</Text>
            <Text style={styles.doctorMeta}>
              {child.bloodGroup || 'Unknown BG'} • BMI {child.bmi} • Age {child.age}
            </Text>
            <TextInput
              style={styles.doctorInput}
              multiline
              numberOfLines={4}
              placeholder="Type clinical findings..."
              placeholderTextColor={COLORS.gray400}
            />
            <TouchableOpacity style={styles.submitBtn}>
              <Text style={styles.submitBtnText}>Submit Official Assessment</Text>
            </TouchableOpacity>

            {/* Diary View for Doctor */}
            <View style={styles.diarySection}>
              <Text style={styles.diaryTitle}>📒 Parent Observations Diary</Text>
              {child.observations.length === 0 ? (
                <Text style={styles.diaryEmpty}>No diary notes added yet.</Text>
              ) : (
                child.observations.map(obs => (
                  <View key={obs.id} style={styles.diaryEntry}>
                    <Text style={styles.diaryDate}>{new Date(obs.timestamp).toLocaleDateString()}</Text>
                    <Text style={styles.diaryText}>{obs.text}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        ) : (
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>Daily Growth Tip 💡</Text>
            <Text style={styles.tipBody}>
              "Based on the results, focused language activities like reading together would be very
              beneficial for {child.name || 'your child'} this week!"
            </Text>
            <TouchableOpacity
              style={styles.playBtn}
              onPress={() => navigation.navigate('Assessment')}
            >
              <Text style={styles.playBtnText}>Play Discovery Games</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Log Out */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => { resetApp(); navigation.navigate('Welcome'); }}
        >
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Parent Diary FAB */}
      {role === 'parent' && (
        <TouchableOpacity style={styles.fab} onPress={() => setDiaryOpen(true)}>
          <Text style={styles.fabIcon}>📒</Text>
        </TouchableOpacity>
      )}

      {/* Diary Modal */}
      <Modal visible={diaryOpen} animationType="slide" transparent onRequestClose={() => setDiaryOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Parent's Diary 📒</Text>
                <Text style={styles.modalSubtitle}>Notes about {child.name || 'Child'}</Text>
              </View>
              <TouchableOpacity onPress={() => setDiaryOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {child.observations.length === 0 ? (
                <Text style={styles.diaryEmpty}>
                  No notes yet. Write down what you notice about {child.name || 'your child'} today...
                </Text>
              ) : (
                child.observations.map(obs => (
                  <View key={obs.id} style={styles.diaryEntry}>
                    <Text style={styles.diaryDate}>
                      {new Date(obs.timestamp).toLocaleDateString()} @ {new Date(obs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={styles.diaryText}>{obs.text}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TextInput
                style={styles.diaryInput}
                value={diaryInput}
                onChangeText={setDiaryInput}
                placeholder="Type a new observation..."
                placeholderTextColor={COLORS.gray400}
                multiline
              />
              <TouchableOpacity style={styles.writeBtn} onPress={handleAddDiaryEntry}>
                <Text style={styles.writeBtnText}>WRITE ✍️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: COLORS.purple100,
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  backBtnText: { fontSize: 22 },
  pageTitle: { fontSize: 24, fontWeight: '900', color: COLORS.primary },
  pageSubtitle: { fontSize: 14, fontWeight: '600', color: COLORS.gray500 },
  updateBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  updateBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  statsScroll: { marginBottom: 20 },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    minWidth: 110,
    borderWidth: 2,
    borderColor: COLORS.purple100,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statIcon: { fontSize: 22 },
  statLabel: { fontSize: 10, fontWeight: '900', color: COLORS.gray400, letterSpacing: 0.5, marginBottom: 2 },
  statValue: { fontSize: 16, fontWeight: '900' },
  ceciCard: {
    borderRadius: 36,
    padding: 24,
    marginBottom: 20,
    borderWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  ceciHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 },
  ceciTitle: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  riskBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  riskBadgeText: { fontSize: 13, fontWeight: '900' },
  ceciRec: { fontSize: 14, color: COLORS.gray600, fontWeight: '600', lineHeight: 22, marginBottom: 16 },
  ceciScoreRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  ceciScoreBox: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  ceciScoreLabel: { fontSize: 9, fontWeight: '900', color: COLORS.gray400, letterSpacing: 1, marginBottom: 4 },
  ceciScoreNum: { fontSize: 30, fontWeight: '900' },
  modelsSection: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
  },
  modelsTitle: { fontSize: 16, fontWeight: '900', color: COLORS.gray700, marginBottom: 16 },
  modelBar: { marginBottom: 14 },
  modelBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  modelBarLabel: { fontSize: 13, fontWeight: '700', color: COLORS.gray600 },
  modelBarValue: { fontSize: 13, fontWeight: '900' },
  modelBarBg: { height: 10, backgroundColor: COLORS.gray100, borderRadius: 5 },
  modelBarFill: { height: 10, borderRadius: 5 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  sourceBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  sourceBadgeText: { fontSize: 11, fontWeight: '800' },
  sessionsText: { fontSize: 11, color: COLORS.gray400, fontWeight: '600' },
  radarCard: {
    backgroundColor: COLORS.white,
    borderRadius: 36,
    padding: 24,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: COLORS.purple100,
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  radarTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary, marginBottom: 20 },
  radarContainer: { alignItems: 'center' },
  metricsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: COLORS.purple100,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  metricsTitle: { fontSize: 20, fontWeight: '900', color: COLORS.primary, marginBottom: 20 },
  metricItem: { marginBottom: 20 },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metricLabel: { fontSize: 16, fontWeight: '800', color: COLORS.gray700 },
  metricScore: { fontSize: 20, fontWeight: '900' },
  metricBarBg: { height: 14, backgroundColor: COLORS.gray100, borderRadius: 7, overflow: 'hidden' },
  metricBarFill: { height: 14, borderRadius: 7 },
  doctorCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#BFDBFE',
  },
  doctorTitle: { fontSize: 18, fontWeight: '900', color: '#2563EB', marginBottom: 8 },
  doctorMeta: { fontSize: 11, color: '#3B82F6', fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 16 },
  doctorInput: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray700,
    borderWidth: 2,
    borderColor: '#BFDBFE',
    minHeight: 100,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '900' },
  diarySection: { marginTop: 8 },
  diaryTitle: { fontSize: 18, fontWeight: '900', color: COLORS.primary, marginBottom: 12 },
  diaryEmpty: { color: COLORS.gray400, fontWeight: '600', fontStyle: 'italic' },
  diaryEntry: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.orange,
  },
  diaryDate: { fontSize: 10, color: COLORS.primaryLight, fontWeight: '900', marginBottom: 6 },
  diaryText: { fontSize: 14, color: COLORS.gray700, fontWeight: '600', lineHeight: 22 },
  tipCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#FED7AA',
  },
  tipTitle: { fontSize: 20, fontWeight: '900', color: COLORS.orange, marginBottom: 12 },
  tipBody: { fontSize: 15, color: COLORS.gray600, fontWeight: '600', lineHeight: 24, marginBottom: 20 },
  playBtn: {
    backgroundColor: COLORS.orange,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  playBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '900' },
  logoutBtn: {
    backgroundColor: COLORS.gray100,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutBtnText: { color: COLORS.gray500, fontSize: 16, fontWeight: '800' },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  fabIcon: { fontSize: 32 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(88,28,135,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FDFDFD',
    borderRadius: 28,
    width: '100%',
    maxHeight: '80%',
    borderLeftWidth: 10,
    borderLeftColor: COLORS.orange,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#FEE2E2',
  },
  modalTitle: { fontSize: 22, fontWeight: '900', color: COLORS.primary },
  modalSubtitle: { fontSize: 11, color: COLORS.gray400, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  modalClose: { fontSize: 24, color: COLORS.gray400 },
  modalBody: { padding: 24, maxHeight: 300 },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    backgroundColor: COLORS.gray50,
    borderTopWidth: 2,
    borderTopColor: '#FFF1F2',
  },
  diaryInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray700,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    minHeight: 48,
  },
  writeBtn: {
    backgroundColor: COLORS.orange,
    borderRadius: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  writeBtnText: { color: COLORS.white, fontWeight: '900', fontSize: 14 },
});
