
import React, { useState, useEffect, useRef } from 'react';
import { Section, ChildProfile, ParentProfile, DoctorProfile, GameResult, UserRole, Observation, AssessmentSession, DomainIndices } from './types';
import { AssessmentPage } from './components/AssessmentPage';
import { HelpPage } from './components/HelpPage';
import { ObservationsDiary } from './components/ObservationsDiary';
import { getCECIBreakdown, estimateCECIParameters, estimateCECIParametersFromSessions, computeDomainIndices, CECIResult } from './services/ceciService';
import { ReportTemplate } from './components/ReportTemplate';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  auth,
  db,
  onAuthChange,
  signOut as firebaseSignOut,
  getUserRole,
  registerParent,
  loginParent,
  loginDoctor,
  getParentProfile,
  getDoctorProfile,
  getChildrenForParent,
  createChildProfile,
  updateChildProfile,
  saveGameResult,
  getSessionsForChild,
  getPendingDoctors,
  getApprovedDoctors,
  approveDoctor,
  rejectDoctor,
  registerDoctor,
  findDoctorByProfessionalId,
  assignChildToDoctor,
  getWeekKey,
} from './services/firebaseService';
import emailjs from '@emailjs/browser';

const SESSION_STORAGE_KEY = 'ceci_sessions';
// EmailJS config — set these in your .env file
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_WEEKLY_TEMPLATE = import.meta.env.VITE_EMAILJS_WEEKLY_TEMPLATE_ID || '';
const EMAILJS_APPROVAL_TEMPLATE = import.meta.env.VITE_EMAILJS_APPROVAL_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

// ── Validation helpers ────────────────────────────────────────────────────
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

const isValidName = (name: string) =>
  name.trim().length >= 2 && /[a-zA-Z]/.test(name);

