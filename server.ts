import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  deleteField,
  updateDoc
} from 'firebase/firestore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isVercel = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
const STORAGE_DIR = isVercel ? '/tmp' : __dirname;

const app = express();
// Force port 3000 in dev environment to match AI Studio requirements
const PORT = (process.env.VERCEL === '1' || process.env.RENDER === 'true') ? (Number(process.env.PORT) || 3000) : 3000;

// Enable CORS for all origins and preflight requests to prevent "Failed to fetch" on Vercel
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const DEFAULT_FIREBASE_CONFIG = {
  projectId: "gen-lang-client-0979020064",
  appId: "1:413009308476:web:42f41b3fede16caf074c39",
  apiKey: "AIzaSyCpXqrYRpwlOtv8FPg6dqs9Ydz_fMSsMtw",
  authDomain: "gen-lang-client-0979020064.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-tewedajonlinelot-c3e01b08-781a-42e8-8c49-fa79ab2a0cf6",
  storageBucket: "gen-lang-client-0979020064.firebasestorage.app",
  messagingSenderId: "413009308476",
  measurementId: "",
  oAuthClientId: "413009308476-1dgr678411tf87h6h698t4ngf1domlj8.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

let firebaseConfig: any = { ...DEFAULT_FIREBASE_CONFIG };
try {
  const possiblePaths = [
    path.join(__dirname, 'firebase-applet-config.json'),
    path.join(__dirname, '..', 'firebase-applet-config.json'),
    path.join(process.cwd(), 'firebase-applet-config.json'),
  ];
  for (const cfgPath of possiblePaths) {
    if (fs.existsSync(cfgPath)) {
      const content = fs.readFileSync(cfgPath, 'utf8');
      if (content && content.trim()) {
        firebaseConfig = JSON.parse(content);
        break;
      }
    }
  }
} catch (e) {
  console.warn('[Firebase Config Load Warning]', e);
}

const fbApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const firestore = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8577097699:AAEwbW_yXyU1q0RgRi7J0GXAEnKboY6wFzM';
const BOT_USERNAME = 'Tewedaj_Online_Lottery_bot';
const APP_URL = 'https://tewedaj-online-lottery.vercel.app';
const ADMIN_APP_URL = `${APP_URL}?admin=true&phone=0910961881&username=lij_makbel&tg_id=5588110290`;

// Official Admin & Support Contact Details
const OFFICIAL_ADMIN = {
  phone: '0910961881',
  supportUsername: 'lij_makbel',
  fullName: 'Makbel Maregu',
  telebirr: '0910961881',
  cbeAccount: '1000321337124',
};

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Ensure persistent Firestore state is loaded for all API calls on Vercel without blocking or timing out
app.use('/api', (_req, _res, next) => {
  try {
    ensureFirestoreLoaded().catch((e) => {
      console.warn('[Firestore Auto-Load Error]', e);
    });
  } catch (e) {
    console.warn('[Firestore Auto-Load Error]', e);
  }
  next();
});

// Official Tewedaj Online Lottery Merchant Details
const OFFICIAL_MERCHANT = {
  fullName: OFFICIAL_ADMIN.fullName,
  telebirr: OFFICIAL_ADMIN.telebirr,
  cbeAccount: OFFICIAL_ADMIN.cbeAccount,
  platform: 'Tewedaj Online Lottery (ተወዳጅ ኦንላይን ሎተሪ)',
  telegramBot: '@' + BOT_USERNAME,
  supportHandle: '@' + OFFICIAL_ADMIN.supportUsername,
  adminPhone: OFFICIAL_ADMIN.phone,
  status: 'active',
  lotteries: [
    { title: 'ባለ 1,000 ብር ደራሽ', price: 10, jackpot: 1000 },
    { title: 'ባለ 5,000 ብር ደራሽ', price: 50, jackpot: 5000 },
    { title: 'ባለ 10,000 ብር ደራሽ', price: 100, jackpot: 10000 },
    { title: 'ባለ 50,000 ብር ደራሽ', price: 200, jackpot: 50000 },
  ],
};

// ----------------------------------------------------
// Persistent Admin Chats Storage
// ----------------------------------------------------
const PRIMARY_ADMIN_CHAT_ID = 5588110290; // Makbel Maregu (@lij_makbel / 0910961881)
const ADMIN_CHATS_FILE = path.join(STORAGE_DIR, 'admin_chats.json');
let adminChatIds: number[] = [PRIMARY_ADMIN_CHAT_ID];

try {
  adminChatIds = [PRIMARY_ADMIN_CHAT_ID];
} catch {
  adminChatIds = [PRIMARY_ADMIN_CHAT_ID];
}

function saveAdminChatIds() {
  try {
    fs.writeFileSync(ADMIN_CHATS_FILE, JSON.stringify(Array.from(new Set([PRIMARY_ADMIN_CHAT_ID, ...adminChatIds])), null, 2));
  } catch (err) {
    console.error('[Save Admin Chats Error]', err);
  }
}

function addAdminChatId(chatId: number) {
  if (!adminChatIds.includes(chatId)) {
    adminChatIds.push(chatId);
    saveAdminChatIds();
    console.log(`[Admin Registered] Chat ID: ${chatId}. Total Admins: ${adminChatIds.length}`);
  }
}

// ----------------------------------------------------
// Persistent User Wallets Store (for Bot and Mini App)
// ----------------------------------------------------
export interface UserWallet {
  userId: string;
  telegramId?: string;
  customerId?: string;
  phone: string;
  fullName: string;
  password?: string;
  username?: string;
  profileImage?: string;
  walletBalance: number;
  ticketsCount: number;
  totalWon: number;
  language: 'am' | 'en';
  registeredAt?: string;
  lastActive?: string;
  isOnline?: boolean;
  isAdmin?: boolean;
  notifications?: { id: string; message: string; timestamp: string; isRead: boolean }[];
}

function safeWriteJsonSync(filePath: string, data: any) {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    const tmpFile = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, jsonStr, 'utf-8');
    if (fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, `${filePath}.bak`);
      } catch {}
    }
    fs.renameSync(tmpFile, filePath);
  } catch (err) {
    console.error(`[Atomic Save Error: ${filePath}]`, err);
  }
}

function safeReadJsonSync<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8').trim();
      if (content) {
        return JSON.parse(content) as T;
      }
    }
  } catch (err) {
    console.warn(`[Read Primary JSON Failed: ${filePath}, trying backup]`, err);
  }
  try {
    const bakFile = `${filePath}.bak`;
    if (fs.existsSync(bakFile)) {
      const content = fs.readFileSync(bakFile, 'utf-8').trim();
      if (content) {
        return JSON.parse(content) as T;
      }
    }
  } catch (bakErr) {
    console.error(`[Read Backup JSON Failed: ${filePath}]`, bakErr);
  }
  return fallback;
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

let firestoreQuotaExceededUntil = 0;

export function isFirestoreQuotaActive(): boolean {
  if (Date.now() < firestoreQuotaExceededUntil) {
    return false; // Throttled
  }
  return true; // Active / Ready
}

export function handleFirestoreError(err: any, contextStr: string) {
  const msg = String(err?.message || err?.code || err || '').toLowerCase();
  const code = String(err?.code || '').toLowerCase();
  if (code.includes('resource-exhausted') || msg.includes('resource-exhausted') || msg.includes('quota exceeded')) {
    firestoreQuotaExceededUntil = Date.now() + 30 * 1000;
    console.warn(`[Firestore Quota Guard: ${contextStr}] Throttled for 30s.`);
    return;
  }
  console.warn(`[Firestore Error: ${contextStr}]`, err?.message || msg);
}

async function safeFirestoreWriteWithRetry(operation: () => Promise<void>, maxRetries = 3, delayMs = 1000): Promise<boolean> {
  if (!isFirestoreQuotaActive()) return false;
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      await operation();
      return true;
    } catch (err: any) {
      attempt++;
      const msg = String(err?.message || err?.code || err || '').toLowerCase();
      const code = String(err?.code || '').toLowerCase();
      if (code.includes('resource-exhausted') || msg.includes('resource-exhausted') || msg.includes('quota exceeded')) {
        handleFirestoreError(err, 'safeFirestoreWriteWithRetry');
        return false;
      }
      if (attempt >= maxRetries) {
        handleFirestoreError(err, `safeFirestoreWriteWithRetry (failed after ${maxRetries} attempts)`);
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  return false;
}

export async function syncWalletToFirestore(wallet: UserWallet) {
  try {
    if (!isFirestoreQuotaActive()) return;
    if (!wallet.userId && !wallet.phone && !wallet.telegramId) return;
    
    const cleanPhone = wallet.phone ? normalizeEthiopianPhone(wallet.phone) : '';

    const raw: any = sanitizeForFirestore(wallet);
    if (!raw.fullName && raw.name) {
      raw.fullName = raw.name;
    }
    delete raw.name;

    const canonicalDocId = (cleanPhone && cleanPhone.length >= 9)
      ? (cleanPhone.length === 10 ? cleanPhone : `0${cleanPhone.slice(-9)}`)
      : (wallet.telegramId ? `tg_${wallet.telegramId}` : String(wallet.userId));

    const isOwnerAccount = Boolean(
      (cleanPhone && cleanPhone.endsWith('0910961881')) ||
      (raw.username && raw.username.toLowerCase().replace('@', '') === 'lij_makbel') ||
      (raw.telegramId && String(raw.telegramId) === '5588110290')
    );

    const cleanData: any = {
      customerId: raw.customerId || '',
      fullName: raw.fullName || 'ተጠቃሚ',
      phone: cleanPhone,
      telegramId: raw.telegramId ? String(raw.telegramId) : '',
      userId: canonicalDocId,
      username: raw.username || '',
      walletBalance: Number(raw.walletBalance) || 0,
      balance: Number(raw.walletBalance) || 0,
      ticketsCount: Number(raw.ticketsCount) || 0,
      totalWon: Number(raw.totalWon) || 0,
      language: 'am',
      statusAm: isOwnerAccount ? 'ዋና አስተዳዳሪ (Owner)' : 'ንቁ ተጠቃሚ (Active)',
      registeredAt: raw.registeredAt || new Date().toISOString(),
      profileImage: raw.profileImage || '',
      isOnline: Boolean(raw.isOnline),
      lastActive: raw.lastActive || new Date().toISOString(),
      notifications: raw.notifications || [],
      kuankua: deleteField(),
      isAdmin: deleteField(),
      totalDeposited: deleteField(),
      totalWithdrawn: deleteField(),
    };

    await safeFirestoreWriteWithRetry(async () => {
      await setDoc(doc(firestore, 'wallets', canonicalDocId), cleanData, { merge: true });
    });
  } catch (err) {
    handleFirestoreError(err, 'syncWalletToFirestore');
  }
}

const WALLETS_FILE = path.join(STORAGE_DIR, 'wallets_store.json');
let userWallets: Record<string, UserWallet> = safeReadJsonSync<Record<string, UserWallet>>(WALLETS_FILE, {});

function ensureOwnerWallet() {
  const ownerKey = '0910961881';
  let owner = findWalletByPhone('0910961881');
  if (!owner) {
    owner = {
      userId: 'usr_0910961881',
      telegramId: 'admin_makbel',
      customerId: 'TEWEDAJ-091881',
      phone: '0910961881',
      fullName: 'Makbel Maregu (Owner)',
      username: '@lij_makbel',
      walletBalance: 50000,
      ticketsCount: 0,
      totalWon: 0,
      language: 'am',
      isAdmin: true,
      registeredAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    };
    userWallets[ownerKey] = owner;
    saveUserWallets(true, owner);
  } else {
    owner.isAdmin = true;
    if (!owner.fullName.includes('Owner')) {
      owner.fullName = 'Makbel Maregu (Owner)';
    }
    owner.username = '@lij_makbel';
    if (!owner.registeredAt) {
      owner.registeredAt = new Date('2026-01-01T00:00:00.000Z').toISOString();
    }
    saveUserWallets(true, owner);
  }
}
ensureOwnerWallet();

function ensureRegisteredUsersSeeded() {
  const seeded: UserWallet[] = [
    {
      userId: 'usr_350267',
      telegramId: '350267',
      customerId: 'TEWEDAJ-350267',
      phone: '',
      fullName: 'Messi',
      username: '@Lulumessbro',
      walletBalance: 0,
      ticketsCount: 0,
      totalWon: 0,
      language: 'am',
      registeredAt: new Date('2026-10-25T09:31:19.000Z').toISOString(),
    },
    {
      userId: 'usr_350267',
      telegramId: '350267',
      customerId: 'TEWEDAJ-350267',
      phone: '',
      fullName: 'Messi',
      username: '@Lulumessbro',
      walletBalance: 0,
      ticketsCount: 0,
      totalWon: 0,
      language: 'am',
      registeredAt: new Date('2026-10-25T09:31:19.000Z').toISOString(),
    },
    {
      userId: 'usr_899978',
      telegramId: '899978',
      customerId: 'TEWEDAJ-899978',
      phone: '',
      fullName: 'abel',
      username: '',
      walletBalance: 0,
      ticketsCount: 0,
      totalWon: 0,
      language: 'am',
      registeredAt: new Date('2026-10-25T09:31:19.000Z').toISOString(),
    },
  ];

  for (const u of seeded) {
    const existingKey = u.userId in userWallets ? u.userId : (u.telegramId && `tg_${u.telegramId}` in userWallets ? `tg_${u.telegramId}` : null);
    if (!existingKey) {
      userWallets[u.userId] = u;
      saveUserWallets(true, u);
    } else if (u.telegramId === '350267') {
      userWallets[existingKey].fullName = 'Messi';
      saveUserWallets(true, userWallets[existingKey]);
    }
  }
}
ensureRegisteredUsersSeeded();

function saveUserWallets(force = false, walletToSync?: UserWallet) {
  if (!force && Object.keys(userWallets).length === 0 && fs.existsSync(WALLETS_FILE)) {
    const existing = safeReadJsonSync<Record<string, UserWallet>>(WALLETS_FILE, {});
    if (Object.keys(existing).length > 0) return;
  }
  safeWriteJsonSync(WALLETS_FILE, userWallets);
  if (walletToSync) {
    syncWalletToFirestore(walletToSync).catch(() => {});
  }
}

/**
 * Authoritatively reconciles a user's wallet balance based on their entire transaction and ticket history.
 * This is the ultimate source of truth for balances.
 */
export async function reconcileWalletForUser(userId?: string, phone?: string, telegramId?: string) {
  if (!userId && !phone && !telegramId) return;

  const wallet = findOrCreateWallet({ userId, phone, telegramId });
  if (!wallet) return;

  const userClean = normalizeEthiopianPhone(wallet.phone);
  const tgIdStr = wallet.telegramId ? String(wallet.telegramId) : '';
  const walletUid = wallet.userId ? String(wallet.userId) : '';

  const isUserMatch = (phoneStr?: string, uidStr?: string) => {
    if (userClean && phoneStr) {
      const pClean = normalizeEthiopianPhone(phoneStr);
      if (pClean && pClean.length >= 9 && (pClean === userClean || pClean.slice(-9) === userClean.slice(-9))) {
        return true;
      }
    }
    if (uidStr) {
      if (uidStr === walletUid || (tgIdStr && (uidStr === tgIdStr || uidStr === `tg_${tgIdStr}`))) {
        return true;
      }
    }
    return false;
  };

  const userTickets = syncedTickets.filter(t => isUserMatch(t.userPhone, t.userId));
  const userTxs = syncedTransactions.filter(t => isUserMatch(t.userPhone, t.userId));

  const userGebi = userTxs.filter(t => (t.type === 'deposit' || t.type === 'xo_win') && t.status === 'completed').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  
  // Deduct both COMPLETED and PENDING withdrawals (locking funds immediately) and xo_loss
  const userWechi = userTxs.filter(t => (t.type === 'withdrawal' || t.type === 'xo_loss') && (t.status === 'completed' || t.status === 'pending')).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  
  const userSpend = userTickets.reduce((s, t) => s + (Number(t.pricePaid) || 0), 0);
  
  // Final calculated balance
  const calculatedBal = Math.max(0, (userGebi + (Number(wallet.totalWon) || 0)) - userWechi - userSpend);

  // If there's a discrepancy, update the wallet and sync to Firestore
  if (Math.abs(wallet.walletBalance - calculatedBal) > 0.01) {
    console.log(`[Reconciliation] User ${wallet.userId} balance corrected: ${wallet.walletBalance} -> ${calculatedBal}`);
    wallet.walletBalance = calculatedBal;
    wallet.ticketsCount = userTickets.length;
    saveUserWallets(true, wallet);
  }
}

// ----------------------------------------------------
// Strict Ethiopian Phone Normalization & Deduplication
// ----------------------------------------------------
export function normalizeEthiopianPhone(raw?: string): string {
  if (!raw) return '';
  let clean = String(raw).replace(/\D/g, '');
  if (clean.startsWith('251')) {
    clean = '0' + clean.slice(3);
  } else if (!clean.startsWith('0') && (clean.startsWith('9') || clean.startsWith('7'))) {
    clean = '0' + clean;
  }
  return clean;
}

export function findWalletByPhone(phone?: string): UserWallet | undefined {
  if (!phone) return undefined;
  const clean = normalizeEthiopianPhone(phone);
  if (!clean || clean.length < 9) return undefined;
  const suffix = clean.slice(-9);

  for (const w of Object.values(userWallets)) {
    if (w.phone) {
      const wClean = normalizeEthiopianPhone(w.phone);
      if (wClean.length >= 9 && wClean.slice(-9) === suffix) {
        return w;
      }
    }
  }
  return undefined;
}

export function deduplicateWallets(cleanFirestore = true): { removedCount: number; remainingCount: number; mergedList: string[] } {
  const mergedList: string[] = [];
  let removedCount = 0;

  const canonicalWallets: Record<string, UserWallet> = {};
  const obsoleteFirestoreKeys: string[] = [];

  const allEntries = Object.entries(userWallets);

  for (const [key, wallet] of allEntries) {
    if (!wallet) continue;
    const cleanPhone = wallet.phone ? normalizeEthiopianPhone(wallet.phone) : '';
    const phoneSuffix = cleanPhone.length >= 9 ? cleanPhone.slice(-9) : '';
    const tgId = wallet.telegramId ? String(wallet.telegramId) : (key.startsWith('tg_') ? key.replace('tg_', '') : '');

    // Check if an existing canonical wallet matches this wallet
    let matchedKey: string | undefined;
    for (const [cKey, cWallet] of Object.entries(canonicalWallets)) {
      const cCleanPhone = cWallet.phone ? normalizeEthiopianPhone(cWallet.phone) : '';
      const cPhoneSuffix = cCleanPhone.length >= 9 ? cCleanPhone.slice(-9) : '';
      const cTgId = cWallet.telegramId ? String(cWallet.telegramId) : (cKey.startsWith('tg_') ? cKey.replace('tg_', '') : '');

      const phoneMatch = Boolean(phoneSuffix && cPhoneSuffix && phoneSuffix === cPhoneSuffix);
      const tgMatch = Boolean(tgId && cTgId && tgId === cTgId);
      const keyTgMatch = Boolean((tgId && cKey === `tg_${tgId}`) || (cTgId && key === `tg_${cTgId}`));

      if (phoneMatch || tgMatch || keyTgMatch) {
        matchedKey = cKey;
        break;
      }
    }

    if (matchedKey) {
      // Merge with existing canonical wallet
      const existing = canonicalWallets[matchedKey];
      const mergedPhone = (cleanPhone && cleanPhone.length >= 9) ? cleanPhone : (existing.phone || '');
      const mergedTgId = existing.telegramId || tgId;

      const bestName = (existing.fullName && existing.fullName !== 'ተጠቃሚ' && !existing.fullName.startsWith('ተጠቃሚ ('))
        ? existing.fullName
        : ((wallet.fullName && wallet.fullName !== 'ተጠቃሚ' && !wallet.fullName.startsWith('ተጠቃሚ (')) ? wallet.fullName : (existing.fullName || wallet.fullName || 'ተጠቃሚ'));

      const bestUsername = existing.username || wallet.username || '';
      const bestCustomerId = existing.customerId || wallet.customerId || ('TEWEDAJ-' + (mergedTgId || mergedPhone || matchedKey).slice(-6));

      // Consolidated metrics (always take max to preserve wallet funds & user activity)
      const mergedBalance = Math.max(Number(existing.walletBalance) || 0, Number(wallet.walletBalance) || 0);
      const mergedTickets = Math.max(Number(existing.ticketsCount) || 0, Number(wallet.ticketsCount) || 0);
      const mergedWon = Math.max(Number(existing.totalWon) || 0, Number(wallet.totalWon) || 0);

      // Determine the single new canonical key
      const newCanonicalKey = (mergedPhone && mergedPhone.length >= 9)
        ? (mergedPhone.length === 10 ? mergedPhone : `0${mergedPhone.slice(-9)}`)
        : (mergedTgId ? `tg_${mergedTgId}` : matchedKey);

      const mergedWallet: UserWallet = {
        ...existing,
        ...wallet,
        userId: newCanonicalKey,
        phone: mergedPhone,
        telegramId: mergedTgId,
        fullName: bestName,
        username: bestUsername,
        customerId: bestCustomerId,
        walletBalance: mergedBalance,
        ticketsCount: mergedTickets,
        totalWon: mergedWon,
        isAdmin: Boolean(
          (mergedPhone && mergedPhone.endsWith('0910961881')) ||
          (bestUsername && bestUsername.toLowerCase().replace('@', '') === 'lij_makbel') ||
          (mergedTgId === '5588110290')
        ),
        isOnline: Boolean(existing.isOnline || wallet.isOnline),
        registeredAt: (existing.registeredAt && wallet.registeredAt)
          ? (new Date(existing.registeredAt) < new Date(wallet.registeredAt) ? existing.registeredAt : wallet.registeredAt)
          : (existing.registeredAt || wallet.registeredAt || new Date().toISOString()),
        lastActive: (existing.lastActive && wallet.lastActive)
          ? (new Date(existing.lastActive) > new Date(wallet.lastActive) ? existing.lastActive : wallet.lastActive)
          : (existing.lastActive || wallet.lastActive || new Date().toISOString()),
      };

      delete (mergedWallet as any).kuankua;
      delete (mergedWallet as any).isAdmin;
      delete (mergedWallet as any).totalDeposited;
      delete (mergedWallet as any).totalWithdrawn;

      if (matchedKey !== newCanonicalKey) {
        delete canonicalWallets[matchedKey];
        obsoleteFirestoreKeys.push(matchedKey);
      }
      if (key !== newCanonicalKey) {
        obsoleteFirestoreKeys.push(key);
      }

      canonicalWallets[newCanonicalKey] = mergedWallet;
      removedCount++;
      mergedList.push(`${bestName} (${key} -> ${newCanonicalKey})`);
    } else {
      // First time seeing this identity
      const newCanonicalKey = (cleanPhone && cleanPhone.length >= 9)
        ? (cleanPhone.length === 10 ? cleanPhone : `0${cleanPhone.slice(-9)}`)
        : (tgId ? `tg_${tgId}` : key);

      wallet.userId = newCanonicalKey;
      if (cleanPhone) wallet.phone = cleanPhone;
      if (tgId) wallet.telegramId = tgId;

      if (key !== newCanonicalKey) {
        obsoleteFirestoreKeys.push(key);
        removedCount++;
      }
      canonicalWallets[newCanonicalKey] = wallet;
    }
  }

  // Update in-memory userWallets
  userWallets = canonicalWallets;
  safeWriteJsonSync(WALLETS_FILE, userWallets);

  // Sync canonical wallets and clean up Firestore obsolete keys
  if (cleanFirestore) {
    const uniqueObsoleteKeys = Array.from(new Set(obsoleteFirestoreKeys)).filter(k => !userWallets[k]);
    for (const obsKey of uniqueObsoleteKeys) {
      deleteDoc(doc(firestore, 'wallets', obsKey)).catch(() => {});
    }

    for (const w of Object.values(userWallets)) {
      syncWalletToFirestore(w).catch(() => {});
    }
  }

  console.log(`[Deduplication Complete] Consolidated to ${Object.keys(userWallets).length} unique users. Removed ${removedCount} duplicates.`);
  return {
    removedCount,
    remainingCount: Object.keys(userWallets).length,
    mergedList,
  };
}

// Initial deduplication on startup
deduplicateWallets(true);

// ----------------------------------------------------
// Persistent Tickets Store
// ----------------------------------------------------
export interface SyncedTicket {
  id: string;
  lotteryId: string;
  lotteryTitleAm: string;
  lotteryTitleEn: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userPhone: string;
  userTelegram?: string;
  userAvatar?: string;
  pricePaid: number;
  purchasedAt: string;
  paymentMethod: string;
  paymentReference: string;
  round?: number;
  status: 'active' | 'won' | 'lost' | 'refunded';
  prizeWon?: number;
  prizeTitleAm?: string;
  prizeTitleEn?: string;
  securityHash: string;
}

export async function syncTicketToFirestore(ticket: SyncedTicket) {
  try {
    if (!isFirestoreQuotaActive()) return;
    if (!ticket.id) return;
    const cleanData: any = sanitizeForFirestore(ticket);
    cleanData.statusAm = ticket.status === 'won' ? 'አሸናፊ (Won)' : ticket.status === 'active' ? 'ንቁ (Active)' : ticket.status === 'lost' ? 'ያልደረሰው' : 'የተመለሰ';
    cleanData.paymentMethodAm = ticket.paymentMethod === 'telebirr' ? 'ቴሌብር' : (ticket.paymentMethod === 'cbe' || ticket.paymentMethod === 'cbe_birr') ? 'የኢትዮጵያ ንግድ ባንክ' : 'ዋሌት';
    cleanData.descriptionAm = `${ticket.userName || 'ደንበኛ'} የ ${ticket.lotteryTitleAm} ትኬት #${ticket.ticketNumber} ቆርጧል`;
    await setDoc(doc(firestore, 'tickets', String(ticket.id)), cleanData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, 'syncTicketToFirestore');
  }
}

const TICKETS_FILE = path.join(STORAGE_DIR, 'tickets_store.json');
let syncedTickets: SyncedTicket[] = safeReadJsonSync<SyncedTicket[]>(TICKETS_FILE, []);

async function saveTickets(ticketToSync?: SyncedTicket) {
  if (syncedTickets.length === 0 && fs.existsSync(TICKETS_FILE)) {
    const existing = safeReadJsonSync<SyncedTicket[]>(TICKETS_FILE, []);
    if (existing.length > 0) return;
  }
  safeWriteJsonSync(TICKETS_FILE, syncedTickets);
  if (ticketToSync) {
    await syncTicketToFirestore(ticketToSync).catch(() => {});
  }
}

// ----------------------------------------------------
// Persistent Notifications Store
// ----------------------------------------------------
export interface SyncedNotification {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  userTelegram?: string;
  userAvatar?: string;
  lotteryId: string;
  lotteryTitleAm: string;
  ticketNumber: string;
  amountWon: number;
  timestamp: string;
  isRead: boolean;
  messageAm: string;
  messageEn: string;
}

export async function syncNotificationToFirestore(notif: SyncedNotification) {
  try {
    if (!isFirestoreQuotaActive()) return;
    if (!notif.id) return;
    const cleanData: any = sanitizeForFirestore(notif);
    await setDoc(doc(firestore, 'notifications', String(notif.id)), cleanData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, 'syncNotificationToFirestore');
  }
}

const NOTIFICATIONS_FILE = path.join(STORAGE_DIR, 'notifications_store.json');
let syncedNotifications: SyncedNotification[] = safeReadJsonSync<SyncedNotification[]>(NOTIFICATIONS_FILE, []);

async function saveNotifications(notifToSync?: SyncedNotification) {
  safeWriteJsonSync(NOTIFICATIONS_FILE, syncedNotifications);
  if (notifToSync) {
    await syncNotificationToFirestore(notifToSync).catch(() => {});
  }
}

export function computeActiveLotteryCounts(): Record<string, number> {
  const lotteryCounts: Record<string, number> = {
    lot_tv_32: 0,
    lot_derash_1000: 0,
    lot_derash_5000: 0,
    lot_derash_10000: 0,
    lot_derash_50000: 0,
  };
  for (const t of syncedTickets) {
    if (t.status === 'active') {
      let key = t.lotteryId;
      if (!key) {
        if (t.pricePaid === 10) key = 'lot_derash_1000';
        else if (t.pricePaid === 50) key = 'lot_derash_5000';
        else if (t.pricePaid === 100) key = 'lot_derash_10000';
        else if (t.pricePaid === 200) {
          key = (t.lotteryTitleAm?.includes('ቲቪ') || t.lotteryTitleAm?.includes('TV')) ? 'lot_tv_32' : 'lot_derash_50000';
        }
      }
      if (key && lotteryCounts[key] !== undefined) {
        lotteryCounts[key]++;
      } else if (key) {
        lotteryCounts[key] = 1;
      }
    }
  }
  return lotteryCounts;
}

export function findOrCreateWallet(params: { userId?: string; phone?: string; telegramId?: string; fullName?: string; username?: string; profileImage?: string }): UserWallet {
  const { userId, phone, telegramId, fullName, username, profileImage } = params;
  const cleanPhone = normalizeEthiopianPhone(phone);
  const searchTgId = telegramId ? String(telegramId) : (userId && !cleanPhone ? String(userId).replace('tg_', '') : '');

  // 1. Direct match by phone first (phone is unique primary identity)
  if (cleanPhone && cleanPhone.length >= 9) {
    const existing = findWalletByPhone(cleanPhone);
    if (existing) {
      if (fullName && (!existing.fullName || existing.fullName === existing.phone || existing.fullName === 'ተጠቃሚ' || existing.fullName.startsWith('ተጠቃሚ ('))) {
        existing.fullName = fullName.trim();
      }
      if (username && !existing.username) existing.username = username;
      if (profileImage && !existing.profileImage) existing.profileImage = profileImage;
      if (!existing.phone) existing.phone = cleanPhone;
      if (searchTgId && !existing.telegramId) existing.telegramId = searchTgId;
      if (!existing.customerId) {
        existing.customerId = 'TEWEDAJ-' + (existing.telegramId || existing.phone || existing.userId).slice(-6);
      }

      // If there was an old temporary telegram-only entry for this user, merge and delete it
      if (searchTgId) {
        const oldKeys = [`tg_${searchTgId}`, searchTgId];
        for (const oldKey of oldKeys) {
          if (oldKey !== cleanPhone && userWallets[oldKey]) {
            const oldW = userWallets[oldKey];
            existing.walletBalance = Math.max(Number(existing.walletBalance) || 0, Number(oldW.walletBalance) || 0);
            existing.ticketsCount = Math.max(Number(existing.ticketsCount) || 0, Number(oldW.ticketsCount) || 0);
            delete userWallets[oldKey];
            deleteDoc(doc(firestore, 'wallets', oldKey)).catch(() => {});
          }
        }
      }

      saveUserWallets(true, existing);
      return existing;
    }
  }

  // 2. Match by telegramId or userId
  if (searchTgId) {
    for (const [k, w] of Object.entries(userWallets)) {
      if (k === searchTgId || k === `tg_${searchTgId}` || String(w.userId) === searchTgId || (w.telegramId && String(w.telegramId) === searchTgId)) {
        if (username && !w.username) w.username = username;
        if (profileImage && !w.profileImage) w.profileImage = profileImage;
        if (searchTgId && !w.telegramId) w.telegramId = searchTgId;
        if (fullName && (!w.fullName || w.fullName === 'ተጠቃሚ' || w.fullName.startsWith('ተጠቃሚ ('))) w.fullName = fullName.trim();
        if (!w.customerId) {
          w.customerId = 'TEWEDAJ-' + (w.telegramId || w.phone || w.userId).slice(-6);
        }

        // If user now provided a phone number, migrate from tg_ key to phone canonical key!
        if (cleanPhone && cleanPhone.length >= 9) {
          w.phone = cleanPhone;
          w.userId = cleanPhone;
          if (k !== cleanPhone) {
            delete userWallets[k];
            deleteDoc(doc(firestore, 'wallets', k)).catch(() => {});
          }
          userWallets[cleanPhone] = w;
          saveUserWallets(true, w);
          return w;
        }

        saveUserWallets(false, w);
        return w;
      }
    }
  }

  // 3. Create new wallet if not found
  const canonicalKey = (cleanPhone && cleanPhone.length >= 9)
    ? (cleanPhone.length === 10 ? cleanPhone : `0${cleanPhone.slice(-9)}`)
    : (searchTgId ? `tg_${searchTgId}` : (userId || `usr_${Date.now()}`));

  const generatedCid = 'TEWEDAJ-' + (searchTgId || cleanPhone || canonicalKey).slice(-6);

  const isNew = !userWallets[canonicalKey];
  userWallets[canonicalKey] = {
    userId: canonicalKey,
    telegramId: searchTgId || '',
    customerId: generatedCid,
    phone: cleanPhone || '',
    fullName: (fullName && fullName.trim() && fullName !== 'ተጠቃሚ') ? fullName.trim() : (cleanPhone ? `ደንበኛ (${cleanPhone})` : (username ? username : `ተጠቃሚ (${searchTgId || canonicalKey})`)),
    username: username || '',
    profileImage: profileImage || '',
    walletBalance: 0,
    ticketsCount: 0,
    totalWon: 0,
    language: 'am',
    registeredAt: new Date().toISOString(),
  };
  saveUserWallets(true, userWallets[canonicalKey]);

  if (isNew) {
    const readableRegDate = new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' });
    const tgRegMessage = 
      `👤 <b>አዲስ ተጠቃሚ ተመዝግቧል! (New User Registered)</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>ሙሉ ስም:</b> <b>${userWallets[canonicalKey].fullName}</b>\n` +
      `🆔 <b>መለያ (CID):</b> <code>${generatedCid}</code>\n` +
      (cleanPhone ? `📱 <b>ስልክ:</b> <code>${cleanPhone}</code>\n` : '') +
      (username ? `💬 <b>ቴሌግራም:</b> @${username.replace('@', '')}\n` : '') +
      `⏰ <b>ሰዓት:</b> ${readableRegDate}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<i>ተወዳጅ ኦንላይን ሎተሪ (Tewedaj Online Lottery)</i>`;

    notifyAllAdmins(tgRegMessage).catch(() => {});

    syncDashboardToFirestore({
      id: 'act_reg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type: 'user_registered',
      titleAm: 'አዲስ ተጠቃሚ ተመዝግቧል',
      titleEn: 'New User Registered',
      descriptionAm: `👤 አዲስ ተጠቃሚ ተመዝግቧል: ${userWallets[canonicalKey].fullName} (${cleanPhone || generatedCid})`,
      descriptionEn: `New user registered: ${userWallets[canonicalKey].fullName} (${cleanPhone || generatedCid})`,
      userPhone: cleanPhone,
      userName: userWallets[canonicalKey].fullName,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  }

  return userWallets[canonicalKey];
}

function getOrCreateWallet(chatId: number, from?: any, phone?: string): UserWallet {
  const cleanPhone = phone || '';
  const fullName = from?.first_name ? `${from.first_name} ${from.last_name || ''}`.trim() : (cleanPhone || '');
  const username = from?.username ? `@${from.username}` : '';
  const wallet = findOrCreateWallet({
    telegramId: String(chatId),
    userId: String(chatId),
    phone: cleanPhone,
    fullName,
    username,
  });
  if (from?.username && !wallet.username) wallet.username = `@${from.username}`;
  if (fullName && (!wallet.fullName || wallet.fullName === 'ተጠቃሚ')) wallet.fullName = fullName;
  if (!wallet.telegramId) wallet.telegramId = String(chatId);
  saveUserWallets();
  return wallet;
}

export function getRegisteredUsersCount(): number {
  const uniqueUsers = new Set<string>();
  for (const w of Object.values(userWallets)) {
    if (w.phone) {
      uniqueUsers.add(normalizeEthiopianPhone(w.phone));
    } else if (w.telegramId) {
      uniqueUsers.add(String(w.telegramId));
    } else if (w.userId) {
      uniqueUsers.add(w.userId);
    }
  }
  return uniqueUsers.size;
}

export async function updateTelegramBotMonthlyUsers() {
  try {
    const userCount = getRegisteredUsersCount();
    
    // Update Telegram Bot Short Description (shows on profile and bot link previews)
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyShortDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        short_description: `ተወዳጅ ኦንላይን ሎተሪ | በቴሌብር እና በንግድ ባንክ የሎተሪ ዕጣዎችን ይጫወቱ!`,
      }),
    }).catch(() => {});

    // Update Telegram Bot Description (shows on chat before start)
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyDescription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: `🇪🇹 ተወዳጅ ኦንላይን ሎተሪ (Tewedaj Online Lottery)\n\n🎟 በየቀኑ በቴሌብር እና በኢትዮጵያ ንግድ ባንክ ፈጣን የሎተሪ ዕጣዎችን ይጫወቱ፣ ያሸንፉ!\n\n👑 ድጋፍ: @lij_makbel`,
      }),
    }).catch(() => {});

    // Save to Firebase Firestore collection 'stats', doc 'monthly_users'
    if (isFirestoreQuotaActive()) {
      await setDoc(doc(firestore, 'stats', 'monthly_users'), {
        count: userCount,
        monthlyUsers: userCount,
        titleAm: 'ጠቅላላ ተጠቃሚዎች',
        titleEn: 'Monthly Users',
        lastUpdated: new Date().toISOString(),
      }, { merge: true }).catch(err => handleFirestoreError(err, 'updateTelegramBotMonthlyUsers'));
    }
    
    console.log(`[Bot Monthly Users Updated] Total: ${userCount}`);
  } catch (err) {
    console.error('[Update Bot Monthly Users Error]', err);
  }
}

