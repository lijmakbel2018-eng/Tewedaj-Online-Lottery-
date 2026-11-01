import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, setDoc, doc, collection, onSnapshot, getDoc, getDocs } from 'firebase/firestore';

import firebaseConfig from '../../firebase-applet-config.json';

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

let clientQuotaExceededUntil = 0;

export function isClientQuotaActive(): boolean {
  return Date.now() > clientQuotaExceededUntil;
}

export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) return null as any;
  if (data === null || typeof data !== 'object') return data;
  if (data instanceof Date) return data.toISOString() as any;
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as any;
  }
  const clean: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  
  const msg = String(errInfo.error).toLowerCase();
  const code = String((error as any)?.code || '').toLowerCase();
  if (code.includes('resource-exhausted') || msg.includes('resource-exhausted') || msg.includes('quota exceeded')) {
    clientQuotaExceededUntil = Date.now() + 30 * 1000;
    console.warn(`[Client Firestore Guard] Quota limit in ${operationType} on ${path}. Throttling for 30s.`);
    return;
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return;
}

export async function safeFirestoreSetDoc(docRef: any, data: any, options?: any) {
  try {
    if (!isClientQuotaActive()) {
      console.warn(`[safeFirestoreSetDoc] Skipped due to active quota throttle on ${docRef.path}`);
      return false;
    }
    const cleanData = sanitizeForFirestore(data);
    await setDoc(docRef, cleanData, options || { merge: true });
    return true;
  } catch (err: any) {
    handleFirestoreError(err, OperationType.WRITE, docRef.path);
    return false;
  }
}

export interface ActivityEvent {
  id: string;
  type: 'ticket_cut' | 'deposit_request' | 'deposit_approved' | 'withdrawal_request' | 'withdrawal_approved' | 'user_registered' | 'draw_winner' | 'general';
  titleAm: string;
  titleEn: string;
  descriptionAm: string;
  descriptionEn: string;
  userPhone?: string;
  userName?: string;
  amount?: number;
  ticketNumber?: string;
  lotteryTitle?: string;
  timestamp: string;
}

export interface LotteryKeriEtsa {
  lotteryId: string;
  titleAm: string;
  ticketPrice: number;
  jackpotAmount: number;
  totalInventory: number; // 150 for derash
  ticketsSold: number;
  keriEtsa: number; // Remaining tickets out of 150
  round: number;
  buyersCount: number;
}

export interface DashboardOverviewData {
  totalTicketsSold: number;
  ticketsCutCount: number;
  activeTicketsCount: number;
  uniqueBuyersCount: number;
  uniqueBuyers: Array<{ phone: string; name: string; ticketsCount: number; totalSpent: number }>;
  keriEtsaSummary: Record<string, LotteryKeriEtsa>;
  totalDepositedAmount: number; // ጠቅላላ ገቢ (Gebi)
  totalWithdrawnAmount: number; // ጠቅላላ ወጪ (Wechi)
  pendingDepositsCount: number;
  pendingWithdrawalsCount: number;
  totalRegisteredUsers: number;
  lastUpdated: string;
  lastActivityDescriptionAm: string;
  lastActivityDescriptionEn: string;
  recentActivities: ActivityEvent[];
}

/**
 * Record a permanent activity event in Firestore
 * Never overwritten or deleted
 */
export async function recordDashboardActivity(activity: ActivityEvent) {
  try {
    const cleanActivity = sanitizeForFirestore(activity);
    
    // 1. Save to individual activity log document in permanent collection
    const activityDocRef = doc(db, 'dashboard_activities', cleanActivity.id);
    await safeFirestoreSetDoc(activityDocRef, cleanActivity);

    // 2. Also write under 'dashboard/activities' document
    const dashActivitiesRef = doc(db, 'dashboard', 'activities');
    const existingDoc = await getDoc(dashActivitiesRef);
    let activitiesList: ActivityEvent[] = [];
    if (existingDoc.exists()) {
      const data = existingDoc.data();
      if (Array.isArray(data?.list)) {
        activitiesList = data.list;
      }
    }
    activitiesList.unshift(cleanActivity);
    if (activitiesList.length > 200) activitiesList = activitiesList.slice(0, 200);

    await safeFirestoreSetDoc(dashActivitiesRef, {
      list: activitiesList,
      lastUpdated: new Date().toISOString(),
      latestEvent: cleanActivity,
    });
  } catch (err) {
    console.warn('[recordDashboardActivity Error]', err);
  }
}

/**
 * Real-time listener for the dashboard overview in Firestore
 */
export function subscribeToDashboard(callback: (data: Partial<DashboardOverviewData>) => void) {
  try {
    const docRef = doc(db, 'dashboard', 'overview');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data() as any);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'dashboard/overview');
    });
  } catch (err) {
    console.warn('[subscribeToDashboard Error]', err);
    return () => {};
  }
}

/**
 * Real-time listener for keri etsa (remaining chances) in Firestore
 * Updated to use consolidated dashboard/overview document
 */
export function subscribeToKeriEtsa(callback: (summary: Record<string, LotteryKeriEtsa>) => void) {
  try {
    const unsub1 = onSnapshot(doc(db, 'dashboard', 'overview'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data?.keriEtsaSummary) {
          callback(data.keriEtsaSummary);
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'dashboard/overview');
    });

    // REMOVED: Collection listener for 'keri_etsa' to save read quota.
    // We now rely solely on the consolidated 'dashboard/overview' document.
    return () => {
      unsub1();
    };
  } catch (err) {
    console.warn('[subscribeToKeriEtsa Error]', err);
    return () => {};
  }
}

/**
 * Real-time listener for locked lotteries in Firestore
 */
export function subscribeToLotteryLocks(callback: (lockedIds: string[]) => void) {
  try {
    const docRef = doc(db, 'system_settings', 'lottery_locks');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.lockedLotteryIds)) {
          callback(data.lockedLotteryIds);
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'system_settings/lottery_locks');
    });
  } catch (err) {
    console.warn('[subscribeToLotteryLocks Error]', err);
    return () => {};
  }
}

/**
 * Save lottery lock status to Firestore
 */
export async function setFirestoreLotteryLock(lotteryId: string, isLocked: boolean, currentLocked: string[]): Promise<string[]> {
  try {
    let nextLocked = [...currentLocked];
    if (isLocked) {
      if (!nextLocked.includes(lotteryId)) {
        nextLocked.push(lotteryId);
      }
    } else {
      nextLocked = nextLocked.filter(id => id !== lotteryId);
    }
    const docRef = doc(db, 'system_settings', 'lottery_locks');
    await safeFirestoreSetDoc(docRef, {
      lockedLotteryIds: nextLocked,
      lastUpdated: new Date().toISOString()
    });
    return nextLocked;
  } catch (err) {
    console.warn('[setFirestoreLotteryLock Error]', err);
    return currentLocked;
  }
}

// MANDATORY connection test for AI Studio
import { getDocFromServer } from 'firebase/firestore';

async function testFirestoreConnection() {
  try {
    // Attempting to read a dummy document to verify connectivity
    await getDocFromServer(doc(db, 'system_settings', 'connection_test'));
    console.log('[Firebase] Firestore connection verified.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("[Firebase] Please check your Firebase configuration: Client is offline.");
    } else {
      console.warn("[Firebase] Initial connection check failed (expected if DB is empty or rules are restrictive):", error);
    }
  }
}

// Run connection test on boot
testFirestoreConnection();

