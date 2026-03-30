/**
 * Firebase service layer for the CECI web app.
 * All Firestore and Auth operations go through here — no direct firebase calls in components.
 *
 * SETUP: Replace the firebaseConfig below with your actual Firebase project config.
 * Get it from: Firebase Console → Project Settings → Your Apps → Web App → SDK setup
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  collection,
  query,
  where,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import type {
  ParentProfile,
  ChildProfile,
  DoctorProfile,
  GameResult,
  AssessmentSession,
  DomainIndices,
  CECIScore,
} from '../types';

// ---------------------------------------------------------------------------
// Firebase config — replace with real values from Firebase Console
// ---------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Prevent re-initialization during hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export const onAuthChange = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);

export const signOut = () => firebaseSignOut(auth);

// ---------------------------------------------------------------------------
// Week-key utility (ISO week number)
// ---------------------------------------------------------------------------
export function getWeekKey(ts: number): string {
  const d = new Date(ts);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    (((d.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getDay() + 1) / 7
  );
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

export async function getUserRole(uid: string): Promise<string | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data().role as string) : null;
}

export async function isAdmin(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'admin', uid));
  return snap.exists() && snap.data().isAdmin === true;
}

// ---------------------------------------------------------------------------
// Parent operations
// ---------------------------------------------------------------------------

export async function registerParent(
  email: string,
  password: string,
  profile: Omit<ParentProfile, 'email'>
): Promise<string> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    role: 'parent',
    displayName: profile.name,
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'parents', uid), {
    uid,
    email,
    name: profile.name,
    relationship: profile.relationship,
    childIds: [],
    assignedDoctorId: null,
    createdAt: serverTimestamp(),
  });

  return uid;
}

export async function loginParent(email: string, password: string): Promise<string> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user.uid;
}

export async function getParentProfile(uid: string): Promise<ParentProfile | null> {
  const snap = await getDoc(doc(db, 'parents', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return { name: d.name, email: d.email, relationship: d.relationship };
}

export async function updateParentProfile(uid: string, data: Partial<ParentProfile>): Promise<void> {
  await updateDoc(doc(db, 'parents', uid), data);
}

// ---------------------------------------------------------------------------
// Child operations
// ---------------------------------------------------------------------------

export async function createChildProfile(
  parentUid: string,
  childData: Omit<ChildProfile, 'observations'>
): Promise<string> {
  const childRef = await addDoc(collection(db, 'children'), {
    ...childData,
    observations: [],
    parentUid,
    assignedDoctorUid: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Link child to parent
  await updateDoc(doc(db, 'parents', parentUid), {
    childIds: arrayUnion(childRef.id),
  });

  return childRef.id;
}

export async function updateChildProfile(
  childId: string,
  data: Partial<ChildProfile>
): Promise<void> {
  await updateDoc(doc(db, 'children', childId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function getChildProfile(childId: string): Promise<(ChildProfile & { id: string; parentUid: string; assignedDoctorUid: string | null }) | null> {
  const snap = await getDoc(doc(db, 'children', childId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as any;
}

export async function getChildrenForParent(
  parentUid: string
): Promise<Array<ChildProfile & { id: string }>> {
  const parentSnap = await getDoc(doc(db, 'parents', parentUid));
  if (!parentSnap.exists()) return [];

  const childIds: string[] = parentSnap.data().childIds || [];
  const children = await Promise.all(
    childIds.map(async (id) => {
      const snap = await getDoc(doc(db, 'children', id));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as any) : null;
    })
  );
  return children.filter(Boolean);
}

export async function getChildrenForDoctor(
  doctorUid: string
): Promise<Array<ChildProfile & { id: string }>> {
  const doctorSnap = await getDoc(doc(db, 'doctors', doctorUid));
  if (!doctorSnap.exists()) return [];

  const childIds: string[] = doctorSnap.data().assignedChildIds || [];
  const children = await Promise.all(
    childIds.map(async (id) => {
      const snap = await getDoc(doc(db, 'children', id));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as any) : null;
    })
  );
  return children.filter(Boolean);
}

export async function addObservationToChild(
  childId: string,
  observation: { id: string; text: string; timestamp: number }
): Promise<void> {
  await updateDoc(doc(db, 'children', childId), {
    observations: arrayUnion(observation),
    updatedAt: serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Session / game result operations
// ---------------------------------------------------------------------------

export async function saveGameResult(
  childId: string,
  result: GameResult,
  domainIndices: DomainIndices
): Promise<void> {
  const weekKey = getWeekKey(result.timestamp);
  const sessionsRef = collection(db, 'children', childId, 'sessions');

  // Find existing session for this week
  const q = query(sessionsRef, where('weekKey', '==', weekKey));
  const existing = await getDocs(q);

  if (!existing.empty) {
    // Update existing session
    const sessionDoc = existing.docs[0];
    const sessionData = sessionDoc.data();
    const updatedResults = [...(sessionData.gameResults || []), result];
    const sessionAccuracy =
      updatedResults.reduce((sum: number, r: GameResult) => sum + r.score / 100, 0) /
      updatedResults.length;

    await updateDoc(sessionDoc.ref, {
      gameResults: arrayUnion(result),
      sessionAccuracy,
      domainIndices,
      updatedAt: serverTimestamp(),
    });
  } else {
    // Get current session count to assign a session number
    const allSessions = await getDocs(sessionsRef);
    const sessionNumber = allSessions.size + 1;

    await addDoc(sessionsRef, {
      sessionNumber,
      weekKey,
      startedAt: serverTimestamp(),
      gameResults: [result],
      sessionAccuracy: result.score / 100,
      ceciScore: null,
      domainIndices,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function updateSessionCECI(
  childId: string,
  weekKey: string,
  ceciScore: CECIScore
): Promise<void> {
  const sessionsRef = collection(db, 'children', childId, 'sessions');
  const q = query(sessionsRef, where('weekKey', '==', weekKey));
  const snap = await getDocs(q);
  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, { ceciScore, updatedAt: serverTimestamp() });
  }
}

export async function getSessionsForChild(childId: string): Promise<AssessmentSession[]> {
  const snap = await getDocs(collection(db, 'children', childId, 'sessions'));
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        date: data.startedAt instanceof Timestamp ? data.startedAt.toMillis() : Date.now(),
        results: data.gameResults || [],
        sessionAccuracy: data.sessionAccuracy || 0,
        sessionNumber: data.sessionNumber,
        weekKey: data.weekKey,
      } as AssessmentSession;
    })
    .sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0));
}

// ---------------------------------------------------------------------------
// Doctor operations
// ---------------------------------------------------------------------------

export async function registerDoctor(
  email: string,
  password: string,
  professionalData: Omit<DoctorProfile, 'uid' | 'email' | 'status' | 'assignedChildIds' | 'createdAt' | 'approvedAt' | 'approvedBy'>
): Promise<string> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    role: 'doctor',
    displayName: professionalData.fullName,
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, 'doctors', uid), {
    uid,
    email,
    status: 'pending',
    rejectionReason: null,
    ...professionalData,
    assignedChildIds: [],
    createdAt: serverTimestamp(),
    approvedAt: null,
    approvedBy: null,
  });

  return uid;
}

export async function getDoctorProfile(uid: string): Promise<DoctorProfile | null> {
  const snap = await getDoc(doc(db, 'doctors', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    ...d,
    uid,
    createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : Date.now(),
    approvedAt: d.approvedAt instanceof Timestamp ? d.approvedAt.toMillis() : undefined,
  } as DoctorProfile;
}

export async function getPendingDoctors(): Promise<DoctorProfile[]> {
  const q = query(collection(db, 'doctors'), where('status', '==', 'pending'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as DoctorProfile));
}

export async function getApprovedDoctors(): Promise<DoctorProfile[]> {
  const q = query(collection(db, 'doctors'), where('status', '==', 'approved'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as DoctorProfile));
}

export async function approveDoctor(doctorUid: string, adminUid: string): Promise<void> {
  await updateDoc(doc(db, 'doctors', doctorUid), {
    status: 'approved',
    approvedAt: serverTimestamp(),
    approvedBy: adminUid,
  });
  await updateDoc(doc(db, 'users', doctorUid), { role: 'doctor' });
}

export async function rejectDoctor(doctorUid: string, reason: string): Promise<void> {
  await updateDoc(doc(db, 'doctors', doctorUid), {
    status: 'rejected',
    rejectionReason: reason,
  });
}

export async function findDoctorByProfessionalId(doctorId: string): Promise<DoctorProfile | null> {
  const q = query(
    collection(db, 'doctors'),
    where('doctorId', '==', doctorId),
    where('status', '==', 'approved')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { uid: snap.docs[0].id, ...snap.docs[0].data() } as DoctorProfile;
}

export async function assignChildToDoctor(childId: string, doctorUid: string): Promise<void> {
  await updateDoc(doc(db, 'children', childId), { assignedDoctorUid: doctorUid });
  await updateDoc(doc(db, 'doctors', doctorUid), {
    assignedChildIds: arrayUnion(childId),
  });
}

export async function loginDoctor(email: string, password: string): Promise<string> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user.uid;
}