// ----------------------------------------------------
// Persistent Transaction Store & Sync
// ----------------------------------------------------
export interface SyncedTransaction {
  id: string;
  ticketId?: string;
  lotteryId?: string;
  lotteryTitleAm?: string;
  userId?: string;
  userName: string;
  userPhone: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'ticket_purchase' | 'prize_payout' | 'xo_win' | 'xo_loss';
  paymentMethod: string;
  referenceNumber: string;
  screenshotUrl?: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  approvedBy?: string;
  approvedAt?: string;
  source?: 'bot' | 'mini_app';
  notifiedAdminMessages?: { chatId: number; messageId: number; text: string }[];
  telegramId?: string;
  gatewayFee?: number;
}

export async function syncTransactionToFirestore(tx: SyncedTransaction) {
  try {
    if (!isFirestoreQuotaActive()) return;
    if (!tx.id) return;
    const cleanData: any = sanitizeForFirestore(tx);
    cleanData.typeAm = tx.type === 'deposit'
      ? 'የገንዘብ ማስገቢያ (ገቢ)'
      : tx.type === 'withdrawal'
      ? 'የገንዘብ ማውጣት (ወጪ)'
      : tx.type === 'ticket_purchase'
      ? 'የትኬት ግዢ'
      : tx.type === 'xo_win'
      ? 'የ XO ጨዋታ ማሸነፍ'
      : tx.type === 'xo_loss'
      ? 'የ XO ጨዋታ ሽንፈት'
      : 'የሽልማት ክፍያ';
    cleanData.statusAm = tx.status === 'completed' ? 'የተጠናቀቀ (ጸድቋል)' : tx.status === 'pending' ? 'በመጠባበቅ ላይ' : 'ውድቅ የተደረገ';
    cleanData.paymentMethodAm = tx.paymentMethod === 'telebirr' ? 'ቴሌብር' : (tx.paymentMethod === 'cbe' || tx.paymentMethod === 'cbe_birr') ? 'የኢትዮጵያ ንግድ ባንክ' : 'ዋሌት';
    cleanData.descriptionAm = tx.type === 'deposit'
      ? `የ ${tx.amount} ብር የገቢ ጥያቄ (${tx.userName} - ${tx.userPhone})`
      : tx.type === 'withdrawal'
      ? `የ ${tx.amount} ብር የወጪ ጥያቄ (${tx.userName} - ${tx.userPhone})`
      : tx.type === 'xo_win'
      ? `የ XO ጨዋታ ማሸነፍ (+${tx.amount} ብር - 20% ተቆርጧል)`
      : tx.type === 'xo_loss'
      ? `የ XO ጨዋታ ሽንፈት (-${tx.amount} ብር)`
      : `የ ${tx.amount} ብር የትኬት ግዢ (${tx.userName})`;
    await setDoc(doc(firestore, 'transactions', String(tx.id)), cleanData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, 'syncTransactionToFirestore');
  }
}

const TX_FILE = path.join(STORAGE_DIR, 'transactions_store.json');
let syncedTransactions: SyncedTransaction[] = safeReadJsonSync<SyncedTransaction[]>(TX_FILE, []);
syncedTransactions.forEach(t => {
  if (t.type === 'ticket_purchase' && t.status !== 'completed') {
    t.status = 'completed';
  }
});

async function saveTransactions(txToSync?: SyncedTransaction) {
  if (syncedTransactions.length === 0 && fs.existsSync(TX_FILE)) {
    const existing = safeReadJsonSync<SyncedTransaction[]>(TX_FILE, []);
    if (existing.length > 0) return;
  }
  safeWriteJsonSync(TX_FILE, syncedTransactions);
  if (txToSync) {
    await syncTransactionToFirestore(txToSync).catch(() => {});
  }
}

// ----------------------------------------------------
// Persistent Dashboard & Real-Time Activity Store (Firebase Sync)
// ----------------------------------------------------
export interface DashboardActivity {
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

const ACTIVITIES_FILE = path.join(STORAGE_DIR, 'dashboard_activities.json');
let dashboardActivities: DashboardActivity[] = safeReadJsonSync<DashboardActivity[]>(ACTIVITIES_FILE, []);

function saveDashboardActivities() {
  safeWriteJsonSync(ACTIVITIES_FILE, dashboardActivities);
}

let lastDashboardSyncTime = 0;
const DASHBOARD_SYNC_THROTTLE_MS = 60000; // 60 seconds throttle to save daily write quota (RESOURCE_EXHAUSTED prevention)

export function logDashboardActivity(activity: DashboardActivity) {
  const existing = dashboardActivities.find(a => a.id === activity.id);
  if (!existing) {
    dashboardActivities.unshift(activity);
    saveDashboardActivities();
    if (isFirestoreQuotaActive()) {
      setDoc(doc(firestore, 'dashboard_activities', activity.id), sanitizeForFirestore(activity), { merge: true }).catch(err => handleFirestoreError(err, 'logDashboardActivity'));
      setDoc(doc(firestore, 'activities', activity.id), sanitizeForFirestore(activity), { merge: true }).catch(err => handleFirestoreError(err, 'logDashboardActivity activities'));
    }
  }
}

export async function logBotActivity(userId: string | number, actionType: string, details: any, phone = '', name = '') {
  try {
    if (!isFirestoreQuotaActive()) return;
    const logId = `bot_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const logEntry = sanitizeForFirestore({
      id: logId,
      userId: String(userId),
      userName: name || 'ተጠቃሚ',
      userPhone: phone || '',
      action: actionType,
      details: typeof details === 'object' ? JSON.stringify(details) : String(details),
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      serverTimestamp: new Date().toISOString(),
    });

    await setDoc(doc(firestore, 'bot_logs', logId), logEntry, { merge: true }).catch(err => handleFirestoreError(err, 'logBotActivity bot_logs'));
    await setDoc(doc(firestore, 'activities', logId), logEntry, { merge: true }).catch(err => handleFirestoreError(err, 'logBotActivity activities'));
  } catch (err) {
    console.warn('[logBotActivity error]', err);
  }
}

export async function recordMiniAppActivity(userId: string | number, activityName: string, details: any = {}) {
  try {
    if (!isFirestoreQuotaActive()) return;
    const actId = `act_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const actEntry = sanitizeForFirestore({
      id: actId,
      userId: String(userId),
      activity: activityName,
      details: typeof details === 'object' ? JSON.stringify(details) : String(details),
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
    });

    await setDoc(doc(firestore, 'activities', actId), actEntry, { merge: true }).catch(err => handleFirestoreError(err, 'recordMiniAppActivity'));
  } catch (err) {
    console.warn('[recordMiniAppActivity error]', err);
  }
}


export const CANONICAL_LOTTERY_CAPACITIES: Record<string, { titleAm: string; titleEn: string; price: number; jackpot: number; capacity: number; isItemPrize?: boolean; prizeItemName?: string; prizeItemNameAm?: string }> = {
  lot_tv_32: { titleAm: '32 Inch TV ዕጣ', titleEn: '32 Inch TV Draw', price: 200, jackpot: 0, capacity: 150, isItemPrize: true, prizeItemName: '32 Inch TV', prizeItemNameAm: '32 Inch TV' },
  lot_derash_1000: { titleAm: 'ባለ 1,000 ብር ደራሽ', titleEn: 'Bale 1,000 ETB Derash', price: 10, jackpot: 1000, capacity: 150 },
  lot_derash_5000: { titleAm: 'ባለ 5,000 ብር ደራሽ', titleEn: 'Bale 5,000 ETB Derash', price: 50, jackpot: 5000, capacity: 150 },
  lot_derash_10000: { titleAm: 'ባለ 10,000 ብር ደራሽ', titleEn: 'Bale 10,000 ETB Derash', price: 100, jackpot: 10000, capacity: 150 },
  lot_derash_50000: { titleAm: 'ባለ 50,000 ብር ደራሽ', titleEn: 'Bale 50,000 ETB Derash', price: 200, jackpot: 50000, capacity: 300 },
};

export async function syncDashboardToFirestore(extraActivity?: DashboardActivity, force = false) {
  try {
    if (extraActivity) {
      logDashboardActivity(extraActivity);
    }

    const nowTime = Date.now();
    if (!force && (nowTime - lastDashboardSyncTime < DASHBOARD_SYNC_THROTTLE_MS)) {
      return;
    }
    lastDashboardSyncTime = nowTime;

    // 1. Compute tickets & buyers metrics
    const totalTicketsSold = syncedTickets.length;
    const activeTickets = syncedTickets.filter(t => t.status !== 'refunded');

    // Group buyers by phone
    const buyersMap = new Map<string, { phone: string; name: string; ticketsCount: number; totalSpent: number }>();
    for (const t of syncedTickets) {
      const p = t.userPhone ? normalizeEthiopianPhone(t.userPhone) : (t.userId || 'unknown');
      if (!buyersMap.has(p)) {
        buyersMap.set(p, {
          phone: p,
          name: (t.userName && t.userName !== 'ተጠቃሚ') ? t.userName : p,
          ticketsCount: 0,
          totalSpent: 0,
        });
      }
      const b = buyersMap.get(p)!;
      b.ticketsCount++;
      b.totalSpent += Number(t.pricePaid) || 0;
      if (t.userName && t.userName !== 'ተጠቃሚ' && (!b.name || b.name === p)) {
        b.name = t.userName;
      }
    }
    const uniqueBuyers = Array.from(buyersMap.values());
    uniqueBuyers.sort((a, b) => b.ticketsCount - a.ticketsCount);

    const keriEtsaSummary: Record<string, any> = {};
    for (const [lotId, conf] of Object.entries(CANONICAL_LOTTERY_CAPACITIES)) {
      const isTv = lotId === 'lot_tv_32';
      const soldForThis = activeTickets.filter(t => {
        if (isTv) {
          return t.lotteryId === 'lot_tv_32' || t.lotteryTitleAm?.includes('ቲቪ') || t.lotteryTitleAm?.includes('TV');
        }
        if (lotId === 'lot_derash_50000') {
          return t.lotteryId === 'lot_derash_50000' || (t.pricePaid === 200 && !t.lotteryId?.includes('tv') && !t.lotteryTitleAm?.includes('ቲቪ') && !t.lotteryTitleAm?.includes('TV'));
        }
        return t.lotteryId === lotId || (t.pricePaid === conf.price && (lotId.includes(String(conf.jackpot)) || lotId.includes('derash')));
      }).length;

      const keriEtsa = Math.max(0, conf.capacity - soldForThis);

      const buyersForThis = new Set(
        activeTickets
          .filter(t => {
            if (isTv) return t.lotteryId === 'lot_tv_32' || t.lotteryTitleAm?.includes('ቲቪ') || t.lotteryTitleAm?.includes('TV');
            if (lotId === 'lot_derash_50000') return t.lotteryId === 'lot_derash_50000' || (t.pricePaid === 200 && !t.lotteryId?.includes('tv') && !t.lotteryTitleAm?.includes('ቲቪ') && !t.lotteryTitleAm?.includes('TV'));
            return t.lotteryId === lotId || t.pricePaid === conf.price;
          })
          .map(t => t.userPhone ? normalizeEthiopianPhone(t.userPhone) : t.userId)
      ).size;

      const itemInfo: any = {
        lotteryId: lotId,
        titleAm: conf.titleAm,
        titleEn: conf.titleEn,
        ticketPrice: conf.price,
        totalInventory: conf.capacity,
        ticketsSold: soldForThis,
        keriEtsa: keriEtsa, // ቀሪ ዕጣ
        round: 1,
        buyersCount: buyersForThis,
        lastUpdated: new Date().toISOString(),
      };
      if (conf.isItemPrize || isTv) {
        itemInfo.isItemPrize = true;
        itemInfo.prizeName = '32 Inch Smart TV';
        itemInfo.prizeAm = 'የ 32 ኢንች ኤልኢዲ ቲቪ';
      } else {
        itemInfo.jackpotAmount = conf.jackpot;
      }

      keriEtsaSummary[lotId] = itemInfo;
    }

    // 3. Financial calculations: Gebi (ገቢ) and Wechi (ወጪ)
    const completedDeposits = syncedTransactions.filter(t => t.type === 'deposit' && t.status === 'completed');
    const totalDepositedAmount = completedDeposits.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const completedWithdrawals = syncedTransactions.filter(t => t.type === 'withdrawal' && t.status === 'completed');
    const totalWithdrawnAmount = completedWithdrawals.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const pendingDepositsCount = syncedTransactions.filter(t => t.type === 'deposit' && t.status === 'pending').length;
    const pendingWithdrawalsCount = syncedTransactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').length;
    const totalTicketSpend = syncedTickets.reduce((s, t) => s + (Number(t.pricePaid) || 0), 0);

    // 4. Per-user financial details (yeyesewun gebi ena wechi data)
    const userFinancialsList = Object.values(userWallets).map(w => {
      const clean = normalizeEthiopianPhone(w.phone);
      const userTxs = clean
        ? syncedTransactions.filter(t => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)))
        : [];
      const userGebi = userTxs.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const userWechi = userTxs.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const userTks = clean
        ? syncedTickets.filter(t => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)))
        : [];
      const userSpend = userTks.reduce((s, t) => s + (Number(t.pricePaid) || 0), 0);