const App: React.FC = () => {
  // Auth
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('loading');
  const [history, setHistory] = useState<Section[]>([]);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isDiaryOpen, setIsDiaryOpen] = useState(false);

  // Doctor state
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const [pendingDoctors, setPendingDoctors] = useState<DoctorProfile[]>([]);
  const [approvedDoctors, setApprovedDoctors] = useState<DoctorProfile[]>([]);
  const [adminActionLoading, setAdminActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  // Doctor link
  const [doctorIdInput, setDoctorIdInput] = useState('');
  const [doctorLinkError, setDoctorLinkError] = useState('');
  const [doctorLinkLoading, setDoctorLinkLoading] = useState(false);

  // Doctor registration form
  const [drForm, setDrForm] = useState({
    email: '', password: '', confirmPassword: '',
    fullName: '', doctorId: '', role: 'Doctor' as 'Doctor' | 'Nurse' | 'Therapist',
    specialty: '', hospital: '', department: '',
    licenseNumber: '', yearsOfExperience: '', qualification: '',
  });
  const [drErrors, setDrErrors] = useState<Record<string, string>>({});
  const [drLoading, setDrLoading] = useState(false);

  // ── Parent auth state ─────────────────────────────────────────────────
  const [parentPassword, setParentPassword] = useState('');
  const [parentErrors, setParentErrors] = useState<{
    name?: string; email?: string; password?: string;
  }>({});
  const [showReAuthModal, setShowReAuthModal] = useState(false);
  const [reAuthInput, setReAuthInput]         = useState('');
  const [reAuthError, setReAuthError]         = useState('');

  // ── Parent Login Modal ─────────────────────────────────────────────────
  const [showParentLoginModal, setShowParentLoginModal] = useState(false);
  const [loginEmail, setLoginEmail]   = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError]   = useState('');

  // ── Child form validation errors ──────────────────────────────────────
  const [childErrors, setChildErrors] = useState<{
    name?: string; dob?: string; gestationalAge?: string;
  }>({});

  const [parent, setParent] = useState<ParentProfile>({
    name: '',
    email: '',
    relationship: ''
  });

  const [child, setChild] = useState<ChildProfile>({
    name: '',
    dob: '',
    age: 0,
    sex: '',
    isPremature: null,
    gestationalAgeWeeks: 0,
    familyHistoryOfDD: null,
    knownConditions: '',
    bloodGroup: '',
    height: 0,
    weight: 0,
    bmi: 0,
    observations: []
  });

  const [results, setResults] = useState<GameResult[]>([]);

  // Doctor assessment state
  const [doctorForm, setDoctorForm] = useState({
    examinerName: '',
    caseNo: `CS-${Math.floor(Math.random() * 90000) + 10000}`,
    referralSource: '',
    presentingComplaints: '',
    behaviorNotes: '',
    diagnosis: '',
    recommendations: '',
    notes: ''
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Multi-session state (longitudinal monitoring per paper)
  const currentSessionId = useRef(`session_${Date.now()}`).current;
  const [sessionHistory, setSessionHistory] = useState<AssessmentSession[]>([]);
  const [domainIndices, setDomainIndices] = useState<DomainIndices>({ VMI: 0, FRI: 0, LCI: 0, IFI: 0, API: 0, ATI: 0 });

  // Navigation with history
  const navigateTo = (newSection: Section) => {
    if (newSection !== section) {
      setHistory(prev => [...prev, section]);
      setSection(newSection);
    }
  };

  const goBack = () => {
    if (history.length > 0) {
      const prevSection = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setSection(prevSection);
    } else {
      setSection('welcome');
      setRole(null);
    }
  };

  // handleGameComplete is defined in the Firebase section above (async version)

  const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return Math.max(0, Math.min(9, age));
  };

  const handleAddObservation = (text: string) => {
    const newObs: Observation = {
      id: Date.now().toString(),
      text,
      timestamp: Date.now()
    };
    setChild(prev => ({
      ...prev,
      observations: [newObs, ...prev.observations]
    }));
  };

  const getCategoryScores = () => {
    const categories = {
      cognitive: { games: ['memory', 'numbersequencer', 'counting', 'maze'], total: 0, count: 0 },
      social: { games: ['emotion', 'leader'], total: 0, count: 0 },
      language: { games: ['sound'], total: 0, count: 0 },
      attention: { games: ['simon', 'category', 'catcher'], total: 0, count: 0 },
    };

    if (results.length === 0) {
      return { cognitive: 0, social: 0, language: 0, attention: 0 };
    }

    results.forEach(res => {
      Object.keys(categories).forEach(catKey => {
        const cat = categories[catKey as keyof typeof categories];
        if (cat.games.includes(res.gameId)) {
          cat.total += Math.min(100, res.score);
          cat.count++;
        }
      });
    });

    const getAvg = (cat: { total: number; count: number }) => cat.count > 0 ? Math.round(cat.total / cat.count) : 0;

    return {
      cognitive: getAvg(categories.cognitive),
      social: getAvg(categories.social),
      language: getAvg(categories.language),
      attention: getAvg(categories.attention),
    };
  };

  const scores = getCategoryScores();
  const overallScore = results.length > 0
    ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 4)
    : 0;

  const [ceciAnalysis, setCeciAnalysis] = useState<CECIResult | null>(null);

  // ── Firebase Auth listener ─────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        setFirebaseUid(user.uid);
        try {
          const userRole = await getUserRole(user.uid) as UserRole | null;
          setRole(userRole);

          if (userRole === 'parent') {
            const profile = await getParentProfile(user.uid);
            if (profile) setParent(prev => ({ ...prev, ...profile }));

            const kids = await getChildrenForParent(user.uid);
            if (kids.length > 0) {
              const { id, parentUid, assignedDoctorUid, ...childData } = kids[0] as any;
              setChild(prev => ({ ...prev, ...childData }));
              setChildId(id);
            }

            setSection('results');
          } else if (userRole === 'doctor') {
            const docProfile = await getDoctorProfile(user.uid);
            if (docProfile) {
              setDoctor(docProfile);
              setSection(docProfile.status === 'approved' ? 'doctor-dashboard' : 'doctor-pending');
            }
          } else if (userRole === 'admin') {
            setSection('admin-dashboard');
          } else {
            setSection('welcome');
          }
        } catch (e) {
          console.warn('Auth load error:', e);
          setSection('welcome');
        }
      } else {
        setFirebaseUid(null);
        setRole(null);
        setSection('welcome');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load session history from localStorage on mount.
  // If URL contains ?clearSessions=1, wipe stored history first (used by clear-sessions.sh).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('clearSessions') === '1') {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      // Strip the query param from the URL without reloading
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) setSessionHistory(JSON.parse(stored));
    } catch {}
  }, []);

  // Save current session & recompute domain indices whenever results change
  useEffect(() => {
    if (results.length === 0) return;
    setDomainIndices(computeDomainIndices(results));
    const sessionAccuracy = results.reduce((sum, r) => sum + r.score / 100, 0) / results.length;
    const session: AssessmentSession = { id: currentSessionId, date: Date.now(), results, sessionAccuracy };
    setSessionHistory(prev => {
      const updated = [...prev.filter(s => s.id !== currentSessionId), session];
      try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [results]);

  // Multi-session CECI analysis using paper's longitudinal formulation
  // Only compute when the child has actually played games in the current session
  useEffect(() => {
    if (results.length === 0) {
      setCeciAnalysis(null);
      return;
    }
    const analyze = async () => {
      const prevSessions = sessionHistory.filter(s => s.id !== currentSessionId);
      const params = estimateCECIParametersFromSessions(prevSessions, results);
      const allAccuracies = [
        ...prevSessions.map(s => s.sessionAccuracy),
        results.reduce((sum, r) => sum + r.score / 100, 0) / results.length
      ];
      try {
        const analysis = await getCECIBreakdown(params.pid, params.varAcc, params.peff, allAccuracies, !params.insufficientData);
        setCeciAnalysis(analysis);
      } catch (error) {
        console.error("Analysis failed", error);
      }
    };
    analyze();
  }, [results, sessionHistory]);

  // Derived session counts — only count a session when games have been played
  const prevSessions = sessionHistory.filter(s => s.id !== currentSessionId);
  const totalSessions = results.length > 0 ? prevSessions.length + 1 : 0;
  const ceciParams = results.length > 0
    ? estimateCECIParametersFromSessions(prevSessions, results)
    : { pid: 0, varAcc: 0, peff: 0, insufficientData: true };

  const handleRoleSelection = (selectedRole: UserRole) => {
    if (selectedRole === 'doctor') {
      setLoginEmail('');
      setLoginPassword('');
      setLoginError('');
      setRole('doctor');
      setShowParentLoginModal(true);
    } else {
      // Parent
      if (firebaseUid && role === 'parent') {
        navigateTo('results');
        return;
      }
      setRole('parent');
      setLoginEmail('');
      setLoginPassword('');
      setLoginError('');
      setShowParentLoginModal(true);
    }
  };

  const handleParentLogin = async () => {
    if (!loginEmail || !loginPassword) { setLoginError('Enter email and password.'); return; }
    try {
      const uid = await loginParent(loginEmail.trim().toLowerCase(), loginPassword);
      // Auth listener will handle routing
      setShowParentLoginModal(false);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setLoginError('Incorrect email or password.');
      } else {
        setLoginError('Login failed. Please try again.');
      }
    }
  };

  const handleDoctorLogin = async () => {
    if (!loginEmail || !loginPassword) { setLoginError('Enter email and password.'); return; }
    try {
      const uid = await loginDoctor(loginEmail.trim().toLowerCase(), loginPassword);
      const docProfile = await getDoctorProfile(uid);
      if (!docProfile) { setLoginError('No professional profile found.'); return; }
      setDoctor(docProfile);
      setShowParentLoginModal(false);
      if (docProfile.status === 'pending') navigateTo('doctor-pending');
      else if (docProfile.status === 'rejected') {
        setLoginError(`Registration rejected: ${docProfile.rejectionReason || 'No reason provided.'}`);
      } else {
        navigateTo('doctor-dashboard');
      }
    } catch (err: any) {
      setLoginError('Login failed. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await firebaseSignOut();
    setFirebaseUid(null);
    setRole(null);
    setDoctor(null);
    setChildId(null);
    setHistory([]);
    setSection('welcome');
  };

  const handleParentRegister = async () => {
    const errs: Record<string, string> = {};
    if (!isValidName(parent.name)) errs.name = 'Enter your full name.';
    if (!isValidEmail(parent.email)) errs.email = 'Enter a valid email.';
    if (!parentPassword || parentPassword.length < 6) errs.password = 'Password must be at least 6 characters.';
    setParentErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      const uid = await registerParent(parent.email.trim().toLowerCase(), parentPassword, {
        name: parent.name.trim(), relationship: parent.relationship || '',
      });
      setFirebaseUid(uid);
      setRole('parent');
      navigateTo('onboarding-child');
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setParentErrors({ email: 'Email already registered. Please log in instead.' });
      } else {
        setParentErrors({ email: err.message || 'Registration failed.' });
      }
    }
  };

  const handleChildSave = async () => {
    // Validate child form (same as before) then save to Firestore
    if (firebaseUid && !childId) {
      try {
        const { observations, ...childData } = child;
        const newId = await createChildProfile(firebaseUid, childData);
        setChildId(newId);
      } catch (e) {
        console.warn('Firestore child save failed:', e);
      }
    } else if (childId) {
      try {
        await updateChildProfile(childId, child);
      } catch (e) {
        console.warn('Firestore child update failed:', e);
      }
    }
  };

  const handleSendWeeklyReport = async () => {
    if (!parent.email || !EMAILJS_SERVICE_ID) return;
    const latestSession = sessionHistory[sessionHistory.length - 1];
    const riskBand = ceciAnalysis?.riskBand || 'green';
    const recs: Record<string, string[]> = {
      green: ['Keep encouraging play sessions!', 'Try different game types.', 'Celebrate achievements!'],
      amber: ['Ensure distraction-free environment.', 'Practice challenging games.', 'Reward effort.'],
      red: ['Follow up with a paediatrician.', 'Keep a daily activity journal.', 'Reduce distractions.'],
    };
    try {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_WEEKLY_TEMPLATE, {
        to_email: parent.email,
        to_name: parent.name,
        child_name: child.name || 'your child',
        week_range: latestSession ? new Date(latestSession.date).toLocaleDateString() : 'this week',
        ceci_band: riskBand,
        ceci_label: ceciAnalysis?.riskLabel || 'Typical Development',
        clinical_note: ceciAnalysis?.clinicalNote || 'No notes available.',
        games_summary: latestSession
          ? latestSession.results.map(r => `${r.gameId}: ${Math.round(r.score)}%`).join(', ')
          : 'No games played yet.',
        recommendations: recs[riskBand].join('\n'),
      }, EMAILJS_PUBLIC_KEY);
      alert('Weekly report sent to ' + parent.email);
    } catch (e) {
      alert('Failed to send report. Please check your EmailJS configuration.');
    }
  };

  const handleFindAndLinkDoctor = async () => {
    if (!doctorIdInput.trim()) { setDoctorLinkError('Enter a doctor professional ID.'); return; }
    if (!childId) { setDoctorLinkError('Save child profile first.'); return; }
    setDoctorLinkLoading(true);
    setDoctorLinkError('');
    try {
      const doc = await findDoctorByProfessionalId(doctorIdInput.trim());
      if (!doc) { setDoctorLinkError('No approved doctor found with that ID.'); return; }
      await assignChildToDoctor(childId, doc.uid);
      setDoctorLinkError('');
      setDoctorIdInput('');
      alert(`${child.name} successfully linked to ${doc.role} ${doc.fullName} at ${doc.hospital}.`);
    } catch {
      setDoctorLinkError('Failed to link. Please try again.');
    } finally {
      setDoctorLinkLoading(false);
    }
  };

  const handleGameComplete = async (result: GameResult) => {
    setResults(prev => [...prev, result]);
    // Save to Firestore
    if (childId) {
      try {
        const di = computeDomainIndices([...results, result]);
        await saveGameResult(childId, result, di);
      } catch (e) {
        console.warn('Firestore game save failed:', e);
      }
    }
    if (role === 'child') {
      navigateTo('assessment');
    } else {
      navigateTo('results');
    }
  };

  const handleDownloadReport = async () => {
    setIsGeneratingPdf(true);
    const element = document.getElementById('report-content');
    if (!element) return;

    try {
      // Temporarily show the report for capture
      element.style.display = 'block';
      element.style.position = 'absolute';
      element.style.left = '-9999px';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Assessment_Report_${child.name || 'Child'}.pdf`);

      element.style.display = 'none';
      alert('Report generated successfully!');
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const renderSection = () => {
    switch (section) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFF9E6]">
            <div className="text-[100px] mb-6" style={{ animation: 'bounce 1s infinite' }}>🌟</div>
            <h1 className="text-6xl font-black text-purple-700 mb-2 tracking-widest">CECI</h1>
            <p className="text-lg font-black text-orange-500 uppercase tracking-widest mb-2">
              Child Effort-Cognition Index
            </p>
            <p className="text-base text-purple-400 font-bold mb-8">
              Game-based developmental screening for children aged 3–9
            </p>
            <div className="flex gap-3 mb-8">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-4 h-4 bg-purple-400 rounded-full"
                  style={{ animation: `bounce 1s infinite ${i * 0.2}s` }}
                />
              ))}
            </div>
            <p className="text-sm text-purple-300 font-bold">Getting things ready...</p>
          </div>
        );

      case 'doctor-pending':
        return (
          <div className="container mx-auto px-4 py-10 max-w-lg">
            <div className="bg-white rounded-3xl p-8 shadow-xl text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h2 className="text-2xl font-black text-yellow-600 mb-4">Registration Under Review</h2>
              <p className="text-gray-600 mb-4 font-semibold">
                Your credentials are being reviewed by our administrator.
                You will receive an email at <strong>{doctor?.email}</strong> once approved.
              </p>
              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 mb-6 text-left">
                <p className="font-bold text-green-800 mb-2">What happens next?</p>
                <p className="text-sm text-green-700">1. Admin reviews your professional details</p>
                <p className="text-sm text-green-700">2. You receive an approval email</p>
                <p className="text-sm text-green-700">3. Log in to access child assessment records</p>
              </div>
              {doctor && (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 mb-6 text-left">
                  <p className="font-bold text-purple-800 mb-2">Submitted Profile</p>
                  <p className="text-sm text-gray-700"><strong>Name:</strong> {doctor.fullName}</p>
                  <p className="text-sm text-gray-700"><strong>Role:</strong> {doctor.role}</p>
                  <p className="text-sm text-gray-700"><strong>Hospital:</strong> {doctor.hospital}</p>
                  <p className="text-sm text-gray-700"><strong>Specialty:</strong> {doctor.specialty}</p>
                </div>
              )}
              <button
                onClick={handleSignOut}
                className="bg-gray-100 text-gray-600 font-bold px-8 py-3 rounded-full"
              >Sign Out</button>
            </div>
          </div>
        );

      case 'doctor-register':
        return (
          <div className="container mx-auto px-4 py-10 max-w-2xl">
            <button onClick={goBack} className="mb-6 flex items-center gap-2 text-purple-600 font-bold text-lg">
              ⬅️ Back
            </button>
            <div className="bg-white rounded-3xl p-8 shadow-xl">
              <h2 className="text-2xl font-black text-purple-700 mb-2">🩺 Professional Registration</h2>
              <p className="text-sm text-yellow-700 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-xl mb-6 font-semibold">
                Your account will be reviewed by an administrator before access is granted.
              </p>
              <div className="space-y-4">
                {(['email','password','confirmPassword','fullName','doctorId','specialty','hospital','department','licenseNumber','yearsOfExperience','qualification'] as const).map(field => (
                  <div key={field}>
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1 block">
                      {field === 'confirmPassword' ? 'Confirm Password' :
                       field === 'fullName' ? 'Full Name *' :
                       field === 'doctorId' ? 'Professional ID * (e.g. MCI-123456)' :
                       field === 'yearsOfExperience' ? 'Years of Experience *' :
                       field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                    </label>
                    <input
                      type={field.toLowerCase().includes('password') ? 'password' : field === 'yearsOfExperience' ? 'number' : 'text'}
                      value={(drForm as any)[field]}
                      onChange={e => setDrForm(prev => ({ ...prev, [field]: e.target.value }))}
                      className={`w-full px-4 py-3 rounded-2xl border-2 font-semibold text-gray-700 ${drErrors[field] ? 'border-red-400' : 'border-gray-100'} bg-gray-50`}
                      placeholder={field === 'email' ? 'your@hospital.com' : field === 'qualification' ? 'MBBS, MD (Pediatrics)' : ''}
                    />
                    {drErrors[field] && <p className="text-red-500 text-xs font-bold mt-1">{drErrors[field]}</p>}
                  </div>
                ))}
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1 block">Role *</label>
                  <div className="flex gap-3">
                    {(['Doctor','Nurse','Therapist'] as const).map(r => (
                      <button key={r}
                        onClick={() => setDrForm(prev => ({ ...prev, role: r }))}
                        className={`flex-1 py-2 rounded-xl font-bold border-2 ${drForm.role === r ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-gray-50 border-transparent text-gray-500'}`}
                      >{r}</button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const errs: Record<string, string> = {};
                    if (!drForm.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = 'Invalid email';
                    if (drForm.password.length < 8) errs.password = 'Min 8 characters';
                    if (drForm.password !== drForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
                    if (!drForm.fullName.trim()) errs.fullName = 'Required';
                    if (!drForm.doctorId.trim()) errs.doctorId = 'Required';
                    if (!drForm.specialty.trim()) errs.specialty = 'Required';
                    if (!drForm.hospital.trim()) errs.hospital = 'Required';
                    if (!drForm.licenseNumber.trim()) errs.licenseNumber = 'Required';
                    if (!drForm.yearsOfExperience) errs.yearsOfExperience = 'Required';
                    if (!drForm.qualification.trim()) errs.qualification = 'Required';
                    setDrErrors(errs);
                    if (Object.keys(errs).length > 0) return;
                    setDrLoading(true);
                    try {
                      const uid = await registerDoctor(drForm.email.trim().toLowerCase(), drForm.password, {
                        doctorId: drForm.doctorId.trim(),
                        fullName: drForm.fullName.trim(),
                        role: drForm.role,
                        specialty: drForm.specialty.trim(),
                        hospital: drForm.hospital.trim(),
                        department: drForm.department.trim(),
                        licenseNumber: drForm.licenseNumber.trim(),
                        yearsOfExperience: Number(drForm.yearsOfExperience),
                        qualification: drForm.qualification.trim(),
                      });
                      navigateTo('doctor-pending');
                    } catch (err: any) {
                      if (err?.code === 'auth/email-already-in-use') {
                        setDrErrors({ email: 'Email already registered.' });
                      } else {
                        setDrErrors({ email: err.message || 'Registration failed.' });
                      }
                    } finally {
                      setDrLoading(false);
                    }
                  }}
                  disabled={drLoading}
                  className="w-full bg-green-500 text-white font-black py-4 rounded-2xl text-lg hover:bg-green-600 disabled:opacity-60 mt-4"
                >
                  {drLoading ? '...' : 'Submit Registration'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'doctor-dashboard':
        return (
          <div className="container mx-auto px-4 py-10 max-w-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-black text-purple-700">🩺 Doctor Dashboard</h2>
                <p className="text-gray-500 font-semibold">{doctor?.role} {doctor?.fullName} • {doctor?.specialty}</p>
                <p className="text-gray-400 text-sm">{doctor?.hospital}</p>
              </div>
              <button onClick={handleSignOut} className="bg-gray-100 text-gray-600 font-bold px-4 py-2 rounded-full text-sm">
                Sign Out
              </button>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
              <p className="font-bold text-blue-800 mb-1">Professional ID: <span className="text-purple-700">{doctor?.doctorId}</span></p>
              <p className="text-sm text-blue-600">Share this ID with parents to link their child's records to you.</p>
            </div>
            <p className="text-center text-gray-400 mt-6 font-semibold">Assigned patients will appear here once parents link their child to your ID.</p>
          </div>
        );

      case 'admin-dashboard':
        return (
          <div className="container mx-auto px-4 py-10 max-w-3xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-purple-700">⚙️ Admin Dashboard</h2>
              <button onClick={handleSignOut} className="bg-gray-100 text-gray-600 font-bold px-4 py-2 rounded-full text-sm">
                Sign Out
              </button>
            </div>
            <button
              onClick={async () => {
                const [pending, approved] = await Promise.all([getPendingDoctors(), getApprovedDoctors()]);
                setPendingDoctors(pending);
                setApprovedDoctors(approved);
              }}
              className="mb-6 bg-purple-600 text-white font-bold px-6 py-3 rounded-2xl"
            >🔄 Refresh</button>
            <h3 className="text-lg font-black text-yellow-600 mb-4">Pending Registrations ({pendingDoctors.length})</h3>
            {pendingDoctors.length === 0 ? (
              <p className="text-gray-400 mb-8 font-semibold">No pending registrations.</p>
            ) : (
              pendingDoctors.map(doc => (
                <div key={doc.uid} className="bg-white rounded-2xl p-6 mb-4 shadow border border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-black text-gray-800 text-lg">{doc.fullName}</p>
                      <p className="text-purple-600 font-bold text-sm">{doc.role} • {doc.specialty}</p>
                    </div>
                    <span className="bg-yellow-100 text-yellow-700 text-xs font-black px-3 py-1 rounded-full">PENDING</span>
                  </div>
                  <p className="text-sm text-gray-500">🏥 {doc.hospital} {doc.department && `• ${doc.department}`}</p>
                  <p className="text-sm text-gray-500">🪪 License: {doc.licenseNumber}</p>
                  <p className="text-sm text-gray-500">🎓 {doc.qualification}</p>
                  <p className="text-sm text-gray-500">📅 {doc.yearsOfExperience} year(s) experience</p>
                  <p className="text-sm text-gray-500">📧 {doc.email}</p>
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={async () => {
                        if (!firebaseUid) return;
                        setAdminActionLoading(doc.uid);
                        try {
                          await approveDoctor(doc.uid, firebaseUid);
                          if (EMAILJS_SERVICE_ID) {
                            await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_APPROVAL_TEMPLATE, {
                              to_email: doc.email, to_name: doc.fullName, status: 'approved',
                            }, EMAILJS_PUBLIC_KEY);
                          }
                          const [pending, approved] = await Promise.all([getPendingDoctors(), getApprovedDoctors()]);
                          setPendingDoctors(pending); setApprovedDoctors(approved);
                        } finally { setAdminActionLoading(null); }
                      }}
                      disabled={adminActionLoading === doc.uid}
                      className="flex-1 bg-green-500 text-white font-black py-2 rounded-xl hover:bg-green-600 disabled:opacity-60"
                    >{adminActionLoading === doc.uid ? '...' : '✓ Approve'}</button>
                    <button
                      onClick={() => { setRejectTarget(doc.uid); setRejectReason(''); }}
                      className="flex-1 bg-red-100 text-red-600 font-black py-2 rounded-xl border-2 border-red-200"
                    >✗ Reject</button>
                  </div>
                  {rejectTarget === doc.uid && (
                    <div className="mt-3">
                      <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Reason for rejection..."
                        className="w-full border-2 border-red-300 rounded-xl p-3 text-sm font-semibold mb-2"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setRejectTarget(null)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-2 rounded-xl text-sm">Cancel</button>
                        <button
                          onClick={async () => {
                            if (!rejectReason.trim()) return;
                            await rejectDoctor(doc.uid, rejectReason.trim());
                            if (EMAILJS_SERVICE_ID) {
                              await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_APPROVAL_TEMPLATE, {
                                to_email: doc.email, to_name: doc.fullName, status: 'rejected', reason: rejectReason,
                              }, EMAILJS_PUBLIC_KEY);
                            }
                            const [pending, approved] = await Promise.all([getPendingDoctors(), getApprovedDoctors()]);
                            setPendingDoctors(pending); setApprovedDoctors(approved);
                            setRejectTarget(null);
                          }}
                          className="flex-1 bg-red-600 text-white font-black py-2 rounded-xl text-sm"
                        >Confirm Reject</button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <h3 className="text-lg font-black text-green-600 mb-4">Approved Doctors ({approvedDoctors.length})</h3>
            {approvedDoctors.map(doc => (
              <div key={doc.uid} className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-3">
                <p className="font-black text-gray-800">{doc.fullName}</p>
                <p className="text-sm text-gray-500">{doc.role} • {doc.specialty} • {doc.hospital}</p>
                <p className="text-sm text-gray-500">Patients assigned: {doc.assignedChildIds?.length || 0}</p>
              </div>
            ))}
          </div>
        );

      case 'welcome':
        return (
          <div className="container mx-auto px-4 py-10 text-center">
            <div className="text-8xl md:text-9xl mb-6 animate-float drop-shadow-xl inline-block cursor-pointer" onClick={() => navigateTo('welcome')}>
               <span className="select-none">🌟</span>
            </div>

            <div className="animate-pop-in" style={{ animationDelay: '0.2s' }}>
              <h1 className="text-4xl md:text-6xl font-black text-purple-700 mb-4 tracking-tight">
                Hi! I'm <span className="text-orange-500">Starry!</span>
              </h1>
              <p className="text-xl md:text-2xl text-purple-400 mb-10 font-bold">
                Ready to explore your super powers?
              </p>
            </div>

            <div className="animate-pop-in max-w-4xl mx-auto mb-12 bg-white p-8 md:p-12 rounded-[3rem] kids-shadow border-4 border-purple-100 shadow-xl" style={{ animationDelay: '0.4s' }}>
              <h2 className="text-3xl md:text-4xl font-black text-purple-800 leading-tight tracking-tight mb-6">
                Early Childhood <span className="text-orange-500">Intellectual Disability</span> Screening
              </h2>
              <p className="text-lg md:text-xl text-gray-600 font-medium leading-relaxed text-left md:text-center">
                This project uses simple interactive games to understand how young children think and learn.
                By observing how a child plays—such as <span className="text-blue-500 font-bold">response time</span>,
                mistakes, and improvement over repeated sessions—the system can identify
                <span className="text-purple-600 font-bold">consistent learning difficulties</span> and separate them from
                temporary low effort or mood changes.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-6 justify-center items-center animate-pop-in" style={{ animationDelay: '0.8s' }}>
              <button
                onClick={() => navigateTo('login')}
                className="bg-[#FF9F1C] hover:bg-orange-400 text-white font-black text-2xl px-12 py-6 rounded-[2.5rem] transition-all hover:scale-110 active:scale-95 kids-button-shadow min-w-[280px] flex items-center justify-center gap-4 group"
              >
                GET STARTED <span className="group-hover:translate-x-2 transition-transform">🚀</span>
              </button>
              <button
                onClick={() => navigateTo('help')}
                className="bg-white border-4 border-purple-500 text-purple-600 font-black text-2xl px-12 py-6 rounded-[2.5rem] transition-all hover:scale-105 active:scale-95 kids-button-shadow min-w-[280px]"
              >
                TUTORIAL
              </button>
            </div>
          </div>
        );

      case 'login':
        return (
          <div className="min-h-screen bg-[#FFF9E6] flex flex-col items-center justify-center px-4 py-16 animate-pop-in">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="text-7xl mb-4">🌟</div>
              <h2 className="text-5xl font-black text-purple-700 mb-3">Welcome!</h2>
              <p className="text-xl text-purple-400 font-bold">Are you a Parent or a Healthcare Professional?</p>
            </div>

            {/* Two role cards */}
            <div className="grid md:grid-cols-2 gap-8 w-full max-w-3xl">
              {/* Parent card */}
              <button
                onClick={() => handleRoleSelection('parent')}
                className="bg-white p-12 rounded-[3rem] border-4 border-purple-100 hover:border-purple-400 hover:scale-105 transition-all shadow-xl group text-left"
              >
                <div className="text-7xl mb-6 bg-purple-100 w-28 h-28 rounded-3xl flex items-center justify-center group-hover:rotate-6 transition-transform">
                  ❤️
                </div>
                <h3 className="text-3xl font-black text-purple-700 mb-3">I'm a Parent</h3>
                <p className="text-gray-500 font-semibold text-base leading-relaxed">
                  Log in to view your child's progress dashboard and play assessment games together.
                </p>
                <div className="mt-6 flex items-center gap-2 text-purple-600 font-black text-sm">
                  <span>Get Started</span>
                  <span className="group-hover:translate-x-2 transition-transform">→</span>
                </div>
              </button>

              {/* Doctor card */}
              <button
                onClick={() => handleRoleSelection('doctor')}
                className="bg-white p-12 rounded-[3rem] border-4 border-green-100 hover:border-green-400 hover:scale-105 transition-all shadow-xl group text-left"
              >
                <div className="text-7xl mb-6 bg-green-100 w-28 h-28 rounded-3xl flex items-center justify-center group-hover:rotate-6 transition-transform">
                  🩺
                </div>
                <h3 className="text-3xl font-black text-green-700 mb-3">I'm a Doctor</h3>
                <p className="text-gray-500 font-semibold text-base leading-relaxed">
                  Log in as a registered healthcare professional to access assigned patient records and clinical assessments.
                </p>
                <div className="mt-6 flex items-center gap-2 text-green-600 font-black text-sm">
                  <span>Get Started</span>
                  <span className="group-hover:translate-x-2 transition-transform">→</span>
                </div>
              </button>
            </div>

            <p className="text-gray-400 font-semibold text-sm mt-10">
              New here?{' '}
              <button onClick={() => navigateTo('onboarding-parent')} className="text-purple-600 underline font-bold">
                Create a parent account
              </button>
              {' '}or{' '}
              <button onClick={() => navigateTo('doctor-register')} className="text-green-600 underline font-bold">
                register as a professional
              </button>
            </p>
          </div>
        );

      case 'onboarding-parent': {
        const validateAndContinue = () => {
          const errs: typeof parentErrors = {};
          if (!isValidName(parent.name))   errs.name     = 'Please enter your full name (at least 2 letters).';
          if (!isValidEmail(parent.email)) errs.email    = 'Please enter a valid email address.';
          if (!parentPassword)             errs.password = 'Please create a password to protect this profile.';
          else if (parentPassword.length < 6) errs.password = 'Password must be at least 6 characters.';
          setParentErrors(errs);
          if (Object.keys(errs).length === 0) {
            handleParentRegister();
          }
        };
        return (
          <div className="max-w-xl mx-auto py-20 px-4 animate-pop-in">
            <div className="bg-white p-12 rounded-[4rem] kids-shadow border-4 border-purple-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-orange-500"></div>
              <h2 className="text-4xl font-black text-purple-600 mb-10 text-center">Hello, Parent! 👋</h2>
              <div className="space-y-8">
                <div>
                  <label className="block text-gray-500 font-black mb-3 ml-2 text-sm uppercase">Your Full Name *</label>
                  <input
                    type="text"
                    className={`w-full p-6 rounded-[2rem] bg-gray-50 border-4 outline-none text-gray-900 font-bold text-xl ${parentErrors.name ? 'border-red-400 focus:border-red-400' : 'border-transparent focus:border-purple-200'}`}
                    value={parent.name}
                    onChange={e => { setParent({...parent, name: e.target.value}); setParentErrors(pe => ({...pe, name: undefined})); }}
                    placeholder="Super Parent Name"
                  />
                  {parentErrors.name && <p className="text-red-500 text-sm font-bold mt-2 ml-2">⚠ {parentErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-gray-500 font-black mb-3 ml-2 text-sm uppercase">Email Address *</label>
                  <input
                    type="email"
                    className={`w-full p-6 rounded-[2rem] bg-gray-50 border-4 outline-none text-gray-900 font-bold text-xl ${parentErrors.email ? 'border-red-400 focus:border-red-400' : 'border-transparent focus:border-purple-200'}`}
                    value={parent.email}
                    onChange={e => { setParent({...parent, email: e.target.value}); setParentErrors(pe => ({...pe, email: undefined})); }}
                    placeholder="you@email.com"
                  />
                  {parentErrors.email && <p className="text-red-500 text-sm font-bold mt-2 ml-2">⚠ {parentErrors.email}</p>}
                </div>
                <div>
                  <label className="block text-gray-500 font-black mb-3 ml-2 text-sm uppercase">Create a Password *</label>
                  <input
                    type="password"
                    className={`w-full p-6 rounded-[2rem] bg-gray-50 border-4 outline-none text-gray-900 font-bold text-xl ${parentErrors.password ? 'border-red-400 focus:border-red-400' : 'border-transparent focus:border-purple-200'}`}
                    value={parentPassword}
                    onChange={e => { setParentPassword(e.target.value); setParentErrors(pe => ({...pe, password: undefined})); }}
                    placeholder="Min. 4 characters"
                  />
                  {parentErrors.password && <p className="text-red-500 text-sm font-bold mt-2 ml-2">⚠ {parentErrors.password}</p>}
                  <p className="text-slate-400 text-xs font-bold mt-2 ml-2">Used to verify your identity when updating the child profile.</p>
                </div>
                <button
                  onClick={validateAndContinue}
                  className="w-full bg-[#FF9F1C] text-white py-6 rounded-[2.5rem] font-black text-2xl hover:scale-105 transition-all kids-button-shadow uppercase"
                >
                  Continue to Child Setup ➜
                </button>
              </div>
            </div>
          </div>
        );
      }

      case 'onboarding-child': {
        const validateChildAndContinue = () => {
          const errs: typeof childErrors = {};
          if (!isValidName(child.name)) errs.name = 'Please enter the child\'s name (at least 2 letters).';
          if (!child.dob) {
            errs.dob = 'Date of birth is required.';
          } else {
            const today = new Date(); today.setHours(0,0,0,0);
            const dob   = new Date(child.dob);
            if (dob > today) errs.dob = 'Date of birth cannot be in the future.';
          }
          if (child.isPremature && (child.gestationalAgeWeeks < 22 || child.gestationalAgeWeeks > 36))
            errs.gestationalAge = 'Gestational age must be between 22 and 36 weeks.';
          setChildErrors(errs);
          if (Object.keys(errs).length === 0) {
            handleChildSave();
            navigateTo('results');
          }
        };
        return (
          <div className="max-w-3xl mx-auto py-10 px-4 animate-pop-in">
            <div className="bg-white p-10 rounded-[4rem] kids-shadow border-4 border-purple-100 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-orange-500"></div>
              <h2 className="text-4xl font-black text-purple-600 mb-2 text-center">Child Profile</h2>
              <p className="text-center text-slate-400 font-bold text-sm mb-10">This information helps calibrate assessment norms accurately.</p>

              {/* ── Section 1: Basic Identity ── */}
              <p className="text-xs font-black text-purple-400 uppercase tracking-widest mb-4">Basic Information</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-gray-500 font-black mb-2 ml-2 text-xs uppercase">Child's Name *</label>
                  <input
                    type="text"
                    className={`w-full p-5 rounded-[2rem] bg-gray-50 border-4 outline-none text-gray-900 font-bold text-lg ${childErrors.name ? 'border-red-400 focus:border-red-400' : 'border-transparent focus:border-purple-200'}`}
                    value={child.name}
                    onChange={e => { setChild({...child, name: e.target.value}); setChildErrors(ce => ({...ce, name: undefined})); }}
                    placeholder="Enter name"
                  />
                  {childErrors.name && <p className="text-red-500 text-xs font-bold mt-1 ml-2">⚠ {childErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-gray-500 font-black mb-2 ml-2 text-xs uppercase">Date of Birth *</label>
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    className={`w-full p-5 rounded-[2rem] bg-gray-50 border-4 outline-none text-gray-900 font-bold text-lg ${childErrors.dob ? 'border-red-400 focus:border-red-400' : 'border-transparent focus:border-purple-200'}`}
                    value={child.dob}
                    onChange={e => {
                      const age = calculateAge(e.target.value);
                      setChild({...child, dob: e.target.value, age});
                      setChildErrors(ce => ({...ce, dob: undefined}));
                    }}
                  />
                  {childErrors.dob && <p className="text-red-500 text-xs font-bold mt-1 ml-2">⚠ {childErrors.dob}</p>}
                </div>

                {/* Sex/Gender — essential for sex-stratified normative scoring */}
                <div className="col-span-full">
                  <label className="block text-gray-500 font-black mb-2 ml-2 text-xs uppercase">Sex *</label>
                  <div className="flex gap-4">
                    {(['male', 'female', 'other'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setChild({...child, sex: s})}
                        className={`flex-1 py-4 rounded-[2rem] font-black text-lg capitalize transition-all border-4 ${
                          child.sex === s
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-gray-50 text-gray-500 border-transparent hover:border-purple-200'
                        }`}
                      >
                        {s === 'male' ? '👦 Boy' : s === 'female' ? '👧 Girl' : '⚧ Other'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Age display */}
                {child.dob && (
                  <div className="col-span-full bg-purple-50 p-5 rounded-[2rem] border-4 border-purple-100 flex items-center justify-between">
                    <span className="text-purple-400 font-black text-xs uppercase tracking-widest">Current Age</span>
                    <span className="text-purple-700 font-black text-3xl">{child.age} <small className="text-base font-bold">years</small></span>
                  </div>
                )}
              </div>

              {/* ── Section 2: Birth History ── */}
              <p className="text-xs font-black text-purple-400 uppercase tracking-widest mb-4">Birth History <span className="text-slate-300 normal-case font-bold">(affects score calibration for young children)</span></p>
              <div className="grid grid-cols-1 gap-6 mb-8">
                <div className="bg-slate-50 p-6 rounded-[2rem] border-4 border-transparent">
                  <label className="block text-gray-600 font-black mb-4 text-sm">Was the child born premature (before 37 weeks)?</label>
                  <div className="flex gap-4">
                    {[{ label: 'Yes', val: true }, { label: 'No', val: false }].map(opt => (
                      <button
                        key={String(opt.val)}
                        type="button"
                        onClick={() => setChild({...child, isPremature: opt.val, gestationalAgeWeeks: opt.val ? child.gestationalAgeWeeks : 0})}
                        className={`flex-1 py-4 rounded-[2rem] font-black text-lg transition-all border-4 ${
                          child.isPremature === opt.val && child.isPremature !== null
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white text-gray-500 border-white hover:border-orange-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {child.isPremature && (
                    <div className="mt-5">
                      <label className="block text-gray-500 font-black mb-2 text-xs uppercase">Gestational Age at Birth (weeks) *</label>
                      <input
                        type="number"
                        min="22" max="36"
                        className={`w-full p-4 rounded-[1.5rem] bg-white border-4 outline-none text-gray-900 font-bold text-lg ${childErrors.gestationalAge ? 'border-red-400 focus:border-red-400' : 'border-orange-200 focus:border-orange-400'}`}
                        value={child.gestationalAgeWeeks || ''}
                        onChange={e => {
                          setChild({...child, gestationalAgeWeeks: parseInt(e.target.value) || 0});
                          setChildErrors(ce => ({...ce, gestationalAge: undefined}));
                        }}
                        placeholder="e.g. 32"
                      />
                      {childErrors.gestationalAge
                        ? <p className="text-red-500 text-xs font-bold mt-2 ml-2">⚠ {childErrors.gestationalAge}</p>
                        : <p className="text-orange-500 text-xs font-bold mt-2 ml-2">Used to compute the child's corrected developmental age for accurate scoring.</p>
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* ── Section 3: Family & Medical Background ── */}
              <p className="text-xs font-black text-purple-400 uppercase tracking-widest mb-4">Family & Medical Background <span className="text-slate-300 normal-case font-bold">(recommended)</span></p>
              <div className="grid grid-cols-1 gap-6 mb-8">
                <div className="bg-slate-50 p-6 rounded-[2rem] border-4 border-transparent">
                  <label className="block text-gray-600 font-black mb-1 text-sm">Family history of ASD, ADHD, intellectual disability, or learning disorders?</label>
                  <p className="text-slate-400 text-xs font-bold mb-4">(in a parent or sibling)</p>
                  <div className="flex gap-4">
                    {[{ label: 'Yes', val: true }, { label: 'No / Unknown', val: false }].map(opt => (
                      <button
                        key={String(opt.val)}
                        type="button"
                        onClick={() => setChild({...child, familyHistoryOfDD: opt.val})}
                        className={`flex-1 py-3 rounded-[2rem] font-black text-base transition-all border-4 ${
                          child.familyHistoryOfDD === opt.val
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-500 border-white hover:border-purple-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-500 font-black mb-2 ml-2 text-xs uppercase">Known Medical Conditions or Diagnoses</label>
                  <input
                    type="text"
                    className="w-full p-5 rounded-[2rem] bg-gray-50 border-4 border-transparent focus:border-purple-200 outline-none text-gray-900 font-bold text-lg"
                    value={child.knownConditions}
                    onChange={e => setChild({...child, knownConditions: e.target.value})}
                    placeholder="e.g. None / Epilepsy / Hearing impairment"
                  />
                  <p className="text-slate-400 text-xs font-bold mt-2 ml-2">Leave blank if none. Diagnosed conditions affect how results are interpreted.</p>
                </div>
              </div>

              <button
                onClick={validateChildAndContinue}
                className="w-full mt-4 bg-purple-600 text-white py-7 rounded-[2.5rem] font-black text-2xl hover:scale-105 transition-all kids-button-shadow uppercase"
              >
                Save & View Report ➜
              </button>
              <p className="text-center text-slate-400 text-xs font-bold mt-4">* Required fields</p>
            </div>
          </div>
        );
      }

      case 'results': {
        // ── PARENT-FRIENDLY DASHBOARD ──────────────────────────────────────
        if (role === 'parent') {
          const gameNames: Record<string, string> = {
            catcher: 'Reaction Catcher', memory: 'Memory Match',
            numbersequencer: 'Number Sequencer', sound: 'Sound & Words',
            leader: 'Follow the Leader', counting: 'Counting Garden',
            emotion: 'Emotion Detective', simon: 'Simon Says',
            maze: 'Treasure Maze', category: 'Category Sort',
          };

          const statusInfo = (() => {
            if (!ceciAnalysis || results.length === 0)
              return { label: 'No Data Yet', color: '#94a3b8', bg: '#f8fafc', icon: '📊', desc: 'Play some games to see progress here!' };
            if (ceciAnalysis.riskBand === 'green')
              return { label: 'On Track', color: '#22c55e', bg: '#f0fdf4', icon: '✅', desc: `${child.name || 'Your child'} is showing steady progress across sessions.` };
            if (ceciAnalysis.riskBand === 'amber')
              return { label: 'Needs Attention', color: '#f59e0b', bg: '#fffbeb', icon: '⚠️', desc: `${child.name || 'Your child'} would benefit from a bit more practice and support.` };
            return { label: 'Seek Support', color: '#ef4444', bg: '#fef2f2', icon: '🔴', desc: `${child.name || 'Your child'} may benefit from a specialist check-up. Please speak to your doctor.` };
          })();

          const avgScore = results.length > 0 ? results.reduce((s, r) => s + r.score, 0) / results.length : 0;
          const avgRt = results.reduce((s, r) => s + (r.telemetry?.avgResponseTime ?? 1500), 0) / (results.length || 1);

          const behaviorCards = results.length === 0
            ? [
                { icon: '⚡', label: 'Reaction Speed', value: '—', color: '#94a3b8' },
                { icon: '🎯', label: 'Accuracy', value: '—', color: '#94a3b8' },
                { icon: '⏳', label: 'Attention', value: '—', color: '#94a3b8' },
                { icon: '🎮', label: 'Engagement Level', value: '—', color: '#94a3b8' },
              ]
            : [
                {
                  icon: '⚡', label: 'Reaction Speed',
                  value: avgRt < 900 ? 'Fast' : avgRt < 1600 ? 'Good' : 'Developing',
                  color: avgRt < 900 ? '#22c55e' : avgRt < 1600 ? '#3b82f6' : '#f59e0b',
                },
                {
                  icon: '🎯', label: 'Accuracy',
                  value: avgScore >= 72 ? 'High' : avgScore >= 48 ? 'Good' : 'Developing',
                  color: avgScore >= 72 ? '#22c55e' : avgScore >= 48 ? '#3b82f6' : '#f59e0b',
                },
                {
                  icon: '⏳', label: 'Attention',
                  value: scores.attention >= 70 ? 'Consistent' : scores.attention >= 45 ? 'Sometimes' : 'Variable',
                  color: scores.attention >= 70 ? '#22c55e' : scores.attention >= 45 ? '#3b82f6' : '#f59e0b',
                },
                {
                  icon: '🎮', label: 'Engagement Level',
                  value: scores.social >= 70 ? 'Great' : scores.social >= 45 ? 'Good' : 'Could Be Higher',
                  color: scores.social >= 70 ? '#22c55e' : scores.social >= 45 ? '#3b82f6' : '#f59e0b',
                },
              ];

          const recommendations = ceciAnalysis?.riskBand === 'red'
            ? ['Follow up if performance remains inconsistent', 'Speak with your paediatrician about these results', 'Reduce distractions during play sessions', 'Keep a daily activity journal']
            : ceciAnalysis?.riskBand === 'amber'
            ? ['Ensure a distraction-free environment', 'Observe attention levels during activities', 'Practice the challenging games more often', 'Reward effort, not just correct answers']
            : ['Encourage regular short play sessions', 'Try different game types to keep it fun', 'Celebrate every small achievement!', 'Keep screen time balanced and playful'];

          const recIcons = ['🕐', '🔊', '👁', '💗'];

          // Progress chart data — combine previous sessions + current
          const chartSessions = [
            ...prevSessions.map(s => Math.round(s.sessionAccuracy * 100)),
            ...(results.length > 0 ? [Math.round(avgScore)] : []),
          ].slice(-8);

          const chartW = 280, chartH = 100, chartPad = 10;
          const chartPoints = chartSessions.map((v, i) => ({
            x: chartPad + (i / Math.max(chartSessions.length - 1, 1)) * (chartW - 2 * chartPad),
            y: chartPad + (1 - v / 100) * (chartH - 2 * chartPad),
          }));
          const linePath = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          const areaPath = chartPoints.length > 0
            ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} ${chartH - chartPad} L ${chartPoints[0].x} ${chartH - chartPad} Z`
            : '';

          const recentResults = [...results].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
          const toStars = (score: number) => Math.max(1, Math.round(score / 20));
          const lastSession = sessionHistory.length > 0
            ? new Date(Math.max(...sessionHistory.map(s => s.date))).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
            : 'No sessions yet';

          return (
            <div className="container mx-auto px-4 py-8 max-w-4xl animate-pop-in">
              {/* Header card */}
              <div className="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-100 p-6 mb-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-4xl shrink-0">
                      {child.sex === 'female' ? '👧' : '👦'}
                    </div>
                    <div>
                      <h1 className="text-2xl font-black text-slate-800">{child.name || 'Your Child'}</h1>
                      <p className="text-slate-500 font-bold">Age {child.age || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-5 py-3 rounded-full font-black text-white text-lg shadow-md" style={{ backgroundColor: statusInfo.color }}>
                    {statusInfo.icon} {statusInfo.label}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100">
                  {[
                    { icon: '📅', label: 'Last session', value: lastSession },
                    { icon: '🎮', label: 'Total sessions', value: totalSessions.toString() },
                    { icon: '⏱', label: 'Games played', value: results.length.toString() },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <div className="text-xl mb-1">{s.icon}</div>
                      <div className="text-slate-400 text-xs font-bold">{s.label}</div>
                      <div className="text-slate-800 font-black text-lg">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* LEFT column */}
                <div className="space-y-6">
                  {/* Development Status */}
                  <div className="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-100 p-6">
                    <h2 className="text-lg font-black text-slate-800 mb-3">Development Status</h2>
                    <div className="flex items-center gap-2 px-4 py-3 rounded-full font-black text-white text-base mb-3" style={{ backgroundColor: statusInfo.color }}>
                      {statusInfo.icon} {statusInfo.label}
                    </div>
                    <p className="text-slate-600 font-bold text-sm leading-relaxed">{statusInfo.desc}</p>
                  </div>

                  {/* Progress Over Time */}
                  <div className="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-100 p-6">
                    <h2 className="text-lg font-black text-slate-800 mb-3">Progress Over Time</h2>
                    {chartSessions.length < 2 ? (
                      <div className="text-center py-6 text-slate-400 font-bold text-sm">
                        Complete more sessions to see your progress chart 📈
                      </div>
                    ) : (
                      <svg width="100%" viewBox={`0 0 ${chartW} ${chartH + 20}`}>
                        <defs>
                          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>
                        <path d={areaPath} fill="url(#chartGrad)" />
                        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {chartPoints.map((p, i) => (
                          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#6366f1" />
                        ))}
                        {chartSessions.map((_, i) => (
                          <text key={i} x={chartPad + (i / Math.max(chartSessions.length - 1, 1)) * (chartW - 2 * chartPad)} y={chartH + 16} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="bold">{i + 1}</text>
                        ))}
                        <text x="2" y={chartPad + 4} fontSize="8" fill="#94a3b8" fontWeight="bold">High</text>
                        <text x="2" y={chartH - chartPad + 4} fontSize="8" fill="#94a3b8" fontWeight="bold">Low</text>
                        <text x={chartW / 2} y={chartH + 24} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="bold">Sessions</text>
                      </svg>
                    )}
                  </div>

                  {/* Session History */}
                  <div className="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-100 p-6">
                    <h2 className="text-lg font-black text-slate-800 mb-4">Session History</h2>
                    {recentResults.length === 0 ? (
                      <p className="text-slate-400 font-bold text-sm text-center py-4">No games played yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {recentResults.map((r, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span className="text-slate-400 font-bold text-xs w-14">
                              {new Date(r.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                            <span className="text-slate-700 font-black text-sm flex-1 ml-2">{gameNames[r.gameId] || r.gameId}</span>
                            <span className="text-lg tracking-tight">
                              {Array.from({ length: 5 }, (_, si) => (
                                <span key={si} style={{ color: si < toStars(r.score) ? '#facc15' : '#e2e8f0' }}>★</span>
                              ))}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Privacy & Safety */}
                  <div className="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-100 p-6">
                    <h2 className="text-lg font-black text-slate-800 mb-4">Privacy & Safety</h2>
                    {['Data is securely stored.', 'No data shared without your permission.'].map(t => (
                      <div key={t} className="flex items-center gap-3 mb-2">
                        <span className="text-green-500 font-black">✓</span>
                        <span className="text-slate-600 font-bold text-sm">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RIGHT column */}
                <div className="space-y-6">
                  {/* Behavior Insights */}
                  <div className="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-100 p-6">
                    <h2 className="text-lg font-black text-slate-800 mb-4">Behaviour Insights</h2>
                    <div className="space-y-3">
                      {behaviorCards.map(card => (
                        <div key={card.label} className="flex items-center gap-3 bg-slate-50 rounded-2xl p-4">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: card.color + '22' }}>
                            {card.icon}
                          </div>
                          <div className="flex-1">
                            <div className="text-slate-700 font-black text-sm">{card.label}</div>
                            <div className="font-black text-sm" style={{ color: card.color }}>{card.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations — only after games played */}
                  {results.length > 0 && ceciAnalysis && (
                    <div className="bg-white rounded-[2.5rem] shadow-xl border-2 border-slate-100 p-6">
                      <h2 className="text-lg font-black text-slate-800 mb-4">Recommendations</h2>
                      <div className="space-y-3">
                        {recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 bg-slate-100">{recIcons[i]}</div>
                            <p className="text-slate-600 font-bold text-sm leading-snug pt-1">{rec}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Play games CTA */}
                  <button
                    onClick={() => navigateTo('assessment')}
                    className="w-full bg-[#FF9F1C] text-white py-5 rounded-[2rem] font-black text-xl kids-button-shadow hover:scale-105 transition-all"
                  >
                    🎮 Play Discovery Games
                  </button>

                  {/* Weekly Report */}
                  <button
                    onClick={handleSendWeeklyReport}
                    className="w-full bg-blue-500 text-white py-4 rounded-[2rem] font-black text-base hover:bg-blue-600 transition-all"
                  >
                    📧 Send Weekly Report
                  </button>

                  {/* Link to Doctor */}
                  <div className="bg-white rounded-[2rem] border-2 border-slate-100 p-4 shadow">
                    <p className="text-slate-700 font-black text-sm mb-2">🩺 Link to Doctor</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={doctorIdInput}
                        onChange={e => { setDoctorIdInput(e.target.value); setDoctorLinkError(''); }}
                        placeholder="Enter doctor's professional ID"
                        className="flex-1 px-4 py-3 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-purple-300 outline-none font-semibold text-gray-700 text-sm"
                      />
                      <button
                        onClick={handleFindAndLinkDoctor}
                        disabled={doctorLinkLoading}
                        className="bg-green-500 text-white px-4 py-3 rounded-2xl font-black text-sm hover:bg-green-600 disabled:opacity-60"
                      >
                        {doctorLinkLoading ? '...' : 'Link'}
                      </button>
                    </div>
                    {doctorLinkError && <p className="text-red-500 text-xs font-bold mt-1">{doctorLinkError}</p>}
                  </div>

                  {/* Update Profile */}
                  <button
                    onClick={() => navigateTo('onboarding-child')}
                    className="w-full bg-purple-100 text-purple-700 py-4 rounded-[2rem] font-black text-base hover:bg-purple-200 transition-all"
                  >
                    ⚙️ Update Profile
                  </button>

                  {/* Sign Out */}
                  <button
                    onClick={handleSignOut}
                    className="w-full bg-gray-100 text-gray-500 py-3 rounded-[2rem] font-black text-sm hover:bg-gray-200 transition-all"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          );
        }

        // ── DOCTOR / TECHNICAL DASHBOARD ──────────────────────────────────
        const centerX = 200;
        const centerY = 200;
        const radius = 130;
        const getPoint = (val: number, angle: number) => {
          const r = (Math.max(5, val) / 100) * radius;
          return {
            x: centerX + r * Math.sin((angle * Math.PI) / 180),
            y: centerY - r * Math.cos((angle * Math.PI) / 180),
          };
        };

        const radarPoints = [
          getPoint(scores.cognitive, 0),
          getPoint(scores.social, 90),
          getPoint(scores.language, 180),
          getPoint(scores.attention, 270),
        ];

        const radarPath = radarPoints.map(p => `${p.x},${p.y}`).join(' ');

        return (
          <div className="container mx-auto px-6 py-10 max-w-7xl animate-pop-in">
            <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-center md:text-left">
                <h1 className="text-5xl font-black text-slate-800 mb-2">
                  {role === 'doctor' ? 'Clinical Dashboard' : 'Development Report'}
                </h1>
                <p className="text-slate-500 font-bold text-2xl">
                  {role === 'doctor' ? `Patient: ${child.name || 'Anonymous'}` : `Tracking ${child.name || 'your child'}'s progress`}
                </p>
              </div>
              <div className="flex gap-4">
                {role === 'parent' && (
                  <button
                    onClick={() => navigateTo('onboarding-child')}
                    className="bg-purple-600 text-white px-10 py-4 rounded-[2rem] font-black text-xl hover:bg-purple-500 transition-all kids-button-shadow"
                  >
                    ⚙️ Update Profile
                  </button>
                )}
                {role === 'doctor' && (
                  <div className="bg-emerald-100 text-emerald-700 px-6 py-3 rounded-2xl font-black flex items-center gap-2 border-2 border-emerald-200">
                    <span className="animate-pulse">●</span> LIVE CLINICAL MODE
                  </div>
                )}
              </div>
            </header>

            {/* High-Risk Alert Banner (paper: alert systems in Visualization Layer) */}
            {results.length > 0 && ceciAnalysis?.riskBand === 'red' && (
              <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-6 mb-8 flex items-center gap-5">
                <span className="text-4xl">🚨</span>
                <div>
                  <p className="text-red-800 font-black text-xl">High Risk Alert — Specialist Referral Recommended</p>
                  <p className="text-red-600 font-bold text-sm mt-1">CECI score indicates persistent cognitive difficulty patterns. A comprehensive clinical assessment is strongly recommended.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Sidebar: Patient Vitals */}
              <div className="lg:col-span-4 space-y-6">
                {/* Session History Summary (longitudinal monitoring per paper) */}
                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-6 rounded-[2.5rem] shadow-xl text-white">
                  <p className="text-purple-200 font-black text-xs uppercase tracking-widest mb-1">Longitudinal Monitoring</p>
                  <div className="flex items-end gap-3">
                    <span className="text-5xl font-black">{totalSessions}</span>
                    <span className="text-purple-200 font-bold text-lg mb-1">Session{totalSessions !== 1 ? 's' : ''} Recorded</span>
                  </div>
                  {totalSessions === 0 && (
                    <p className="text-purple-300 text-xs font-bold mt-2">No games played yet — play assessment games to start tracking</p>
                  )}
                  {totalSessions === 1 && (
                    <p className="text-purple-300 text-xs font-bold mt-2">Play games in another visit to enable cross-session Var(Acc) analysis</p>
                  )}
                  {totalSessions >= 2 && (
                    <p className="text-purple-300 text-xs font-bold mt-2">Multi-session CECI active — Var(Acc) computed across {totalSessions} sessions</p>
                  )}
                </div>

                <div className="bg-white p-8 rounded-[3rem] shadow-xl border-2 border-slate-100">
                  <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                    <span className="text-2xl">👤</span> Child Profile
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Age', value: `${child.age} yrs`, icon: '🎂', color: 'text-blue-500' },
                      { label: 'Sex', value: child.sex ? (child.sex === 'male' ? 'Boy' : child.sex === 'female' ? 'Girl' : 'Other') : 'N/A', icon: child.sex === 'male' ? '👦' : child.sex === 'female' ? '👧' : '⚧', color: 'text-purple-500' },
                      { label: 'Birth', value: child.isPremature ? `Premature (${child.gestationalAgeWeeks || '?'} wks)` : child.isPremature === false ? 'Full-term' : 'Not specified', icon: '🏥', color: child.isPremature ? 'text-orange-500' : 'text-green-500' },
                      { label: 'Family History', value: child.familyHistoryOfDD ? 'ASD/ADHD/ID reported' : child.familyHistoryOfDD === false ? 'None reported' : 'Not specified', icon: '🧬', color: child.familyHistoryOfDD ? 'text-red-500' : 'text-slate-500' },
                      ...(child.knownConditions ? [{ label: 'Conditions', value: child.knownConditions, icon: '📋', color: 'text-amber-600' }] : []),
                    ].map((stat, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-3">
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xl">{stat.icon}</span>
                          <span className="text-sm font-black text-slate-400 uppercase">{stat.label}</span>
                        </div>
                        <span className={`text-sm font-black ${stat.color} text-right`}>{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {role === 'doctor' && (
                  <div className="bg-white p-8 rounded-[3rem] shadow-xl border-2 border-slate-100">
                    <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                      <span>📒</span> Parent Observations
                    </h3>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {child.observations.length === 0 ? (
                        <p className="text-slate-400 font-bold italic text-center py-4">No diary entries available.</p>
                      ) : (
                        child.observations.map(obs => (
                          <div key={obs.id} className="bg-slate-50 p-5 rounded-2xl border-l-8 border-orange-300 relative">
                             <div className="text-[10px] text-slate-300 font-black absolute top-2 right-4 uppercase">
                                {new Date(obs.timestamp).toLocaleDateString()}
                             </div>
                             <p className="text-slate-700 font-bold text-sm pt-2">{obs.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Main Content: Analysis & Assessment */}
              <div className="lg:col-span-8 space-y-8">
                {/* Performance Radar */}
                <div className="bg-white p-10 rounded-[4rem] shadow-xl border-2 border-slate-100">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-black text-slate-800">Developmental Performance</h2>
                    <div className="flex gap-2">
                      {Object.entries(scores).map(([key, val]) => (
                        <div key={key} className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black uppercase text-slate-500">
                          {key}: {val}%
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <svg width="350" height="350" viewBox="0 0 400 400" className="overflow-visible drop-shadow-2xl">
                      {[20, 40, 60, 80, 100].map(r => (
                        <circle key={r} cx="200" cy="200" r={(r/100) * radius} fill="none" stroke="#F1F5F9" strokeWidth="1" />
                      ))}
                      {[0, 90, 180, 270].map(a => {
                        const p = getPoint(100, a);
                        return <line key={a} x1="200" y1="200" x2={p.x} y2={p.y} stroke="#F1F5F9" strokeWidth="1" />;
                      })}
                      <polygon
                        points={radarPath}
                        fill="rgba(99, 102, 241, 0.2)"
                        stroke="#6366f1"
                        strokeWidth="4"
                        strokeLinejoin="round"
                        className="transition-all duration-1000 ease-out"
                      />
                      {radarPoints.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="5" fill="#6366f1" />
                      ))}
                      <text x="200" y="-10" textAnchor="middle" className="text-[12px] font-black fill-slate-400 uppercase">Cognitive</text>
                      <text x="360" y="200" textAnchor="start" className="text-[12px] font-black fill-slate-400 uppercase">Social</text>
                      <text x="200" y="410" textAnchor="middle" className="text-[12px] font-black fill-slate-400 uppercase">Language</text>
                      <text x="40" y="200" textAnchor="end" className="text-[12px] font-black fill-slate-400 uppercase">Attention</text>
                    </svg>
                  </div>
                </div>

                {/* Domain Assessment Indices (paper: VMI, FRI, LCI, IFI, API, ATI) */}
                <div className="bg-white p-10 rounded-[4rem] shadow-xl border-2 border-slate-100">
                  <div className="mb-8">
                    <h2 className="text-2xl font-black text-slate-800">Domain Assessment Indices</h2>
                    <p className="text-slate-400 font-bold text-sm mt-1">Neuropsychological domain scores derived from game telemetry</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {([
                      { label: 'VMI', full: 'Visual-Motor Integration', key: 'VMI' as const, bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', sub: 'text-blue-400', val: 'text-blue-900', bar: 'bg-blue-500' },
                      { label: 'FRI', full: 'Fluid Reasoning Index', key: 'FRI' as const, bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-700', sub: 'text-violet-400', val: 'text-violet-900', bar: 'bg-violet-500' },
                      { label: 'LCI', full: 'Language Comprehension', key: 'LCI' as const, bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-700', sub: 'text-emerald-400', val: 'text-emerald-900', bar: 'bg-emerald-500' },
                      { label: 'IFI', full: 'Inhibitory Function', key: 'IFI' as const, bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700', sub: 'text-orange-400', val: 'text-orange-900', bar: 'bg-orange-500' },
                      { label: 'API', full: 'Attention Processing', key: 'API' as const, bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-700', sub: 'text-rose-400', val: 'text-rose-900', bar: 'bg-rose-500' },
                      { label: 'ATI', full: 'Attention-Task Integration', key: 'ATI' as const, bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-700', sub: 'text-indigo-400', val: 'text-indigo-900', bar: 'bg-indigo-500' },
                    ] as const).map(idx => (
                      <div key={idx.label} className={`${idx.bg} p-5 rounded-3xl border ${idx.border}`}>
                        <div className={`${idx.text} font-black text-lg`}>{idx.label}</div>
                        <div className={`${idx.sub} text-[10px] font-bold uppercase tracking-wide mb-2`}>{idx.full}</div>
                        <div className={`${idx.val} font-black text-3xl mb-2`}>
                          {domainIndices[idx.key]}<span className="text-sm font-bold ml-0.5">%</span>
                        </div>
                        <div className="w-full bg-white/60 rounded-full h-1.5">
                          <div className={`${idx.bar} h-1.5 rounded-full transition-all duration-700`} style={{ width: `${domainIndices[idx.key]}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CECI Analysis */}
                <div className="bg-white p-10 rounded-[4rem] shadow-xl border-2 border-slate-100">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <span>🧠</span> CECI Screening Analysis
                      </h3>
                      <p className="text-slate-400 font-bold text-sm">
                        Child Effort-Cognition Index · {totalSessions} session{totalSessions !== 1 ? 's' : ''} recorded
                      </p>
                    </div>
                    {results.length > 0 && (
                      <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                        <div className="text-right">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Index Score</div>
                          <div className="text-3xl font-black text-slate-800">{ceciAnalysis?.ceciScore.toFixed(3) || '—'}</div>
                        </div>
                        <div
                          className="px-5 py-2 rounded-xl text-white font-black text-sm shadow-md"
                          style={{ backgroundColor: ceciAnalysis?.riskColor || '#cbd5e1' }}
                        >
                          {ceciAnalysis?.riskLabel || 'Calculating...'}
                        </div>
                      </div>
                    )}
                  </div>

                  {results.length === 0 ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-3xl text-center">
                      <p className="text-slate-500 font-black text-lg mb-2">🎮 No Games Played Yet</p>
                      <p className="text-slate-400 text-sm font-bold">Play assessment games to generate the CECI score, PID, Consistency, and Effort metrics. All values update dynamically as the child plays.</p>
                    </div>
                  ) : ceciParams.insufficientData ? (
                    <div className="bg-amber-50 border-2 border-dashed border-amber-200 p-6 rounded-3xl text-center">
                      <p className="text-amber-700 font-black text-lg mb-1">⚠️ Insufficient Data for Full Analysis</p>
                      <p className="text-amber-600 text-sm font-bold">At least 2 assessment sessions are required to calculate cross-session Var(Acc) and effort metrics per the CECI model. Complete more games and revisit.</p>
                    </div>
                  ) : ceciAnalysis ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      {[
                        { label: 'PID', value: ceciAnalysis.components.pid.value, color: 'blue', interpretation: ceciAnalysis.components.pid.interpretation },
                        { label: 'Consistency', value: ceciAnalysis.components.consistency.value, color: 'emerald', interpretation: ceciAnalysis.components.consistency.interpretation },
                        { label: 'Effort', value: ceciAnalysis.components.effort.value, color: 'orange', interpretation: ceciAnalysis.components.effort.interpretation }
                      ].map((comp, i) => (
                        <div key={i} className={`bg-${comp.color}-50 p-6 rounded-3xl border border-${comp.color}-100`}>
                          <div className={`text-${comp.color}-700 font-black uppercase text-[10px] tracking-widest mb-2`}>{comp.label}</div>
                          <div className={`text-2xl font-black text-${comp.color}-900 mb-1`}>{(comp.value * 100).toFixed(1)}%</div>
                          <p className={`text-${comp.color}-600 text-[10px] font-bold leading-tight`}>{comp.interpretation}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-slate-400 font-bold italic">Calculating metrics...</div>
                  )}

                  {/* 3-Way Classification Indicators */}
                  {results.length > 0 && ceciAnalysis && !ceciParams.insufficientData && (
                    <div className="mb-6">
                      <h4 className="text-sm font-black text-slate-700 mb-3 uppercase tracking-wide">Classification Indicators</h4>
                      <div className="space-y-3">
                        {[
                          { label: 'Cognitive Risk Score', value: Math.round(ceciAnalysis.components.pid.value * 100), color: '#EF4444', bg: '#FEF2F2' },
                          { label: 'Emotional Variability', value: 0, color: '#F59E0B', bg: '#FFFBEB' },
                          { label: 'Effort Variability', value: Math.round(ceciAnalysis.components.effort.value * 100), color: '#EAB308', bg: '#FEFCE8' },
                        ].map(ind => (
                          <div key={ind.label} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-600 w-36 text-right">{ind.label}</span>
                            <div className="flex-1 h-3 rounded-full bg-slate-100">
                              <div className="h-3 rounded-full transition-all duration-500" style={{ width: `${ind.value}%`, backgroundColor: ind.color }} />
                            </div>
                            <span className="text-xs font-black w-10" style={{ color: ind.color }}>{ind.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.length > 0 && (
                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                      <h4 className="text-sm font-black text-slate-800 mb-2 flex items-center gap-2">
                        <span>📋</span> Clinical Interpretation Note
                      </h4>
                      <p className="text-slate-600 font-bold text-sm leading-relaxed italic">
                        "{ceciAnalysis?.clinicalNote || 'Calculating...'}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Official Assessment Form - DOCTOR ONLY */}
                {role === 'doctor' && (
                  <div className="bg-slate-800 p-10 rounded-[4rem] shadow-2xl text-white">
                    <h4 className="font-black text-2xl mb-8 flex items-center gap-3">
                      <span className="bg-white/10 p-3 rounded-2xl">🩺</span> Official Clinical Assessment
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Examiner Name</label>
                        <input
                          type="text"
                          className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 outline-none font-bold text-white focus:border-emerald-400 transition-all"
                          value={doctorForm.examinerName}
                          onChange={e => setDoctorForm({...doctorForm, examinerName: e.target.value})}
                          placeholder="Dr. Name"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Case Number</label>
                        <input
                          type="text"
                          className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 outline-none font-bold text-white focus:border-emerald-400 transition-all"
                          value={doctorForm.caseNo}
                          onChange={e => setDoctorForm({...doctorForm, caseNo: e.target.value})}
                        />
                      </div>
                      <div className="col-span-full">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Referral Source & Complaints</label>
                        <input
                          type="text"
                          className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 outline-none font-bold text-white focus:border-emerald-400 transition-all mb-4"
                          value={doctorForm.referralSource}
                          onChange={e => setDoctorForm({...doctorForm, referralSource: e.target.value})}
                          placeholder="Who referred the child?"
                        />
                        <textarea
                          className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 outline-none font-bold text-white focus:border-emerald-400 transition-all"
                          value={doctorForm.presentingComplaints}
                          onChange={e => setDoctorForm({...doctorForm, presentingComplaints: e.target.value})}
                          placeholder="Presenting complaints..."
                          rows={2}
                        ></textarea>
                      </div>
                      <div className="col-span-full">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Behavioral Observations</label>
                        <textarea
                          className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 outline-none font-bold text-white focus:border-emerald-400 transition-all"
                          value={doctorForm.behaviorNotes}
                          onChange={e => setDoctorForm({...doctorForm, behaviorNotes: e.target.value})}
                          placeholder="How was the child during the session?"
                          rows={2}
                        ></textarea>
                      </div>
                      <div className="col-span-full">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Tentative Diagnosis</label>
                        <input
                          type="text"
                          className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 outline-none font-bold text-white focus:border-emerald-400 transition-all"
                          value={doctorForm.diagnosis}
                          onChange={e => setDoctorForm({...doctorForm, diagnosis: e.target.value})}
                          placeholder="Diagnosis code or description"
                        />
                      </div>
                      <div className="col-span-full">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Clinical Findings & Notes</label>
                        <textarea
                          className="w-full p-5 rounded-3xl bg-white/5 border border-white/10 outline-none min-h-[140px] font-bold text-white focus:border-emerald-400 transition-all"
                          value={doctorForm.notes}
                          onChange={e => setDoctorForm({...doctorForm, notes: e.target.value})}
                          placeholder="Detailed clinical findings..."
                        ></textarea>
                      </div>
                      <div className="col-span-full">
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-2 tracking-widest">Recommendations (one per line)</label>
                        <textarea
                          className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 outline-none font-bold text-white focus:border-emerald-400 transition-all"
                          value={doctorForm.recommendations}
                          onChange={e => setDoctorForm({...doctorForm, recommendations: e.target.value})}
                          placeholder="1. Recommendation one&#10;2. Recommendation two..."
                          rows={3}
                        ></textarea>
                      </div>
                    </div>

                    <button
                      onClick={handleDownloadReport}
                      disabled={isGeneratingPdf || !doctorForm.examinerName}
                      className="w-full bg-emerald-500 text-white py-6 rounded-[2rem] font-black text-2xl shadow-xl flex items-center justify-center gap-4 hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingPdf ? 'GENERATING PDF...' : 'SUBMIT & PRINT PDF REPORT 📄'}
                    </button>
                    {!doctorForm.examinerName && <p className="text-center text-emerald-400 text-xs font-bold mt-4">Please enter Examiner Name to enable printing</p>}
                  </div>
                )}

                {/* Parent Growth Tip - PARENT ONLY */}
                {role === 'parent' && (
                  <div className="bg-white p-10 rounded-[4rem] shadow-xl border-2 border-orange-100">
                    <p className="text-orange-700 font-black text-2xl mb-4">Daily Growth Tip 💡</p>
                    <p className="text-gray-600 font-bold text-lg leading-relaxed mb-8">
                      "Based on the results, focused language activities like reading together would be very beneficial for {child.name} this week!"
                    </p>
                    <button onClick={() => navigateTo('assessment')} className="w-full bg-[#FF9F1C] text-white py-5 rounded-[2rem] font-black text-xl kids-button-shadow">Play Discovery Games</button>
                  </div>
                )}

                {/* Session History Reset (dev / admin utility) */}
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-slate-700 font-black text-sm">Session History</p>
                    <p className="text-slate-400 text-xs font-bold mt-0.5">{prevSessions.length} previous session{prevSessions.length !== 1 ? 's' : ''} stored in browser</p>
                  </div>
                  <button
                    onClick={() => {
                      localStorage.removeItem(SESSION_STORAGE_KEY);
                      setSessionHistory([]);
                    }}
                    className="bg-red-50 text-red-600 border border-red-200 px-5 py-2.5 rounded-2xl font-black text-sm hover:bg-red-100 transition-all whitespace-nowrap"
                  >
                    Clear History
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'help': return <HelpPage role={role} />;
      case 'assessment': return <AssessmentPage profile={child} onGameComplete={handleGameComplete} />;
      default: return null;
    }
  };

  const navItems = [
    { id: 'results', label: 'Dashboard', roles: ['parent'] },
    { id: 'assessment', label: 'Play Games', roles: ['parent'] },
    { id: 'doctor-dashboard', label: 'Dashboard', roles: ['doctor'] },
    { id: 'help', label: 'Help', roles: ['parent', 'doctor'] }
  ].filter(item => {
    if (!role) return false;
    return item.roles.includes(role);
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF9E6]">
      <nav className="py-8 px-6 sticky top-0 z-50 transition-all bg-white/80 backdrop-blur-xl border-b-4 border-purple-100 shadow-xl">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-6">
            {section !== 'welcome' && (
              <button
                onClick={goBack}
                className="bg-purple-100 text-purple-700 w-14 h-14 rounded-full flex items-center justify-center text-3xl kids-shadow hover:scale-110 active:scale-95 transition-all"
              >
                ⬅️
              </button>
            )}
            <button onClick={() => { setSection('welcome'); setRole(null); setHistory([]); }} className="text-4xl font-black flex items-center gap-4 text-purple-700 hover:scale-110 transition-all group">
              <span className="text-5xl drop-shadow-md group-hover:rotate-12 transition-transform">🌟</span> KidsScreen
            </button>
          </div>

          <div className="hidden md:flex gap-2 p-1.5 bg-gray-100 rounded-full shadow-inner border border-gray-200">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id as Section)}
                className={`
                  font-black capitalize transition-all text-lg px-8 py-3 rounded-full
                  ${section === item.id || (item.id === 'welcome' && section === 'welcome') ? 'text-white bg-purple-600 shadow-lg scale-105' : 'text-gray-500 hover:text-purple-600'}
                `}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {role && (
              <button
                onClick={handleSignOut}
                className="bg-gray-100 text-gray-500 px-8 py-3 rounded-full font-black text-lg hover:bg-gray-200 transition-all shadow-sm"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {renderSection()}
      </main>

      {/* ── Parent Re-Authentication Modal ────────────────────────────── */}
      {showReAuthModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] p-10 shadow-2xl border-4 border-purple-100 w-full max-w-sm mx-4 animate-pop-in">
            <div className="text-center mb-6">
              <div className="text-6xl mb-3">🔒</div>
              <h3 className="text-2xl font-black text-purple-700">Verify Identity</h3>
              <p className="text-slate-500 font-bold text-sm mt-1">Enter your password to edit the child profile.</p>
            </div>
            <input
              type="password"
              autoFocus
              className={`w-full p-5 rounded-[2rem] bg-gray-50 border-4 outline-none text-gray-900 font-bold text-lg ${reAuthError ? 'border-red-400' : 'border-transparent focus:border-purple-300'}`}
              placeholder="Your password"
              value={reAuthInput}
              onChange={e => { setReAuthInput(e.target.value); setReAuthError(''); }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (reAuthInput === parentPassword) { setShowReAuthModal(false); navigateTo('onboarding-child'); }
                  else setReAuthError('Incorrect password. Please try again.');
                }
              }}
            />
            {reAuthError && <p className="text-red-500 text-sm font-bold mt-2 ml-2">⚠ {reAuthError}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowReAuthModal(false)}
                className="flex-1 py-4 rounded-[2rem] bg-gray-100 text-gray-600 font-black text-lg hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (reAuthInput === parentPassword) { setShowReAuthModal(false); navigateTo('onboarding-child'); }
                  else setReAuthError('Incorrect password. Please try again.');
                }}
                className="flex-1 py-4 rounded-[2rem] bg-purple-600 text-white font-black text-lg hover:bg-purple-500 transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Parent / Doctor Login Modal ─────────────────────────────────── */}
      {showParentLoginModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] p-10 shadow-2xl border-4 border-purple-100 w-full max-w-sm mx-4 animate-pop-in">
            <div className="text-center mb-6">
              <div className="text-6xl mb-3">{role === 'doctor' ? '🩺' : '🔐'}</div>
              <h3 className="text-2xl font-black text-purple-700">
                {role === 'doctor' ? 'Professional Login' : 'Parent Login'}
              </h3>
              <p className="text-slate-500 font-bold text-sm mt-1">
                Enter your credentials to access the dashboard.
              </p>
            </div>
            <div className="space-y-4">
              <input
                type="email"
                autoFocus
                className="w-full p-5 rounded-[2rem] bg-gray-50 border-4 border-transparent focus:border-purple-300 outline-none text-gray-900 font-bold text-lg"
                placeholder="Email address"
                value={loginEmail}
                onChange={e => { setLoginEmail(e.target.value); setLoginError(''); }}
              />
              <input
                type="password"
                className={`w-full p-5 rounded-[2rem] bg-gray-50 border-4 outline-none text-gray-900 font-bold text-lg ${loginError ? 'border-red-400' : 'border-transparent focus:border-purple-300'}`}
                placeholder="Password"
                value={loginPassword}
                onChange={e => { setLoginPassword(e.target.value); setLoginError(''); }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    role === 'doctor' ? handleDoctorLogin() : handleParentLogin();
                  }
                }}
              />
              {loginError && <p className="text-red-500 text-sm font-bold ml-2">⚠ {loginError}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowParentLoginModal(false); setRole(null); }}
                className="flex-1 py-4 rounded-[2rem] bg-gray-100 text-gray-600 font-black text-lg hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => role === 'doctor' ? handleDoctorLogin() : handleParentLogin()}
                className={`flex-1 py-4 rounded-[2rem] ${role === 'doctor' ? 'bg-green-500' : 'bg-purple-600'} text-white font-black text-lg transition-all`}
              >
                Login
              </button>
            </div>
            {role === 'doctor' ? (
              <p className="text-center text-slate-400 text-xs font-bold mt-4">
                New professional?{' '}
                <button
                  onClick={() => { setShowParentLoginModal(false); navigateTo('doctor-register'); }}
                  className="text-green-600 underline"
                >
                  Register here
                </button>
              </p>
            ) : (
              <p className="text-center text-slate-400 text-xs font-bold mt-4">
                New user?{' '}
                <button
                  onClick={() => { setShowParentLoginModal(false); navigateTo('onboarding-parent'); }}
                  className="text-purple-600 underline"
                >
                  Register here
                </button>
              </p>
            )}
          </div>
        </div>
      )}

      {role === 'parent' && (
        <button
          onClick={() => setIsDiaryOpen(true)}
          className="fixed bottom-10 right-10 z-[80] bg-orange-400 text-white w-20 h-20 rounded-full flex items-center justify-center text-4xl kids-button-shadow hover:scale-110 transition-all animate-bounce"
        >
          📒
        </button>
      )}

      <ObservationsDiary
        isOpen={isDiaryOpen}
        onClose={() => setIsDiaryOpen(false)}
        observations={child.observations}
        onAdd={handleAddObservation}
        childName={child.name}
      />

      {/* Hidden Report Template for PDF Generation */}
      <div style={{ display: 'none' }}>
        {ceciAnalysis && (
          <ReportTemplate
            child={child}
            parentName={parent.name}
            doctorNotes={doctorForm.notes}
            ceciAnalysis={ceciAnalysis}
            scores={scores}
            overallScore={overallScore}
            examinerName={doctorForm.examinerName}
            caseNo={doctorForm.caseNo}
            referralSource={doctorForm.referralSource}
            presentingComplaints={doctorForm.presentingComplaints}
            behaviorNotes={doctorForm.behaviorNotes}
            diagnosis={doctorForm.diagnosis}
            recommendations={doctorForm.recommendations.split('\n').filter(r => r.trim())}
            domainIndices={domainIndices}
            totalSessions={totalSessions}
          />
        )}
      </div>

      <footer className="py-20 text-center transition-all bg-white text-gray-400 border-t-8 border-purple-50">
        <div className="container mx-auto px-4">
          <p className="font-black text-5xl mb-4 text-purple-700">KidsScreen Interactive</p>
          <p className="font-bold text-2xl text-purple-300">Making growth an amazing adventure! 🚀</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
