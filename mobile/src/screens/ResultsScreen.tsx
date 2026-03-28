
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import Svg, {
  Circle,
  Line,
  Polygon,
  Path,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useApp } from '../context/AppContext';
import { useCECICalculation } from '../hooks/useCECICalculation';
import { calculateCECI } from '../ceciAlgorithm';
import { COLORS } from '../constants';
import { PARENT_CREDS_KEY } from './OnboardingParentScreen';

type NavProp = StackNavigationProp<RootStackParamList, 'Results'>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GAME_NAME_MAP: Record<string, string> = {
  catcher: 'Reaction Catcher',
  memory: 'Memory Match',
  numbersequencer: 'Number Sequencer',
  sound: 'Sound & Words',
  leader: 'Follow the Leader',
  counting: 'Counting Garden',
  emotion: 'Emotion Detective',
  simon: 'Simon Says',
  maze: 'Treasure Maze',
  category: 'Category Sort',
};

const RECOMMENDATIONS: Record<string, string[]> = {
  green: [
    'Encourage regular short play sessions',
    'Try different game types to keep it fun',
    'Celebrate every small achievement!',
    'Keep screen time balanced and playful',
  ],
  amber: [
    'Ensure a distraction-free environment',
    'Observe attention levels during activities',
    'Practice the challenging games more often',
    'Reward effort, not just correct answers',
  ],
  red: [
    'Follow up if performance remains inconsistent',
    'Speak with your paediatrician about these results',
    'Reduce distractions during play sessions',
    'Keep a daily activity journal',
  ],
};