      return {
        phone: clean || w.phone || w.userId,
        fullName: w.fullName || 'ተጠቃሚ',
        walletBalance: w.walletBalance || 0,
        ticketsCount: userTks.length,
        ticketSpend: userSpend,
        totalWon: w.totalWon || 0,
      };
    });

    // 5. Total registered users
    const registeredUsersCount = getRegisteredUsersCount();

    const now = new Date().toISOString();
    const lastActivity = extraActivity 
      ? extraActivity.descriptionAm 
      : (dashboardActivities[0]?.descriptionAm || 'የሲስተም ዳሽቦርድ ዝግጁ ነው');

    // 6. Construct Dashboard Overview document
    const overviewDoc = {
      id: 'overview',
      totalTicketsSold,
      ticketsCutCount: totalTicketsSold,
      activeTicketsCount: activeTickets.length,
      uniqueBuyersCount: uniqueBuyers.length,
      totalRegisteredUsers: registeredUsersCount,
      pendingDepositsCount,
      pendingWithdrawalsCount,
      keriEtsaSummary,
      uniqueBuyers: uniqueBuyers.slice(0, 50),
      recentActivities: dashboardActivities.slice(0, 50),
      userFinancials: userFinancialsList,
      lastUpdated: now,
      lastActivityDescriptionAm: lastActivity,
      lastActivityDescriptionEn: extraActivity?.descriptionEn || 'System dashboard synchronized',
    };

    // Write to Firestore under collection 'dashboard'
    if (isFirestoreQuotaActive()) {
      await setDoc(doc(firestore, 'dashboard', 'overview'), sanitizeForFirestore(overviewDoc), { merge: true }).catch(err => handleFirestoreError(err, 'syncDashboardToFirestore overview'));
    }

    // REMOVED: Individual keri_etsa collection writes. 
    // We now rely solely on the consolidated 'dashboard/overview' document to save daily write quota.

    // If an individual activity event was passed, also save it in dashboard_activities collection
    if (extraActivity) {
      await setDoc(doc(firestore, 'dashboard_activities', extraActivity.id), sanitizeForFirestore(extraActivity), { merge: true });
    }

    console.log(`[Firestore Dashboard Synced] Tickets Cut: ${totalTicketsSold}, Buyers: ${uniqueBuyers.length}, Active Users: ${registeredUsersCount}`);
  } catch (err) {
    console.warn('[syncDashboardToFirestore Error]', err);
  }
}

export async function loadAllFromFirestore() {
  try {
    console.log('[Firestore] Synchronizing persistent state from Firebase Firestore...');
    // 1. Wallets
    const walletsSnap = await getDocs(collection(firestore, 'wallets'));
    let loadedWallets = 0;
    walletsSnap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      if (data && (data.phone || data.userId)) {
        if ('totalDeposited' in data || 'totalWithdrawn' in data || 'kuankua' in data || 'isAdmin' in data) {
          updateDoc(doc(firestore, 'wallets', docSnap.id), {
            totalDeposited: deleteField(),
            totalWithdrawn: deleteField(),
            kuankua: deleteField(),
            isAdmin: deleteField(),
          }).catch(() => {});
        }
        delete data.totalDeposited;
        delete data.totalWithdrawn;
        delete data.kuankua;
        delete data.isAdmin;
        if (!data.fullName && data.name) {
          data.fullName = data.name;
        }
        delete data.name;
        const cleanPhone = data.phone ? normalizeEthiopianPhone(data.phone) : '';
        const canonicalKey = (cleanPhone && cleanPhone.length >= 9)
          ? (cleanPhone.length === 10 ? cleanPhone : `0${cleanPhone.slice(-9)}`)
          : (data.telegramId ? `tg_${data.telegramId}` : (data.userId || docSnap.id));

        userWallets[canonicalKey] = {
          ...userWallets[canonicalKey],
          ...data,
          userId: canonicalKey,
        };
        delete (userWallets[canonicalKey] as any).totalDeposited;
        delete (userWallets[canonicalKey] as any).totalWithdrawn;
        delete (userWallets[canonicalKey] as any).kuankua;
        delete (userWallets[canonicalKey] as any).isAdmin;
        loadedWallets++;
      }
    });
    console.log(`[Firestore] Successfully loaded ${loadedWallets} wallets. Running deduplication...`);

    // Explicitly purge test users 1182 / 0925941966 / Lulumessbro / usr_eth_1182
    const keysToPurge = ['usr_eth_1182', '1182', '0925941966', 'usr_eth_0925941966', 'tg_350267', '350267'];
    for (const k of keysToPurge) {
      delete userWallets[k];
      deleteDoc(doc(firestore, 'wallets', k)).catch(() => {});
    }
    for (const [k, w] of Object.entries(userWallets)) {
      if (w.phone && (w.phone.includes('0925941966') || w.phone === '1182')) {
        delete userWallets[k];
        deleteDoc(doc(firestore, 'wallets', k)).catch(() => {});
      }
      if (w.username && w.username.toLowerCase().includes('lulumessbro')) {
        delete userWallets[k];
        deleteDoc(doc(firestore, 'wallets', k)).catch(() => {});
      }
      if (w.telegramId && (w.telegramId === '350267' || w.telegramId === '0925941966')) {
        delete userWallets[k];
        deleteDoc(doc(firestore, 'wallets', k)).catch(() => {});
      }
    }
    safeWriteJsonSync(WALLETS_FILE, userWallets);

    // Clean up all duplicate records across Firestore and memory
    deduplicateWallets(true);

    // 2. Tickets (Authoritative sync from Firestore)
    const ticketsSnap = await getDocs(collection(firestore, 'tickets'));
    const firestoreTickets: SyncedTicket[] = [];
    ticketsSnap.forEach((docSnap) => {
      const data = docSnap.data() as any;
      const id = data?.id || docSnap.id;
      const ticketNumber = data?.ticketNumber || data?.ticket_number || data?.number || id.replace('tkt_', '');
      const userPhone = data?.userPhone || data?.phone || '';
      const wallet = userPhone ? findWalletByPhone(userPhone) : (data?.userId ? findOrCreateWallet({ userId: data.userId }) : undefined);
      const userName = (data?.userName && data.userName !== 'ተጠቃሚ') ? data.userName : (wallet?.fullName || (userPhone ? `ደንበኛ (${userPhone})` : 'ደንበኛ'));

      const t: SyncedTicket = {
        id,
        lotteryId: data?.lotteryId || (data?.pricePaid === 10 ? 'lot_derash_1000' : data?.pricePaid === 50 ? 'lot_derash_5000' : data?.pricePaid === 100 ? 'lot_derash_10000' : 'lot_derash_50000'),
        lotteryTitleAm: data?.lotteryTitleAm || 'ባለ 1,000 ብር ደራሽ',
        lotteryTitleEn: data?.lotteryTitleEn || 'Bale 1,000 ETB Derash',
        ticketNumber: String(ticketNumber),
        userId: data?.userId || wallet?.userId || '0920561776',
        userName,
        userPhone: userPhone || wallet?.phone || '',
        userTelegram: data?.userTelegram || wallet?.username || '',
        pricePaid: Number(data?.pricePaid) || 10,
        purchasedAt: data?.purchasedAt || data?.purchaseDate || new Date().toISOString(),
        paymentMethod: data?.paymentMethod || 'wallet',
        paymentReference: data?.paymentReference || `TKT-${ticketNumber}`,
        round: Number(data?.round) || 1,
        status: data?.status || 'active',
        securityHash: data?.securityHash || `ETH-${ticketNumber}`,
      };
      firestoreTickets.push(t);
    });
    syncedTickets = firestoreTickets;
    safeWriteJsonSync(TICKETS_FILE, syncedTickets);
    console.log(`[Firestore] Successfully loaded ${syncedTickets.length} tickets from Firestore.`);

    // 3. Transactions
    const txSnap = await getDocs(collection(firestore, 'transactions'));
    const loadedTxIds = new Set(syncedTransactions.map(t => t.id));
    let newTxs = 0;
    txSnap.forEach((docSnap) => {
      const tx = docSnap.data() as SyncedTransaction;
      if (tx && tx.id && !loadedTxIds.has(tx.id)) {
        syncedTransactions.unshift(tx);
        loadedTxIds.add(tx.id);
        newTxs++;
      }
    });
    console.log(`[Firestore] Successfully loaded ${txSnap.size} transactions (${newTxs} new).`);


    // 5. Dashboard Activities
    try {
      const actSnap = await getDocs(collection(firestore, 'dashboard_activities'));
      const loadedActIds = new Set(dashboardActivities.map(a => a.id));
      let newActs = 0;
      actSnap.forEach((docSnap) => {
        const act = docSnap.data() as DashboardActivity;
        if (act && act.id && !loadedActIds.has(act.id)) {
          dashboardActivities.unshift(act);
          loadedActIds.add(act.id);
          newActs++;
        }
      });
      dashboardActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      console.log(`[Firestore] Successfully loaded ${actSnap.size} dashboard activities (${newActs} new).`);
    } catch (e) {
      console.warn('[Firestore Dashboard Activities Load Error]', e);
    }

    // REMOVED: Expensive backfill of all local wallets to Firestore to save quota.
    // Sync will happen incrementally as users interact with the app.
    
    // Filter out obsolete lot_derash_20000 if loaded
    syncedTickets = syncedTickets.filter(t => t.lotteryId !== 'lot_derash_20000');

    // Permanently delete obsolete lot_derash_20000 from Firestore
    try {
      await deleteDoc(doc(firestore, 'keri_etsa', 'lot_derash_20000'));
      console.log('[Firestore] Permanently deleted obsolete lot_derash_20000 from keri_etsa collection');
    } catch (err) {}

    // Update local file backups without dropping any records
    safeWriteJsonSync(WALLETS_FILE, userWallets);
    safeWriteJsonSync(TICKETS_FILE, syncedTickets);
    safeWriteJsonSync(TX_FILE, syncedTransactions);

    safeWriteJsonSync(ACTIVITIES_FILE, dashboardActivities);

    // Seed lot_tv_32 (150 capacity, 32 Inch TV item prize) and lot_derash_50000 (300 inventory, 50,000 Birr) in Firestore
    try {
      const soldTv = syncedTickets.filter(t => t.status === 'active' && (t.lotteryId === 'lot_tv_32' || t.lotteryTitleAm?.includes('ቲቪ') || t.lotteryTitleAm?.includes('TV'))).length;
      await setDoc(doc(firestore, 'keri_etsa', 'lot_tv_32'), {
        lotteryId: 'lot_tv_32',
        titleAm: '32 Inch TV ዕጣ',
        titleEn: '32 Inch TV Draw',
        ticketPrice: 200,
        totalInventory: 150,
        ticketsSold: soldTv,
        keriEtsa: Math.max(0, 150 - soldTv),
        round: 1,
        buyersCount: 0,
        isItemPrize: true,
        prizeName: '32 Inch TV',
        prizeAm: '32 Inch TV',
        lastUpdated: new Date().toISOString(),
      }, { merge: true });

      const sold50k = syncedTickets.filter(t => t.status === 'active' && (t.lotteryId === 'lot_derash_50000' || (t.pricePaid === 200 && !t.lotteryId?.includes('tv') && !t.lotteryTitleAm?.includes('ቲቪ') && !t.lotteryTitleAm?.includes('TV')))).length;
      await setDoc(doc(firestore, 'keri_etsa', 'lot_derash_50000'), {
        lotteryId: 'lot_derash_50000',
        titleAm: 'ባለ 50,000 ብር ደራሽ',
        titleEn: 'Bale 50,000 ETB Derash',
        ticketPrice: 200,
        jackpotAmount: 50000,
        totalInventory: 300,
        ticketsSold: sold50k,
        keriEtsa: Math.max(0, 300 - sold50k),
        round: 1,
        buyersCount: 0,
        lastUpdated: new Date().toISOString(),
      }, { merge: true });
    } catch {}

    // Load real-time locked lotteries state from Firestore
    try {
      const locksSnap = await getDoc(doc(firestore, 'system_settings', 'lottery_locks'));
      if (locksSnap.exists()) {
        const data = locksSnap.data();
        if (Array.isArray(data?.lockedLotteryIds)) {
          serverLockedLotteryIds = data.lockedLotteryIds;
          safeWriteJsonSync(LOCKS_FILE, serverLockedLotteryIds);
        }
      }
    } catch (err) {}

    // Sync all stats to the 'dashboard' collection in Firebase Firestore immediately!
    await syncDashboardToFirestore(undefined, true);
  } catch (err) {
    handleFirestoreError(err, 'loadAllFromFirestore');
  }
}

let firestoreLoadPromise: Promise<void> | null = null;
export async function ensureFirestoreLoaded() {
  if (!firestoreLoadPromise) {
    firestoreLoadPromise = loadAllFromFirestore().catch((err) => {
      handleFirestoreError(err, 'ensureFirestoreLoaded');
    });
  }
  // Fast 2.5s timeout prevents stalling webhook and bot message handlers
  await Promise.race([
    firestoreLoadPromise,
    new Promise((resolve) => setTimeout(resolve, 2500))
  ]);
  return firestoreLoadPromise;
}

// ----------------------------------------------------
// Persistent Support Messages Store
// ----------------------------------------------------
export interface SupportMessage {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  sender: 'user' | 'admin';
  text: string;
  timestamp: string;
  telegramMsgId?: number;
}

const SUPPORT_FILE = path.join(STORAGE_DIR, 'support_messages.json');
let supportMessages: SupportMessage[] = safeReadJsonSync<SupportMessage[]>(SUPPORT_FILE, []);

function saveSupportMessages() {
  safeWriteJsonSync(SUPPORT_FILE, supportMessages.slice(0, 500));
}


function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function maskPhone(phone?: string): string {
  if (!phone) return '***';
  const clean = normalizeEthiopianPhone(phone);
  if (clean.length >= 9) {
    return clean.slice(0, 4) + '****' + clean.slice(-2);
  }
  return clean;
}

const DEFAULT_REPLY_KEYBOARD = {
  keyboard: [
    [{ text: '🎟 ሎተሪ ክፈት' }],
    [{ text: '📱 ስልክ ቁጥር' }, { text: '💬 እገዛ / ድጋፍ' }],
  ],
  resize_keyboard: true,
};

async function sendTelegramResponse(chatId: number, text: string, replyMarkup?: any) {
  try {
    const body: any = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup !== undefined ? replyMarkup : DEFAULT_REPLY_KEYBOARD,
    };
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = (await res.json()) as any;
    if (!result?.ok) {
      const desc = result?.description || '';
      if (desc.includes('chat not found') || desc.includes('blocked') || desc.includes('deactivated') || desc.includes('chat_id is empty')) {
        console.info(`[Telegram Notification Skipped: chat ${chatId} unavailable]`);
        if (adminChatIds.includes(chatId)) {
          adminChatIds = adminChatIds.filter(id => id !== chatId);
          saveAdminChatIds();
        }
        return result;
      }
      console.warn(`[Send Telegram Message HTML failed for chat ${chatId}]:`, desc);
      const plainText = text.replace(/<[^>]*>?/gm, '');
      const fallbackBody = {
        chat_id: chatId,
        text: plainText,
        reply_markup: body.reply_markup,
      };
      const fallbackRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackBody),
      });
      return await fallbackRes.json();
    }
    return result;
  } catch (err) {
    console.error('[Send Telegram Message Error]', err);
    return null;
  }
}

async function editTelegramMessage(chatId: number, messageId: number, text: string, inlineKeyboard?: any) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard ? inlineKeyboard : { inline_keyboard: [] },
      }),
    });
    const result = (await res.json()) as any;
    if (!result?.ok) {
      const desc = result?.description || '';
      if (desc.includes('chat not found') || desc.includes('message to edit not found')) {
        return;
      }
      const plainText = text.replace(/<[^>]*>?/gm, '');
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: plainText,
          reply_markup: inlineKeyboard ? inlineKeyboard : { inline_keyboard: [] },
        }),
      });
    }
  } catch (err) {
    console.error('[Edit Telegram Message Error]', err);
  }
}

async function answerTelegramCallback(callbackQueryId: string, text?: string, showAlert?: boolean) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert || false,
      }),
    });
  } catch (err) {
    console.error('[Answer Callback Error]', err);
  }
}

async function notifyAllAdmins(text: string, inlineKeyboard?: any) {
  const adminSet = new Set(adminChatIds);
  adminSet.add(PRIMARY_ADMIN_CHAT_ID);
  const currentAdmins = Array.from(adminSet);
  if (currentAdmins.length === 0) {
    return [];
  }
  const results = [];
  for (const chatId of currentAdmins) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard,
        }),
      });
      const data = (await res.json()) as any;
      if (data.ok) {
        results.push({ chatId, messageId: data.result.message_id });
      } else {
        const desc = data.description || '';
        if (chatId !== PRIMARY_ADMIN_CHAT_ID && (desc.includes('chat not found') || desc.includes('blocked') || desc.includes('deactivated'))) {
          console.info(`[Admin chat ${chatId} unavailable]: ${desc}`);
          adminChatIds = adminChatIds.filter(id => id !== chatId);
          saveAdminChatIds();
        }
      }
    } catch (err) {
      console.error(`[Notify Admin ${chatId} Error]`, err);
    }
  }
  return results;
}

const notified200FilledRounds = new Set<string>();

const CANONICAL_LOTTERIES_MAP: Record<string, { titleAm: string; jackpot: number; isItemPrize?: boolean; prizeNameAm?: string }> = {
  lot_tv_32: { titleAm: 'የ 32 ኢንች ኤልኢዲ ቲቪ ዕጣ', jackpot: 0, isItemPrize: true, prizeNameAm: 'የ 32 ኢንች ኤልኢዲ ቲቪ' },
  lot_derash_1000: { titleAm: 'ባለ 1,000 ብር ደራሽ', jackpot: 1000 },
  lot_derash_5000: { titleAm: 'ባለ 5,000 ብር ደራሽ', jackpot: 5000 },
  lot_derash_10000: { titleAm: 'ባለ 10,000 ብር ደራሽ', jackpot: 10000 },
  lot_derash_50000: { titleAm: 'ባለ 50,000 ብር ደራሽ', jackpot: 50000 },
};

async function checkAndNotify200Filled(lotteryId: string, count: number, roundNum: number = 1, customTitle?: string) {
  const cap = lotteryId === 'lot_derash_50000' ? 300 : 150;
  if (count < cap) return;
  const key = `${lotteryId}_r${roundNum}`;
  if (notified200FilledRounds.has(key)) return;
  notified200FilledRounds.add(key);

  const info = CANONICAL_LOTTERIES_MAP[lotteryId] || { titleAm: customTitle || lotteryId, jackpot: 1000, isItemPrize: lotteryId === 'lot_tv_32', prizeNameAm: 'የ 32 ኢንች ኤልኢዲ ቲቪ' };
  const isTv = lotteryId === 'lot_tv_32' || info.isItemPrize || info.titleAm?.includes('ቲቪ');
  const timeNow = new Date().toLocaleTimeString('en-US', { hour12: true, timeZone: 'Africa/Addis_Ababa' });
  const prizeDisplay = isTv
    ? `🎁 <b>ሽልማት:</b> <b>የ 32 ኢንች ኤልኢዲ ቲቪ (32 Inch TV)</b>\n`
    : `💰 <b>ሽልማት:</b> <b>${info.jackpot.toLocaleString()} ብር</b>\n`;

  const msg = 
    `🚨 <b>አስቸኳይ ማስታወቂያ ለአድሚን (Admin Alert)!</b>\n\n` +
    `🎯 <b>${cap} ሞልቷል ዕጣ አውጣ!</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📦 <b>የዕጣ ዓይነት:</b> <b>${info.titleAm}</b>\n` +
    `🔢 <b>የተሸጠ ትኬት:</b> <b>${count} / ${cap} (100% ሙሉ!)</b>\n` +
    prizeDisplay +
    `🏆 <b>ዙር:</b> <b>${roundNum}</b>\n` +
    `⏰ <b>ሰዓት:</b> ${timeNow}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ <b>ትኩረት:</b> የዚህ ዕጣ ትኬቶች ሙሉ በሙሉ ተጠናቀዋል። እባክዎ አሁኑኑ ወደ አድሚን ዳሽቦርድ በመግባት ዕጣውን ያውጡ!`;

  await notifyAllAdmins(msg);
  console.log(`[Alert Filled] Sent to admins: ${cap} ሞልቷል ዕጣ አውጣ for ${lotteryId} (Round ${roundNum})`);
}

function isAuthorizedAdmin(chatId: number, from?: any, phoneOrPass?: string): boolean {
  if (chatId === PRIMARY_ADMIN_CHAT_ID || from?.id === PRIMARY_ADMIN_CHAT_ID) {
    return true;
  }
  if (from?.username && from.username.toLowerCase().replace('@', '') === 'lij_makbel') {
    return true;
  }
  const wallet = userWallets[String(chatId)] || userWallets['0910961881'];
  if (wallet?.phone && normalizeEthiopianPhone(wallet.phone).endsWith('910961881') && (String(chatId) === wallet.telegramId || chatId === PRIMARY_ADMIN_CHAT_ID)) {
    return true;
  }
  return false;
}

