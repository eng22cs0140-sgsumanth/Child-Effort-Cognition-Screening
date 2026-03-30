/**
 * Firebase service layer for the CECI mobile app.
 * Uses @react-native-firebase — same API surface as the web firebaseService.ts
 * so all screens stay platform-agnostic.
 *
 * SETUP: Place google-services.json in mobile/android/app/
 * Run: npx expo prebuild  (ejects to bare workflow, required for @react-native-firebase)
 */

import auth, { type FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

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
// Week-key utility (ISO week number) — same as web version
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
// Auth helpers
// ---------------------------------------------------------------------------

export const getAuth = () => auth();

export const onAuthChange = (
  callback: (user: FirebaseAuthTypes.User | null) => void
) => auth().onAuthStateChanged(callback);

export const signOut = () => auth().signOut();

export const getCurrentUser = () => auth().currentUser;

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

export async function getUserRole(uid: string): Promise<string | null> {
  const snap = await firestore().collection('users').doc(uid).get();
  return snap.exists ? (snap.data()?.role as string) ?? null : null;
}

export async function isAdmin(uid: string): Promise<boolean> {
  const snap = await firestore().collection('admin').doc(uid).get();
  return snap.exists && snap.data()?.isAdmin === true;
}

// ---------------------------------------------------------------------------
// Parent operations
// ---------------------------------------------------------------------------

export async function registerParent(
  email: string,
  password: string,
  profile: Omit<ParentProfile, 'email'>
): Promise<string> {
  const cred = await auth().createUserWithEmailAndPassword(email, password);
  const uid = cred.user.uid;

  await firestore().collection('users').doc(uid).set({
    uid,
    email,
    role: 'parent',
    displayName: profile.name,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  await firestore().collection('parents').doc(uid).set({
    uid,
    email,
    name: profile.name,
    relationship: profile.relationship,
    childIds: [],
    assignedDoctorId: null,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  return uid;
}

export async function loginParent(email: string, password: string): Promise<string> {
  const cred = await auth().signInWithEmailAndPassword(email, password);
  return cred.user.uid;
}

export async function getParentProfile(uid: string): Promise<ParentProfile | null> {
  const snap = await firestore().collection('parents').doc(uid).get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  return { name: d.name, email: d.email, relationship: d.relationship };
}

export async function updateParentProfile(uid: string, data: Partial<ParentProfile>): Promise<void> {
  await firestore().collection('parents').doc(uid).update(data);
}

// ---------------------------------------------------------------------------
// Child operations
// ---------------------------------------------------------------------------

export async function createChildProfile(
  parentUid: string,
  childData: Omit<ChildProfile, 'observations'>
): Promise<string> {
  const childRef = await firestore().collection('children').add({
    ...childData,
    observations: [],
    parentUid,
    assignedDoctorUid: null,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

  await firestore()
    .collection('parents')
    .doc(parentUid)
    .update({
      childIds: firestore.FieldValue.arrayUnion(childRef.id),
    });

  return childRef.id;
}

export async function updateChildProfile(
  childId: string,
  data: Partial<ChildProfile>
): Promise<void> {
  await firestore()
    .collection('children')
    .doc(childId)
    .update({ ...data, updatedAt: firestore.FieldValue.serverTimestamp() });
}

export async function getChildProfile(
  childId: string
): Promise<(ChildProfile & { id: string; parentUid: string; assignedDoctorUid: string | null }) | null> {
  const snap = await firestore().collection('children').doc(childId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as any;
}

export async function getChildrenForParent(
  parentUid: string
): Promise<Array<ChildProfile & { id: string }>> {
  const parentSnap = await firestore().collection('parents').doc(parentUid).get();
  if (!parentSnap.exists) return [];

  const childIds: string[] = parentSnap.data()?.childIds || [];
  const children = await Promise.all(
    childIds.map(async (id) => {
      const snap = await firestore().collection('children').doc(id).get();
      return snap.exists ? ({ id: snap.id, ...snap.data() } as any) : null;
    })
  );
  return children.filter(Boolean);
}

export async function getChildrenForDoctor(
  doctorUid: string
): Promise<Array<ChildProfile & { id: string }>> {
  const doctorSnap = await firestore().collection('doctors').doc(doctorUid).get();
  if (!doctorSnap.exists) return [];

  const childIds: string[] = doctorSnap.data()?.assignedChildIds || [];
  const children = await Promise.all(
    childIds.map(async (id) => {
      const snap = await firestore().collection('children').doc(id).get();
      return snap.exists ? ({ id: snap.id, ...snap.data() } as any) : null;
    })
  );
  return children.filter(Boolean);
}

export async function addObservationToChild(
  childId: string,
  observation: { id: string; text: string; timestamp: number }
): Promise<void> {
  await firestore()
    .collection('children')
    .doc(childId)
    .update({
      observations: firestore.FieldValue.arrayUnion(observation),
      updatedAt: firestore.FieldValue.serverTimestamp(),
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
  const sessionsRef = firestore()
    .collection('children')
    .doc(childId)
    .collection('sessions');

  const existing = await sessionsRef.where('weekKey', '==', weekKey).get();

  if (!existing.empty) {
    const sessionDoc = existing.docs[0];
    const sessionData = sessionDoc.data();
    const updatedResults = [...(sessionData.gameResults || []), result];
    const sessionAccuracy =
      updatedResults.reduce((sum: number, r: GameResult) => sum + r.score / 100, 0) /
      updatedResults.length;

    await sessionDoc.ref.update({
      gameResults: firestore.FieldValue.arrayUnion(result),
      sessionAccuracy,
      domainIndices,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } else {
    const allSessions = await sessionsRef.get();
    const sessionNumber = allSessions.size + 1;

    await sessionsRef.add({
      sessionNumber,
      weekKey,
      startedAt: firestore.FieldValue.serverTimestamp(),
      gameResults: [result],
      sessionAccuracy: result.score / 100,
      ceciScore: null,
      domainIndices,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  }
}

export async function updateSessionCECI(
  childId: string,
  weekKey: string,
  ceciScore: CECIScore
): Promise<void> {
  const sessionsRef = firestore()
    .collection('children')
    .doc(childId)
    .collection('sessions');
  const snap = await sessionsRef.where('weekKey', '==', weekKey).get();
  if (!snap.empty) {
    await snap.docs[0].ref.update({
      ceciScore,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  }
}

export async function getSessionsForChild(childId: string): Promise<AssessmentSession[]> {
  const snap = await firestore()
    .collection('children')
    .doc(childId)
    .collection('sessions')
    .get();

  return snap.docs
    .map((d) => {
      const data = d.data();
      const startedAt = data.startedAt as FirebaseFirestoreTypes.Timestamp | null;
      return {
        id: d.id,
        date: startedAt ? startedAt.toMillis() : Date.now(),
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
  const cred = await auth().createUserWithEmailAndPassword(email, password);
  const uid = cred.user.uid;

  await firestore().collection('users').doc(uid).set({
    uid,
    email,
    role: 'doctor',
    displayName: professionalData.fullName,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  await firestore().collection('doctors').doc(uid).set({
    uid,
    email,
    status: 'pending',
    rejectionReason: null,
    ...professionalData,
    assignedChildIds: [],
    createdAt: firestore.FieldValue.serverTimestamp(),
    approvedAt: null,
    approvedBy: null,
  });

  return uid;
}

export async function getDoctorProfile(uid: string): Promise<DoctorProfile | null> {
  const snap = await firestore().collection('doctors').doc(uid).get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  return {
    ...d,
    uid,
    createdAt: (d.createdAt as FirebaseFirestoreTypes.Timestamp)?.toMillis?.() ?? Date.now(),
    approvedAt: (d.approvedAt as FirebaseFirestoreTypes.Timestamp)?.toMillis?.() ?? undefined,
  } as DoctorProfile;
}

export async function getPendingDoctors(): Promise<DoctorProfile[]> {
  const snap = await firestore()
    .collection('doctors')
    .where('status', '==', 'pending')
    .get();
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as DoctorProfile));
}

export async function getApprovedDoctors(): Promise<DoctorProfile[]> {
  const snap = await firestore()
    .collection('doctors')
    .where('status', '==', 'approved')
    .get();
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as DoctorProfile));
}

export async function approveDoctor(doctorUid: string, adminUid: string): Promise<void> {
  await firestore().collection('doctors').doc(doctorUid).update({
    status: 'approved',
    approvedAt: firestore.FieldValue.serverTimestamp(),
    approvedBy: adminUid,
  });
  await firestore().collection('users').doc(doctorUid).update({ role: 'doctor' });
}

export async function rejectDoctor(doctorUid: string, reason: string): Promise<void> {
  await firestore().collection('doctors').doc(doctorUid).update({
    status: 'rejected',
    rejectionReason: reason,
  });
}

export async function findDoctorByProfessionalId(
  doctorId: string
): Promise<DoctorProfile | null> {
  const snap = await firestore()
    .collection('doctors')
    .where('doctorId', '==', doctorId)
    .where('status', '==', 'approved')
    .get();
  if (snap.empty) return null;
  return { uid: snap.docs[0].id, ...snap.docs[0].data() } as DoctorProfile;
}

export async function assignChildToDoctor(
  childId: string,
  doctorUid: string
): Promise<void> {
  await firestore()
    .collection('children')
    .doc(childId)
    .update({ assignedDoctorUid: doctorUid });
  await firestore()
    .collection('doctors')
    .doc(doctorUid)
    .update({ assignedChildIds: firestore.FieldValue.arrayUnion(childId) });
}

export async function loginDoctor(email: string, password: string): Promise<string> {
  const cred = await auth().signInWithEmailAndPassword(email, password);
  return cred.user.uid;
}