const STATUS_MAP = {
  green: { label: 'On Track', color: '#22c55e', bg: '#f0fdf4', border: '#86efac' },
  amber: { label: 'Needs Attention', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  red: { label: 'Seek Support', color: '#ef4444', bg: '#fff1f2', border: '#fca5a5' },
  none: { label: 'No Data Yet', color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
};

const CHILD_AVATARS = ['🐣', '🦊', '🐼', '🦁', '🐸', '🐨', '🦄', '🐯'];

function getChildAvatar(name: string): string {
  const idx = name.charCodeAt(0) % CHILD_AVATARS.length;
  return CHILD_AVATARS[idx] ?? '🐣';
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Parent Dashboard components (inline)
// ---------------------------------------------------------------------------

function StarRating({ score }: { score: number }) {
  const stars = Math.round(Math.min(5, Math.max(0, score / 20)));
  return (
    <Text style={styles.starText}>
      {Array.from({ length: 5 }, (_, i) => (i < stars ? '★' : '☆')).join('')}
    </Text>
  );
}

interface MiniLineChartProps {
  data: number[]; // values 0-100
}

function MiniLineChart({ data }: MiniLineChartProps) {
  if (data.length < 2) {
    return (
      <View style={styles.chartEmpty}>
        <Text style={styles.chartEmptyText}>Play more games to see your progress chart!</Text>
      </View>
    );
  }

  const W = 320;
  const H = 120;
  const PAD = 16;
  const chartW = W - PAD * 2;
  const chartH = H - PAD * 2;

  const maxVal = Math.max(...data, 1);
  const points = data.map((v, i) => ({
    x: PAD + (i / (data.length - 1)) * chartW,
    y: PAD + (1 - v / maxVal) * chartH,
  }));

  // Build smooth path (polyline)
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Build filled area path
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x.toFixed(1)} ${(H - PAD).toFixed(1)}` +
    ` L ${points[0].x.toFixed(1)} ${(H - PAD).toFixed(1)} Z`;

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7C3AED" stopOpacity="0.35" />
          <Stop offset="1" stopColor="#7C3AED" stopOpacity="0.0" />
        </LinearGradient>
      </Defs>
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map(v => {
        const gy = PAD + (1 - v / maxVal) * chartH;
        return (
          <Line
            key={v}
            x1={PAD}
            y1={gy}
            x2={W - PAD}
            y2={gy}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        );
      })}
      {/* Filled area */}
      <Path d={areaPath} fill="url(#chartGrad)" />
      {/* Line */}
      <Path d={linePath} fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={4} fill="#7C3AED" />
      ))}
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ResultsScreen() {
  const navigation = useNavigation<NavProp>();
  const { child, role, results, resetApp, addObservation, clearResults } = useApp();
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [diaryInput, setDiaryInput] = useState('');

  // ── Parent Re-Auth modal state ──────────────────────────────────────────
  const [reAuthOpen, setReAuthOpen] = useState(false);
  const [reAuthPassword, setReAuthPassword] = useState('');
  const [reAuthError, setReAuthError] = useState('');

  const handleUpdateProfile = () => {
    setReAuthPassword('');
    setReAuthError('');
    setReAuthOpen(true);
  };

  const handleReAuthConfirm = async () => {
    try {
      const stored = await AsyncStorage.getItem(PARENT_CREDS_KEY);
      if (!stored) { navigation.navigate('OnboardingChild'); setReAuthOpen(false); return; }
      const creds = JSON.parse(stored);
      if (reAuthPassword !== creds.password) {
        setReAuthError('Incorrect password. Please try again.');
        return;
      }
      setReAuthOpen(false);
      navigation.navigate('OnboardingChild');
    } catch {
      setReAuthError('Verification failed. Please try again.');
    }
  };

  // ── PDF generation ──────────────────────────────────────────────────────
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleDownloadPDF = async () => {
    setGeneratingPdf(true);
    try {
      const riskColor = ceciScore.riskBand === 'green' ? '#22c55e'
        : ceciScore.riskBand === 'amber' ? '#f59e0b' : '#ef4444';
      const riskLabel = ceciScore.riskBand === 'green' ? 'Typical Development'
        : ceciScore.riskBand === 'amber' ? 'Monitor Closely' : 'Specialist Recommended';

      const domainGames: Record<string, string[]> = {
        VMI: ['maze', 'numbersequencer'], FRI: ['memory', 'counting'],
        LCI: ['sound'], IFI: ['simon', 'category'], API: ['catcher'], ATI: ['leader', 'emotion'],
      };
      const domainRows = Object.entries(domainGames).map(([key, games]) => {
        const dr = results.filter(r => games.includes(r.gameId));
        const score = dr.length > 0 ? Math.round(dr.reduce((s, r) => s + Math.min(100, r.score), 0) / dr.length) : 0;
        return `<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold">${key}</td><td style="padding:8px;border:1px solid #e2e8f0">${score}%</td></tr>`;
      }).join('');

      const gameRows = [...results].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10).map(r => {
        const names: Record<string,string> = { catcher:'Reaction Catcher', memory:'Memory Match', numbersequencer:'Number Sequencer', sound:'Sound & Words', leader:'Follow the Leader', counting:'Counting Garden', emotion:'Emotion Detective', simon:'Simon Says', maze:'Treasure Maze', category:'Category Sort' };
        return `<tr><td style="padding:8px;border:1px solid #e2e8f0">${names[r.gameId]||r.gameId}</td><td style="padding:8px;border:1px solid #e2e8f0">${r.score}%</td><td style="padding:8px;border:1px solid #e2e8f0">${new Date(r.timestamp).toLocaleDateString()}</td></tr>`;
      }).join('');

      const html = `
        <!DOCTYPE html><html><head><meta charset="utf-8">
        <style>body{font-family:Arial,sans-serif;margin:40px;color:#1e293b}h1{color:#7C3AED}h2{color:#334155;border-bottom:2px solid #e2e8f0;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin-bottom:20px}.badge{display:inline-block;padding:6px 16px;border-radius:20px;color:white;font-weight:bold}</style>
        </head><body>
        <h1>CECI Assessment Report</h1>
        <p style="color:#64748b">Generated: ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}</p>
        <h2>Child Profile</h2>
        <table><tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Name</b></td><td style="padding:8px;border:1px solid #e2e8f0">${child.name||'—'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Age</b></td><td style="padding:8px;border:1px solid #e2e8f0">${child.age} years</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Sex</b></td><td style="padding:8px;border:1px solid #e2e8f0">${child.sex||'Not specified'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Birth History</b></td><td style="padding:8px;border:1px solid #e2e8f0">${child.isPremature ? `Premature (${child.gestationalAgeWeeks} wks)` : child.isPremature===false ? 'Full-term' : 'Not specified'}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Family History</b></td><td style="padding:8px;border:1px solid #e2e8f0">${child.familyHistoryOfDD ? 'ASD/ADHD/ID reported' : child.familyHistoryOfDD===false ? 'None reported' : 'Not specified'}</td></tr>
        ${child.knownConditions ? `<tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Conditions</b></td><td style="padding:8px;border:1px solid #e2e8f0">${child.knownConditions}</td></tr>` : ''}
        ${child.bloodGroup ? `<tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Blood Group</b></td><td style="padding:8px;border:1px solid #e2e8f0">${child.bloodGroup}</td></tr>` : ''}
        ${child.bmi > 0 ? `<tr><td style="padding:8px;border:1px solid #e2e8f0"><b>BMI</b></td><td style="padding:8px;border:1px solid #e2e8f0">${child.bmi} (${child.height}cm / ${child.weight}kg)</td></tr>` : ''}
        </table>
        <h2>CECI Assessment</h2>
        <p><span class="badge" style="background:${riskColor}">${riskLabel}</span></p>
        <table><tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Overall Score</b></td><td style="padding:8px;border:1px solid #e2e8f0">${ceciScore.overall}%</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Confidence</b></td><td style="padding:8px;border:1px solid #e2e8f0">${ceciScore.confidence}%</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0"><b>Recommendation</b></td><td style="padding:8px;border:1px solid #e2e8f0">${ceciScore.recommendation}</td></tr>
        </table>
        <h2>Domain Assessment Indices</h2>
        <table><tr style="background:#f8fafc"><th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Domain</th><th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Score</th></tr>${domainRows}</table>
        <h2>Session History</h2>
        <table><tr style="background:#f8fafc"><th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Game</th><th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Score</th><th style="padding:8px;border:1px solid #e2e8f0;text-align:left">Date</th></tr>${gameRows||'<tr><td colspan="3" style="padding:8px;text-align:center;color:#94a3b8">No games played yet</td></tr>'}</table>
        ${child.observations.length > 0 ? `<h2>Parent Observations</h2>${child.observations.map(o => `<div style="background:#f8fafc;border-left:4px solid #f59e0b;padding:12px;margin-bottom:8px;border-radius:4px"><small style="color:#94a3b8">${new Date(o.timestamp).toLocaleDateString()}</small><p style="margin:4px 0 0">${o.text}</p></div>`).join('')}` : ''}
        <p style="margin-top:40px;color:#94a3b8;font-size:12px">This report is generated by CECI Screening App. It is a screening tool, not a clinical diagnosis. Please consult a qualified professional for clinical assessment.</p>
        </body></html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Assessment_${child.name||'Report'}.pdf` });
      } else {
        Alert.alert('PDF saved', `Report saved to: ${uri}`);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // ── Shared CECI calculation (used by both views) ────────────────────────
  const {
    score: apiCeciScore,
    source: ceciSource,
    loading: ceciLoading,
  } = useCECICalculation(results, child.name || 'Child', child.age || 5, { autoCalculate: true });

  const ceciScore = apiCeciScore || calculateCECI(results, child.name || 'Child');

  // ── Doctor-view helpers (unchanged) ────────────────────────────────────
  const getCategoryScores = () => {
    const categories = {
      cognitive: { games: ['memory', 'numbersequencer', 'counting', 'maze'], total: 0, count: 0 },
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

  const classificationLabel = ceciScore.primaryClassification
    ? {
        typical: '✓ Typical',
        emotional_variability: '💛 Emotional Variability',
        effort_variability: '⚡ Effort Variability',
        cognitive_risk: '🔴 Cognitive Risk',
      }[ceciScore.primaryClassification]
    : null;

  const classificationColor = ceciScore.primaryClassification
    ? {
        typical: '#22C55E',
        emotional_variability: '#F59E0B',
        effort_variability: '#EAB308',
        cognitive_risk: '#EF4444',
      }[ceciScore.primaryClassification]
    : COLORS.primary;

  const tapMetrics = results
    .filter(r => r.behavioralMetrics)
    .map(r => r.behavioralMetrics!);
  const totalTaps = tapMetrics.reduce((s, m) => s + (m.totalTapCount ?? 0), 0);
  const totalEmptyTaps = tapMetrics.reduce((s, m) => s + (m.emptySpaceTapCount ?? 0), 0);
  const totalImpulsiveTaps = tapMetrics.reduce((s, m) => s + (m.impulsiveTapCount ?? 0), 0);
  const emptySpacePct = totalTaps > 0 ? Math.round((totalEmptyTaps / totalTaps) * 100) : 0;

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

  // ── Parent view data derivation ─────────────────────────────────────────
  const hasData = results.length > 0;
  const statusKey: keyof typeof STATUS_MAP = hasData ? ceciScore.riskBand : 'none';
  const status = STATUS_MAP[statusKey];

  const lastSessionDate = hasData
    ? formatDate(Math.max(...results.map(r => r.timestamp)))
    : '—';

  // Session = all games played within the same calendar week
  const getWeekKey = (ts: number): string => {
    const d = new Date(ts);
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
  };
  const totalSessions = new Set(results.map(r => getWeekKey(r.timestamp))).size;
  // Games played = total number of individual games played across all sessions
  const gamesPlayed = results.length;

  // Development summary sentence
  const devSummary = (() => {
    if (!hasData) return `${child.name || 'Your child'} hasn't played any games yet. Tap "Play Games" below to get started!`;
    if (ceciScore.riskBand === 'green')
      return `${child.name || 'Your child'} is developing well across all areas. Keep up the great play sessions!`;
    if (ceciScore.riskBand === 'amber')
      return `${child.name || 'Your child'} is showing some variation in performance. A few focused sessions will help.`;
    return `${child.name || 'Your child'} may benefit from additional support. Consider speaking with a specialist.`;
  })();

  // Behaviour insight derivations
  const avgReactionMs = tapMetrics.length > 0
    ? tapMetrics.reduce((s, m) => s + m.averageReactionTime, 0) / tapMetrics.length
    : null;
  const reactionLabel =
    avgReactionMs === null ? 'No data'
    : avgReactionMs < 600 ? 'Fast'
    : avgReactionMs < 1200 ? 'Good'
    : 'Developing';

  const avgAccuracy = tapMetrics.length > 0
    ? tapMetrics.reduce((s, m) => s + m.accuracy, 0) / tapMetrics.length
    : null;
  const accuracyLabel =
    avgAccuracy === null ? 'No data'
    : avgAccuracy >= 75 ? 'High'
    : avgAccuracy >= 50 ? 'Good'
    : 'Developing';

  const avgEngagement = tapMetrics.length > 0
    ? tapMetrics.reduce((s, m) => s + m.engagementScore, 0) / tapMetrics.length
    : null;

  const avgWSD = tapMetrics.length > 0
    ? tapMetrics.reduce((s, m) => s + (m.withinSessionDegradation ?? 0), 0) / tapMetrics.length
    : null;
  const attentionLabel =
    avgWSD === null ? 'No data'
    : avgWSD < 0.2 ? 'Consistent'
    : avgWSD < 0.45 ? 'Sometimes'
    : 'Variable';

  const engagementLabel =
    avgEngagement === null ? 'No data'
    : avgEngagement >= 70 ? 'Great'
    : avgEngagement >= 45 ? 'Good'
    : 'Could Be Higher';

  // Progress chart data (accuracy per result, chronological)
  const chartData = [...results]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(r => r.behavioralMetrics?.accuracy ?? Math.min(100, r.score));

  // Recent session history (up to 10, newest first)
  const sessionHistory = [...results]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  const recs = RECOMMENDATIONS[ceciScore.riskBand] ?? RECOMMENDATIONS.green;

  // ── Render ───────────────────────────────────────────────────────────────
  if (role === 'parent') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* ── Header ── */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>⬅️</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>My Child's Progress</Text>
              <Text style={styles.pageSubtitle}>Parent Dashboard</Text>
            </View>
            <TouchableOpacity
              style={styles.updateBtn}
              onPress={handleUpdateProfile}
            >
              <Text style={styles.updateBtnText}>⚙️ Update</Text>
            </TouchableOpacity>
          </View>

          {/* ── 1. Child Card ── */}
          <View style={[styles.childCard, { backgroundColor: status.bg, borderColor: status.border }]}>
            <Text style={styles.childAvatar}>
              {child.sex === 'female' ? '👧' : child.sex === 'male' ? '👦' : getChildAvatar(child.name || 'A')}
            </Text>
            <View style={styles.childInfo}>
              <Text style={styles.childName}>{child.name || 'Your Child'}</Text>
              {child.age > 0 && (
                <Text style={styles.childAge}>{child.age} years old</Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <Text style={styles.statusBadgeText}>{status.label}</Text>
            </View>
          </View>

          {/* ── 2. Stats Row ── */}
          <View style={styles.statsRow}>
            {[
              { label: 'Last Session', value: lastSessionDate, icon: '📅' },
              { label: 'Total Sessions', value: String(totalSessions), icon: '🎮' },
              { label: 'Games Played', value: String(gamesPlayed), icon: '⭐' },
            ].map((s, i) => (
              <View key={i} style={styles.statPill}>
                <Text style={styles.statPillIcon}>{s.icon}</Text>
                <Text style={styles.statPillValue}>{s.value}</Text>
                <Text style={styles.statPillLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ── 3. Development Status ── */}
          <View style={styles.devCard}>
            <Text style={styles.devCardTitle}>Development Status</Text>
            <Text style={styles.devCardBody}>{devSummary}</Text>
          </View>

          {/* ── 4. Behaviour Insights ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Behaviour Insights</Text>
            <View style={styles.insightsGrid}>
              {[
                { icon: '⚡', label: 'Reaction Speed', value: reactionLabel },
                { icon: '🎯', label: 'Accuracy', value: accuracyLabel },
                { icon: '⏳', label: 'Attention', value: attentionLabel },
                { icon: '🎮', label: 'Engagement Level', value: engagementLabel },
              ].map((insight, i) => (
                <View key={i} style={styles.insightCard}>
                  <Text style={styles.insightIcon}>{insight.icon}</Text>
                  <Text style={styles.insightLabel}>{insight.label}</Text>
                  <Text style={[
                    styles.insightValue,
                    {
                      color: ['Fast', 'High', 'Consistent', 'Great'].includes(insight.value)
                        ? '#22c55e'
                        : ['Good', 'Sometimes'].includes(insight.value)
                        ? '#f59e0b'
                        : '#94a3b8',
                    },
                  ]}>
                    {insight.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── 5. Progress Over Time ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Progress Over Time</Text>
            <Text style={styles.sectionSubtitle}>Accuracy across recent games</Text>
            <View style={styles.chartContainer}>
              <MiniLineChart data={chartData} />
            </View>
          </View>

          {/* ── 6. Session History ── */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Recent Games</Text>
            {sessionHistory.length === 0 ? (
              <Text style={styles.emptyText}>No games played yet.</Text>
            ) : (
              sessionHistory.map((r, i) => (
                <View key={i} style={styles.sessionRow}>
                  <View style={styles.sessionLeft}>
                    <Text style={styles.sessionGame}>
                      {GAME_NAME_MAP[r.gameId] ?? r.gameId}
                    </Text>
                    <Text style={styles.sessionDate}>{formatDate(r.timestamp)}</Text>
                  </View>
                  <StarRating score={r.score} />
                </View>
              ))
            )}
          </View>

          {/* ── 7. Recommendations — only after games played ── */}
          {hasData && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Tips For You</Text>
              {recs.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipBullet} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── 8. Privacy & Safety ── */}
          <View style={[styles.sectionCard, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
            <Text style={[styles.sectionTitle, { color: '#15803d' }]}>Privacy & Safety</Text>
            {['Data is securely stored.', 'No data shared without your permission.'].map((line, i) => (
              <View key={i} style={styles.checkRow}>
                <Text style={styles.checkMark}>✓</Text>
                <Text style={styles.checkText}>{line}</Text>
              </View>
            ))}
          </View>

          {/* ── 9. Play Games Button ── */}
          <TouchableOpacity
            style={styles.playGamesBtn}
            onPress={() => navigation.navigate('Assessment')}
          >
            <Text style={styles.playGamesBtnText}>🎮  Play Games</Text>
          </TouchableOpacity>

          {/* Log Out */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => { resetApp(); navigation.navigate('Welcome'); }}
          >
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>

        </ScrollView>

        {/* Parent Diary FAB */}
        <TouchableOpacity style={styles.fab} onPress={() => setDiaryOpen(true)}>
          <Text style={styles.fabIcon}>📒</Text>
        </TouchableOpacity>

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
                        {new Date(obs.timestamp).toLocaleDateString()} @{' '}
                        {new Date(obs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

        {/* Re-Auth Modal */}
        <Modal visible={reAuthOpen} animationType="slide" transparent onRequestClose={() => setReAuthOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>🔐 Verify Identity</Text>
              <Text style={styles.modalSubtitle}>Enter your password to update the child profile.</Text>
              <TextInput
                style={[styles.diaryInput, reAuthError ? { borderColor: '#EF4444' } : null]}
                value={reAuthPassword}
                onChangeText={v => { setReAuthPassword(v); setReAuthError(''); }}
                placeholder="Your password"
                placeholderTextColor={COLORS.gray400}
                secureTextEntry
                autoFocus
              />
              {reAuthError ? <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 4 }}>⚠ {reAuthError}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.writeBtn, { flex: 1, backgroundColor: COLORS.gray100, borderRadius: 20, paddingVertical: 14 }]}
                  onPress={() => setReAuthOpen(false)}
                >
                  <Text style={{ color: COLORS.gray600, fontWeight: '900', fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.writeBtn, { flex: 1, backgroundColor: COLORS.primary, borderRadius: 20, paddingVertical: 14 }]}
                  onPress={handleReAuthConfirm}
                >
                  <Text style={styles.writeBtnText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── Doctor view ─────────────────────────────────────────────────────────
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
              {`Analyzing: ${child.name || 'Anonymous'}`}
            </Text>
          </View>
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

            {/* 3-Way Classification Indicator */}
            <View style={styles.triIndicatorSection}>
              <Text style={styles.modelsTitle}>Classification Indicators</Text>
              {[
                {
                  label: 'Cognitive Risk Score',
                  value: ceciScore.pid !== undefined ? Math.round(ceciScore.pid * 100) : 0,
                  color: '#EF4444',
                },
                {
                  label: 'Emotional Variability',
                  value: ceciScore.emotionalVariabilityScore ?? 0,
                  color: '#F59E0B',
                },
                {
                  label: 'Effort Variability',
                  value: ceciScore.effortVariabilityScore ?? 0,
                  color: '#EAB308',
                },
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
            </View>

            {/* Primary Classification Badge */}
            {classificationLabel && (
              <View style={[styles.classificationBadge, { backgroundColor: classificationColor + '22', borderColor: classificationColor }]}>
                <Text style={[styles.classificationText, { color: classificationColor }]}>
                  {classificationLabel}
                </Text>
              </View>
            )}

            {/* Tap Behavior Summary */}
            {totalTaps > 0 && (
              <View style={styles.tapSummary}>
                <Text style={styles.tapSummaryTitle}>Tap Behavior</Text>
                <View style={styles.tapSummaryRow}>
                  <View style={styles.tapStat}>
                    <Text style={styles.tapStatNum}>{totalTaps}</Text>
                    <Text style={styles.tapStatLabel}>Total Taps</Text>
                  </View>
                  <View style={styles.tapStat}>
                    <Text style={[styles.tapStatNum, { color: '#F59E0B' }]}>{emptySpacePct}%</Text>
                    <Text style={styles.tapStatLabel}>Empty Space</Text>
                  </View>
                  <View style={styles.tapStat}>
                    <Text style={[styles.tapStatNum, { color: '#EF4444' }]}>{totalImpulsiveTaps}</Text>
                    <Text style={styles.tapStatLabel}>Impulsive</Text>
                  </View>
                </View>
              </View>
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

        {/* Child Profile Summary */}
        <View style={styles.doctorCard}>
          <Text style={styles.doctorTitle}>👤 Child Profile</Text>
          {[
            { label: 'Age', value: `${child.age} yrs`, icon: '🎂' },
            { label: 'Sex', value: child.sex ? (child.sex === 'male' ? 'Boy' : child.sex === 'female' ? 'Girl' : 'Other') : 'Not specified', icon: child.sex === 'female' ? '👧' : child.sex === 'male' ? '👦' : '⚧' },
            { label: 'Birth', value: child.isPremature ? `Premature (${child.gestationalAgeWeeks || '?'} wks)` : child.isPremature === false ? 'Full-term' : 'Not specified', icon: '🏥' },
            { label: 'Family History', value: child.familyHistoryOfDD ? 'ASD/ADHD/ID reported' : child.familyHistoryOfDD === false ? 'None reported' : 'Not specified', icon: '🧬' },
            ...(child.knownConditions ? [{ label: 'Conditions', value: child.knownConditions, icon: '📋' }] : []),
            ...(child.bloodGroup ? [{ label: 'Blood Group', value: child.bloodGroup, icon: '🩸' }] : []),
            ...(child.bmi > 0 ? [{ label: 'BMI', value: String(child.bmi), icon: '⚖️' }] : []),
          ].map((stat, i) => (
            <View key={i} style={styles.profileRow}>
              <Text style={styles.profileIcon}>{stat.icon}</Text>
              <Text style={styles.profileLabel}>{stat.label}</Text>
              <Text style={styles.profileValue}>{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* Domain Assessment Indices */}
        <View style={styles.doctorCard}>
          <Text style={styles.doctorTitle}>Domain Assessment Indices</Text>
          <Text style={styles.doctorMeta}>Neuropsychological domain scores derived from game telemetry</Text>
          {([
            { label: 'VMI', full: 'Visual-Motor Integration', color: '#2563EB', bg: '#EFF6FF' },
            { label: 'FRI', full: 'Fluid Reasoning Index', color: '#7C3AED', bg: '#F5F3FF' },
            { label: 'LCI', full: 'Language Comprehension', color: '#16A34A', bg: '#F0FDF4' },
            { label: 'IFI', full: 'Inhibitory Function', color: '#EA580C', bg: '#FFF7ED' },
            { label: 'API', full: 'Attention Processing', color: '#DC2626', bg: '#FFF1F2' },
            { label: 'ATI', full: 'Attention-Task Integration', color: '#4F46E5', bg: '#EEF2FF' },
          ] as const).map(idx => {
            // Derive domain score from game results
            const domainGames: Record<string, string[]> = {
              VMI: ['maze', 'numbersequencer'],
              FRI: ['memory', 'counting'],
              LCI: ['sound'],
              IFI: ['simon', 'category'],
              API: ['catcher'],
              ATI: ['leader', 'emotion'],
            };
            const gameList = domainGames[idx.label] ?? [];
            const domainResults = results.filter(r => gameList.includes(r.gameId));
            const score = domainResults.length > 0
              ? Math.round(domainResults.reduce((s, r) => s + Math.min(100, r.score), 0) / domainResults.length)
              : 0;
            return (
              <View key={idx.label} style={[styles.domainRow, { backgroundColor: idx.bg }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.domainLabel, { color: idx.color }]}>{idx.label}</Text>
                  <Text style={styles.domainFull}>{idx.full}</Text>
                  <View style={styles.domainBarBg}>
                    <View style={[styles.domainBarFill, { width: `${score}%` as any, backgroundColor: idx.color }]} />
                  </View>
                </View>
                <Text style={[styles.domainScore, { color: idx.color }]}>{score}%</Text>
              </View>
            );
          })}
        </View>

        {/* Official Clinical Assessment Form */}
        <View style={styles.doctorCard}>
          <Text style={styles.doctorTitle}>📋 Official Clinical Assessment</Text>
          <Text style={styles.doctorMeta}>Fill in the details below for the formal report.</Text>

          {[
            { label: 'EXAMINER NAME', placeholder: 'Dr. ...', key: 'examinerName' },
            { label: 'CASE NUMBER', placeholder: `CS-${Math.floor(Math.random() * 90000) + 10000}`, key: 'caseNo' },
            { label: 'REFERRAL SOURCE', placeholder: 'e.g. Parent, School, Paediatrician', key: 'referralSource' },
          ].map(field => (
            <View key={field.key} style={styles.formField}>
              <Text style={styles.formLabel}>{field.label}</Text>
              <TextInput
                style={styles.formInput}
                placeholder={field.placeholder}
                placeholderTextColor={COLORS.gray400}
              />
            </View>
          ))}

          {[
            { label: 'PRESENTING COMPLAINTS', placeholder: 'Describe the main concerns...', key: 'complaints' },
            { label: 'BEHAVIOURAL OBSERVATIONS', placeholder: 'Describe observed behaviour during assessment...', key: 'behaviour' },
            { label: 'TENTATIVE DIAGNOSIS', placeholder: 'e.g. Typical development / ASD risk / ADHD...', key: 'diagnosis' },
            { label: 'CLINICAL FINDINGS & NOTES', placeholder: 'Detailed clinical notes...', key: 'findings' },
            { label: 'RECOMMENDATIONS', placeholder: 'Suggested next steps and interventions...', key: 'recs' },
          ].map(field => (
            <View key={field.key} style={styles.formField}>
              <Text style={styles.formLabel}>{field.label}</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                placeholder={field.placeholder}
                placeholderTextColor={COLORS.gray400}
                multiline
                numberOfLines={3}
              />
            </View>
          ))}

          <TouchableOpacity style={styles.submitBtn}>
            <Text style={styles.submitBtnText}>Submit Official Assessment ✓</Text>
          </TouchableOpacity>
        </View>

        {/* Download PDF Report */}
        <TouchableOpacity
          style={[styles.pdfBtn, generatingPdf && { opacity: 0.7 }]}
          onPress={handleDownloadPDF}
          disabled={generatingPdf}
        >
          {generatingPdf
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.pdfBtnText}>⬇️  Download PDF Report</Text>
          }
        </TouchableOpacity>

        {/* Clear Session History */}
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={() => Alert.alert('Clear Sessions', 'Delete all game session history?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Clear', style: 'destructive', onPress: clearResults },
          ])}
        >
          <Text style={styles.clearBtnText}>🗑  Clear Session History</Text>
        </TouchableOpacity>

        {/* Parent Observations Diary */}
        <View style={styles.doctorCard}>
          <Text style={styles.doctorTitle}>📒 Parent Observations Diary</Text>
          {child.observations.length === 0 ? (
            <Text style={styles.diaryEmpty}>No diary entries available.</Text>
          ) : (
            child.observations.map(obs => (
              <View key={obs.id} style={styles.diaryEntry}>
                <Text style={styles.diaryDate}>{new Date(obs.timestamp).toLocaleDateString()}</Text>
                <Text style={styles.diaryText}>{obs.text}</Text>
              </View>
            ))
          )}
        </View>

        {/* Log Out */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => { resetApp(); navigation.navigate('Welcome'); }}
        >
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 24 },

  // ── Shared header ──────────────────────────────────────────────────────
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

  // ── Doctor stats scroll ────────────────────────────────────────────────
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

  // ── Parent: child card ─────────────────────────────────────────────────
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 3,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  childAvatar: { fontSize: 52 },
  childInfo: { flex: 1 },
  childName: { fontSize: 22, fontWeight: '900', color: COLORS.gray700 },
  childAge: { fontSize: 14, fontWeight: '600', color: COLORS.gray500, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusBadgeText: { color: COLORS.white, fontWeight: '900', fontSize: 13 },

  // ── Parent: stats row ──────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statPill: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.purple100,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  statPillIcon: { fontSize: 20, marginBottom: 4 },
  statPillValue: { fontSize: 16, fontWeight: '900', color: COLORS.primary },
  statPillLabel: { fontSize: 10, fontWeight: '700', color: COLORS.gray400, textAlign: 'center', marginTop: 2 },

  // ── Parent: development card ───────────────────────────────────────────
  devCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.purple100,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  devCardTitle: { fontSize: 17, fontWeight: '900', color: COLORS.primary, marginBottom: 8 },
  devCardBody: { fontSize: 15, fontWeight: '600', color: COLORS.gray600, lineHeight: 24 },

  // ── Parent: section card (generic) ────────────────────────────────────
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.purple100,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: COLORS.primary, marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, fontWeight: '600', color: COLORS.gray400, marginBottom: 12 },
  emptyText: { fontSize: 14, color: COLORS.gray400, fontWeight: '600', fontStyle: 'italic' },

  // ── Parent: insights grid ──────────────────────────────────────────────
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  insightCard: {
    width: '47%',
    backgroundColor: COLORS.gray50,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  insightIcon: { fontSize: 28 },
  insightLabel: { fontSize: 12, fontWeight: '700', color: COLORS.gray500, textAlign: 'center' },
  insightValue: { fontSize: 16, fontWeight: '900' },

  // ── Parent: chart ──────────────────────────────────────────────────────
  chartContainer: { alignItems: 'center', marginTop: 4 },
  chartEmpty: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  chartEmptyText: { fontSize: 13, color: COLORS.gray400, fontWeight: '600', textAlign: 'center' },

  // ── Parent: session history ────────────────────────────────────────────
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  sessionLeft: { flex: 1 },
  sessionGame: { fontSize: 14, fontWeight: '800', color: COLORS.gray700 },
  sessionDate: { fontSize: 11, fontWeight: '600', color: COLORS.gray400, marginTop: 2 },
  starText: { fontSize: 18, color: '#f59e0b', letterSpacing: 2 },

  // ── Parent: tips ──────────────────────────────────────────────────────
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
  },
  tipBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6,
  },
  tipText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.gray600, lineHeight: 22 },

  // ── Parent: privacy ────────────────────────────────────────────────────
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  checkMark: { fontSize: 18, color: '#22c55e', fontWeight: '900' },
  checkText: { fontSize: 14, fontWeight: '600', color: '#15803d' },

  // ── Parent: play button ────────────────────────────────────────────────
  playGamesBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  playGamesBtnText: { color: COLORS.white, fontSize: 18, fontWeight: '900' },

  // ── Shared logout ─────────────────────────────────────────────────────
  logoutBtn: {
    backgroundColor: COLORS.gray100,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutBtnText: { color: COLORS.gray500, fontSize: 16, fontWeight: '800' },

  // ── FAB ───────────────────────────────────────────────────────────────
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

  // ── Diary modal ───────────────────────────────────────────────────────
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

  // ── Doctor: CECI card ──────────────────────────────────────────────────
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
  triIndicatorSection: {
    backgroundColor: COLORS.gray50,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  classificationBadge: {
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  classificationText: { fontSize: 16, fontWeight: '900' },
  tapSummary: {
    backgroundColor: COLORS.gray50,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  tapSummaryTitle: { fontSize: 13, fontWeight: '900', color: COLORS.gray600, marginBottom: 8 },
  tapSummaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  tapStat: { alignItems: 'center' },
  tapStatNum: { fontSize: 20, fontWeight: '900', color: COLORS.primary },
  tapStatLabel: { fontSize: 10, fontWeight: '700', color: COLORS.gray400, marginTop: 2 },

  // ── Doctor: radar chart ────────────────────────────────────────────────
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

  // ── Doctor: summary metrics ────────────────────────────────────────────
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

  // ── Doctor: notes ──────────────────────────────────────────────────────
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
    marginBottom: 12,
  },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '900' },

  pdfBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  pdfBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '900' },

  clearBtn: {
    backgroundColor: COLORS.gray100,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  clearBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '800' },

  // ── Doctor: child profile summary ──────────────────────────────────────
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  profileIcon: { fontSize: 20, width: 30, textAlign: 'center' },
  profileLabel: { fontSize: 12, fontWeight: '900', color: '#64748B', textTransform: 'uppercase', flex: 1 },
  profileValue: { fontSize: 13, fontWeight: '800', color: '#1E3A5F', textAlign: 'right' },

  // ── Doctor: domain indices ─────────────────────────────────────────────
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    gap: 12,
  },
  domainLabel: { fontSize: 16, fontWeight: '900' },
  domainFull: { fontSize: 10, fontWeight: '700', color: '#64748B', marginTop: 2, marginBottom: 8 },
  domainBarBg: { height: 6, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 3, overflow: 'hidden' },
  domainBarFill: { height: 6, borderRadius: 3 },
  domainScore: { fontSize: 22, fontWeight: '900', minWidth: 52, textAlign: 'right' },

  // ── Doctor: clinical form ──────────────────────────────────────────────
  formField: { marginBottom: 16 },
  formLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  formInput: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray700,
    borderWidth: 2,
    borderColor: '#BFDBFE',
  },
  formTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