async function sendTransactionsOverview(chatId: number, filter: 'all' | 'deposit' | 'withdrawal' | 'pending' = 'all') {
  let list = syncedTransactions;
  let title = '📊 <b>የገንዘብ ዝውውሮች (All Transactions)</b>';

  if (filter === 'deposit') {
    list = syncedTransactions.filter(t => t.type === 'deposit');
    title = '📥 <b>የገቢ ክፍያዎች (Deposits)</b>';
  } else if (filter === 'withdrawal') {
    list = syncedTransactions.filter(t => t.type === 'withdrawal');
    title = '📤 <b>የወጪ ክፍያዎች (Withdrawals)</b>';
  } else if (filter === 'pending') {
    list = syncedTransactions.filter(t => t.status === 'pending');
    title = '⏳ <b>ማረጋገጫ የሚጠብቁ (Pending Approvals)</b>';
  }

  const depSum = syncedTransactions.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((s, t) => s + t.amount, 0);
  const wthSum = syncedTransactions.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((s, t) => s + t.amount, 0);
  const pendingCount = syncedTransactions.filter(t => t.status === 'pending').length;

  let msg = `${title}\n\n` +
    `💰 <b>ጠቅላላ ገቢ:</b> <b>${depSum.toLocaleString()} ብር</b>\n` +
    `💸 <b>ጠቅላላ ወጪ:</b> <b>${wthSum.toLocaleString()} ብር</b>\n` +
    `⏳ <b>የሚጠብቁ:</b> <b>${pendingCount}</b> | 📋 <b>ጠቅላላ:</b> <b>${syncedTransactions.length}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (list.length === 0) {
    msg += `<i>ምንም ዝውውር አልተገኘም</i>`;
  } else {
    for (const tx of list.slice(0, 10)) {
      const isDep = tx.type === 'deposit';
      const isWth = tx.type === 'withdrawal';
      const icon = isDep ? '📥' : (isWth ? '📤' : '🎟');
      const stBadge = tx.status === 'completed' ? '✅' : (tx.status === 'pending' ? '⏳' : '❌');
      const timeStr = new Date(tx.timestamp).toLocaleString('am-ET', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      msg += `${icon} <b>${tx.amount.toLocaleString()} ብር</b> (${stBadge})\n` +
        `👤 <b>ስም:</b> ${escapeHtml(tx.userName)} (<code>${escapeHtml(tx.userPhone || 'የለም')}</code>)\n` +
        `🔖 <b>ማጣቀሻ:</b> <code>${escapeHtml(tx.referenceNumber)}</code>\n` +
        `⏰ <b>ቀን:</b> ${timeStr}\n` +
        `━━━━━━━━━━━━━━━\n`;
    }
  }

  const ik = {
    inline_keyboard: [
      [
        { text: filter === 'all' ? '• ሁሉም •' : 'ሁሉም', callback_data: 'txfilter_all' },
        { text: filter === 'deposit' ? '• ገቢ •' : 'ገቢ', callback_data: 'txfilter_deposit' },
      ],
      [
        { text: filter === 'withdrawal' ? '• ወጪ •' : 'ወጪ', callback_data: 'txfilter_withdrawal' },
        { text: filter === 'pending' ? `• የሚጠብቁ (${pendingCount}) •` : `የሚጠብቁ (${pendingCount})`, callback_data: 'txfilter_pending' },
      ],
      [
        { text: '🌐 መተግበሪያ ክፈት (Open)', url: APP_URL },
      ],
    ],
  };

  await sendTelegramResponse(chatId, msg, ik);
}

async function handleTelegramMessage(message: any) {
  try {
    const chatId = message.chat?.id;
    if (!chatId) return;

    const from = message.from;
    const text = (message.text || '').trim();
    const textLower = text.toLowerCase();
    const contact = message.contact;

    const wallet = getOrCreateWallet(chatId, from);
    const hasPhone = Boolean(wallet.phone && wallet.phone.length >= 9);
    const cleanPhone = hasPhone ? normalizeEthiopianPhone(wallet.phone) : '';
    const webAppUrl = cleanPhone 
      ? `${APP_URL}?phone=${cleanPhone}&userId=${wallet.userId}&tg_id=${chatId}&cid=${wallet.customerId}&username=${encodeURIComponent(wallet.username || '')}&name=${encodeURIComponent(wallet.fullName || '')}`
      : `${APP_URL}?tg_id=${chatId}&cid=${wallet.customerId}&username=${encodeURIComponent(wallet.username || '')}&name=${encodeURIComponent(wallet.fullName || '')}`;

    // 1. Detect Phone Number (via contact share or typed phone number)
    let detectedPhone = contact?.phone_number ? contact.phone_number.replace(/\D/g, '') : null;
    if (!detectedPhone && text && !text.startsWith('/')) {
      const cleanDigits = text.replace(/[\s-+]/g, '');
      const m = cleanDigits.match(/^(?:251|0)?([79]\d{8})$/);
      if (m) {
        detectedPhone = '0' + m[1];
      }
    }

    if (detectedPhone) {
      let cleanP = detectedPhone;
      if (cleanP.startsWith('251')) {
        cleanP = '0' + cleanP.slice(3);
      } else if (cleanP.startsWith('9') || cleanP.startsWith('7')) {
        cleanP = '0' + cleanP;
      }

      const linkedWallet = findOrCreateWallet({
        phone: cleanP,
        telegramId: String(chatId),
        fullName: from?.first_name ? `${from.first_name} ${from.last_name || ''}`.trim() : wallet.fullName,
        username: from?.username ? `@${from.username}` : wallet.username,
      });

      linkedWallet.phone = cleanP;
      linkedWallet.telegramId = String(chatId);
      if (!linkedWallet.customerId) {
        linkedWallet.customerId = 'TEWEDAJ-' + String(chatId).slice(-6);
      }
      if (!linkedWallet.registeredAt) {
        linkedWallet.registeredAt = new Date().toISOString();
      }
      saveUserWallets(true, linkedWallet);
      syncWalletToFirestore(linkedWallet).catch(() => {});
      console.log(`[Telegram User Registered & Linked] ChatID: ${chatId}, Phone: ${cleanP}, CID: ${linkedWallet.customerId}, Name: ${linkedWallet.fullName}`);
      
      if (cleanP.includes('910961881') || from?.username?.toLowerCase() === 'lij_makbel') {
        addAdminChatId(chatId);
        await sendTelegramResponse(
          chatId,
          `👑 <b>እንኳን ደህና መጡ አድሚን (0910961881)!</b>\n\nየአድሚን ዳሽቦርዱን ለመክፈት ከታች ያለውን ይጫኑ::\n\n📢 <b>ቴሌግራም ቻናል:</b> <a href="https://t.me/tewedaj_lottery">@tewedaj_lottery</a>\n💬 <b>እገዛ / ድጋፍ:</b> <a href="https://t.me/lij_makbel">@lij_makbel</a>`,
          {
            inline_keyboard: [
              [
                { text: '👑 የአድሚን ዳሽቦርድ (Admin)', web_app: { url: ADMIN_APP_URL } },
              ],
              [
                { text: '📢 ቴሌግራም ቻናል', url: 'https://t.me/tewedaj_lottery' },
                { text: '💬 እገዛ (@lij_makbel)', url: 'https://t.me/lij_makbel' },
              ],
            ],
          }
        );
        return;
      }

      const updatedWebAppUrl = `${APP_URL}?phone=${cleanP}&userId=${wallet.userId}&tg_id=${chatId}&cid=${wallet.customerId}&username=${encodeURIComponent(wallet.username || '')}&name=${encodeURIComponent(wallet.fullName || '')}`;

      const thankYouMsg = 
        `🇪🇹 <b>እንኳን ወደ ተወዳጅ ኦንላይን ሎተሪ በሰላም መጡ!</b>\n\n` +
        `✅ <b>እናመሰግናለን! ስልክዎ በተሳካ ሁኔታ ተመዝግቧል::</b>\n\n` +
        `🆔 <b>መለያ ቁጥር (ID):</b> <code>${wallet.customerId}</code>\n` +
        `📱 <b>ስልክ ቁጥር:</b> <code>${cleanP}</code>\n` +
        `👤 <b>ተጠቃሚ:</b> <b>${escapeHtml(wallet.fullName || 'ደንበኛ')}</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🎟 <b>ሎተሪውን ለመክፈት ከታች ያለውን "🎟 ሎተሪ ክፈት" የሚለውን ይጫኑ!</b>\n\n` +
        `📢 <b>የቴሌግራም ቻናል:</b> <a href="https://t.me/tewedaj_lottery">@tewedaj_lottery</a>\n` +
        `💬 <b>እገዛ / ድጋፍ:</b> <a href="https://t.me/lij_makbel">@lij_makbel</a>`;

      await sendTelegramResponse(chatId, thankYouMsg, {
        inline_keyboard: [
          [
            { text: '🎟 ሎተሪ ክፈት', web_app: { url: updatedWebAppUrl } },
          ],
        ],
      });

      updateTelegramBotMonthlyUsers().catch(() => {});

      if (!cleanP.includes('910961881')) {
        const readableRegDate = new Date().toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' });
        const tgRegMessage = 
          `👤 <b>ተጠቃሚ ስልኩን አጋርቷል / ተመዝግቧል!</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 <b>ስም:</b> <b>${escapeHtml(wallet.fullName || 'ደንበኛ')}</b>\n` +
          `🆔 <b>መለያ (CID):</b> <code>${wallet.customerId}</code>\n` +
          `📱 <b>ስልክ ቁጥር:</b> <code>${cleanP}</code>\n` +
          (wallet.username ? `💬 <b>ቴሌግራም:</b> @${wallet.username.replace('@', '')}\n` : '') +
          `⏰ <b>ሰዓት:</b> ${readableRegDate}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `<i>ተወዳጅ ኦንላይን ሎተሪ (Tewedaj Online Lottery)</i>`;

        notifyAllAdmins(tgRegMessage, {
          inline_keyboard: [
            [
              { text: '👑 የአድሚን ዳሽቦርድ (Admin)', web_app: { url: ADMIN_APP_URL } },
            ],
          ],
        }).catch(() => {});
      }
      return;
    }

    const isAdmin = isAuthorizedAdmin(chatId, from, text);
    if (isAdmin) {
      addAdminChatId(chatId);
    }

    // 2. /start command
    if (text === '/start' || textLower.startsWith('/start') || textLower === 'start') {
      if (!wallet.customerId) {
        wallet.customerId = 'TEWEDAJ-' + String(chatId).slice(-6);
      }
      if (from?.username) wallet.username = `@${from.username}`;
      if (from?.first_name) {
        wallet.fullName = `${from.first_name} ${from.last_name || ''}`.trim();
      }
      if (!wallet.registeredAt) {
        wallet.registeredAt = new Date().toISOString();
      }
      wallet.telegramId = String(chatId);
      saveUserWallets();

      logBotActivity(chatId, 'bot_start', 'User launched /start command', cleanPhone, wallet.fullName).catch(() => {});

      if (!hasPhone) {
        const promptContactMsg = 
          `🇪🇹 <b>እንኳን ወደ ተወዳጅ ኦንላይን ሎተሪ በሰላም መጡ!</b>\n\n` +
          `🆔 <b>የእርስዎ መለያ ቁጥር (ID):</b> <code>${wallet.customerId}</code>\n` +
          `👤 <b>ተጠቃሚ:</b> <b>${escapeHtml(wallet.fullName || 'ደንበኛ')}</b>\n` +
          `👉 <b>እባክዎ በቅድሚያ ከታች ያለውን "📱 ስልክዎን ያጋሩ" የሚለውን በመጫን ይመዝገቡ!</b>\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📢 <b>የቴሌግራም ቻናል:</b> <a href="https://t.me/tewedaj_lottery">@tewedaj_lottery</a>\n` +
          `💬 <b>እገዛ / ድጋፍ:</b> <a href="https://t.me/lij_makbel">@lij_makbel</a>`;

        await sendTelegramResponse(chatId, promptContactMsg, {
          keyboard: [[{ text: '📱 ስልክዎን ያጋሩ', request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        });
      } else {
        const welcomeMsg = 
          `🇪🇹 <b>እንኳን ወደ ተወዳጅ ኦንላይን ሎተሪ በሰላም መጡ!</b>\n\n` +
          `🆔 <b>መለያ (ID):</b> <code>${wallet.customerId}</code>\n` +
          `📱 <b>ስልክ:</b> <code>${cleanPhone}</code>\n` +
          `👤 <b>ተጠቃሚ:</b> <b>${escapeHtml(wallet.fullName || 'ደንበኛ')}</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `🎟 <b>ሎተሪ ለመክፈት ከታች ያለውን "🎟 ሎተሪ ክፈት" የሚለውን ይጫኑ!</b>\n\n` +
          `📢 <b>የቴሌግራም ቻናል:</b> <a href="https://t.me/tewedaj_lottery">@tewedaj_lottery</a>\n` +
          `💬 <b>እገዛ / ድጋፍ:</b> <a href="https://t.me/lij_makbel">@lij_makbel</a>`;

        await sendTelegramResponse(chatId, welcomeMsg, {
          inline_keyboard: [
            [
              { text: '🎟 ሎተሪ ክፈት', web_app: { url: webAppUrl } },
            ],
          ],
        });
      }
      return;
    }

    // 3. /lottery command or 🎟 ሎተሪ ክፈት
    if (text === '/lottery' || textLower === 'lottery' || text === '🎟 ሎተሪ ክፈት' || textLower.includes('ሎተሪ')) {
      logBotActivity(chatId, 'bot_lottery_view', 'User viewed lotteries list in bot', cleanPhone, wallet.fullName).catch(() => {});

      const lotteryMsg = 
        `🎟 <b>ተወዳጅ ኦንላይን ሎተሪ (Tewedaj Online Lottery)</b>\n\n` +
        `በስራ ላይ ያሉ ንቁ የሎተሪ ዕጣዎች፦\n` +
        `• <b>ባለ 1,000 ብር ደራሽ</b> (በ 10 ብር ይቁረጡ)\n` +
        `• <b>ባለ 5,000 ብር ደራሽ</b> (በ 50 ብር ይቁረጡ)\n` +
        `• <b>ባለ 10,000 ብር ደራሽ</b> (በ 100 ብር ይቁረጡ)\n` +
        `• <b>ባለ 50,000 ብር ደራሽ</b> (በ 200 ብር ይቁረጡ)\n` +
        `• <b>የ 32 ኢንች ኤልኢዲ ቲቪ ዕጣ</b> (በ 200 ብር ይቁረጡ)\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🎟 <b>ትኬት ለመቁረጥ እና ለመጫወት አፑን ይክፈቱ!</b>`;

      await sendTelegramResponse(chatId, lotteryMsg, {
        inline_keyboard: [
          [
            { text: '🎟 ሎተሪ አሁን ክፈት (Open App)', web_app: { url: webAppUrl } },
          ],
        ],
      });
      return;
    }

    // 4. /wallet command or 💳 ዋሌት
    if (text === '/wallet' || textLower === 'wallet' || text === '💳 የዋሌት ሒሳብ' || text === '💳 ዋሌት' || textLower.includes('ዋሌት')) {
      logBotActivity(chatId, 'bot_wallet_view', 'User checked wallet balance in bot', cleanPhone, wallet.fullName).catch(() => {});

      const walletMsg = 
        `💳 <b>የእርስዎ ዋሌት መረጃ (My Wallet)</b>\n\n` +
        `🆔 <b>መለያ (CID):</b> <code>${wallet.customerId}</code>\n` +
        `📱 <b>ስልክ ቁጥር:</b> <code>${wallet.phone || 'ያልተመዘገበ'}</code>\n` +
        `🎟 <b>የተቆረጡ ትኬቶች:</b> <b>${wallet.ticketsCount || 0}</b>\n` +
        `🏆 <b>ያሸነፉት ጠቅላላ:</b> <b>${(wallet.totalWon || 0).toLocaleString()} ብር</b>\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `💰 <b>ዋሌትዎን ለመክፈት ከታች ያለውን ቁልፍ ይጫኑ!</b>`;

      await sendTelegramResponse(chatId, walletMsg, {
        inline_keyboard: [
          [
            { text: '💳 ዋሌት ክፈት (Open Wallet)', web_app: { url: `${webAppUrl}&tab=wallet` } },
          ],
        ],
      });
      return;
    }

    // 5. /help command or 💬 እገዛ / ድጋፍ
    if (text === '/help' || textLower === 'help' || text === '💬 እገዛ / ድጋፍ' || textLower.includes('እገዛ') || textLower.includes('ድጋፍ')) {
      logBotActivity(chatId, 'bot_help_view', 'User requested help & support in bot', cleanPhone, wallet.fullName).catch(() => {});
      const helpMsg = 
        `💬 <b>እገዛ እና ድጋፍ (Help & Support)</b>\n\n` +
        `ማንኛውም ጥያቄ፣ የገቢ/ወጪ ችግር ወይም እርዳታ ሲፈልጉ በቀጥታ ያግኙን፦\n\n` +
        `👑 <b>ዋና አድሚን:</b> <a href="https://t.me/lij_makbel">@lij_makbel</a>\n` +
        `📞 <b>ስልክ:</b> <code>0910961881</code>\n` +
        `📢 <b>ይፋዊ ቻናል:</b> <a href="https://t.me/tewedaj_lottery">@tewedaj_lottery</a>\n\n` +
        `━━━━━━━━━━━━━━━━━━━━`;

      await sendTelegramResponse(chatId, helpMsg, {
        inline_keyboard: [
          [
            { text: '💬 አድሚኑን ያነጋግሩ (@lij_makbel)', url: 'https://t.me/lij_makbel' },
          ],
          [
            { text: '📢 ይፋዊ ቻናል', url: 'https://t.me/tewedaj_lottery' },
          ],
        ],
      });
      return;
    }

    // 6. 📱 ስልክ ቁጥር
    if (text === '📱 ስልክ ቁጥር') {
      const phoneMsg = `📱 <b>የተመዘገበ ስልክ ቁጥርዎ፦</b> <code>${wallet.phone || 'አልተመዘገበም (እባክዎ ስልክዎን ያጋሩ)'}</code>`;
      await sendTelegramResponse(chatId, phoneMsg);
      return;
    }

    // 7. Admin management command
    if (isAdmin && (text === '/admin' || text === '2728' || text.includes('0910961881') || textLower.includes('office_makbel_admin'))) {
      addAdminChatId(chatId);
      await sendTransactionsOverview(chatId, 'pending');
      return;
    }

    // 8. Default message handler:
    const simpleMsg = 
      `🇪🇹 <b>ተወዳጅ ኦንላይን ሎተሪ (Tewedaj Online Lottery)</b>\n\n` +
      `ትኬት ለመቁረጥ እና ዋሌትዎን ለመጠቀም ከታች <b>'🎟 ሎተሪ ክፈት'</b> የሚለውን ይጫኑ::\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📢 <b>የቴሌግራም ቻናል:</b> <a href="https://t.me/tewedaj_lottery">@tewedaj_lottery</a>\n` +
      `💬 <b>እገዛ / ድጋፍ:</b> <a href="https://t.me/lij_makbel">@lij_makbel</a>\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    await sendTelegramResponse(chatId, simpleMsg, {
      inline_keyboard: [
        [
          { text: '🎟 ሎተሪ ክፈት (OPEN)', web_app: { url: webAppUrl } },
        ],
      ],
    });
    return;
  } catch (e) {
    console.error('[Telegram Message Error]', e);
  }
}

const notifiedUserTxStatus = new Set<string>();

async function sendUserTransactionStatusTelegramNotification(tx: SyncedTransaction, status: string, userWallet: UserWallet) {
  const notifKey = `${tx.id}_${status}`;
  if (notifiedUserTxStatus.has(notifKey)) {
    console.log(`[Telegram Notification Skipped] Duplicate status notification skipped for ${notifKey}`);
    return;
  }
  notifiedUserTxStatus.add(notifKey);

  const customerChatId = Number(userWallet.telegramId || (tx as any).telegramId || tx.userId);
  if (!isNaN(customerChatId) && customerChatId > 0) {
    const isApprove = status === 'completed';
    const userNotif = isApprove
      ? (tx.type === 'deposit'
          ? `🎉 <b>የገንዘብ ማስገቢያ ጥያቄዎ ጸድቋል!</b>\n\nየ <b>${Number(tx.amount).toLocaleString()} ብር</b> ተቀብለን ወደ ዋሌትዎ ገብቷል::\n\nተወዳጅ ኦንላይን ሎተሪ (Tewedaj Online Lottery)`
          : `💸 <b>የገንዘብ ማውጣት ጥያቄዎ ተፈጽሟል!</b>\n\nየ <b>${Number(tx.amount).toLocaleString()} ብር</b> ወደ አካውንትዎ (<code>${tx.userPhone}</code>) ተላልፏል::\n\nተወዳጅ ኦንላይን ሎተሪ (Tewedaj Online Lottery)`)
      : (tx.type === 'deposit'
          ? `❌ <b>የ ${Number(tx.amount).toLocaleString()} ብር ገቢ ጥያቄዎ ውድቅ ተደርጓል::</b>\nለተጨማሪ መረጃ ድጋፍ ሰጪውን ያነጋግሩ (@lij_makbel)`
          : `❌ የ <b>${Number(tx.amount).toLocaleString()} ብር</b> ማውጣት ጥያቄዎ ውድቅ ተደርጓል፤ ገንዘቡ ወደ ዋሌትዎ ተመልሷል::\n\nተወዳጅ ኦንላይን ሎተሪ (Tewedaj Online Lottery)`);

    if (!userWallet.notifications) userWallet.notifications = [];
    userWallet.notifications.push({
      id: 'notif_' + Date.now(),
      message: userNotif,
      timestamp: new Date().toISOString(),
      isRead: false
    });
    saveUserWallets(true, userWallet);
    await sendTelegramResponse(customerChatId, userNotif).catch(() => {});
  }
}

async function handleTelegramCallback(callbackQuery: any) {
  try {
    const callbackId = callbackQuery.id;
    const chatId = callbackQuery.message?.chat?.id;
    const data = callbackQuery.data;
    const firstName = callbackQuery.from?.first_name || 'Admin';

    if (data.startsWith('appr:') || data.startsWith('rejc:')) {
      const isApprove = data.startsWith('appr:');
      const txId = data.replace(/^appr:|^rejc:/, '');
      const callerFrom = callbackQuery.from;

      if (!isAuthorizedAdmin(chatId, callerFrom)) {
        await answerTelegramCallback(
          callbackId,
          'ይህንን ለማድረግ ፈቃድ የለዎትም (0910961881 ብቻ)::',
          true
        );
        return;
      }

      let tx = syncedTransactions.find((t) => t.id === txId);
      if (!tx) {
        try {
          const snap = await getDoc(doc(firestore, 'transactions', txId));
          if (snap.exists()) {
            tx = snap.data() as SyncedTransaction;
            syncedTransactions.push(tx);
          }
        } catch (e) {
          console.warn('[Fetch Tx from Firestore Error]', e);
        }
      }

      if (tx) {
        if (tx.status === 'completed' || tx.status === 'failed') {
          await answerTelegramCallback(callbackId, 'ይህ ጥያቄ ቀደም ሲል ተከናውኗል!', true);
          return;
        }
        const previousStatus: string = tx.status;
        tx.status = isApprove ? 'completed' : 'failed';
        tx.approvedBy = `${firstName} (0910961881)`;
        tx.approvedAt = new Date().toISOString();
        saveTransactions();
        await syncTransactionToFirestore(tx).catch(() => {});

        const userWallet = findOrCreateWallet({
          userId: tx.userId,
          phone: tx.userPhone,
          fullName: tx.userName,
        });

        if (isApprove && tx.type === 'deposit' && previousStatus === 'pending') {
          await reconcileWalletForUser(userWallet.userId, userWallet.phone, (tx as any).telegramId);

          const apprNotif = {
            id: 'notif_appr_' + Date.now(),
            userId: tx.userId || userWallet.userId,
            userName: tx.userName,
            userPhone: tx.userPhone,
            lotteryId: 'wallet',
            lotteryTitleAm: 'ገንዘብ ገቢ ተደርጓል',
            ticketNumber: tx.referenceNumber || '',
            amountWon: 0,
            timestamp: new Date().toISOString(),
            isRead: false,
            messageAm: `የ ${Number(tx.amount).toLocaleString()} ብር ገቢ ጥያቄዎ በአድሚን ጸድቆ ዋሌትዎ ላይ ገቢ ተደርጓል:: (ማጣቀሻ: ${tx.referenceNumber || ''})`,
            messageEn: `Your deposit of ${Number(tx.amount).toLocaleString()} ETB was approved and credited to your wallet!`,
          };
          await setDoc(doc(firestore, 'notifications', apprNotif.id), apprNotif, { merge: true }).catch(() => {});
        } else if (!isApprove && tx.type === 'withdrawal' && previousStatus === 'pending') {
          await reconcileWalletForUser(userWallet.userId, userWallet.phone, (tx as any).telegramId);
        }

        // Immediately sync to Firebase Firestore dashboard
        syncDashboardToFirestore({
          id: 'act_bot_' + (isApprove ? 'appr_' : 'rejc_') + tx.id,
          type: isApprove
            ? (tx.type === 'deposit' ? 'deposit_approved' : 'withdrawal_approved')
            : (tx.type === 'deposit' ? 'deposit_request' : 'withdrawal_request'),
          titleAm: isApprove
            ? (tx.type === 'deposit' ? 'የገቢ ጥያቄ በቦት ጸድቋል' : 'የማውጣት ጥያቄ በቦት ጸድቋል')
            : (tx.type === 'deposit' ? 'የገቢ ጥያቄ በቦት ውድቅ ተደርጓል' : 'የማውጣት ጥያቄ በቦት ውድቅ ተደርጓል'),
          titleEn: isApprove ? 'Deposit Approved via Bot' : 'Withdrawal Approved via Bot',
          descriptionAm: isApprove
            ? (tx.type === 'deposit'
                ? `✅ የ ${Number(tx.amount).toLocaleString()} ብር ገቢ ጸድቋል (${tx.userName} - ${tx.userPhone})`
                : `💸 የ ${Number(tx.amount).toLocaleString()} ብር ወጪ ጸድቋል (${tx.userName} - ${tx.userPhone})`)
            : `❌ የ ${Number(tx.amount).toLocaleString()} ብር ${tx.type === 'deposit' ? 'ገቢ' : 'ወጪ'} ውድቅ ተደርጓል (${tx.userName})`,
          descriptionEn: `${isApprove ? 'Approved' : 'Rejected'} ${tx.type} of ${tx.amount} ETB for ${tx.userName}`,
          userPhone: tx.userPhone,
          userName: tx.userName,
          amount: Number(tx.amount),
          timestamp: new Date().toISOString(),
        }).catch(() => {});

        await sendUserTransactionStatusTelegramNotification(tx, isApprove ? 'completed' : 'failed', userWallet);
      }

      const alertMsg = isApprove 
        ? `የ ${tx?.amount?.toLocaleString() || ''} ብር ክፍያ ጸድቋል!` 
        : `የ ${tx?.amount?.toLocaleString() || ''} ብር ክፍያ ውድቅ ተደርጓል!`;
      await answerTelegramCallback(callbackId, alertMsg, true);

      // Update all bot messages for this transaction (if multiple admins received it)
      if (tx) {
        updateBotMessagesStatus(tx).catch(() => {});
      }
      return;
    }

    if (data.startsWith('txfilter_')) {
      const filter = data.replace('txfilter_', '') as 'all' | 'deposit' | 'withdrawal' | 'pending';
      await answerTelegramCallback(callbackId, 'ዝርዝሩ በመጫን ላይ...');
      await sendTransactionsOverview(chatId, filter);
      return;
    }

    if (data === 'done' || data === 'noop') {
      await answerTelegramCallback(callbackId, 'ተጠናቋል!');
      return;
    }

    await answerTelegramCallback(callbackId);
  } catch (err) {
    console.error('[Telegram Callback Error]', err);
  }
}

// REST API Endpoints
app.get('/api/merchant', (_req, res) => {
  res.json({
    ok: true,
    merchant: OFFICIAL_MERCHANT,
  });
});

app.get('/api/lottery/status', (_req, res) => {
  res.json({
    ok: true,
    platform: 'Tewedaj Online Lottery (ተወዳጅ ኦንላይን ሎተሪ)',
    merchant: OFFICIAL_MERCHANT,
  });
});

app.get('/api/telegram/status', async (_req, res) => {
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
    const data = await tgRes.json();
    res.json({
      ok: true,
      bot: data.result,
      configuredUrl: APP_URL,
      adminCount: adminChatIds.length,
      adminChatIds: adminChatIds,
      botUsername: BOT_USERNAME,
      officialAdminPhone: OFFICIAL_ADMIN.phone,
      officialSupport: OFFICIAL_ADMIN.supportUsername,
    });
  } catch (err: any) {
    res.json({ ok: false, error: err.message, adminCount: adminChatIds.length });
  }
});

app.post('/api/telegram/test-alert', async (_req, res) => {
  try {
    const timeNow = new Date().toLocaleTimeString('en-US');
    const msg = 
      `🚨 <b>የሙከራ መልዕክት (Test Alert)</b>\n\n` +
      `የተወዳጅ ሎተሪ ቦት (@${BOT_USERNAME}) በትክክል እየሰራ ነው!\n` +
      `📞 ስልክ: <b>0910961881</b>\n` +
      `💬 ቴሌግራም: <b>@${OFFICIAL_ADMIN.supportUsername}</b>\n` +
      `⏰ ሰዓት: ${timeNow}`;
    const results = await notifyAllAdmins(msg, {
      inline_keyboard: [
        [
          { text: '✅ ይሰራል (Working)', callback_data: 'done' },
          { text: '🌐 ወደ መተግበሪያ', url: APP_URL },
        ],
      ],
    });
    res.json({ ok: true, sentCount: results.length, totalAdmins: adminChatIds.length });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/notify-admin', async (req, res) => {
  await ensureFirestoreLoaded();
  const { id, type, userName, userPhone, amount, paymentMethod, referenceNumber, timestamp, userId, telegramId, screenshotUrl } = req.body;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Transaction id is required' });
  }

  const finalUserId = userId || telegramId || '';
  const cleanPhone = normalizeEthiopianPhone(userPhone);

  // IMMEDIATELY bind wallet and phone number on deposit!
  if (cleanPhone && cleanPhone.length >= 9) {
    const canonicalKey = cleanPhone.length === 10 ? cleanPhone : `0${cleanPhone.slice(-9)}`;
    const existing = userWallets[canonicalKey];
    if (!existing) {
      userWallets[canonicalKey] = {
        userId: finalUserId || `usr_${canonicalKey}`,
        phone: canonicalKey,
        fullName: (userName && userName.trim() && userName !== 'ተጠቃሚ' && !userName.startsWith('ደንበኛ')) ? userName.trim() : `ደንበኛ (${canonicalKey})`,
        walletBalance: 0,
        ticketsCount: 0,
        totalWon: 0,
        language: 'am',
        registeredAt: new Date().toISOString(),
      };
    } else {
      if (userName && userName.trim() && userName !== 'ተጠቃሚ' && (!existing.fullName || existing.fullName === 'ተጠቃሚ' || existing.fullName.startsWith('ደንበኛ'))) {
        existing.fullName = userName.trim();
      }
      if (!existing.phone) existing.phone = canonicalKey;
    }
    saveUserWallets();
  } else {
    findOrCreateWallet({ userId: finalUserId, phone: userPhone, telegramId, fullName: userName });
  }

  const existingIndex = syncedTransactions.findIndex((t) => t.id === id);
  // Requirement: Deposits and Withdrawals MUST be 'pending' for Admin approval.
  // Only ticket purchases are auto-completed.
  const txStatus = (type === 'ticket_purchase') ? 'completed' : 'pending';
  
  const txRecord: SyncedTransaction = {
    id,
    type: type || 'deposit',
    userId: finalUserId,
    userName: (userName && userName !== 'ተጠቃሚ') ? userName : (userPhone || 'ደንበኛ'),
    userPhone: userPhone || '',
    amount: Number(amount) || 0,
    paymentMethod: paymentMethod || 'wallet',
    referenceNumber: referenceNumber || 'REF-' + Date.now(),
    screenshotUrl: screenshotUrl || undefined,
    timestamp: timestamp || new Date().toISOString(),
    status: txStatus,
    approvedBy: type === 'ticket_purchase' ? 'System Auto-Approve' : undefined,
    approvedAt: type === 'ticket_purchase' ? new Date().toISOString() : undefined,
    source: 'mini_app',
  };

  const isDeposit = type === 'deposit';
  const isWth = type === 'withdrawal';

  // Enforce limits
  if (isDeposit) {
    const dAmount = Number(amount) || 0;
    if (dAmount < 10) {
      return res.status(400).json({ ok: false, error: 'Minimum deposit is 10 ETB (ዝቅተኛው የገቢ መጠን 10 ብር ነው)' });
    }
  }

  if (isWth) {
    const wAmount = Number(amount) || 0;
    if (wAmount < 50) {
      return res.status(400).json({ ok: false, error: 'Minimum withdrawal is 50 ETB (ዝቅተኛው የማውጣት መጠን 50 ብር ነው)' });
    }
    const userWallet = findOrCreateWallet({ userId: finalUserId, phone: userPhone, telegramId, fullName: userName });
    if (userWallet.walletBalance < wAmount) {
      return res.status(400).json({ ok: false, error: 'Insufficient balance (በቂ ሒሳብ የለዎትም)' });
    }
  }

  if (existingIndex >= 0) {
    syncedTransactions[existingIndex] = { ...syncedTransactions[existingIndex], ...txRecord };
  } else {
    syncedTransactions.unshift(txRecord);
  }
  saveTransactions();
  recordMiniAppActivity(finalUserId, (type || 'deposit') + '_request', {
    userName,
    userPhone,
    amount: Number(amount) || 0,
    referenceNumber,
    paymentMethod,
  }).catch(() => {});
  await syncTransactionToFirestore(txRecord).catch(() => {});

  // STRICT RULE: Pending deposit creation MUST NOT change wallet balance! Only Admin approval credits balance.
  if (type !== 'deposit') {
    await reconcileWalletForUser(finalUserId, userPhone, telegramId);
  }

  if (type === 'ticket_purchase') {
    return res.json({ ok: true, txId: id, status: 'completed' });
  }

  await sendTransactionNotificationToTelegram(txRecord);

  res.json({
    ok: true,
    txId: id,
    status: txStatus,
  });
});


// Periodic task to sweep inactive users and mark them offline (improves "online" indicator reliability)
if (!isVercel) {
  const sweepInterval = setInterval(async () => {
    let changed = false;
    const now = Date.now();
    const INACTIVE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

    for (const wallet of Object.values(userWallets)) {
      if (wallet.isOnline && wallet.lastActive) {
        const lastActiveTime = new Date(wallet.lastActive).getTime();
        if (now - lastActiveTime > INACTIVE_THRESHOLD_MS) {
          wallet.isOnline = false;
          changed = true;
          syncWalletToFirestore(wallet).catch(() => {});
        }
      }
    }
    if (changed) {
      saveUserWallets(false);
    }
  }, 60000); // Check every minute
  if (sweepInterval.unref) sweepInterval.unref();
}


const notifiedTxIds = new Set<string>();

async function sendTransactionNotificationToTelegram(tx: SyncedTransaction) {
  if (notifiedTxIds.has(tx.id)) return;

  if (tx.type === 'ticket_purchase') {
    const tgMessage = 
      `🎟 <b>አዲስ የትኬት ግዢ (New Ticket Purchase)</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>ደንበኛ:</b> <b>${escapeHtml(tx.userName)}</b>\n` +
      `📱 <b>ስልክ:</b> <code>${escapeHtml(tx.userPhone)}</code>\n` +
      `💰 <b>የተከፈለው:</b> <b>${tx.amount.toLocaleString()} ብር</b>\n` +
      `🔖 <b>ማጣቀሻ:</b> <code>${escapeHtml(tx.referenceNumber)}</code>\n` +
      `━━━━━━━━━━━━━━━━━━━━`;
    const res = await notifyAllAdmins(tgMessage);
    if (res && res.length > 0) {
      notifiedTxIds.add(tx.id);
    }
    return;
  }

  const isDeposit = tx.type === 'deposit';
  let tgMessage = '';
  if (isDeposit) {
    tgMessage = 
      `📥 <b>አዲስ የገንዘብ ማስገቢያ ጥያቄ</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>የደንበኛ ስም:</b> <b>${escapeHtml(tx.userName)}</b>\n` +
      `📱 <b>ስልክ ቁጥር:</b> <code>${escapeHtml(tx.userPhone)}</code>\n` +
      `💰 <b>የብር መጠን:</b> <b>${Number(tx.amount).toLocaleString()} ብር (ETB)</b>\n` +
      `💳 <b>የክፍያ ዘዴ:</b> <b>${String(tx.paymentMethod).toUpperCase()}</b>\n` +
      `🔖 <b>የማጣቀሻ ቁጥር:</b> <code>${escapeHtml(tx.referenceNumber)}</code>\n` +
      (tx.screenshotUrl ? `📸 <b>ደረሰኝ:</b> ፎቶ በዳሽቦርድ ይገኛል\n` : '') +
      `⏰ <b>ሰዓት:</b> ${new Date(tx.timestamp || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Addis_Ababa' })}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<i>እባክዎ ክፍያውን ካረጋገጡ በኋላ 'አጽድቅ' የሚለውን ይጫኑ::</i>`;
  } else {
    tgMessage = 
      `📤 <b>አዲስ የገንዘብ ማውጣት ጥያቄ</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 <b>የደንበኛ ስም:</b> <b>${escapeHtml(tx.userName)}</b>\n` +
      `📱 <b>መቀበያ አካውንት:</b> <code>${escapeHtml(tx.userPhone)}</code>\n` +
      `💸 <b>የሚወጣው መጠን:</b> <b>${Number(tx.amount).toLocaleString()} ብር (ETB)</b>\n` +
      `⏰ <b>ሰዓት:</b> ${new Date(tx.timestamp || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Addis_Ababa' })}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `<i>ገንዘቡን ወደ <code>${escapeHtml(tx.userPhone)}</code> ልከው ሲያጠናቅቁ 'አጽድቅ' የሚለውን ይጫኑ::</i>`;
  }

  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: '✅ አጽድቅ', callback_data: `appr:${tx.id}` },
        { text: '❌ ውድቅ', callback_data: `rejc:${tx.id}` },
      ],
      [
        { text: '👑 የአድሚን ዳሽቦርድ', web_app: { url: ADMIN_APP_URL } },
      ],
    ],
  };

  const results = await notifyAllAdmins(tgMessage, inlineKeyboard);
  if (results && results.length > 0) {
    notifiedTxIds.add(tx.id);
    tx.notifiedAdminMessages = results.map(r => ({ chatId: r.chatId, messageId: r.messageId, text: tgMessage }));
    saveTransactions();
  }
}

async function updateBotMessagesStatus(tx: SyncedTransaction) {
  if (!tx.notifiedAdminMessages || tx.notifiedAdminMessages.length === 0) return;

  const isApprove = tx.status === 'completed';
  const timeNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Addis_Ababa' });
  const badge = isApprove
    ? `\n\n✅ <b>ተፈቅዷል (APPROVED)</b>\n👤 <b>${tx.approvedBy || 'Admin'}</b>\n⏰ ${timeNow}`
    : `\n\n❌ <b>ውድቅ ተደርጓል (REJECTED)</b>\n👤 <b>${tx.approvedBy || 'Admin'}</b>\n⏰ ${timeNow}`;

  const updatedKeyboard = {
    inline_keyboard: [
      [
        {
          text: isApprove ? '✅ ጸድቋል' : '❌ ውድቅ ሆኗል',
          callback_data: 'done',
        },
      ],
      [
        {
          text: '🌐 መተግበሪያ ክፈት (Open)',
          url: APP_URL,
        },
      ],
    ],
  };

  for (const msg of tx.notifiedAdminMessages) {
    try {
      await editTelegramMessage(msg.chatId, msg.messageId, msg.text + badge, updatedKeyboard);
    } catch (err) {
      console.error(`[Update Bot Message Error] Chat: ${msg.chatId}, Msg: ${msg.messageId}`, err);
    }
  }
}

function initFirestoreTransactionsWatcher() {
  try {
    // Listen to all transactions to keep server state in sync with Firestore without strict index requirement
    const q = query(collection(firestore, 'transactions'), limit(250));
    onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const tx = change.doc.data() as SyncedTransaction;
          if (tx && tx.id) {
            const idx = syncedTransactions.findIndex(t => t.id === tx.id);
            if (idx >= 0) {
              // If the status has changed to completed/failed, update our local store
              const oldStatus = syncedTransactions[idx].status;
              syncedTransactions[idx] = { ...syncedTransactions[idx], ...tx };
              
              if (oldStatus === 'pending' && tx.status !== 'pending') {
                console.log(`[Firestore Sync] Transaction ${tx.id} status transition: ${oldStatus} -> ${tx.status === 'failed' ? 'rejected' : tx.status}`);
                saveTransactions();
                reconcileWalletForUser(tx.userId, tx.userPhone, (tx as any).telegramId).catch(() => {});
              }
            } else {
              // New transaction found in Firestore
              syncedTransactions.unshift(tx);
              saveTransactions();
              
              // Only notify if it's pending and we haven't notified yet
              if (tx.status === 'pending' && !notifiedTxIds.has(tx.id)) {
                sendTransactionNotificationToTelegram(tx).catch(() => {});
              }
              // STRICT RULE: Do NOT reconcile or credit on pending transaction addition!
            }
        }
        } else if (change.type === 'removed') {
          const tx = change.doc.data() as SyncedTransaction;
          if (tx && tx.id) {
            const idx = syncedTransactions.findIndex(t => t.id === tx.id);
            if (idx >= 0) {
              syncedTransactions.splice(idx, 1);
              saveTransactions();
            }
            // Force authoritative wallet reconciliation for the user involved
            reconcileWalletForUser(tx.userId, tx.userPhone).catch(() => {});
          }
        }
      });
    }, (err) => {
      handleFirestoreError(err, 'initFirestoreTransactionsWatcher');
    });
  } catch (err) {
    handleFirestoreError(err, 'initFirestoreTransactionsWatcher_init');
  }
}

function initFirestoreTicketsWatcher() {
  try {
    const q = query(collection(firestore, 'tickets'));
    onSnapshot(q, (snapshot) => {
      let changed = false;
      const affectedUsers = new Set<string>();

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data() as any;
          const id = data?.id || change.doc.id;
          const ticketNumber = data?.ticketNumber || data?.ticket_number || data?.number || id.replace('tkt_', '');
          const userPhone = data?.userPhone || data?.phone || '';
          const wallet = userPhone ? findWalletByPhone(userPhone) : (data?.userId ? findOrCreateWallet({ userId: data.userId }) : undefined);
          const userName = (data?.userName && data.userName !== 'ተጠቃሚ') ? data.userName : (wallet?.fullName || (userPhone ? `ደንበኛ (${userPhone})` : 'ደንበኛ'));

          const tk: SyncedTicket = {
            id,
            lotteryId: data?.lotteryId || (data?.pricePaid === 10 ? 'lot_derash_1000' : data?.pricePaid === 50 ? 'lot_derash_5000' : data?.pricePaid === 100 ? 'lot_derash_10000' : 'lot_derash_50000'),
            lotteryTitleAm: data?.lotteryTitleAm || 'ባለ 1,000 ብር ደራሽ',
            lotteryTitleEn: data?.lotteryTitleEn || 'Bale 1,000 ETB Derash',
            ticketNumber: String(ticketNumber),
            userId: data?.userId || wallet?.userId || '0920561776',
            userName,
            userPhone: userPhone || wallet?.phone || '',
            userTelegram: data?.userTelegram || wallet?.username || '',
            pricePaid: Number(data?.pricePaid) || 10,
            purchasedAt: data?.purchasedAt || data?.purchaseDate || new Date().toISOString(),
            paymentMethod: data?.paymentMethod || 'wallet',
            paymentReference: data?.paymentReference || `TKT-${ticketNumber}`,
            round: Number(data?.round) || 1,
            status: data?.status || 'active',
            securityHash: data?.securityHash || `ETH-${ticketNumber}`,
          };

          const idx = syncedTickets.findIndex(t => t.id === id || t.ticketNumber === tk.ticketNumber);
          if (idx >= 0) {
            syncedTickets[idx] = { ...syncedTickets[idx], ...tk };
          } else {
            syncedTickets.unshift(tk);
          }
          changed = true;
          if (tk.userId) affectedUsers.add(tk.userId);
          if (tk.userPhone) affectedUsers.add(tk.userPhone);
        } else if (change.type === 'removed') {
          const id = change.doc.id;
          const idx = syncedTickets.findIndex(t => t.id === id);
          if (idx >= 0) {
            const tk = syncedTickets[idx];
            if (tk.userId) affectedUsers.add(tk.userId);
            if (tk.userPhone) affectedUsers.add(tk.userPhone);
            syncedTickets.splice(idx, 1);
            changed = true;
          }
        }
      });
      if (changed) {
        saveTickets();
        syncDashboardToFirestore().catch(() => {});
        affectedUsers.forEach(id => reconcileWalletForUser(id, id).catch(() => {}));
      }
    }, (err) => {
      handleFirestoreError(err, 'initFirestoreTicketsWatcher');
    });
  } catch (err) {
    handleFirestoreError(err, 'initFirestoreTicketsWatcher_init');
  }
}

app.post('/api/admin/users/delete', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ ok: false, error: 'User ID required' });

  // 1. Remove from local memory
  delete userWallets[userId];
  saveUserWallets(true);

  // 2. Remove from Firestore
  try {
    await deleteDoc(doc(firestore, 'wallets', userId));
  } catch (err) {
    console.error(`[Firestore Delete User Error] ${userId}:`, err);
  }

  res.json({ ok: true, message: `User ${userId} deleted` });
});
app.post('/api/auth/register', (req, res) => {
  const { fullName, phone, password, username, profileImage } = req.body;
  if (!phone || !phone.trim()) {
    return res.status(400).json({ ok: false, error: 'ስልክ ቁጥር ያስፈልጋል' });
  }
  if (!password || !password.trim()) {
    return res.status(400).json({ ok: false, error: 'የይለፍ ቃል ያስፈልጋል' });
  }

  const clean = normalizeEthiopianPhone(phone);
  if (clean.length < 10) {
    return res.status(400).json({ ok: false, error: 'እባክዎ ትክክለኛ ባለ 10 አሃዝ ስልክ ቁጥር ያስገቡ (ምሳሌ: 09... ወይም 07...)' });
  }

  const trimmedPassword = password.trim();
  if (trimmedPassword.length < 4) {
    return res.status(400).json({ ok: false, error: 'የይለፍ ቃል ቢያንስ 4 ፊደላት ወይም ቁጥሮች መሆን አለበት' });
  }

  deduplicateWallets();

  const existingWallet = findWalletByPhone(clean);
  if (existingWallet) {
    return res.status(409).json({
      ok: false,
      error: 'ይህ ስልክ ቁጥር ቀደም ሲል ተመዝግቧል። እባክዎ "ግባ (Login)" የሚለውን ይጫኑ',
      isExisting: true,
    });
  }

  const regDateIso = new Date().toISOString();
  const readableRegDate = new Date().toLocaleTimeString('am-ET', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('am-ET');
  const walletKey = clean;

  const newWallet: UserWallet = {
    userId: `usr_${clean}`,
    phone: clean,
    fullName: (fullName && typeof fullName === 'string' ? fullName.trim() : '') || 'ተጠቃሚ',
    password: trimmedPassword,
    username: username || '',
    profileImage: (profileImage && typeof profileImage === 'string' ? profileImage.trim() : '') || '',
    walletBalance: 0,
    ticketsCount: 0,
    totalWon: 0,
    language: 'am',
    registeredAt: regDateIso,
  };

  userWallets[walletKey] = newWallet;
  saveUserWallets();

  const tgRegMessage = 
    `👤 <b>አዲስ ተጠቃሚ ተመዝግቧል! (New User Registered)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>ሙሉ ስም (Full Name):</b> <b>${newWallet.fullName || 'አልተሞላም'}</b>\n` +
    `📱 <b>ስልክ ቁጥር (Phone):</b> <code>${clean}</code>\n` +
    (username ? `💬 <b>ቴሌግራም (Telegram):</b> @${username.replace('@', '')}\n` : '') +
    `⏰ <b>የተመዘገበበት ቀን:</b> ${readableRegDate}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `<i>ተወዳጅ ኦንላይን ሎተሪ (Tewedaj Online Lottery)</i>`;

  notifyAllAdmins(tgRegMessage, {
    inline_keyboard: [
      [
        { text: '👑 የአድሚን ዳሽቦርድ (Admin)', web_app: { url: ADMIN_APP_URL } },
      ],
    ],
  }).catch(err => console.error('[Register Notify Error]', err));

  const userTickets = syncedTickets.filter(t => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)));
  const userTxs = syncedTransactions.filter(t => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)));

  res.json({
    ok: true,
    user: newWallet,
    tickets: userTickets,
    transactions: userTxs,
  });
});

app.post('/api/auth/login', (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !phone.trim()) {
    return res.status(400).json({ ok: false, error: 'ስልክ ቁጥር ያስገቡ' });
  }
  if (!password || !password.trim()) {
    return res.status(400).json({ ok: false, error: 'የይለፍ ቃል ያስገቡ' });
  }

  const clean = normalizeEthiopianPhone(phone);
  if (clean.length < 9) {
    return res.status(400).json({ ok: false, error: 'ትክክለኛ ስልክ ቁጥር ያስገቡ' });
  }

  deduplicateWallets();
  const matchedWallet = findWalletByPhone(clean);

  if (!matchedWallet) {
    return res.status(404).json({
      ok: false,
      error: 'ይህ ስልክ ቁጥር አልተገኘም። እባክዎ አስቀድመው "ተመዝገብ (Register)" የሚለውን ይጫኑ',
      notFound: true,
    });
  }

  const trimmedPassword = password.trim();
  if (!matchedWallet.password || matchedWallet.password !== trimmedPassword) {
    return res.status(401).json({
      ok: false,
      error: 'የተሳሳተ የይለፍ ቃል (Password)! እባክዎ ደግመው ይሞክሩ',
      invalidPassword: true,
    });
  }

  const isMakbelAdmin = clean.endsWith('910961881') || (matchedWallet.username && matchedWallet.username.toLowerCase().replace('@', '') === 'lij_makbel');
  if (isMakbelAdmin) {
    matchedWallet.isAdmin = true;
  }

  const userTickets = syncedTickets.filter(t => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)));
  const userTxs = syncedTransactions.filter(t => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)));

  res.json({
    ok: true,
    user: matchedWallet,
    tickets: userTickets,
    transactions: userTxs,
  });
});

app.post('/api/tickets/save', async (req, res) => {
  const { newTickets, phone, userId } = req.body;
  if (Array.isArray(newTickets) && newTickets.length > 0) {
    for (const tk of newTickets) {
      const idx = syncedTickets.findIndex(t => t.id === tk.id);
      if (idx >= 0) {
        syncedTickets[idx] = { ...syncedTickets[idx], ...tk };
      } else {
        syncedTickets.unshift(tk);
      }
      await saveTickets(tk);
    }

    const firstTk = newTickets[0];
    const tkCount = newTickets.length;
    const buyerPhone = phone || firstTk.userPhone || '';
    const buyerName = (firstTk.userName && firstTk.userName !== 'ተጠቃሚ') ? firstTk.userName : (buyerPhone || 'ደንበኛ');
    const totalCost = newTickets.reduce((s: number, t: any) => s + (Number(t.pricePaid) || 0), 0);
    const nums = newTickets.map((t: any) => t.ticketNumber).join(', ');

  }

  const clean = phone ? phone.replace(/\D/g, '') : '';
  if (clean) {
    for (const w of Object.values(userWallets)) {
      if (w.phone && w.phone.replace(/\D/g, '').endsWith(clean.slice(-9))) {
        w.ticketsCount = syncedTickets.filter(t => t.userPhone && t.userPhone.replace(/\D/g, '').endsWith(clean.slice(-9))).length;
        saveUserWallets();
        break;
      }
    }
  }

  const userTickets = clean 
    ? syncedTickets.filter(t => t.userPhone && t.userPhone.replace(/\D/g, '').endsWith(clean.slice(-9)))
    : syncedTickets;

  const lotteryCounts = computeActiveLotteryCounts();

  // If any lottery reached 150, immediately alert the admin: "150 ሞልቷል ዕጣ አውጣ!"
  for (const [lotId, count] of Object.entries(lotteryCounts)) {
    if (count >= 150) {
      checkAndNotify200Filled(lotId, count, 1);
    }
  }

  // Authoritative reconciliation after purchase
  await reconcileWalletForUser(userId, phone);

  res.json({ ok: true, tickets: userTickets, lotteryCounts });
});

app.get('/api/lotteries/live-counts', (_req, res) => {
  res.json({
    ok: true,
    lotteryCounts: computeActiveLotteryCounts(),
    totalActive: syncedTickets.filter(t => t.status === 'active').length,
    timestamp: new Date().toISOString(),
  });
});

// Dedicated Real-Time Dashboard Stats API for Admin & Mini App
app.get('/api/dashboard/stats', async (_req, res) => {
  try {
    const totalTicketsSold = syncedTickets.length;
    const activeTickets = syncedTickets.filter(t => t.status === 'active');

    const buyersMap = new Map<string, { phone: string; name: string; ticketsCount: number; totalSpent: number }>();
    for (const t of syncedTickets) {
      const p = t.userPhone ? normalizeEthiopianPhone(t.userPhone) : (t.userId || 'unknown');
      if (!buyersMap.has(p)) {
        buyersMap.set(p, {
          phone: p,
          name: (t.userName && t.userName !== 'ተጠቃሚ') ? t.userName : p,
          ticketsCount: 0,
          totalSpent: 0,
        });
      }
      const b = buyersMap.get(p)!;
      b.ticketsCount++;
      b.totalSpent += Number(t.pricePaid) || 0;
      if (t.userName && t.userName !== 'ተጠቃሚ' && (!b.name || b.name === p)) {
        b.name = t.userName;
      }
    }
    const uniqueBuyers = Array.from(buyersMap.values());
    uniqueBuyers.sort((a, b) => b.ticketsCount - a.ticketsCount);

    const keriEtsaSummary: Record<string, any> = {};
    for (const [lotId, conf] of Object.entries(CANONICAL_LOTTERY_CAPACITIES)) {
      const isTv = lotId === 'lot_tv_32';
      const soldForThis = activeTickets.filter(t => {
        if (isTv) {
          return t.lotteryId === 'lot_tv_32' || t.lotteryTitleAm?.includes('ቲቪ') || t.lotteryTitleAm?.includes('TV');
        }
        if (lotId === 'lot_derash_50000') {
          return t.lotteryId === 'lot_derash_50000' || (t.pricePaid === 200 && !t.lotteryId?.includes('tv') && !t.lotteryTitleAm?.includes('ቲቪ') && !t.lotteryTitleAm?.includes('TV'));
        }
        return t.lotteryId === lotId || (t.pricePaid === conf.price && (lotId.includes(String(conf.jackpot)) || lotId.includes('derash')));
      }).length;

      const keriEtsa = Math.max(0, conf.capacity - soldForThis);

      const buyersForThis = new Set(
        activeTickets
          .filter(t => {
            if (isTv) return t.lotteryId === 'lot_tv_32' || t.lotteryTitleAm?.includes('ቲቪ') || t.lotteryTitleAm?.includes('TV');
            if (lotId === 'lot_derash_50000') return t.lotteryId === 'lot_derash_50000' || (t.pricePaid === 200 && !t.lotteryId?.includes('tv') && !t.lotteryTitleAm?.includes('ቲቪ') && !t.lotteryTitleAm?.includes('TV'));
            return t.lotteryId === lotId || t.pricePaid === conf.price;
          })
          .map(t => t.userPhone ? normalizeEthiopianPhone(t.userPhone) : t.userId)
      ).size;

      const itemInfo: any = {
        lotteryId: lotId,
        titleAm: conf.titleAm,
        titleEn: conf.titleEn,
        ticketPrice: conf.price,
        totalInventory: conf.capacity,
        ticketsSold: soldForThis,
        keriEtsa: keriEtsa, // ቀሪ ዕጣ
        round: 1,
        buyersCount: buyersForThis,
        lastUpdated: new Date().toISOString(),
      };
      if (conf.isItemPrize || isTv) {
        itemInfo.isItemPrize = true;
        itemInfo.prizeName = '32 Inch Smart TV';
        itemInfo.prizeAm = 'የ 32 ኢንች ኤልኢዲ ቲቪ';
      } else {
        itemInfo.jackpotAmount = conf.jackpot;
      }

      keriEtsaSummary[lotId] = itemInfo;
    }

    const completedDeposits = syncedTransactions.filter(t => t.type === 'deposit' && t.status === 'completed');
    const totalDepositedAmount = completedDeposits.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const completedWithdrawals = syncedTransactions.filter(t => t.type === 'withdrawal' && t.status === 'completed');
    const totalWithdrawnAmount = completedWithdrawals.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const pendingDepositsCount = syncedTransactions.filter(t => t.type === 'deposit' && t.status === 'pending').length;
    const pendingWithdrawalsCount = syncedTransactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').length;
    const registeredUsersCount = getRegisteredUsersCount();

    res.json({
      ok: true,
      totalTicketsSold,
      ticketsCutCount: totalTicketsSold,
      activeTicketsCount: activeTickets.length,
      uniqueBuyersCount: uniqueBuyers.length,
      uniqueBuyers: uniqueBuyers.slice(0, 50),
      keriEtsaSummary,
      pendingDepositsCount,
      pendingWithdrawalsCount,
      totalRegisteredUsers: registeredUsersCount,
      recentActivities: dashboardActivities.slice(0, 50),
      lastUpdated: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/dashboard/refresh', async (_req, res) => {
  try {
    await syncDashboardToFirestore();
    res.json({ ok: true, message: 'Firestore Dashboard synchronized successfully' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/admin/all-tickets', (_req, res) => {
  res.json({
    ok: true,
    tickets: syncedTickets,
    total: syncedTickets.length,
    active: syncedTickets.filter(t => t.status === 'active').length,
  });
});

const LOCKS_FILE = path.join(STORAGE_DIR, 'lottery_locks_store.json');
let serverLockedLotteryIds: string[] = safeReadJsonSync<string[]>(LOCKS_FILE, []);

export async function saveLotteryLocks() {
  safeWriteJsonSync(LOCKS_FILE, serverLockedLotteryIds);
  if (isFirestoreQuotaActive()) {
    try {
      await setDoc(doc(firestore, 'system_settings', 'lottery_locks'), {
        lockedLotteryIds: serverLockedLotteryIds,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, 'saveLotteryLocks');
    }
  }
}

app.get('/api/lottery/locks', (_req, res) => {
  res.json({ ok: true, lockedLotteryIds: serverLockedLotteryIds });
});

app.post('/api/lottery/locks', async (req, res) => {
  try {
    const { isLocked } = req.body;
    const allActiveIds = ['lot_tv_32', 'lot_derash_1000', 'lot_derash_5000', 'lot_derash_10000', 'lot_derash_50000'];
    if (isLocked) {
      serverLockedLotteryIds = allActiveIds;
    } else {
      serverLockedLotteryIds = [];
    }
    await saveLotteryLocks();
    res.json({ ok: true, lockedLotteryIds: serverLockedLotteryIds });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/admin/notify-200-filled', async (req, res) => {
  try {
    const { lotteryId, titleAm, round, ticketsSold } = req.body;
    if (!lotteryId) {
      return res.status(400).json({ ok: false, error: 'lotteryId is required' });
    }
    const count = Number(ticketsSold) || 200;
    const roundNum = Number(round) || 1;
    await checkAndNotify200Filled(lotteryId, count, roundNum, titleAm);
    res.json({ ok: true });
  } catch (err: any) {
    console.error('[Notify 200 Filled Error]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/lottery/draw-executed', async (req, res) => {
  console.log('[API] /api/lottery/draw-executed called with body:', req.body);
  try {
    const { lotteryId, round, winningNumbers } = req.body;
    const roundNum = Number(round) || 1;
    const key = `${lotteryId}_r${roundNum}`;
    notified200FilledRounds.delete(key);

    const info = CANONICAL_LOTTERIES_MAP[lotteryId] || { 
      titleAm: lotteryId, 
      jackpot: 1000, 
      isItemPrize: lotteryId === 'lot_tv_32', 
      prizeNameAm: 'የ 32 ኢንች ኤልኢዲ ቲቪ' 
    };

    const firstWinningRaw = winningNumbers?.firstPrize || '';
    const cleanWinningNum = String(firstWinningRaw).replace(/\D/g, '');
    const prizeAmount = info.isItemPrize ? 0 : (info.jackpot || 0);

    // 1. Identify matching ticket(s)
    const matchingTickets: SyncedTicket[] = [];
    for (const t of syncedTickets) {
      if (t.status === 'refunded') continue;
      const tNum = String(t.ticketNumber || '').replace(/\D/g, '');
      const numMatch = Boolean(tNum && cleanWinningNum && tNum === cleanWinningNum);

      const isTv = lotteryId === 'lot_tv_32' || info.isItemPrize;
      const ticketIsTv = t.lotteryId === 'lot_tv_32' || t.lotteryTitleAm?.includes('ቲቪ') || t.lotteryTitleAm?.includes('TV');
      
      const lotMatch = (t.lotteryId === lotteryId) || (isTv && ticketIsTv) || (t.pricePaid === (lotteryId === 'lot_derash_1000' ? 10 : lotteryId === 'lot_derash_5000' ? 50 : lotteryId === 'lot_derash_10000' ? 100 : 200));
      const roundMatch = !t.round || Number(t.round) === roundNum;

      if (numMatch && (lotMatch || t.lotteryId === lotteryId) && roundMatch) {
        matchingTickets.push(t);
      }
    }

    const winnersProcessed: any[] = [];

    // 2. Process each winner (Ticket, Wallet, Transaction, In-App Notification, Telegram Direct Bot Message)
    for (const winTicket of matchingTickets) {
      winTicket.status = 'won';
      winTicket.prizeWon = prizeAmount;
      winTicket.prizeTitleAm = info.isItemPrize ? info.prizeNameAm : '1ኛ ዕጣ አሸናፊ';
      winTicket.prizeTitleEn = '1st Prize Winner';
      await syncTicketToFirestore(winTicket).catch(() => {});

      // Find or create winner's wallet
      let winnerWallet = findWalletByPhone(winTicket.userPhone);
      if (!winnerWallet && winTicket.userId) {
        winnerWallet = userWallets[winTicket.userId];
      }
      if (!winnerWallet && winTicket.userTelegram) {
        winnerWallet = Object.values(userWallets).find(w => w.telegramId && w.telegramId === winTicket.userTelegram);
      }
      if (!winnerWallet) {
        winnerWallet = findOrCreateWallet({
          userId: winTicket.userId,
          phone: winTicket.userPhone,
          telegramId: winTicket.userTelegram,
          fullName: winTicket.userName,
        });
      }

      // Automatically Credit the winner's wallet
      if (winnerWallet && prizeAmount > 0) {
        winnerWallet.walletBalance = (Number(winnerWallet.walletBalance) || 0) + prizeAmount;
        winnerWallet.totalWon = (Number(winnerWallet.totalWon) || 0) + prizeAmount;
        saveUserWallets(true, winnerWallet);
        await syncWalletToFirestore(winnerWallet).catch(() => {});
      }

      // Record a formal prize_payout transaction
      const payoutTx: SyncedTransaction = {
        id: `tx_payout_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
        ticketId: winTicket.id,
        lotteryId,
        lotteryTitleAm: info.titleAm,
        userId: winnerWallet?.userId || winTicket.userId,
        userName: winnerWallet?.fullName || winTicket.userName || 'አሸናፊ ደንበኛ',
        userPhone: winnerWallet?.phone || winTicket.userPhone || '',
        telegramId: winnerWallet?.telegramId || winTicket.userTelegram || '',
        amount: prizeAmount,
        type: 'prize_payout',
        paymentMethod: 'wallet',
        referenceNumber: 'WIN-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        timestamp: new Date().toISOString(),
        status: 'completed',
        gatewayFee: 0,
      };
      syncedTransactions.unshift(payoutTx);
      saveTransactions(payoutTx);
      await syncTransactionToFirestore(payoutTx).catch(() => {});

      // Create Push Notification for the winner's wallet
      const winMsgAm = info.isItemPrize
        ? `🎉 እንኳን ደስ አለዎት! በ${info.titleAm} (ዙር ${roundNum}) ${info.prizeNameAm} አሸንፈዋል! ትኬት ቁጥር: #${cleanWinningNum}`
        : `🎉 እንኳን ደስ አለዎት! በ${info.titleAm} (ዙር ${roundNum}) ${prizeAmount.toLocaleString()} ብር አሸንፈዋል! ትኬት ቁጥር: #${cleanWinningNum} (ገንዘቡ በቀጥታ ዋሌትዎ ላይ ገቢ ተደርጓል)`;
      const winMsgEn = info.isItemPrize
        ? `🎉 Congratulations! You won ${info.prizeNameAm} in ${info.titleAm}! Ticket: #${cleanWinningNum}`
        : `🎉 Congratulations! You won ${prizeAmount.toLocaleString()} ETB in ${info.titleAm}! Ticket: #${cleanWinningNum} (Credited to wallet)`;

      const winnerNotif: SyncedNotification = {
        id: `notif_win_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
        userId: winnerWallet?.userId || winTicket.userId,
        userName: winnerWallet?.fullName || winTicket.userName,
        userPhone: winnerWallet?.phone || winTicket.userPhone,
        userTelegram: winnerWallet?.telegramId || winTicket.userTelegram,
        lotteryId,
        lotteryTitleAm: info.titleAm,
        ticketNumber: cleanWinningNum,
        amountWon: prizeAmount,
        timestamp: new Date().toISOString(),
        isRead: false,
        messageAm: winMsgAm,
        messageEn: winMsgEn,
      };
      syncedNotifications.unshift(winnerNotif);
      await saveNotifications(winnerNotif);

      // Determine winner's Telegram Chat ID to send direct bot message
      let winnerChatId: number | null = null;
      if (winnerWallet?.telegramId && !isNaN(Number(winnerWallet.telegramId))) {
        winnerChatId = Number(winnerWallet.telegramId);
      } else if (winTicket.userTelegram && !isNaN(Number(winTicket.userTelegram))) {
        winnerChatId = Number(winTicket.userTelegram);
      } else if (winTicket.userId && winTicket.userId.startsWith('tg_')) {
        const parsed = Number(winTicket.userId.replace('tg_', ''));
        if (!isNaN(parsed)) winnerChatId = parsed;
      }

      // Send Direct Telegram Bot Message to the winner
      if (winnerChatId) {
        const winnerCleanPhone = winnerWallet?.phone ? normalizeEthiopianPhone(winnerWallet.phone) : '';
        const winnerWalletAppUrl = winnerCleanPhone
          ? `${APP_URL}?tab=wallet&phone=${winnerCleanPhone}&userId=${winnerWallet?.userId || ''}&tg_id=${winnerChatId}`
          : `${APP_URL}?tab=wallet&tg_id=${winnerChatId}`;

        const winnerTgMsg =
          `🎉 <b>እንኳን ደስ አለዎት! አሸናፊ ሆነዋል! (Congratulations! You Won!)</b> 🏆\n\n` +
          `ውድ <b>${winnerWallet?.fullName || winTicket.userName || 'ተጠቃሚ'}</b>፣\n` +
          `በተወዳጅ ኦንላይን ሎተሪ በቆረጡት ትኬት አሸናፊ ሆነዋል!\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📦 <b>የዕጣ ዓይነት:</b> <b>${info.titleAm}</b>\n` +
          `🏆 <b>ዙር:</b> <b>${roundNum}</b>\n` +
          `🎟 <b>የአሸናፊ ትኬት ቁጥር:</b> <code>#${cleanWinningNum}</code>\n` +
          (info.isItemPrize 
            ? `🎁 <b>ያሸነፉት ሽልማት:</b> <b>${info.prizeNameAm}</b>\n`
            : `💰 <b>ያሸነፉት ሽልማት:</b> <b>${prizeAmount.toLocaleString()} ብር</b>\n💳 <b>የዋሌት ሁኔታ:</b> <b>ገንዘቡ በቀጥታ ወደ ዋሌትዎ ገቢ ተደርጓል!</b>\n`
          ) +
          `⏰ <b>ቀን:</b> ${new Date().toLocaleDateString('am-ET')} ${new Date().toLocaleTimeString('en-US', { hour12: true, timeZone: 'Africa/Addis_Ababa' })}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `✨ አሁኑኑ ዋሌትዎን በመክፈት ሽልማትዎን ማየት ወይም ወደ ቴሌብር ማውጣት ይችላሉ!`;

        try {
          await sendTelegramResponse(winnerChatId, winnerTgMsg, {
            inline_keyboard: [
              [
                { text: '💳 ዋሌትዎን ይክፈቱ (Open Wallet)', web_app: { url: winnerWalletAppUrl } },
              ],
              [
                { text: '🎟 አዲስ ትኬት ይቁረጡ', web_app: { url: APP_URL } },
              ],
            ],
          });
          console.log(`[Telegram Direct Message Sent to Winner] ChatID: ${winnerChatId}, Prize: ${prizeAmount}`);
        } catch (tgErr) {
          console.warn(`[Failed to send direct TG msg to winner ${winnerChatId}]:`, tgErr);
        }
      }

      winnersProcessed.push({
        ticketId: winTicket.id,
        ticketNumber: cleanWinningNum,
        userName: winTicket.userName,
        userPhone: winTicket.userPhone,
        prize: prizeAmount,
        telegramChatId: winnerChatId,
      });
    }

    // 3. Mark non-winning active tickets in this round as lost
    syncedTickets.forEach(t => {
      if (t.status === 'active' && (t.lotteryId === lotteryId) && (!t.round || Number(t.round) === roundNum)) {
        if (String(t.ticketNumber).replace(/\D/g, '') !== cleanWinningNum) {
          t.status = 'lost';
          syncTicketToFirestore(t).catch(() => {});
        }
      }
    });
    saveTickets();

    // 4. Create General In-App Announcement Notification for all users
    const generalNotif: SyncedNotification = {
      id: `notif_draw_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      userId: 'all',
      lotteryId,
      lotteryTitleAm: info.titleAm,
      ticketNumber: cleanWinningNum,
      amountWon: 0,
      timestamp: new Date().toISOString(),
      isRead: false,
      messageAm: `የ${info.titleAm} (ዙር ${roundNum}) ዕጣ ወጥቷል! አሸናፊ ቁጥር: #${cleanWinningNum} ${matchingTickets.length > 0 ? `(አሸናፊ: ${matchingTickets[0].userName})` : ''}`,
      messageEn: `Draw completed for ${info.titleAm} (Round ${roundNum})! Winning Number: #${cleanWinningNum}`,
    };
    syncedNotifications.unshift(generalNotif);
    await saveNotifications(generalNotif);

    // 5. Broadcast to Admins & Official Telegram Channel
    const winnerDisplay = matchingTickets.length > 0
      ? `\n👤 <b>አሸናፊ:</b> <b>${matchingTickets[0].userName || 'ተጠቃሚ'} (${maskPhone(matchingTickets[0].userPhone)})</b>\n💳 <b>ዋሌት:</b> <b>የሽልማት ገንዘቡ በራስ-ሰር ተከፍሏል!</b>\n📲 <b>ቦት መልዕክት:</b> <b>ለአሸናፊው በራስ-ሰር ተልኳል!</b>`
      : `\nℹ️ <i>ይህንን ትኬት የቆረጠ ተጠቃሚ አልተገኘም::</i>`;

    const announceMsg =
      `🎉 <b>የዕጣ ውጤት ይፋ ሆነ! (Draw Results Published)</b>\n\n` +
      `📦 <b>የዕጣ ዓይነት:</b> <b>${info.titleAm}</b>\n` +
      `🏆 <b>ዙር:</b> <b>${roundNum}</b>\n` +
      `🥇 <b>1ኛ አሸናፊ ቁጥር:</b> <code>#${cleanWinningNum || 'N/A'}</code>\n` +
      (info.isItemPrize 
        ? `🎁 <b>ሽልማት:</b> <b>${info.prizeNameAm}</b>` 
        : `💰 <b>ሽልማት:</b> <b>${info.jackpot.toLocaleString()} ብር</b>`
      ) +
      winnerDisplay +
      `\n━━━━━━━━━━━━━━━━━━━━\n` +
      `✨ አዲሱ ዙር ${roundNum + 1} ተጀምሯል!`;

    await notifyAllAdmins(announceMsg, {
      inline_keyboard: [
        [
          { text: '🌐 ወደ መተግበሪያ (Open App)', url: APP_URL },
        ],
      ],
    });

    res.json({ 
      ok: true, 
      winnersCount: matchingTickets.length, 
      winners: winnersProcessed 
    });
  } catch (err: any) {
    console.error('[Draw Executed Broadcast Error]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get('/api/notifications', (req, res) => {
  const userId = req.query.userId as string;
  const phone = req.query.phone as string;
  const tgId = req.query.tgId as string;

  const clean = phone ? phone.replace(/\D/g, '') : '';
  const searchTg = tgId ? String(tgId) : '';
  const searchUid = userId ? String(userId) : '';

  const userNotifs = syncedNotifications.filter(n => {
    if (n.userId === 'all') return true;
    if (searchUid && n.userId === searchUid) return true;
    if (clean && n.userPhone) {
      const p = n.userPhone.replace(/\D/g, '');
      if (p.endsWith(clean.slice(-9)) || clean.endsWith(p.slice(-9))) return true;
    }
    if (searchTg && (n.userId === searchTg || n.userId === `tg_${searchTg}` || n.userTelegram === searchTg)) return true;
    return false;
  });

  res.json({ ok: true, notifications: userNotifs });
});

app.post('/api/notifications/:id/read', (req, res) => {
  const notifId = req.params.id;
  const target = syncedNotifications.find(n => n.id === notifId);
  if (target) {
    target.isRead = true;
    saveNotifications(target);
  }
  res.json({ ok: true });
});

app.get('/api/transactions/sync', (req, res) => {
  const userId = req.query.userId as string;
  const phone = req.query.phone as string;
  const tgId = req.query.tgId as string;
  const isAdmin = req.query.isAdmin === 'true';

  let wallet = undefined;
  if (userId || phone || tgId) {
    wallet = findOrCreateWallet({ userId, phone, telegramId: tgId });
  }

  const clean = phone ? phone.replace(/\D/g, '') : '';
  const searchTg = tgId ? String(tgId) : '';
  const searchUid = userId ? String(userId) : '';

  const isUserMatch = (tPhone?: string, tUid?: string) => {
    if (clean && tPhone) {
      const p = tPhone.replace(/\D/g, '');
      if (p.endsWith(clean.slice(-9)) || clean.endsWith(p.slice(-9))) return true;
    }
    if (tUid) {
      if (searchUid && tUid === searchUid) return true;
      if (searchTg && (tUid === searchTg || tUid === `tg_${searchTg}`)) return true;
    }
    return false;
  };

  const userTickets = (clean || searchTg || searchUid)
    ? syncedTickets.filter(t => isUserMatch(t.userPhone, t.userId))
    : [];

  const userTransactions = (clean || searchTg || searchUid)
    ? syncedTransactions.filter(t => isUserMatch(t.userPhone, t.userId))
    : [];

  const userNotifications = syncedNotifications.filter(n => {
    if (n.userId === 'all') return true;
    if (searchUid && n.userId === searchUid) return true;
    if (clean && n.userPhone) {
      const p = n.userPhone.replace(/\D/g, '');
      if (p.endsWith(clean.slice(-9)) || clean.endsWith(p.slice(-9))) return true;
    }
    if (searchTg && (n.userId === searchTg || n.userId === `tg_${searchTg}` || n.userTelegram === searchTg)) return true;
    return false;
  });

  const adminPhoneSuffix = OFFICIAL_ADMIN.phone.replace(/\D/g, '').slice(-9);
  const isVerifiedAdmin = Boolean(
    (clean && clean.endsWith(adminPhoneSuffix)) ||
    (wallet?.username && wallet.username.toLowerCase().replace('@', '') === 'lij_makbel') ||
    (wallet?.telegramId === '5588110290') ||
    (searchTg === '5588110290')
  );

  const lotteryCounts = computeActiveLotteryCounts();

  res.json({
    ok: true,
    transactions: isVerifiedAdmin ? syncedTransactions : userTransactions,
    tickets: isVerifiedAdmin ? syncedTickets : userTickets,
    notifications: userNotifications,
    lotteryCounts,
    wallet: wallet ? {
      userId: wallet.userId,
      walletBalance: wallet.walletBalance,
      phone: wallet.phone,
      fullName: wallet.fullName,
      username: wallet.username,
      profileImage: wallet.profileImage,
      ticketsCount: wallet.ticketsCount,
      totalWon: wallet.totalWon,
      isAdmin: isVerifiedAdmin,
    } : null,
  });
});

app.get('/api/admin/transactions', async (_req, res) => {
  if (isFirestoreQuotaActive()) {
    try {
      const txSnap = await getDocs(collection(firestore, 'transactions'));
      const firestoreTxs: SyncedTransaction[] = [];
      txSnap.forEach(docSnap => {
        const tx = docSnap.data() as SyncedTransaction;
        if (tx && tx.id) {
          firestoreTxs.push(tx);
        }
      });
      if (firestoreTxs.length > 0) {
        const existingIds = new Set(syncedTransactions.map(t => t.id));
        for (const ft of firestoreTxs) {
          if (!existingIds.has(ft.id)) {
            syncedTransactions.unshift(ft);
          }
        }
      }
    } catch (err) {
      handleFirestoreError(err, 'admin_transactions_sync');
    }
  }

  res.json({
    ok: true,
    transactions: syncedTransactions,
  });
});

app.get('/api/admin/users', async (_req, res) => {
  if (isFirestoreQuotaActive()) {
    try {
      const walletsSnap = await getDocs(collection(firestore, 'wallets'));
      walletsSnap.forEach(docSnap => {
        const data = docSnap.data() as UserWallet & { name?: string };
        if (data && (data.userId || data.phone || data.telegramId)) {
          if (!data.fullName && data.name) {
            data.fullName = data.name;
          }
          delete data.name;
          const cleanPhone = data.phone ? normalizeEthiopianPhone(data.phone) : '';
          const key = (cleanPhone && cleanPhone.length >= 9)
            ? (cleanPhone.length === 10 ? cleanPhone : `0${cleanPhone.slice(-9)}`)
            : (data.telegramId ? `tg_${data.telegramId}` : (data.userId || docSnap.id));

          userWallets[key] = {
            ...userWallets[key],
            ...data,
            userId: key,
          };
        }
      });

      // Run deduplication to consolidate memory and clean up duplicate Firestore documents
      deduplicateWallets(true);
    } catch (err) {
      handleFirestoreError(err, 'admin_users_sync');
    }
  }

  const seenPhones = new Set<string>();
  const seenTgIds = new Set<string>();
  const seenIds = new Set<string>();
  const usersList: any[] = [];

  for (const w of Object.values(userWallets)) {
    const clean = normalizeEthiopianPhone(w.phone);
    const phoneSuffix = clean && clean.length >= 9 ? clean.slice(-9) : '';
    const tgId = w.telegramId ? String(w.telegramId) : '';
    const uid = String(w.userId || '');

    // Check if this user was already included
    if (phoneSuffix && seenPhones.has(phoneSuffix)) continue;
    if (tgId && seenTgIds.has(tgId)) continue;
    if (uid && seenIds.has(uid)) continue;

    if (phoneSuffix) seenPhones.add(phoneSuffix);
    if (tgId) seenTgIds.add(tgId);
    if (uid) seenIds.add(uid);

    const userTxs = clean ? syncedTransactions.filter(t => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9))) : [];

    const displayName = (w.fullName && w.fullName.trim() && w.fullName !== 'ተጠቃሚ' && !w.fullName.startsWith('ተጠቃሚ ('))
      ? w.fullName.trim()
      : (clean ? `ደንበኛ (${clean})` : (w.username ? w.username : `ተጠቃሚ (TG: ${w.telegramId || w.userId})`));

    const userTickets = clean ? syncedTickets.filter(t => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9))) : [];
    usersList.push({
      userId: w.userId,
      telegramId: w.telegramId || '',
      customerId: w.customerId || ('TEWEDAJ-' + (w.telegramId || w.phone || w.userId).slice(-6)),
      phone: clean || (w.telegramId ? `TG: ${w.telegramId}` : 'ስልክ አልተጋራም'),
      fullName: displayName,
      username: w.username || '',
      profileImage: w.profileImage || '',
      registeredAt: w.registeredAt || new Date().toISOString(),
      password: w.password || '',
      walletBalance: Number(w.walletBalance) || 0,
      ticketsCount: userTickets.length || w.ticketsCount || 0,
      totalWon: Number(w.totalWon) || 0,
      isOnline: Boolean(w.isOnline),
      lastActive: w.lastActive || '',
    });
  }

  usersList.sort((a, b) => {
    const aIsOwner = (a.phone && a.phone.includes('0910961881')) || (a.username && a.username.toLowerCase().includes('lij_makbel'));
    const bIsOwner = (b.phone && b.phone.includes('0910961881')) || (b.username && b.username.toLowerCase().includes('lij_makbel'));
    if (aIsOwner && !bIsOwner) return -1;
    if (!aIsOwner && bIsOwner) return 1;

    const timeA = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
    const timeB = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
    return timeB - timeA;
  });

  res.json({
    ok: true,
    users: usersList,
    total: usersList.length,
  });
});



app.post('/api/admin/transactions/delete', async (req, res) => {
  const { transactionId } = req.body;
  if (!transactionId) return res.status(400).json({ ok: false, error: 'Transaction ID required' });
  
  const targetTx = syncedTransactions.find(t => String(t.id) === String(transactionId));
  syncedTransactions = syncedTransactions.filter(t => String(t.id) !== String(transactionId));
  safeWriteJsonSync(TX_FILE, syncedTransactions);

  try {
    await deleteDoc(doc(firestore, 'transactions', String(transactionId)));
  } catch (err) {
    console.warn(`[Firestore Delete tx ${transactionId} Error]`, err);
  }

  // Immediately deduct from user wallet if completed or pending
  let affectedWallet: UserWallet | undefined;
  if (targetTx) {
    const cleanPhone = targetTx.userPhone ? normalizeEthiopianPhone(targetTx.userPhone) : '';
    affectedWallet = cleanPhone ? findWalletByPhone(cleanPhone) : (targetTx.userId ? userWallets[targetTx.userId] : undefined);
    
    if (affectedWallet) {
      const amount = Number(targetTx.amount) || 0;
      if (targetTx.type === 'deposit') {
        if (targetTx.status === 'completed') {
          affectedWallet.walletBalance = Math.max(0, (affectedWallet.walletBalance || 0) - amount);
        }
      } else if (targetTx.type === 'withdrawal') {
        if (targetTx.status === 'completed') {
          affectedWallet.walletBalance = (affectedWallet.walletBalance || 0) + amount; // refund back
        } else if (targetTx.status === 'pending') {
          affectedWallet.walletBalance = (affectedWallet.walletBalance || 0) + amount; // refund back reserved amount
        }
      }
      saveUserWallets(true, affectedWallet);
      await syncWalletToFirestore(affectedWallet).catch(() => {});
    }
  }

  // Force recalculate and sync Firestore dashboard/overview immediately
  await syncDashboardToFirestore(undefined, true);
  console.log(`[Admin Delete Transaction] ID: ${transactionId}, Type: ${targetTx?.type}, Amount: ${targetTx?.amount}. Synced and deducted from Firebase.`);

  res.json({
    ok: true,
    message: 'Transaction deleted successfully and deducted from Firebase',
    wallet: affectedWallet,
    remainingTransactions: syncedTransactions.length
  });
});

app.post('/api/admin/users/delete', async (req, res) => {
  const { userId, phone } = req.body;
  if (!userId && !phone) return res.status(400).json({ ok: false, error: 'User identifier required' });

  // 1. Identify all matching keys for this user in local memory
  const keysToDelete = new Set<string>();
  const phoneToDelete = phone ? normalizeEthiopianPhone(phone) : '';
  
  if (userId) keysToDelete.add(String(userId));
  if (phoneToDelete) keysToDelete.add(phoneToDelete);

  for (const [k, w] of Object.entries(userWallets)) {
    const wPhone = w.phone ? normalizeEthiopianPhone(w.phone) : '';
    const matchesPhone = phoneToDelete && wPhone && (wPhone === phoneToDelete || wPhone.endsWith(phoneToDelete.slice(-9)));
    const matchesId = userId && (k === userId || w.userId === userId || (w.telegramId && (w.telegramId === userId || `tg_${w.telegramId}` === userId)));
    
    if (matchesPhone || matchesId) {
      if (w.phone && w.phone.includes('0910961881')) {
        return res.status(403).json({ ok: false, error: 'Cannot delete owner account' });
      }
      keysToDelete.add(k);
      if (w.userId) keysToDelete.add(String(w.userId));
      if (wPhone) keysToDelete.add(wPhone);
      if (w.telegramId) {
        keysToDelete.add(String(w.telegramId));
        keysToDelete.add(`tg_${w.telegramId}`);
      }
    }
  }

  // 2. Query Firestore to find ANY other potential matches (Orphans)
  try {
    const walletsSnap = await getDocs(collection(firestore, 'wallets'));
    walletsSnap.forEach(d => {
      const data = d.data();
      const dPhone = data.phone ? normalizeEthiopianPhone(data.phone) : '';
      const dId = data.userId || '';
      
      const phoneMatch = phoneToDelete && dPhone && (dPhone === phoneToDelete || dPhone.endsWith(phoneToDelete.slice(-9)));
      const idMatch = userId && (dId === userId || d.id === userId);
      
      if (phoneMatch || idMatch) {
        keysToDelete.add(d.id);
      }
    });
  } catch (err) {}

  // 3. Perform deletion from memory and local file
  const deletedKeys: string[] = [];
  keysToDelete.forEach(key => {
    if (userWallets[key]) {
      delete userWallets[key];
      deletedKeys.push(key);
    }
  });

  if (deletedKeys.length > 0) {
    safeWriteJsonSync(WALLETS_FILE, userWallets);
  }

  // 4. Perform permanent deletion from Firebase Firestore
  const firestoreDeleted: string[] = [];
  for (const key of Array.from(keysToDelete)) {
    try {
      await deleteDoc(doc(firestore, 'wallets', key));
      firestoreDeleted.push(key);
    } catch (err) {
      console.warn(`[Admin User Delete] Error deleting Firestore key ${key}:`, err);
    }
  }

  await syncDashboardToFirestore(undefined, true);
  
  console.log(`[Admin User Delete] Permanently deleted user. Memory keys: ${deletedKeys.join(', ')}. Firestore keys: ${firestoreDeleted.join(', ')}.`);

  res.json({ 
    ok: true, 
    message: 'User permanently deleted from memory and Firebase',
    deletedKeys,
    firestoreDeleted
  });
});

app.post('/api/admin/tickets/delete', async (req, res) => {
  const { ticketId, userPhone } = req.body;
  if (!ticketId) return res.status(400).json({ ok: false, error: 'Ticket ID required' });

  const targetTicket = syncedTickets.find(t => String(t.id) === String(ticketId));
  syncedTickets = syncedTickets.filter(t => String(t.id) !== String(ticketId));
  syncedTransactions = syncedTransactions.filter(t => String(t.id) !== String(ticketId) && String(t.ticketId) !== String(ticketId));
  
  safeWriteJsonSync(TICKETS_FILE, syncedTickets);
  safeWriteJsonSync(TX_FILE, syncedTransactions);

  try {
    await deleteDoc(doc(firestore, 'tickets', String(ticketId)));
    await deleteDoc(doc(firestore, 'transactions', String(ticketId)));
  } catch (err) {
    console.error(`[Firestore Delete Error] ticketId: ${ticketId}`, err);
    return res.status(500).json({ ok: false, error: 'Failed to delete ticket from Firebase' });
  }

  // Deduct from User Wallet
  const phoneToUse = targetTicket?.userPhone || userPhone;
  if (phoneToUse) {
    const clean = normalizeEthiopianPhone(phoneToUse);
    const wallet = findWalletByPhone(clean) || (targetTicket?.userId ? userWallets[targetTicket.userId] : undefined);
    if (wallet) {
      wallet.ticketsCount = Math.max(0, syncedTickets.filter(t => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9))).length);
      saveUserWallets(true, wallet);
      await syncWalletToFirestore(wallet).catch((e) => console.error('[Sync Wallet Error]', e));
    }
  }

  // Update keri_etsa in Firestore
  const lotId = targetTicket?.lotteryId || (targetTicket?.pricePaid === 10 ? 'lot_derash_1000' : targetTicket?.pricePaid === 50 ? 'lot_derash_5000' : targetTicket?.pricePaid === 100 ? 'lot_derash_10000' : 'lot_derash_50000');
  const remainingForLot = syncedTickets.filter(t => t.status === 'active' && (t.lotteryId === lotId || (targetTicket && t.pricePaid === targetTicket.pricePaid)));
  const capacity = lotId === 'lot_derash_50000' ? 300 : 150;
  const sold = remainingForLot.length;
  const keri = Math.max(0, capacity - sold);
  const buyersCount = new Set(remainingForLot.map(t => t.userPhone ? normalizeEthiopianPhone(t.userPhone) : t.userId)).size;

  try {
    await setDoc(doc(firestore, 'keri_etsa', lotId), {
      lotteryId: lotId,
      ticketsSold: sold,
      keriEtsa: keri,
      buyersCount: buyersCount,
      totalInventory: capacity,
      lastUpdated: new Date().toISOString(),
      kuankua: 'አማርኛ',
    }, { merge: true });
  } catch (err) {
    console.error('[Firestore Update Keri Etsa Error]', err);
    // Continue even if keri_etsa update fails, or should we return error? Better to report but proceed.
  }

  // Force sync Firestore dashboard/overview immediately
  await syncDashboardToFirestore(undefined, true);
  const lotteryCounts = computeActiveLotteryCounts();

  console.log(`[Admin Delete Ticket] ID: ${ticketId}, Lottery: ${lotId}. Updated keri_etsa (Sold: ${sold}, Keri: ${keri}) in Firebase.`);

  res.json({
    ok: true,
    lotteryCounts,
    deletedTicketId: ticketId,
    message: 'Ticket deleted successfully and volume deducted from Firebase'
  });
});

app.post('/api/tickets/user-delete', async (req, res) => {
  const { ticketId, userPhone } = req.body;
  if (!ticketId) return res.status(400).json({ ok: false, error: 'Ticket ID is required' });

  const targetTicket = syncedTickets.find(t => String(t.id) === String(ticketId));
  syncedTickets = syncedTickets.filter(t => String(t.id) !== String(ticketId));
  syncedTransactions = syncedTransactions.filter(t => String(t.id) !== String(ticketId) && String(t.ticketId) !== String(ticketId));
  
  safeWriteJsonSync(TICKETS_FILE, syncedTickets);
  safeWriteJsonSync(TX_FILE, syncedTransactions);

  try {
    await deleteDoc(doc(firestore, 'tickets', String(ticketId)));
    await deleteDoc(doc(firestore, 'transactions', String(ticketId)));
  } catch (err) {
    console.error(`[Firestore Delete Error] ticketId: ${ticketId}`, err);
    // Don't return error here to maintain user-side behavior? 
    // Actually, if Firebase fails, we should know.
  }

  const phoneToUse = targetTicket?.userPhone || userPhone;
  if (phoneToUse) {
    const clean = normalizeEthiopianPhone(phoneToUse);
    const wallet = findWalletByPhone(clean) || (targetTicket?.userId ? userWallets[targetTicket.userId] : undefined);
    if (wallet) {
      wallet.ticketsCount = Math.max(0, syncedTickets.filter(t => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9))).length);
      saveUserWallets(true, wallet);
      await syncWalletToFirestore(wallet).catch((e) => console.error('[Sync Wallet Error]', e));
    }
  }

  // Update keri_etsa in Firestore
  const lotId = targetTicket?.lotteryId || (targetTicket?.pricePaid === 10 ? 'lot_derash_1000' : targetTicket?.pricePaid === 50 ? 'lot_derash_5000' : targetTicket?.pricePaid === 100 ? 'lot_derash_10000' : 'lot_derash_50000');
  const remainingForLot = syncedTickets.filter(t => t.status === 'active' && (t.lotteryId === lotId || (targetTicket && t.pricePaid === targetTicket.pricePaid)));
  const capacity = lotId === 'lot_derash_50000' ? 300 : 150;
  const sold = remainingForLot.length;
  const keri = Math.max(0, capacity - sold);
  
  try {
    await setDoc(doc(firestore, 'keri_etsa', lotId), {
      lotteryId: lotId,
      ticketsSold: sold,
      keriEtsa: keri,
      totalInventory: capacity,
      lastUpdated: new Date().toISOString(),
      kuankua: 'አማርኛ',
    }, { merge: true });
  } catch (err) {
    console.error('[Firestore Update Keri Etsa Error]', err);
  }

  await syncDashboardToFirestore(undefined, true);
  const lotteryCounts = computeActiveLotteryCounts();

  res.json({
    ok: true,
    lotteryCounts,
    deletedTicketId: ticketId,
    message: 'Ticket deleted successfully and volume deducted from Firebase'
  });
});

app.post('/api/admin/deduplicate', async (_req, res) => {
  const result = deduplicateWallets(true);
  await syncDashboardToFirestore(undefined, true);
  res.json({
    ok: true,
    ...result,
  });
});

app.get('/api/user/profile', (req, res) => {
  const telegramId = (req.query.telegramId || req.query.tg_id) as string;
  const phone = req.query.phone as string;
  const userId = req.query.userId as string;

  if (!telegramId && !phone && !userId) {
    return res.status(400).json({ ok: false, error: 'Identifier required' });
  }

  const cleanPhone = normalizeEthiopianPhone(phone);
  let wallet: UserWallet | undefined;

  // 1. Match by phone
  if (cleanPhone && cleanPhone.length >= 9) {
    wallet = findWalletByPhone(cleanPhone);
  }

  // 2. Match by telegramId or userId
  if (!wallet && (telegramId || userId)) {
    const searchId = telegramId ? String(telegramId) : String(userId);
    for (const [k, w] of Object.entries(userWallets)) {
      if (k === searchId || k === `tg_${searchId}` || w.userId === searchId || (w.telegramId && w.telegramId === searchId)) {
        wallet = w;
        break;
      }
    }
  }

  if (!wallet) {
    return res.status(404).json({ ok: false, error: 'User not found' });
  }

  // Automatically link phone and telegramId if both exist
  if (cleanPhone && cleanPhone.length >= 9) {
    if (!wallet.phone || wallet.phone !== cleanPhone) {
      wallet.phone = cleanPhone;
      wallet.userId = cleanPhone;
      userWallets[cleanPhone] = wallet;
    }
  }
  if (telegramId && !wallet.telegramId) {
    wallet.telegramId = String(telegramId);
  }

  wallet.lastActive = new Date().toISOString();

  const userClean = normalizeEthiopianPhone(wallet.phone);
  const tgIdStr = wallet.telegramId ? String(wallet.telegramId) : '';
  const walletUid = wallet.userId ? String(wallet.userId) : '';

  const isUserMatch = (phoneStr?: string, uidStr?: string) => {
    if (userClean && phoneStr) {
      const pClean = normalizeEthiopianPhone(phoneStr);
      if (pClean && pClean.length >= 9 && (pClean === userClean || pClean.slice(-9) === userClean.slice(-9))) {
        return true;
      }
    }
    if (uidStr) {
      if (uidStr === walletUid || (tgIdStr && (uidStr === tgIdStr || uidStr === `tg_${tgIdStr}`))) {
        return true;
      }
    }
    return false;
  };

  const userTickets = syncedTickets.filter(t => isUserMatch(t.userPhone, t.userId));
  const userTxs = syncedTransactions.filter(t => isUserMatch(t.userPhone, t.userId));

  // Only include COMPLETED deposits in wallet balance
  const userGebi = userTxs.filter(t => (t.type === 'deposit' || t.type === 'xo_win') && t.status === 'completed').reduce((s, t) => s + (Number(t.amount) || 0), 0);
  
  // Deduct both COMPLETED and PENDING withdrawals (locking funds) and xo_loss
  const userWechi = userTxs.filter(t => (t.type === 'withdrawal' || t.type === 'xo_loss') && (t.status === 'completed' || t.status === 'pending')).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  
  const userSpend = userTickets.reduce((s, t) => s + (Number(t.pricePaid) || 0), 0);
  
  // Authoritative calculation based on full transaction history
  const calculatedBal = Math.max(0, (userGebi + (Number(wallet.totalWon) || 0)) - userWechi - userSpend);

  // Trust the calculation as the source of truth
  wallet.walletBalance = calculatedBal;
  
  saveUserWallets(true, wallet);

  res.json({
    ok: true,
    user: {
      userId: wallet.userId,
      telegramId: wallet.telegramId || '',
      customerId: wallet.customerId || ('TEWEDAJ-' + (wallet.telegramId || wallet.userId || wallet.phone).slice(-6)),
      phone: userClean || wallet.phone || '',
      fullName: wallet.fullName || 'ተጠቃሚ',
      username: wallet.username || '',
      profileImage: wallet.profileImage || '',
      walletBalance: wallet.walletBalance,
      ticketsCount: userTickets.length || wallet.ticketsCount || 0,
      totalWon: wallet.totalWon || 0,
      isAdmin: Boolean(
        (userClean && userClean.endsWith('0910961881')) ||
        (wallet.username && wallet.username.toLowerCase().replace('@', '') === 'lij_makbel') ||
        (wallet.telegramId === '5588110290')
      ),
    },
    tickets: userTickets,
  });
});

app.post('/api/admin/users/full-reset', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ ok: false, error: 'Phone required' });

  const clean = normalizeEthiopianPhone(phone);
  if (clean.includes('0910961881')) return res.status(403).json({ ok: false, error: 'Cannot reset owner' });

  // 1. Delete all user tickets
  syncedTickets = syncedTickets.filter(t => !t.userPhone || !normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)));
  safeWriteJsonSync(TICKETS_FILE, syncedTickets);

  // 1b. Delete all user transactions
  syncedTransactions = syncedTransactions.filter(t => !t.userPhone || !normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)));
  safeWriteJsonSync(TX_FILE, syncedTransactions);

  // 2. Reset Wallet
  const wallet = findWalletByPhone(clean);
  if (wallet) {
    wallet.walletBalance = 0;
    wallet.totalWon = 0;
    wallet.ticketsCount = 0;
    wallet.notifications = [];
    saveUserWallets(true, wallet);
    await syncWalletToFirestore(wallet).catch(() => {});
  }

  // 3. Clear from Firestore tickets & transactions
  try {
    const ticketsSnap = await getDocs(collection(firestore, 'tickets'));
    for (const d of ticketsSnap.docs) {
      const data = d.data();
      if (data.userPhone && normalizeEthiopianPhone(data.userPhone).endsWith(clean.slice(-9))) {
        await deleteDoc(doc(firestore, 'tickets', d.id));
      }
    }
    const txSnap = await getDocs(collection(firestore, 'transactions'));
    for (const d of txSnap.docs) {
      const data = d.data();
      if (data.userPhone && normalizeEthiopianPhone(data.userPhone).endsWith(clean.slice(-9))) {
        await deleteDoc(doc(firestore, 'transactions', d.id));
      }
    }
  } catch (err) {}


  await syncDashboardToFirestore(undefined, true);
  res.json({ ok: true, message: `User ${phone} reset to 0` });
});

app.post('/api/user/status', async (req, res) => {
  const { userId, phone, status } = req.body; // status: 'online' | 'offline'
  if (!userId && !phone) return res.status(400).json({ ok: false, error: 'User identifier required' });

  const cleanPhone = normalizeEthiopianPhone(phone);
  let wallet = cleanPhone ? findWalletByPhone(cleanPhone) : (userId ? userWallets[userId] : undefined);
  
  if (!wallet && userId) {
    // Search by telegramId if needed
    for (const w of Object.values(userWallets)) {
      if (w.userId === userId || w.telegramId === userId || `tg_${w.telegramId}` === userId) {
        wallet = w;
        break;
      }
    }
  }

  if (wallet) {
    wallet.isOnline = (status === 'online');
    wallet.lastActive = new Date().toISOString();
    saveUserWallets(false, wallet);
    // REMOVED: await syncWalletToFirestore(wallet).catch(() => {});
    // To save daily write quota, we don't sync 'online' status heartbeats to Firestore.
    // Wallet is still synced to Firestore when critical data (balance, tickets) actually changes.
  }

  res.json({ ok: true });
});

app.post('/api/user/wallet/update', (req, res) => {
  const { userId, phone, telegramId, walletBalance, ticketsCount, totalWon, fullName, username, profileImage, action } = req.body;
  if (!userId && !phone && !telegramId) {
    return res.status(400).json({ ok: false, error: 'User identifier required' });
  }

  const wallet = findOrCreateWallet({ userId, phone, telegramId, fullName, username, profileImage });
  if (typeof walletBalance === 'number') {
    if (action === 'ticket_purchase' || action === 'deduct') {
      wallet.walletBalance = Math.max(0, walletBalance);
    }
  }
  if (typeof ticketsCount === 'number') wallet.ticketsCount = ticketsCount;
  if (typeof totalWon === 'number') wallet.totalWon = totalWon;
  if (fullName && fullName.trim() && fullName !== 'ተጠቃሚ') wallet.fullName = fullName.trim();
  if (phone) wallet.phone = normalizeEthiopianPhone(phone);
  if (username) wallet.username = username;
  if (profileImage) wallet.profileImage = profileImage;
  if (telegramId) wallet.telegramId = String(telegramId);
  saveUserWallets(false, wallet);
  syncWalletToFirestore(wallet).catch(() => {});
  syncDashboardToFirestore().catch(() => {});

  res.json({ ok: true, wallet });
});

// Dedicated XO Game Settlement with 20% cut for wins and instant deduction for losses
app.post('/api/xo/settle', async (req, res) => {
  const { userId, phone, telegramId, outcome, betAmount, txId } = req.body;
  if (!userId && !phone && !telegramId) {
    return res.status(400).json({ ok: false, error: 'User identifier required' });
  }

  const bet = Math.max(0, Number(betAmount) || 0);
  const cut = Math.round(bet * 0.20);
  const netWin = Math.max(0, bet - cut);

  const wallet = findOrCreateWallet({ userId, phone, telegramId });
  if (!wallet) {
    return res.status(404).json({ ok: false, error: 'Wallet not found' });
  }

  const cleanPhone = normalizeEthiopianPhone(wallet.phone || phone);
  const finalTxId = txId || `tx_xo_${outcome}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  if (outcome === 'win') {
    wallet.walletBalance = (Number(wallet.walletBalance) || 0) + netWin;
    wallet.totalWon = (Number(wallet.totalWon) || 0) + netWin;

    const tx: SyncedTransaction = {
      id: finalTxId,
      lotteryId: 'xo_game',
      lotteryTitleAm: 'XO ጨዋታ',
      userId: wallet.userId,
      userName: wallet.fullName || 'ተጠቃሚ',
      userPhone: cleanPhone,
      telegramId: wallet.telegramId || '',
      amount: netWin,
      type: 'xo_win',
      paymentMethod: 'wallet',
      referenceNumber: 'XO-WIN-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      timestamp: now,
      status: 'completed',
      gatewayFee: cut,
    };

    syncedTransactions.unshift(tx);
    saveTransactions(tx);
    saveUserWallets(true, wallet);
    await syncWalletToFirestore(wallet).catch(() => {});
    await syncTransactionToFirestore(tx).catch(() => {});

    console.log(`[XO Settle - WIN] User: ${wallet.userId}, Bet: ${bet}, NetWin: ${netWin}, Cut: ${cut}, NewBal: ${wallet.walletBalance}`);

    return res.json({
      ok: true,
      outcome: 'win',
      walletBalance: wallet.walletBalance,
      netWin,
      cut,
      txId: finalTxId,
    });
  } else if (outcome === 'lose') {
    wallet.walletBalance = Math.max(0, (Number(wallet.walletBalance) || 0) - bet);

    const tx: SyncedTransaction = {
      id: finalTxId,
      lotteryId: 'xo_game',
      lotteryTitleAm: 'XO ጨዋታ',
      userId: wallet.userId,
      userName: wallet.fullName || 'ተጠቃሚ',
      userPhone: cleanPhone,
      telegramId: wallet.telegramId || '',
      amount: bet,
      type: 'xo_loss',
      paymentMethod: 'wallet',
      referenceNumber: 'XO-LOSS-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      timestamp: now,
      status: 'completed',
      gatewayFee: 0,
    };

    syncedTransactions.unshift(tx);
    saveTransactions(tx);
    saveUserWallets(true, wallet);
    await syncWalletToFirestore(wallet).catch(() => {});
    await syncTransactionToFirestore(tx).catch(() => {});

    console.log(`[XO Settle - LOSE] User: ${wallet.userId}, Bet: ${bet}, Deducted: ${bet}, NewBal: ${wallet.walletBalance}`);

    return res.json({
      ok: true,
      outcome: 'lose',
      walletBalance: wallet.walletBalance,
      deducted: bet,
      txId: finalTxId,
    });
  } else {
    // Draw
    return res.json({
      ok: true,
      outcome: 'draw',
      walletBalance: wallet.walletBalance,
    });
  }
});

// Batch delete transactions
app.post('/api/transactions/delete-batch', async (req, res) => {
  const { transactionIds } = req.body;
  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    return res.status(400).json({ ok: false, error: 'Transaction IDs are required' });
  }

  const idsSet = new Set(transactionIds.map(String));
  const toDelete = syncedTransactions.filter(t => idsSet.has(String(t.id)));

  // Adjust affected user wallets
  for (const tx of toDelete) {
    const cleanPhone = tx.userPhone ? normalizeEthiopianPhone(tx.userPhone) : '';
    const wallet = cleanPhone ? findWalletByPhone(cleanPhone) : (tx.userId ? userWallets[tx.userId] : undefined);
    if (wallet) {
      const amount = Number(tx.amount) || 0;
      if (tx.type === 'deposit' && tx.status === 'completed') {
        wallet.walletBalance = Math.max(0, (wallet.walletBalance || 0) - amount);
      } else if (tx.type === 'withdrawal' && tx.status === 'completed') {
        wallet.walletBalance = (wallet.walletBalance || 0) + amount; // refund
      } else if (tx.type === 'withdrawal' && tx.status === 'pending') {
        wallet.walletBalance = (wallet.walletBalance || 0) + amount; // refund
      }
      saveUserWallets(true, wallet);
      await syncWalletToFirestore(wallet).catch(() => {});
    }
  }

  syncedTransactions = syncedTransactions.filter(t => !idsSet.has(String(t.id)));
  safeWriteJsonSync(TX_FILE, syncedTransactions);

  // Delete from Firestore
  for (const id of transactionIds) {
    try {
      await deleteDoc(doc(firestore, 'transactions', String(id)));
    } catch (err) {
      console.warn(`[Firestore Delete Error] tx ${id}:`, err);
    }
  }

  await syncDashboardToFirestore(undefined, true);

  res.json({
    ok: true,
    deletedCount: toDelete.length,
    message: `Successfully deleted ${toDelete.length} transactions and deducted from Firebase`,
    remaining: syncedTransactions.length
  });
});

// Admin endpoints for Group Chat Management
app.post('/api/admin/group/permissions', async (req, res) => {
  const { chatId, canSendMedia, adminPhone, adminUsername } = req.body;
  
  // Verify Admin
  const cleanPhone = adminPhone ? String(adminPhone).replace(/\D/g, '') : '';
  const isOwner = cleanPhone.includes('910961881') || (adminUsername && String(adminUsername).toLowerCase().includes('lij_makbel'));
  if (!isOwner) return res.status(403).json({ ok: false, error: 'Unauthorized' });

  try {
    const permissions = {
      can_send_messages: true,
      can_send_media_messages: canSendMedia, // Allow/Restrict images/videos
      can_send_polls: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false,
      can_change_info: false,
      can_invite_users: false,
      can_pin_messages: false,
    };

    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setChatPermissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, permissions }),
    });
    const data = await tgRes.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/admin/reconcile-all', async (req, res) => {
  try {
    console.log('[Admin] Running global balance reconciliation...');
    let changedCount = 0;

    for (const wallet of Object.values(userWallets)) {
      const cleanPhone = wallet.phone ? normalizeEthiopianPhone(wallet.phone) : '';
      const tgId = wallet.telegramId || '';
      
      const userTxs = syncedTransactions.filter(t => {
        if (cleanPhone && t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(cleanPhone.slice(-9))) return true;
        if (t.userId === wallet.userId || t.userId === tgId || t.userId === `tg_${tgId}`) return true;
        return false;
      });

      const userTickets = syncedTickets.filter(t => {
        if (cleanPhone && t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(cleanPhone.slice(-9))) return true;
        if (t.userId === wallet.userId || t.userId === tgId || t.userId === `tg_${tgId}`) return true;
        return false;
      });

      const totalGebi = userTxs.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const totalWechi = userTxs.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const totalWon = Number(wallet.totalWon) || 0;
      const totalSpend = userTickets.reduce((s, t) => s + (Number(t.pricePaid) || 0), 0);

      const calculatedBal = Math.max(0, (totalGebi + totalWon) - totalWechi - totalSpend);
      
      if (Math.abs(wallet.walletBalance - calculatedBal) > 0.01) {
        wallet.walletBalance = calculatedBal;
        wallet.ticketsCount = userTickets.length;
        changedCount++;
        syncWalletToFirestore(wallet).catch(() => {});
      }
    }

    if (changedCount > 0) {
      saveUserWallets(true);
    }
    
    await syncDashboardToFirestore(undefined, true);
    
    res.json({ ok: true, changedCount, totalUsers: Object.keys(userWallets).length });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});


app.post('/api/transactions/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, approvedBy } = req.body;
  let tx = syncedTransactions.find((t) => t.id === id);
  if (!tx) {
    try {
      const snap = await getDoc(doc(firestore, 'transactions', id));
      if (snap.exists()) {
        tx = snap.data() as SyncedTransaction;
        syncedTransactions.unshift(tx);
        saveTransactions();
      }
    } catch (e) {
      console.warn('[Fetch Tx from Firestore error]', e);
    }
  }
  if (!tx) {
    return res.status(404).json({ ok: false, error: 'Transaction not found' });
  }

  const previousStatus: string = tx.status;
  if (previousStatus === status) {
    return res.json({ ok: true, transaction: tx, message: 'Already processed' });
  }
  tx.status = status;
  tx.approvedBy = approvedBy || 'Admin 0910961881';
  saveTransactions(tx);
  await syncTransactionToFirestore(tx).catch(() => {});

  const userWallet = findOrCreateWallet({
    userId: tx.userId,
    phone: tx.userPhone,
    telegramId: (tx as any).telegramId || (tx.userId?.startsWith('tg_') ? tx.userId.replace('tg_', '') : undefined),
    fullName: tx.userName,
  });

  const exactAmount = Number(tx.amount) || 0;

  // Authoritative mathematical balance calculation from completed transaction records:
  await reconcileWalletForUser(userWallet.userId, userWallet.phone, userWallet.telegramId);

  if (status === 'completed' && tx.type === 'deposit' && previousStatus === 'pending') {
    console.log(`[Admin Approved Deposit] Transaction ${tx.id} approved for ${exactAmount} ETB. User ${userWallet.phone || userWallet.userId} balance reconciled to: ${userWallet.walletBalance}`);

    const apprNotif = {
      id: 'notif_appr_' + Date.now(),
      userId: tx.userId || userWallet.userId,
      userName: tx.userName,
      userPhone: tx.userPhone,
      lotteryId: 'wallet',
      lotteryTitleAm: 'ገንዘብ ገቢ ተደርጓል',
      ticketNumber: tx.referenceNumber || '',
      amountWon: 0,
      timestamp: new Date().toISOString(),
      isRead: false,
      messageAm: `የ ${exactAmount.toLocaleString()} ብር ገቢ ጥያቄዎ በአድሚን ጸድቆ ዋሌትዎ ላይ ገቢ ተደርጓል:: (ማጣቀሻ: ${tx.referenceNumber || ''})`,
      messageEn: `Your deposit of ${exactAmount.toLocaleString()} ETB was approved and credited to your wallet!`,
    };
    await setDoc(doc(firestore, 'notifications', apprNotif.id), apprNotif, { merge: true }).catch(() => {});
  }

  await sendUserTransactionStatusTelegramNotification(tx, status, userWallet);

  updateBotMessagesStatus(tx).catch(() => {});

  res.json({ ok: true, transaction: tx, walletBalance: userWallet.walletBalance });
});

app.get('/api/support/messages', (req, res) => {
  const userPhone = req.query.phone as string;
  if (!userPhone) {
    return res.json({ ok: true, messages: supportMessages.slice(-50) });
  }
  const cleanPhone = userPhone.replace(/\s+/g, '');
  const userFiltered = supportMessages.filter(
    (m) => m.userPhone.replace(/\s+/g, '').includes(cleanPhone) || cleanPhone.includes(m.userPhone.replace(/\s+/g, ''))
  );
  res.json({ ok: true, messages: userFiltered });
});

app.post('/api/support/send', async (req, res) => {
  const { userName, userPhone, text, userId } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ ok: false, error: 'Message text is required' });
  }

  const newMsg: SupportMessage = {
    id: 'sup_' + Date.now(),
    userId: userId || 'user',
    userName: (userName && userName !== 'ተጠቃሚ') ? userName : (userPhone || 'ደንበኛ'),
    userPhone: userPhone || '',
    sender: 'user',
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };

  supportMessages.push(newMsg);
  saveSupportMessages();
  recordMiniAppActivity(userId || userPhone || 'support_user', 'support_message_sent', {
    userName: newMsg.userName,
    userPhone: newMsg.userPhone,
    text: newMsg.text,
  }).catch(() => {});

  const adminNotification = 
    `💬 <b>አዲስ የድጋፍ መልዕክት (Support Inquiry)</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 <b>ስም:</b> <b>${newMsg.userName}</b>\n` +
    `📱 <b>ስልክ:</b> <code>${newMsg.userPhone}</code>\n` +
    `📝 <b>መልዕክት:</b>\n` +
    `<i>"${newMsg.text}"</i>\n` +
    `━━━━━━━━━━━━━━━━━━━━`;

  await notifyAllAdmins(adminNotification);
  res.json({ ok: true, message: newMsg });
});


app.all(['/api/telegram/webhook', '/api/webhook', '/telegram/webhook', '/webhook'], async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      status: 'Telegram Webhook is Active & Ready 24/7 (Vercel Serverless & Express)',
      bot: BOT_USERNAME,
      url: `${APP_URL}/api/telegram/webhook`,
    });
  }

  try {
    await ensureFirestoreLoaded();
    const update = req.body;
    if (update?.message) {
      await handleTelegramMessage(update.message);
    } else if (update?.callback_query) {
      await handleTelegramCallback(update.callback_query);
    }
  } catch (err: any) {
    console.error('[Telegram Webhook Error]', err?.message || err);
  }

  return res.status(200).send('OK');
});

const UPDATE_ID_FILE = path.join(STORAGE_DIR, 'last_update_id.txt');
let lastUpdateId = 0;

try {
  if (fs.existsSync(UPDATE_ID_FILE)) {
    lastUpdateId = parseInt(fs.readFileSync(UPDATE_ID_FILE, 'utf-8').trim(), 10) || 0;
  }
} catch {
  lastUpdateId = 0;
}

function saveLastUpdateId(id: number) {
  try {
    fs.writeFileSync(UPDATE_ID_FILE, String(id));
  } catch {}
}

const asyncSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function setupTelegramBotCommandsAndMenu() {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: '🚀 ቦቱን ጀምር / ሎተሪ ክፈት (Start Bot)' },
          { command: 'lottery', description: '🎟 ንቁ ዕጣዎችና ትኬቶች (Active Lotteries)' },
          { command: 'wallet', description: '💳 የኔ ዋሌት (My Wallet)' },
          { command: 'help', description: '❓ እርዳታና ድጋፍ (Help & Support)' },
        ],
      }),
    });

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'commands',
        },
      }),
    });

    await updateTelegramBotMonthlyUsers();
  } catch (err: any) {
    console.warn('[Bot Commands & Menu Warning]', err?.message || err);
  }
}

async function startTelegramPolling() {
  console.log(`[Telegram Bot] Starting non-blocking 24/7 async polling for @${BOT_USERNAME}...`);
  try {
    // Unset any webhook so that Telegram's getUpdates receives messages immediately
    const delRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`);
    const delData = await delRes.json() as any;
    console.log(`[Telegram Bot Webhook Clear] Success:`, delData?.ok);
    await setupTelegramBotCommandsAndMenu();
  } catch (err) {
    console.error('[Bot Polling Init Warning]', err);
  }

  let consecutiveErrors = 0;
  while (true) {
    try {
      const offset = lastUpdateId > 0 ? lastUpdateId + 1 : 0;
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=20`,
        { signal: AbortSignal.timeout(30000) }
      );
      
      if (!res.ok) {
        consecutiveErrors++;
        if (res.status === 409) {
          console.warn('[Bot Polling] 409 Conflict detected (active webhook or duplicate instance). Resetting webhook...');
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`).catch(() => {});
        } else {
          console.warn(`[Bot Polling] getUpdates failed: ${res.status} ${res.statusText}`);
        }
        await asyncSleep(consecutiveErrors > 5 ? 4000 : 1500);
        continue;
      }
      
      consecutiveErrors = 0;
      const data = (await res.json()) as any;
      if (data && data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          saveLastUpdateId(lastUpdateId);
          try {
            if (update.message) {
              console.log(`[Telegram Bot Incoming Message] From: ${update.message.from?.id} (${update.message.from?.username || ''}), Text: "${update.message.text || ''}"`);
              await handleTelegramMessage(update.message);
            } else if (update.callback_query) {
              console.log(`[Telegram Bot Incoming Callback] From: ${update.callback_query.from?.id}, Data: "${update.callback_query.data || ''}"`);
              await handleTelegramCallback(update.callback_query);
            }
          } catch (innerErr) {
            console.error('[Update Processing Error]', update.update_id, innerErr);
          }
        }
        if (data.result.length > 0) {
          // Immediately process next batch if updates arrived
          await asyncSleep(50);
          continue;
        }
      } else if (data && !data.ok) {
        console.error('[Bot Polling Error from Telegram]', data);
        if (data.error_code === 409) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`).catch(() => {});
        }
        await asyncSleep(2000);
      }
    } catch (err: any) {
      if (err.name !== 'TimeoutError' && !err.message?.includes('timeout')) {
        console.error('[Bot Polling Cycle Error]', err.message || err);
      }
      await asyncSleep(1500);
    }
    await asyncSleep(300); // 300ms non-blocking async sleep, yields event loop
  }
}

async function initTelegramBotService() {
  if (isVercel) {
    // In Vercel serverless environment, never start long polling as it causes function invocation timeouts
    return;
  }
  console.log(`[Telegram Bot] Initializing bot service for @${BOT_USERNAME}...`);
  await setupTelegramBotCommandsAndMenu();

  if (process.env.TELEGRAM_USE_WEBHOOK === 'true' && APP_URL && !APP_URL.includes('localhost')) {
    try {
      const webhookUrl = `${APP_URL}/api/telegram/webhook`;
      const whRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'callback_query'],
          drop_pending_updates: false,
        }),
      });
      const whData = await whRes.json() as any;
      console.log(`[Telegram 24/7 Webhook Configured] URL: ${webhookUrl}, Success: ${whData?.ok}`);
      return;
    } catch (whErr: any) {
      console.warn('[Webhook Registration Warning]', whErr?.message || whErr);
    }
    return;
  }

  // Standalone server / local dev: Non-blocking 24/7 async polling
  startTelegramPolling();
}

app.post('/api/admin/tickets/clear-all', async (req, res) => {
  // Clear all tickets
  syncedTickets = [];
  syncedTransactions = syncedTransactions.filter(t => t.type !== 'ticket_purchase');
  safeWriteJsonSync(TICKETS_FILE, syncedTickets);
  safeWriteJsonSync(TX_FILE, syncedTransactions);

  // Clear Firestore 'tickets'
  const ticketsSnap = await getDocs(collection(firestore, 'tickets'));
  for (const docSnap of ticketsSnap.docs) {
    await deleteDoc(doc(firestore, 'tickets', docSnap.id)).catch(() => {});
  }

  // Reset 'keri_etsa'
  for (const [lotId, conf] of Object.entries(CANONICAL_LOTTERY_CAPACITIES)) {
    await setDoc(doc(firestore, 'keri_etsa', lotId), {
      lotteryId: lotId,
      ticketsSold: 0,
      keriEtsa: conf.capacity,
      buyersCount: 0,
      totalInventory: conf.capacity,
      lastUpdated: new Date().toISOString(),
      kuankua: 'አማርኛ',
    }, { merge: true }).catch(() => {});
  }

  await syncDashboardToFirestore(undefined, true);
  res.json({ ok: true, message: 'All tickets cleared' });
});

app.post('/api/admin/broadcast', async (req, res) => {
  const { message, title } = req.body;
  if (!message) {
    return res.status(400).json({ ok: false, error: 'Message is required' });
  }
  const broadcastText = `📢 <b>${escapeHtml(title || 'የተወዳጅ ሎተሪ ማስታወቂያ (Announcement)')}</b>\n\n${escapeHtml(message)}\n\n━━━━━━━━━━━━━━━━━━━━\n<i>ተወዳጅ ኦንላይን ሎተሪ (Tewedaj Online Lottery)</i>`;
  const uniqueChatIds = new Set<number>();
  for (const w of Object.values(userWallets)) {
    if (w.telegramId) {
      const num = Number(w.telegramId);
      if (!isNaN(num) && num > 0) uniqueChatIds.add(num);
    }
  }
  adminChatIds.forEach(id => uniqueChatIds.add(id));
  uniqueChatIds.add(PRIMARY_ADMIN_CHAT_ID);

  let successCount = 0;
  for (const cid of uniqueChatIds) {
    try {
      await sendTelegramResponse(cid, broadcastText, {
        inline_keyboard: [[{ text: '🎟 አፑን ክፈት (Open Lottery)', url: APP_URL }]],
      });
      successCount++;
    } catch {}
  }
  res.json({ ok: true, sentCount: successCount });
});

app.all('/api/health', (_req, res) => {
  res.json({
    ok: true,
    status: 'running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    bot: BOT_USERNAME,
  });
});

app.all('/api/ping', (_req, res) => {
  res.status(200).send('pong - Tewedaj Bot & Mini App is awake 24/7!');
});

app.all('/api/keep-alive', (_req, res) => {
  res.status(200).json({
    ok: true,
    status: 'active_24_7',
    service: 'Tewedaj Online Lottery Bot & Mini App Keep-Alive',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    uptimerobot: {
      url: `${APP_URL}/api/keep-alive`,
      interval: '5 minutes',
      method: 'GET or HEAD',
      purpose: 'Prevents free hosting sleep/idle timeouts 24/7'
    }
  });
});

// Global Express Error Handler Middleware to catch any uncaught errors and prevent 500 crashes
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[Express Global Error] ${req.method} ${req.url}:`, err);
  if (!res.headersSent) {
    res.status(200).json({
      ok: false,
      error: err?.message || 'Server error occurred, handled gracefully',
    });
  }
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, async () => {
    console.log(`[Tewedaj Server] Running on http://0.0.0.0:${PORT}`);
    await loadAllFromFirestore();
    initFirestoreTransactionsWatcher();
    initFirestoreTicketsWatcher();
    
    // Initialize Bot Service (Webhook on public deployments, non-blocking polling on local dev)
    await initTelegramBotService();

    // 24/7 Keep-Alive Self-Ping Interval (pings internal & external public endpoints every 2 minutes)
    const keepAliveTargets = [`http://127.0.0.1:${PORT}/api/keep-alive`];
    if (APP_URL && !APP_URL.includes('localhost') && !APP_URL.includes('127.0.0.1')) {
      keepAliveTargets.push(`${APP_URL}/api/keep-alive`);
    }
    if (process.env.RENDER_EXTERNAL_URL) {
      keepAliveTargets.push(`${process.env.RENDER_EXTERNAL_URL}/api/keep-alive`);
    }

    const keepAliveInterval = setInterval(async () => {
      for (const targetUrl of keepAliveTargets) {
        try {
          await fetch(targetUrl, { signal: AbortSignal.timeout(8000) });
        } catch {}
      }
    }, 120000); // Every 2 minutes to prevent free host 15-minute sleep
    if (keepAliveInterval.unref) keepAliveInterval.unref();
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server Error] Port ${PORT} is already in use.`);
      process.exit(1);
    } else {
      console.error('[Server Error]', err);
    }
  });
}

if (process.env.VERCEL !== '1') {
  startServer();
}

export default app;

