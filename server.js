// server.ts
import express from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { initializeApp, getApps, getApp } from "firebase/app";
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
  limit
} from "firebase/firestore";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var isVercel = process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
var STORAGE_DIR = isVercel ? "/tmp" : __dirname;
var app = express();
var PORT = Number(process.env.PORT) || 3e3;
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
var DEFAULT_FIREBASE_CONFIG = {
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
var firebaseConfig = { ...DEFAULT_FIREBASE_CONFIG };
try {
  const possiblePaths = [
    path.join(__dirname, "firebase-applet-config.json"),
    path.join(__dirname, "..", "firebase-applet-config.json"),
    path.join(process.cwd(), "firebase-applet-config.json")
  ];
  for (const cfgPath of possiblePaths) {
    if (fs.existsSync(cfgPath)) {
      const content = fs.readFileSync(cfgPath, "utf8");
      if (content && content.trim()) {
        firebaseConfig = JSON.parse(content);
        break;
      }
    }
  }
} catch (e) {
  console.warn("[Firebase Config Load Warning]", e);
}
var fbApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
var firestore = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);
var TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8577097699:AAEwbW_yXyU1q0RgRi7J0GXAEnKboY6wFzM";
var BOT_USERNAME = "Tewedaj_Online_Lottery_bot";
var APP_URL = "https://tewedaj-online-lottery.vercel.app";
var ADMIN_APP_URL = `${APP_URL}?admin=true&phone=0910961881&username=lij_makbel&tg_id=5588110290`;
var OFFICIAL_ADMIN = {
  phone: "0910961881",
  supportUsername: "lij_makbel",
  fullName: "Makbel Maregu",
  telebirr: "0910961881",
  cbeAccount: "1000321337124"
};
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.use("/api", async (_req, _res, next) => {
  try {
    await ensureFirestoreLoaded();
  } catch (e) {
    console.warn("[Firestore Auto-Load Error]", e);
  }
  next();
});
var OFFICIAL_MERCHANT = {
  fullName: OFFICIAL_ADMIN.fullName,
  telebirr: OFFICIAL_ADMIN.telebirr,
  cbeAccount: OFFICIAL_ADMIN.cbeAccount,
  platform: "Tewedaj Online Lottery (\u1270\u12C8\u12F3\u1305 \u12A6\u1295\u120B\u12ED\u1295 \u120E\u1270\u122A)",
  telegramBot: "@" + BOT_USERNAME,
  supportHandle: "@" + OFFICIAL_ADMIN.supportUsername,
  adminPhone: OFFICIAL_ADMIN.phone,
  status: "active",
  lotteries: [
    { title: "\u1263\u1208 1,000 \u1265\u122D \u12F0\u122B\u123D", price: 10, jackpot: 1e3 },
    { title: "\u1263\u1208 5,000 \u1265\u122D \u12F0\u122B\u123D", price: 50, jackpot: 5e3 },
    { title: "\u1263\u1208 10,000 \u1265\u122D \u12F0\u122B\u123D", price: 100, jackpot: 1e4 },
    { title: "\u1263\u1208 50,000 \u1265\u122D \u12F0\u122B\u123D", price: 200, jackpot: 5e4 }
  ]
};
var PRIMARY_ADMIN_CHAT_ID = 5588110290;
var ADMIN_CHATS_FILE = path.join(STORAGE_DIR, "admin_chats.json");
var adminChatIds = [PRIMARY_ADMIN_CHAT_ID];
try {
  adminChatIds = [PRIMARY_ADMIN_CHAT_ID];
} catch {
  adminChatIds = [PRIMARY_ADMIN_CHAT_ID];
}
function saveAdminChatIds() {
  try {
    fs.writeFileSync(ADMIN_CHATS_FILE, JSON.stringify(Array.from(/* @__PURE__ */ new Set([PRIMARY_ADMIN_CHAT_ID, ...adminChatIds])), null, 2));
  } catch (err) {
    console.error("[Save Admin Chats Error]", err);
  }
}
function addAdminChatId(chatId) {
  if (!adminChatIds.includes(chatId)) {
    adminChatIds.push(chatId);
    saveAdminChatIds();
    console.log(`[Admin Registered] Chat ID: ${chatId}. Total Admins: ${adminChatIds.length}`);
  }
}
function safeWriteJsonSync(filePath, data) {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    const tmpFile = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tmpFile, jsonStr, "utf-8");
    if (fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, `${filePath}.bak`);
      } catch {
      }
    }
    fs.renameSync(tmpFile, filePath);
  } catch (err) {
    console.error(`[Atomic Save Error: ${filePath}]`, err);
  }
}
function safeReadJsonSync(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8").trim();
      if (content) {
        return JSON.parse(content);
      }
    }
  } catch (err) {
    console.warn(`[Read Primary JSON Failed: ${filePath}, trying backup]`, err);
  }
  try {
    const bakFile = `${filePath}.bak`;
    if (fs.existsSync(bakFile)) {
      const content = fs.readFileSync(bakFile, "utf-8").trim();
      if (content) {
        return JSON.parse(content);
      }
    }
  } catch (bakErr) {
    console.error(`[Read Backup JSON Failed: ${filePath}]`, bakErr);
  }
  return fallback;
}
function sanitizeForFirestore(data) {
  if (data === void 0) return null;
  if (data === null || typeof data !== "object") return data;
  if (data instanceof Date) return data.toISOString();
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item));
  }
  const clean = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== void 0) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean;
}
var firestoreQuotaExceededUntil = 0;
function isFirestoreQuotaActive() {
  if (Date.now() < firestoreQuotaExceededUntil) {
    return false;
  }
  return true;
}
function handleFirestoreError(err, contextStr) {
  const msg = String(err?.message || err?.code || err || "").toLowerCase();
  const code = String(err?.code || "").toLowerCase();
  if (code.includes("resource-exhausted") || msg.includes("resource-exhausted") || msg.includes("quota exceeded")) {
    firestoreQuotaExceededUntil = Date.now() + 30 * 1e3;
    console.warn(`[Firestore Quota Guard: ${contextStr}] Throttled for 30s.`);
    return;
  }
  console.warn(`[Firestore Error: ${contextStr}]`, err?.message || msg);
}
async function safeFirestoreWriteWithRetry(operation, maxRetries = 3, delayMs = 1e3) {
  if (!isFirestoreQuotaActive()) return false;
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      await operation();
      return true;
    } catch (err) {
      attempt++;
      const msg = String(err?.message || err?.code || err || "").toLowerCase();
      const code = String(err?.code || "").toLowerCase();
      if (code.includes("resource-exhausted") || msg.includes("resource-exhausted") || msg.includes("quota exceeded")) {
        handleFirestoreError(err, "safeFirestoreWriteWithRetry");
        return false;
      }
      if (attempt >= maxRetries) {
        handleFirestoreError(err, `safeFirestoreWriteWithRetry (failed after ${maxRetries} attempts)`);
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  return false;
}
async function syncWalletToFirestore(wallet) {
  try {
    if (!isFirestoreQuotaActive()) return;
    if (!wallet.userId && !wallet.phone && !wallet.telegramId) return;
    const cleanPhone = wallet.phone ? normalizeEthiopianPhone(wallet.phone) : "";
    const raw = sanitizeForFirestore(wallet);
    if (!raw.fullName && raw.name) {
      raw.fullName = raw.name;
    }
    delete raw.name;
    const canonicalDocId = cleanPhone && cleanPhone.length >= 9 ? cleanPhone.length === 10 ? cleanPhone : `0${cleanPhone.slice(-9)}` : wallet.telegramId ? `tg_${wallet.telegramId}` : String(wallet.userId);
    const isOwnerAccount = Boolean(
      cleanPhone && cleanPhone.endsWith("0910961881") || raw.username && raw.username.toLowerCase().replace("@", "") === "lij_makbel" || raw.telegramId && String(raw.telegramId) === "5588110290"
    );
    const cleanData = {
      customerId: raw.customerId || "",
      fullName: raw.fullName || "\u1270\u1320\u1243\u121A",
      phone: cleanPhone,
      telegramId: raw.telegramId ? String(raw.telegramId) : "",
      userId: canonicalDocId,
      username: raw.username || "",
      walletBalance: Number(raw.walletBalance) || 0,
      balance: Number(raw.walletBalance) || 0,
      ticketsCount: Number(raw.ticketsCount) || 0,
      totalWon: Number(raw.totalWon) || 0,
      language: "am",
      kuankua: "\u12A0\u121B\u122D\u129B",
      statusAm: isOwnerAccount ? "\u12CB\u1293 \u12A0\u1235\u1270\u12F3\u12F3\u122A (Owner)" : "\u1295\u1241 \u1270\u1320\u1243\u121A (Active)",
      registeredAt: raw.registeredAt || (/* @__PURE__ */ new Date()).toISOString(),
      profileImage: raw.profileImage || "",
      isAdmin: isOwnerAccount,
      isOnline: Boolean(raw.isOnline),
      lastActive: raw.lastActive || (/* @__PURE__ */ new Date()).toISOString(),
      notifications: raw.notifications || []
    };
    await safeFirestoreWriteWithRetry(async () => {
      await setDoc(doc(firestore, "wallets", canonicalDocId), cleanData, { merge: true });
    });
  } catch (err) {
    handleFirestoreError(err, "syncWalletToFirestore");
  }
}
var WALLETS_FILE = path.join(STORAGE_DIR, "wallets_store.json");
var userWallets = safeReadJsonSync(WALLETS_FILE, {});
function ensureOwnerWallet() {
  const ownerKey = "0910961881";
  let owner = findWalletByPhone("0910961881");
  if (!owner) {
    owner = {
      userId: "usr_0910961881",
      telegramId: "admin_makbel",
      customerId: "TEWEDAJ-091881",
      phone: "0910961881",
      fullName: "Makbel Maregu (Owner)",
      username: "@lij_makbel",
      walletBalance: 5e4,
      ticketsCount: 0,
      totalWon: 0,
      language: "am",
      isAdmin: true,
      registeredAt: (/* @__PURE__ */ new Date("2026-01-01T00:00:00.000Z")).toISOString()
    };
    userWallets[ownerKey] = owner;
    saveUserWallets(true, owner);
  } else {
    owner.isAdmin = true;
    if (!owner.fullName.includes("Owner")) {
      owner.fullName = "Makbel Maregu (Owner)";
    }
    owner.username = "@lij_makbel";
    if (!owner.registeredAt) {
      owner.registeredAt = (/* @__PURE__ */ new Date("2026-01-01T00:00:00.000Z")).toISOString();
    }
    saveUserWallets(true, owner);
  }
}
ensureOwnerWallet();
function ensureRegisteredUsersSeeded() {
  const seeded = [
    {
      userId: "usr_350267",
      telegramId: "350267",
      customerId: "TEWEDAJ-350267",
      phone: "",
      fullName: "Messi",
      username: "@Lulumessbro",
      walletBalance: 0,
      ticketsCount: 0,
      totalWon: 0,
      language: "am",
      registeredAt: (/* @__PURE__ */ new Date("2026-10-25T09:31:19.000Z")).toISOString()
    },
    {
      userId: "usr_350267",
      telegramId: "350267",
      customerId: "TEWEDAJ-350267",
      phone: "",
      fullName: "Messi",
      username: "@Lulumessbro",
      walletBalance: 0,
      ticketsCount: 0,
      totalWon: 0,
      language: "am",
      registeredAt: (/* @__PURE__ */ new Date("2026-10-25T09:31:19.000Z")).toISOString()
    },
    {
      userId: "usr_899978",
      telegramId: "899978",
      customerId: "TEWEDAJ-899978",
      phone: "",
      fullName: "abel",
      username: "",
      walletBalance: 0,
      ticketsCount: 0,
      totalWon: 0,
      language: "am",
      registeredAt: (/* @__PURE__ */ new Date("2026-10-25T09:31:19.000Z")).toISOString()
    }
  ];
  for (const u of seeded) {
    const existingKey = u.userId in userWallets ? u.userId : u.telegramId && `tg_${u.telegramId}` in userWallets ? `tg_${u.telegramId}` : null;
    if (!existingKey) {
      userWallets[u.userId] = u;
      saveUserWallets(true, u);
    } else if (u.telegramId === "350267") {
      userWallets[existingKey].fullName = "Messi";
      saveUserWallets(true, userWallets[existingKey]);
    }
  }
}
ensureRegisteredUsersSeeded();
function saveUserWallets(force = false, walletToSync) {
  if (!force && Object.keys(userWallets).length === 0 && fs.existsSync(WALLETS_FILE)) {
    const existing = safeReadJsonSync(WALLETS_FILE, {});
    if (Object.keys(existing).length > 0) return;
  }
  safeWriteJsonSync(WALLETS_FILE, userWallets);
  if (walletToSync) {
    syncWalletToFirestore(walletToSync).catch(() => {
    });
  }
}
async function reconcileWalletForUser(userId, phone, telegramId) {
  if (!userId && !phone && !telegramId) return;
  const wallet = findOrCreateWallet({ userId, phone, telegramId });
  if (!wallet) return;
  const userClean = normalizeEthiopianPhone(wallet.phone);
  const tgIdStr = wallet.telegramId ? String(wallet.telegramId) : "";
  const walletUid = wallet.userId ? String(wallet.userId) : "";
  const isUserMatch = (phoneStr, uidStr) => {
    if (userClean && phoneStr) {
      const pClean = normalizeEthiopianPhone(phoneStr);
      if (pClean && pClean.length >= 9 && (pClean === userClean || pClean.slice(-9) === userClean.slice(-9))) {
        return true;
      }
    }
    if (uidStr) {
      if (uidStr === walletUid || tgIdStr && (uidStr === tgIdStr || uidStr === `tg_${tgIdStr}`)) {
        return true;
      }
    }
    return false;
  };
  const userTickets = syncedTickets.filter((t) => isUserMatch(t.userPhone, t.userId));
  const userTxs = syncedTransactions.filter((t) => isUserMatch(t.userPhone, t.userId));
  const userGebi = userTxs.filter((t) => (t.type === "deposit" || t.type === "xo_win") && t.status === "completed").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const userWechi = userTxs.filter((t) => (t.type === "withdrawal" || t.type === "xo_loss") && (t.status === "completed" || t.status === "pending")).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const userSpend = userTickets.reduce((s, t) => s + (Number(t.pricePaid) || 0), 0);
  const calculatedBal = Math.max(0, userGebi + (Number(wallet.totalWon) || 0) - userWechi - userSpend);
  if (Math.abs(wallet.walletBalance - calculatedBal) > 0.01) {
    console.log(`[Reconciliation] User ${wallet.userId} balance corrected: ${wallet.walletBalance} -> ${calculatedBal}`);
    wallet.walletBalance = calculatedBal;
    wallet.ticketsCount = userTickets.length;
    saveUserWallets(true, wallet);
  }
}
function normalizeEthiopianPhone(raw) {
  if (!raw) return "";
  let clean = String(raw).replace(/\D/g, "");
  if (clean.startsWith("251")) {
    clean = "0" + clean.slice(3);
  } else if (!clean.startsWith("0") && (clean.startsWith("9") || clean.startsWith("7"))) {
    clean = "0" + clean;
  }
  return clean;
}
function findWalletByPhone(phone) {
  if (!phone) return void 0;
  const clean = normalizeEthiopianPhone(phone);
  if (!clean || clean.length < 9) return void 0;
  const suffix = clean.slice(-9);
  for (const w of Object.values(userWallets)) {
    if (w.phone) {
      const wClean = normalizeEthiopianPhone(w.phone);
      if (wClean.length >= 9 && wClean.slice(-9) === suffix) {
        return w;
      }
    }
  }
  return void 0;
}
function deduplicateWallets(cleanFirestore = true) {
  const mergedList = [];
  let removedCount = 0;
  const canonicalWallets = {};
  const obsoleteFirestoreKeys = [];
  const allEntries = Object.entries(userWallets);
  for (const [key, wallet] of allEntries) {
    if (!wallet) continue;
    const cleanPhone = wallet.phone ? normalizeEthiopianPhone(wallet.phone) : "";
    const phoneSuffix = cleanPhone.length >= 9 ? cleanPhone.slice(-9) : "";
    const tgId = wallet.telegramId ? String(wallet.telegramId) : key.startsWith("tg_") ? key.replace("tg_", "") : "";
    let matchedKey;
    for (const [cKey, cWallet] of Object.entries(canonicalWallets)) {
      const cCleanPhone = cWallet.phone ? normalizeEthiopianPhone(cWallet.phone) : "";
      const cPhoneSuffix = cCleanPhone.length >= 9 ? cCleanPhone.slice(-9) : "";
      const cTgId = cWallet.telegramId ? String(cWallet.telegramId) : cKey.startsWith("tg_") ? cKey.replace("tg_", "") : "";
      const phoneMatch = Boolean(phoneSuffix && cPhoneSuffix && phoneSuffix === cPhoneSuffix);
      const tgMatch = Boolean(tgId && cTgId && tgId === cTgId);
      const keyTgMatch = Boolean(tgId && cKey === `tg_${tgId}` || cTgId && key === `tg_${cTgId}`);
      if (phoneMatch || tgMatch || keyTgMatch) {
        matchedKey = cKey;
        break;
      }
    }
    if (matchedKey) {
      const existing = canonicalWallets[matchedKey];
      const mergedPhone = cleanPhone && cleanPhone.length >= 9 ? cleanPhone : existing.phone || "";
      const mergedTgId = existing.telegramId || tgId;
      const bestName = existing.fullName && existing.fullName !== "\u1270\u1320\u1243\u121A" && !existing.fullName.startsWith("\u1270\u1320\u1243\u121A (") ? existing.fullName : wallet.fullName && wallet.fullName !== "\u1270\u1320\u1243\u121A" && !wallet.fullName.startsWith("\u1270\u1320\u1243\u121A (") ? wallet.fullName : existing.fullName || wallet.fullName || "\u1270\u1320\u1243\u121A";
      const bestUsername = existing.username || wallet.username || "";
      const bestCustomerId = existing.customerId || wallet.customerId || "TEWEDAJ-" + (mergedTgId || mergedPhone || matchedKey).slice(-6);
      const mergedBalance = Math.max(Number(existing.walletBalance) || 0, Number(wallet.walletBalance) || 0);
      const mergedTickets = Math.max(Number(existing.ticketsCount) || 0, Number(wallet.ticketsCount) || 0);
      const mergedWon = Math.max(Number(existing.totalWon) || 0, Number(wallet.totalWon) || 0);
      const newCanonicalKey = mergedPhone && mergedPhone.length >= 9 ? mergedPhone.length === 10 ? mergedPhone : `0${mergedPhone.slice(-9)}` : mergedTgId ? `tg_${mergedTgId}` : matchedKey;
      const mergedWallet = {
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
          mergedPhone && mergedPhone.endsWith("0910961881") || bestUsername && bestUsername.toLowerCase().replace("@", "") === "lij_makbel" || mergedTgId === "5588110290"
        ),
        isOnline: Boolean(existing.isOnline || wallet.isOnline),
        registeredAt: existing.registeredAt && wallet.registeredAt ? new Date(existing.registeredAt) < new Date(wallet.registeredAt) ? existing.registeredAt : wallet.registeredAt : existing.registeredAt || wallet.registeredAt || (/* @__PURE__ */ new Date()).toISOString(),
        lastActive: existing.lastActive && wallet.lastActive ? new Date(existing.lastActive) > new Date(wallet.lastActive) ? existing.lastActive : wallet.lastActive : existing.lastActive || wallet.lastActive || (/* @__PURE__ */ new Date()).toISOString()
      };
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
      const newCanonicalKey = cleanPhone && cleanPhone.length >= 9 ? cleanPhone.length === 10 ? cleanPhone : `0${cleanPhone.slice(-9)}` : tgId ? `tg_${tgId}` : key;
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
  userWallets = canonicalWallets;
  safeWriteJsonSync(WALLETS_FILE, userWallets);
  if (cleanFirestore) {
    const uniqueObsoleteKeys = Array.from(new Set(obsoleteFirestoreKeys)).filter((k) => !userWallets[k]);
    for (const obsKey of uniqueObsoleteKeys) {
      deleteDoc(doc(firestore, "wallets", obsKey)).catch(() => {
      });
    }
    for (const w of Object.values(userWallets)) {
      syncWalletToFirestore(w).catch(() => {
      });
    }
  }
  console.log(`[Deduplication Complete] Consolidated to ${Object.keys(userWallets).length} unique users. Removed ${removedCount} duplicates.`);
  return {
    removedCount,
    remainingCount: Object.keys(userWallets).length,
    mergedList
  };
}
deduplicateWallets(true);
async function syncTicketToFirestore(ticket) {
  try {
    if (!isFirestoreQuotaActive()) return;
    if (!ticket.id) return;
    const cleanData = sanitizeForFirestore(ticket);
    cleanData.statusAm = ticket.status === "won" ? "\u12A0\u1238\u1293\u134A (Won)" : ticket.status === "active" ? "\u1295\u1241 (Active)" : ticket.status === "lost" ? "\u12EB\u120D\u12F0\u1228\u1230\u12CD" : "\u12E8\u1270\u1218\u1208\u1230";
    cleanData.paymentMethodAm = ticket.paymentMethod === "telebirr" ? "\u1274\u120C\u1265\u122D" : ticket.paymentMethod === "cbe" || ticket.paymentMethod === "cbe_birr" ? "\u12E8\u12A2\u1275\u12EE\u1335\u12EB \u1295\u130D\u12F5 \u1263\u1295\u12AD" : "\u12CB\u120C\u1275";
    cleanData.descriptionAm = `${ticket.userName || "\u12F0\u1295\u1260\u129B"} \u12E8 ${ticket.lotteryTitleAm} \u1275\u12AC\u1275 #${ticket.ticketNumber} \u1246\u122D\u1327\u120D`;
    await setDoc(doc(firestore, "tickets", String(ticket.id)), cleanData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, "syncTicketToFirestore");
  }
}
var TICKETS_FILE = path.join(STORAGE_DIR, "tickets_store.json");
var syncedTickets = safeReadJsonSync(TICKETS_FILE, []);
async function saveTickets(ticketToSync) {
  if (syncedTickets.length === 0 && fs.existsSync(TICKETS_FILE)) {
    const existing = safeReadJsonSync(TICKETS_FILE, []);
    if (existing.length > 0) return;
  }
  safeWriteJsonSync(TICKETS_FILE, syncedTickets);
  if (ticketToSync) {
    await syncTicketToFirestore(ticketToSync).catch(() => {
    });
  }
}
async function syncNotificationToFirestore(notif) {
  try {
    if (!isFirestoreQuotaActive()) return;
    if (!notif.id) return;
    const cleanData = sanitizeForFirestore(notif);
    await setDoc(doc(firestore, "notifications", String(notif.id)), cleanData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, "syncNotificationToFirestore");
  }
}
var NOTIFICATIONS_FILE = path.join(STORAGE_DIR, "notifications_store.json");
var syncedNotifications = safeReadJsonSync(NOTIFICATIONS_FILE, []);
async function saveNotifications(notifToSync) {
  safeWriteJsonSync(NOTIFICATIONS_FILE, syncedNotifications);
  if (notifToSync) {
    await syncNotificationToFirestore(notifToSync).catch(() => {
    });
  }
}
function computeActiveLotteryCounts() {
  const lotteryCounts = {
    lot_tv_32: 0,
    lot_derash_1000: 0,
    lot_derash_5000: 0,
    lot_derash_10000: 0,
    lot_derash_50000: 0
  };
  for (const t of syncedTickets) {
    if (t.status === "active") {
      let key = t.lotteryId;
      if (!key) {
        if (t.pricePaid === 10) key = "lot_derash_1000";
        else if (t.pricePaid === 50) key = "lot_derash_5000";
        else if (t.pricePaid === 100) key = "lot_derash_10000";
        else if (t.pricePaid === 200) {
          key = t.lotteryTitleAm?.includes("\u1272\u126A") || t.lotteryTitleAm?.includes("TV") ? "lot_tv_32" : "lot_derash_50000";
        }
      }
      if (key && lotteryCounts[key] !== void 0) {
        lotteryCounts[key]++;
      } else if (key) {
        lotteryCounts[key] = 1;
      }
    }
  }
  return lotteryCounts;
}
function findOrCreateWallet(params) {
  const { userId, phone, telegramId, fullName, username, profileImage } = params;
  const cleanPhone = normalizeEthiopianPhone(phone);
  const searchTgId = telegramId ? String(telegramId) : userId && !cleanPhone ? String(userId).replace("tg_", "") : "";
  if (cleanPhone && cleanPhone.length >= 9) {
    const existing = findWalletByPhone(cleanPhone);
    if (existing) {
      if (fullName && (!existing.fullName || existing.fullName === existing.phone || existing.fullName === "\u1270\u1320\u1243\u121A" || existing.fullName.startsWith("\u1270\u1320\u1243\u121A ("))) {
        existing.fullName = fullName.trim();
      }
      if (username && !existing.username) existing.username = username;
      if (profileImage && !existing.profileImage) existing.profileImage = profileImage;
      if (!existing.phone) existing.phone = cleanPhone;
      if (searchTgId && !existing.telegramId) existing.telegramId = searchTgId;
      if (!existing.customerId) {
        existing.customerId = "TEWEDAJ-" + (existing.telegramId || existing.phone || existing.userId).slice(-6);
      }
      if (searchTgId) {
        const oldKeys = [`tg_${searchTgId}`, searchTgId];
        for (const oldKey of oldKeys) {
          if (oldKey !== cleanPhone && userWallets[oldKey]) {
            const oldW = userWallets[oldKey];
            existing.walletBalance = Math.max(Number(existing.walletBalance) || 0, Number(oldW.walletBalance) || 0);
            existing.ticketsCount = Math.max(Number(existing.ticketsCount) || 0, Number(oldW.ticketsCount) || 0);
            delete userWallets[oldKey];
            deleteDoc(doc(firestore, "wallets", oldKey)).catch(() => {
            });
          }
        }
      }
      saveUserWallets(true, existing);
      return existing;
    }
  }
  if (searchTgId) {
    for (const [k, w] of Object.entries(userWallets)) {
      if (k === searchTgId || k === `tg_${searchTgId}` || String(w.userId) === searchTgId || w.telegramId && String(w.telegramId) === searchTgId) {
        if (username && !w.username) w.username = username;
        if (profileImage && !w.profileImage) w.profileImage = profileImage;
        if (searchTgId && !w.telegramId) w.telegramId = searchTgId;
        if (fullName && (!w.fullName || w.fullName === "\u1270\u1320\u1243\u121A" || w.fullName.startsWith("\u1270\u1320\u1243\u121A ("))) w.fullName = fullName.trim();
        if (!w.customerId) {
          w.customerId = "TEWEDAJ-" + (w.telegramId || w.phone || w.userId).slice(-6);
        }
        if (cleanPhone && cleanPhone.length >= 9) {
          w.phone = cleanPhone;
          w.userId = cleanPhone;
          if (k !== cleanPhone) {
            delete userWallets[k];
            deleteDoc(doc(firestore, "wallets", k)).catch(() => {
            });
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
  const canonicalKey = cleanPhone && cleanPhone.length >= 9 ? cleanPhone.length === 10 ? cleanPhone : `0${cleanPhone.slice(-9)}` : searchTgId ? `tg_${searchTgId}` : userId || `usr_${Date.now()}`;
  const generatedCid = "TEWEDAJ-" + (searchTgId || cleanPhone || canonicalKey).slice(-6);
  const isNew = !userWallets[canonicalKey];
  userWallets[canonicalKey] = {
    userId: canonicalKey,
    telegramId: searchTgId || "",
    customerId: generatedCid,
    phone: cleanPhone || "",
    fullName: fullName && fullName.trim() && fullName !== "\u1270\u1320\u1243\u121A" ? fullName.trim() : cleanPhone ? `\u12F0\u1295\u1260\u129B (${cleanPhone})` : username ? username : `\u1270\u1320\u1243\u121A (${searchTgId || canonicalKey})`,
    username: username || "",
    profileImage: profileImage || "",
    walletBalance: 0,
    ticketsCount: 0,
    totalWon: 0,
    language: "am",
    registeredAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  saveUserWallets(true, userWallets[canonicalKey]);
  if (isNew) {
    const readableRegDate = (/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" });
    const tgRegMessage = `\u{1F464} <b>\u12A0\u12F2\u1235 \u1270\u1320\u1243\u121A \u1270\u1218\u12DD\u130D\u1267\u120D! (New User Registered)</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} <b>\u1219\u1209 \u1235\u121D:</b> <b>${userWallets[canonicalKey].fullName}</b>
\u{1F194} <b>\u1218\u1208\u12EB (CID):</b> <code>${generatedCid}</code>
` + (cleanPhone ? `\u{1F4F1} <b>\u1235\u120D\u12AD:</b> <code>${cleanPhone}</code>
` : "") + (username ? `\u{1F4AC} <b>\u1274\u120C\u130D\u122B\u121D:</b> @${username.replace("@", "")}
` : "") + `\u23F0 <b>\u1230\u12D3\u1275:</b> ${readableRegDate}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
<i>\u1270\u12C8\u12F3\u1305 \u12A6\u1295\u120B\u12ED\u1295 \u120E\u1270\u122A (Tewedaj Online Lottery)</i>`;
    notifyAllAdmins(tgRegMessage).catch(() => {
    });
    syncDashboardToFirestore({
      id: "act_reg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      type: "user_registered",
      titleAm: "\u12A0\u12F2\u1235 \u1270\u1320\u1243\u121A \u1270\u1218\u12DD\u130D\u1267\u120D",
      titleEn: "New User Registered",
      descriptionAm: `\u{1F464} \u12A0\u12F2\u1235 \u1270\u1320\u1243\u121A \u1270\u1218\u12DD\u130D\u1267\u120D: ${userWallets[canonicalKey].fullName} (${cleanPhone || generatedCid})`,
      descriptionEn: `New user registered: ${userWallets[canonicalKey].fullName} (${cleanPhone || generatedCid})`,
      userPhone: cleanPhone,
      userName: userWallets[canonicalKey].fullName,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }).catch(() => {
    });
  }
  return userWallets[canonicalKey];
}
function getOrCreateWallet(chatId, from, phone) {
  const cleanPhone = phone || "";
  const fullName = from?.first_name ? `${from.first_name} ${from.last_name || ""}`.trim() : cleanPhone || "";
  const username = from?.username ? `@${from.username}` : "";
  const wallet = findOrCreateWallet({
    telegramId: String(chatId),
    userId: String(chatId),
    phone: cleanPhone,
    fullName,
    username
  });
  if (from?.username && !wallet.username) wallet.username = `@${from.username}`;
  if (fullName && (!wallet.fullName || wallet.fullName === "\u1270\u1320\u1243\u121A")) wallet.fullName = fullName;
  if (!wallet.telegramId) wallet.telegramId = String(chatId);
  saveUserWallets();
  return wallet;
}
function getRegisteredUsersCount() {
  const uniqueUsers = /* @__PURE__ */ new Set();
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
async function updateTelegramBotMonthlyUsers() {
  try {
    const userCount = getRegisteredUsersCount();
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyShortDescription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        short_description: `\u1270\u12C8\u12F3\u1305 \u12A6\u1295\u120B\u12ED\u1295 \u120E\u1270\u122A | \u1260\u1274\u120C\u1265\u122D \u12A5\u1293 \u1260\u1295\u130D\u12F5 \u1263\u1295\u12AD \u12E8\u120E\u1270\u122A \u12D5\u1323\u12CE\u127D\u1295 \u12ED\u132B\u12C8\u1271!`
      })
    }).catch(() => {
    });
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyDescription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: `\u{1F1EA}\u{1F1F9} \u1270\u12C8\u12F3\u1305 \u12A6\u1295\u120B\u12ED\u1295 \u120E\u1270\u122A (Tewedaj Online Lottery)

\u{1F39F} \u1260\u12E8\u1240\u1291 \u1260\u1274\u120C\u1265\u122D \u12A5\u1293 \u1260\u12A2\u1275\u12EE\u1335\u12EB \u1295\u130D\u12F5 \u1263\u1295\u12AD \u1348\u1323\u1295 \u12E8\u120E\u1270\u122A \u12D5\u1323\u12CE\u127D\u1295 \u12ED\u132B\u12C8\u1271\u1363 \u12EB\u1238\u1295\u1349!

\u{1F451} \u12F5\u130B\u134D: @lij_makbel`
      })
    }).catch(() => {
    });
    if (isFirestoreQuotaActive()) {
      await setDoc(doc(firestore, "stats", "monthly_users"), {
        count: userCount,
        monthlyUsers: userCount,
        titleAm: "\u1320\u1245\u120B\u120B \u1270\u1320\u1243\u121A\u12CE\u127D",
        titleEn: "Monthly Users",
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true }).catch((err) => handleFirestoreError(err, "updateTelegramBotMonthlyUsers"));
    }
    console.log(`[Bot Monthly Users Updated] Total: ${userCount}`);
  } catch (err) {
    console.error("[Update Bot Monthly Users Error]", err);
  }
}
async function syncTransactionToFirestore(tx) {
  try {
    if (!isFirestoreQuotaActive()) return;
    if (!tx.id) return;
    const cleanData = sanitizeForFirestore(tx);
    cleanData.typeAm = tx.type === "deposit" ? "\u12E8\u1308\u1295\u12D8\u1265 \u121B\u1235\u1308\u1262\u12EB (\u1308\u1262)" : tx.type === "withdrawal" ? "\u12E8\u1308\u1295\u12D8\u1265 \u121B\u12CD\u1323\u1275 (\u12C8\u132A)" : tx.type === "ticket_purchase" ? "\u12E8\u1275\u12AC\u1275 \u130D\u12E2" : tx.type === "xo_win" ? "\u12E8 XO \u1328\u12CB\u1273 \u121B\u1238\u1290\u134D" : tx.type === "xo_loss" ? "\u12E8 XO \u1328\u12CB\u1273 \u123D\u1295\u1348\u1275" : "\u12E8\u123D\u120D\u121B\u1275 \u12AD\u134D\u12EB";
    cleanData.statusAm = tx.status === "completed" ? "\u12E8\u1270\u1320\u1293\u1240\u1240 (\u1338\u12F5\u124B\u120D)" : tx.status === "pending" ? "\u1260\u1218\u1320\u1263\u1260\u1245 \u120B\u12ED" : "\u12CD\u12F5\u1245 \u12E8\u1270\u12F0\u1228\u1308";
    cleanData.paymentMethodAm = tx.paymentMethod === "telebirr" ? "\u1274\u120C\u1265\u122D" : tx.paymentMethod === "cbe" || tx.paymentMethod === "cbe_birr" ? "\u12E8\u12A2\u1275\u12EE\u1335\u12EB \u1295\u130D\u12F5 \u1263\u1295\u12AD" : "\u12CB\u120C\u1275";
    cleanData.descriptionAm = tx.type === "deposit" ? `\u12E8 ${tx.amount} \u1265\u122D \u12E8\u1308\u1262 \u1325\u12EB\u1244 (${tx.userName} - ${tx.userPhone})` : tx.type === "withdrawal" ? `\u12E8 ${tx.amount} \u1265\u122D \u12E8\u12C8\u132A \u1325\u12EB\u1244 (${tx.userName} - ${tx.userPhone})` : tx.type === "xo_win" ? `\u12E8 XO \u1328\u12CB\u1273 \u121B\u1238\u1290\u134D (+${tx.amount} \u1265\u122D - 20% \u1270\u1246\u122D\u1327\u120D)` : tx.type === "xo_loss" ? `\u12E8 XO \u1328\u12CB\u1273 \u123D\u1295\u1348\u1275 (-${tx.amount} \u1265\u122D)` : `\u12E8 ${tx.amount} \u1265\u122D \u12E8\u1275\u12AC\u1275 \u130D\u12E2 (${tx.userName})`;
    await setDoc(doc(firestore, "transactions", String(tx.id)), cleanData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, "syncTransactionToFirestore");
  }
}
var TX_FILE = path.join(STORAGE_DIR, "transactions_store.json");
var syncedTransactions = safeReadJsonSync(TX_FILE, []);
syncedTransactions.forEach((t) => {
  if (t.type === "ticket_purchase" && t.status !== "completed") {
    t.status = "completed";
  }
});
async function saveTransactions(txToSync) {
  if (syncedTransactions.length === 0 && fs.existsSync(TX_FILE)) {
    const existing = safeReadJsonSync(TX_FILE, []);
    if (existing.length > 0) return;
  }
  safeWriteJsonSync(TX_FILE, syncedTransactions);
  if (txToSync) {
    await syncTransactionToFirestore(txToSync).catch(() => {
    });
  }
}
var ACTIVITIES_FILE = path.join(STORAGE_DIR, "dashboard_activities.json");
var dashboardActivities = safeReadJsonSync(ACTIVITIES_FILE, []);
function saveDashboardActivities() {
  safeWriteJsonSync(ACTIVITIES_FILE, dashboardActivities);
}
var lastDashboardSyncTime = 0;
var DASHBOARD_SYNC_THROTTLE_MS = 6e4;
function logDashboardActivity(activity) {
  const existing = dashboardActivities.find((a) => a.id === activity.id);
  if (!existing) {
    dashboardActivities.unshift(activity);
    saveDashboardActivities();
    if (isFirestoreQuotaActive()) {
      setDoc(doc(firestore, "dashboard_activities", activity.id), sanitizeForFirestore(activity), { merge: true }).catch((err) => handleFirestoreError(err, "logDashboardActivity"));
      setDoc(doc(firestore, "activities", activity.id), sanitizeForFirestore(activity), { merge: true }).catch((err) => handleFirestoreError(err, "logDashboardActivity activities"));
    }
  }
}
async function logBotActivity(userId, actionType, details, phone = "", name = "") {
  try {
    if (!isFirestoreQuotaActive()) return;
    const logId = `bot_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const logEntry = sanitizeForFirestore({
      id: logId,
      userId: String(userId),
      userName: name || "\u1270\u1320\u1243\u121A",
      userPhone: phone || "",
      action: actionType,
      details: typeof details === "object" ? JSON.stringify(details) : String(details),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      serverTimestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    await setDoc(doc(firestore, "bot_logs", logId), logEntry, { merge: true }).catch((err) => handleFirestoreError(err, "logBotActivity bot_logs"));
    await setDoc(doc(firestore, "activities", logId), logEntry, { merge: true }).catch((err) => handleFirestoreError(err, "logBotActivity activities"));
  } catch (err) {
    console.warn("[logBotActivity error]", err);
  }
}
async function recordMiniAppActivity(userId, activityName, details = {}) {
  try {
    if (!isFirestoreQuotaActive()) return;
    const actId = `act_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const actEntry = sanitizeForFirestore({
      id: actId,
      userId: String(userId),
      activity: activityName,
      details: typeof details === "object" ? JSON.stringify(details) : String(details),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    await setDoc(doc(firestore, "activities", actId), actEntry, { merge: true }).catch((err) => handleFirestoreError(err, "recordMiniAppActivity"));
  } catch (err) {
    console.warn("[recordMiniAppActivity error]", err);
  }
}
var CANONICAL_LOTTERY_CAPACITIES = {
  lot_tv_32: { titleAm: "32 Inch TV \u12D5\u1323", titleEn: "32 Inch TV Draw", price: 200, jackpot: 0, capacity: 150, isItemPrize: true, prizeItemName: "32 Inch TV", prizeItemNameAm: "32 Inch TV" },
  lot_derash_1000: { titleAm: "\u1263\u1208 1,000 \u1265\u122D \u12F0\u122B\u123D", titleEn: "Bale 1,000 ETB Derash", price: 10, jackpot: 1e3, capacity: 150 },
  lot_derash_5000: { titleAm: "\u1263\u1208 5,000 \u1265\u122D \u12F0\u122B\u123D", titleEn: "Bale 5,000 ETB Derash", price: 50, jackpot: 5e3, capacity: 150 },
  lot_derash_10000: { titleAm: "\u1263\u1208 10,000 \u1265\u122D \u12F0\u122B\u123D", titleEn: "Bale 10,000 ETB Derash", price: 100, jackpot: 1e4, capacity: 150 },
  lot_derash_50000: { titleAm: "\u1263\u1208 50,000 \u1265\u122D \u12F0\u122B\u123D", titleEn: "Bale 50,000 ETB Derash", price: 200, jackpot: 5e4, capacity: 300 }
};
async function syncDashboardToFirestore(extraActivity, force = false) {
  try {
    if (extraActivity) {
      logDashboardActivity(extraActivity);
    }
    const nowTime = Date.now();
    if (!force && nowTime - lastDashboardSyncTime < DASHBOARD_SYNC_THROTTLE_MS) {
      return;
    }
    lastDashboardSyncTime = nowTime;
    const totalTicketsSold = syncedTickets.length;
    const activeTickets = syncedTickets.filter((t) => t.status !== "refunded");
    const buyersMap = /* @__PURE__ */ new Map();
    for (const t of syncedTickets) {
      const p = t.userPhone ? normalizeEthiopianPhone(t.userPhone) : t.userId || "unknown";
      if (!buyersMap.has(p)) {
        buyersMap.set(p, {
          phone: p,
          name: t.userName && t.userName !== "\u1270\u1320\u1243\u121A" ? t.userName : p,
          ticketsCount: 0,
          totalSpent: 0
        });
      }
      const b = buyersMap.get(p);
      b.ticketsCount++;
      b.totalSpent += Number(t.pricePaid) || 0;
      if (t.userName && t.userName !== "\u1270\u1320\u1243\u121A" && (!b.name || b.name === p)) {
        b.name = t.userName;
      }
    }
    const uniqueBuyers = Array.from(buyersMap.values());
    uniqueBuyers.sort((a, b) => b.ticketsCount - a.ticketsCount);
    const keriEtsaSummary = {};
    for (const [lotId, conf] of Object.entries(CANONICAL_LOTTERY_CAPACITIES)) {
      const isTv = lotId === "lot_tv_32";
      const soldForThis = activeTickets.filter((t) => {
        if (isTv) {
          return t.lotteryId === "lot_tv_32" || t.lotteryTitleAm?.includes("\u1272\u126A") || t.lotteryTitleAm?.includes("TV");
        }
        if (lotId === "lot_derash_50000") {
          return t.lotteryId === "lot_derash_50000" || t.pricePaid === 200 && !t.lotteryId?.includes("tv") && !t.lotteryTitleAm?.includes("\u1272\u126A") && !t.lotteryTitleAm?.includes("TV");
        }
        return t.lotteryId === lotId || t.pricePaid === conf.price && (lotId.includes(String(conf.jackpot)) || lotId.includes("derash"));
      }).length;
      const keriEtsa = Math.max(0, conf.capacity - soldForThis);
      const buyersForThis = new Set(
        activeTickets.filter((t) => {
          if (isTv) return t.lotteryId === "lot_tv_32" || t.lotteryTitleAm?.includes("\u1272\u126A") || t.lotteryTitleAm?.includes("TV");
          if (lotId === "lot_derash_50000") return t.lotteryId === "lot_derash_50000" || t.pricePaid === 200 && !t.lotteryId?.includes("tv") && !t.lotteryTitleAm?.includes("\u1272\u126A") && !t.lotteryTitleAm?.includes("TV");
          return t.lotteryId === lotId || t.pricePaid === conf.price;
        }).map((t) => t.userPhone ? normalizeEthiopianPhone(t.userPhone) : t.userId)
      ).size;
      const itemInfo = {
        lotteryId: lotId,
        titleAm: conf.titleAm,
        titleEn: conf.titleEn,
        ticketPrice: conf.price,
        totalInventory: conf.capacity,
        ticketsSold: soldForThis,
        keriEtsa,
        // ቀሪ ዕጣ
        round: 1,
        buyersCount: buyersForThis,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (conf.isItemPrize || isTv) {
        itemInfo.isItemPrize = true;
        itemInfo.prizeName = "32 Inch Smart TV";
        itemInfo.prizeAm = "\u12E8 32 \u12A2\u1295\u127D \u12A4\u120D\u12A2\u12F2 \u1272\u126A";
      } else {
        itemInfo.jackpotAmount = conf.jackpot;
      }
      keriEtsaSummary[lotId] = itemInfo;
    }
    const completedDeposits = syncedTransactions.filter((t) => t.type === "deposit" && t.status === "completed");
    const totalDepositedAmount = completedDeposits.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const completedWithdrawals = syncedTransactions.filter((t) => t.type === "withdrawal" && t.status === "completed");
    const totalWithdrawnAmount = completedWithdrawals.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const pendingDepositsCount = syncedTransactions.filter((t) => t.type === "deposit" && t.status === "pending").length;
    const pendingWithdrawalsCount = syncedTransactions.filter((t) => t.type === "withdrawal" && t.status === "pending").length;
    const totalTicketSpend = syncedTickets.reduce((s, t) => s + (Number(t.pricePaid) || 0), 0);
    const userFinancialsList = Object.values(userWallets).map((w) => {
      const clean = normalizeEthiopianPhone(w.phone);
      const userTxs = clean ? syncedTransactions.filter((t) => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9))) : [];
      const userGebi = userTxs.filter((t) => t.type === "deposit" && t.status === "completed").reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const userWechi = userTxs.filter((t) => t.type === "withdrawal" && t.status === "completed").reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const userTks = clean ? syncedTickets.filter((t) => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9))) : [];
      const userSpend = userTks.reduce((s, t) => s + (Number(t.pricePaid) || 0), 0);
      return {
        phone: clean || w.phone || w.userId,
        fullName: w.fullName || "\u1270\u1320\u1243\u121A",
        walletBalance: w.walletBalance || 0,
        ticketsCount: userTks.length,
        ticketSpend: userSpend,
        totalWon: w.totalWon || 0
      };
    });
    const registeredUsersCount = getRegisteredUsersCount();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const lastActivity = extraActivity ? extraActivity.descriptionAm : dashboardActivities[0]?.descriptionAm || "\u12E8\u1232\u1235\u1270\u121D \u12F3\u123D\u1266\u122D\u12F5 \u12DD\u130D\u1301 \u1290\u12CD";
    const overviewDoc = {
      id: "overview",
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
      lastActivityDescriptionEn: extraActivity?.descriptionEn || "System dashboard synchronized"
    };
    if (isFirestoreQuotaActive()) {
      await setDoc(doc(firestore, "dashboard", "overview"), sanitizeForFirestore(overviewDoc), { merge: true }).catch((err) => handleFirestoreError(err, "syncDashboardToFirestore overview"));
    }
    if (extraActivity) {
      await setDoc(doc(firestore, "dashboard_activities", extraActivity.id), sanitizeForFirestore(extraActivity), { merge: true });
    }
    console.log(`[Firestore Dashboard Synced] Tickets Cut: ${totalTicketsSold}, Buyers: ${uniqueBuyers.length}, Active Users: ${registeredUsersCount}`);
  } catch (err) {
    console.warn("[syncDashboardToFirestore Error]", err);
  }
}
async function loadAllFromFirestore() {
  try {
    console.log("[Firestore] Synchronizing persistent state from Firebase Firestore...");
    const walletsSnap = await getDocs(collection(firestore, "wallets"));
    let loadedWallets = 0;
    walletsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && (data.phone || data.userId)) {
        if (!data.fullName && data.name) {
          data.fullName = data.name;
        }
        delete data.name;
        const cleanPhone = data.phone ? normalizeEthiopianPhone(data.phone) : "";
        const canonicalKey = cleanPhone && cleanPhone.length >= 9 ? cleanPhone.length === 10 ? cleanPhone : `0${cleanPhone.slice(-9)}` : data.telegramId ? `tg_${data.telegramId}` : data.userId || docSnap.id;
        userWallets[canonicalKey] = {
          ...userWallets[canonicalKey],
          ...data,
          userId: canonicalKey
        };
        loadedWallets++;
      }
    });
    console.log(`[Firestore] Successfully loaded ${loadedWallets} wallets. Running deduplication...`);
    const keysToPurge = ["usr_eth_1182", "1182", "0925941966", "usr_eth_0925941966", "tg_350267", "350267"];
    for (const k of keysToPurge) {
      delete userWallets[k];
      deleteDoc(doc(firestore, "wallets", k)).catch(() => {
      });
    }
    for (const [k, w] of Object.entries(userWallets)) {
      if (w.phone && (w.phone.includes("0925941966") || w.phone === "1182")) {
        delete userWallets[k];
        deleteDoc(doc(firestore, "wallets", k)).catch(() => {
        });
      }
      if (w.username && w.username.toLowerCase().includes("lulumessbro")) {
        delete userWallets[k];
        deleteDoc(doc(firestore, "wallets", k)).catch(() => {
        });
      }
      if (w.telegramId && (w.telegramId === "350267" || w.telegramId === "0925941966")) {
        delete userWallets[k];
        deleteDoc(doc(firestore, "wallets", k)).catch(() => {
        });
      }
    }
    safeWriteJsonSync(WALLETS_FILE, userWallets);
    deduplicateWallets(true);
    const ticketsSnap = await getDocs(collection(firestore, "tickets"));
    const firestoreTickets = [];
    ticketsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      const id = data?.id || docSnap.id;
      const ticketNumber = data?.ticketNumber || data?.ticket_number || data?.number || id.replace("tkt_", "");
      const userPhone = data?.userPhone || data?.phone || "";
      const wallet = userPhone ? findWalletByPhone(userPhone) : data?.userId ? findOrCreateWallet({ userId: data.userId }) : void 0;
      const userName = data?.userName && data.userName !== "\u1270\u1320\u1243\u121A" ? data.userName : wallet?.fullName || (userPhone ? `\u12F0\u1295\u1260\u129B (${userPhone})` : "\u12F0\u1295\u1260\u129B");
      const t = {
        id,
        lotteryId: data?.lotteryId || (data?.pricePaid === 10 ? "lot_derash_1000" : data?.pricePaid === 50 ? "lot_derash_5000" : data?.pricePaid === 100 ? "lot_derash_10000" : "lot_derash_50000"),
        lotteryTitleAm: data?.lotteryTitleAm || "\u1263\u1208 1,000 \u1265\u122D \u12F0\u122B\u123D",
        lotteryTitleEn: data?.lotteryTitleEn || "Bale 1,000 ETB Derash",
        ticketNumber: String(ticketNumber),
        userId: data?.userId || wallet?.userId || "0920561776",
        userName,
        userPhone: userPhone || wallet?.phone || "",
        userTelegram: data?.userTelegram || wallet?.username || "",
        pricePaid: Number(data?.pricePaid) || 10,
        purchasedAt: data?.purchasedAt || data?.purchaseDate || (/* @__PURE__ */ new Date()).toISOString(),
        paymentMethod: data?.paymentMethod || "wallet",
        paymentReference: data?.paymentReference || `TKT-${ticketNumber}`,
        round: Number(data?.round) || 1,
        status: data?.status || "active",
        securityHash: data?.securityHash || `ETH-${ticketNumber}`
      };
      firestoreTickets.push(t);
    });
    syncedTickets = firestoreTickets;
    safeWriteJsonSync(TICKETS_FILE, syncedTickets);
    console.log(`[Firestore] Successfully loaded ${syncedTickets.length} tickets from Firestore.`);
    const txSnap = await getDocs(collection(firestore, "transactions"));
    const loadedTxIds = new Set(syncedTransactions.map((t) => t.id));
    let newTxs = 0;
    txSnap.forEach((docSnap) => {
      const tx = docSnap.data();
      if (tx && tx.id && !loadedTxIds.has(tx.id)) {
        syncedTransactions.unshift(tx);
        loadedTxIds.add(tx.id);
        newTxs++;
      }
    });
    console.log(`[Firestore] Successfully loaded ${txSnap.size} transactions (${newTxs} new).`);
    try {
      const actSnap = await getDocs(collection(firestore, "dashboard_activities"));
      const loadedActIds = new Set(dashboardActivities.map((a) => a.id));
      let newActs = 0;
      actSnap.forEach((docSnap) => {
        const act = docSnap.data();
        if (act && act.id && !loadedActIds.has(act.id)) {
          dashboardActivities.unshift(act);
          loadedActIds.add(act.id);
          newActs++;
        }
      });
      dashboardActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      console.log(`[Firestore] Successfully loaded ${actSnap.size} dashboard activities (${newActs} new).`);
    } catch (e) {
      console.warn("[Firestore Dashboard Activities Load Error]", e);
    }
    syncedTickets = syncedTickets.filter((t) => t.lotteryId !== "lot_derash_20000");
    try {
      await deleteDoc(doc(firestore, "keri_etsa", "lot_derash_20000"));
      console.log("[Firestore] Permanently deleted obsolete lot_derash_20000 from keri_etsa collection");
    } catch (err) {
    }
    safeWriteJsonSync(WALLETS_FILE, userWallets);
    safeWriteJsonSync(TICKETS_FILE, syncedTickets);
    safeWriteJsonSync(TX_FILE, syncedTransactions);
    safeWriteJsonSync(ACTIVITIES_FILE, dashboardActivities);
    try {
      const soldTv = syncedTickets.filter((t) => t.status === "active" && (t.lotteryId === "lot_tv_32" || t.lotteryTitleAm?.includes("\u1272\u126A") || t.lotteryTitleAm?.includes("TV"))).length;
      await setDoc(doc(firestore, "keri_etsa", "lot_tv_32"), {
        lotteryId: "lot_tv_32",
        titleAm: "32 Inch TV \u12D5\u1323",
        titleEn: "32 Inch TV Draw",
        ticketPrice: 200,
        totalInventory: 150,
        ticketsSold: soldTv,
        keriEtsa: Math.max(0, 150 - soldTv),
        round: 1,
        buyersCount: 0,
        kuankua: "\u12A0\u121B\u122D\u129B",
        isItemPrize: true,
        prizeName: "32 Inch TV",
        prizeAm: "32 Inch TV",
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
      const sold50k = syncedTickets.filter((t) => t.status === "active" && (t.lotteryId === "lot_derash_50000" || t.pricePaid === 200 && !t.lotteryId?.includes("tv") && !t.lotteryTitleAm?.includes("\u1272\u126A") && !t.lotteryTitleAm?.includes("TV"))).length;
      await setDoc(doc(firestore, "keri_etsa", "lot_derash_50000"), {
        lotteryId: "lot_derash_50000",
        titleAm: "\u1263\u1208 50,000 \u1265\u122D \u12F0\u122B\u123D",
        titleEn: "Bale 50,000 ETB Derash",
        ticketPrice: 200,
        jackpotAmount: 5e4,
        totalInventory: 300,
        ticketsSold: sold50k,
        keriEtsa: Math.max(0, 300 - sold50k),
        round: 1,
        buyersCount: 0,
        kuankua: "\u12A0\u121B\u122D\u129B",
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
    } catch {
    }
    try {
      const locksSnap = await getDoc(doc(firestore, "system_settings", "lottery_locks"));
      if (locksSnap.exists()) {
        const data = locksSnap.data();
        if (Array.isArray(data?.lockedLotteryIds)) {
          serverLockedLotteryIds = data.lockedLotteryIds;
          safeWriteJsonSync(LOCKS_FILE, serverLockedLotteryIds);
        }
      }
    } catch (err) {
    }
    await syncDashboardToFirestore(void 0, true);
  } catch (err) {
    console.error("[Firestore Initial Load Error]", err);
  }
}
var firestoreLoadPromise = null;
async function ensureFirestoreLoaded() {
  if (!firestoreLoadPromise) {
    firestoreLoadPromise = loadAllFromFirestore().catch((err) => {
      console.error("[Firestore Initial Load Error]", err);
    });
  }
  await Promise.race([
    firestoreLoadPromise,
    new Promise((resolve) => setTimeout(resolve, 2500))
  ]);
  return firestoreLoadPromise;
}
var SUPPORT_FILE = path.join(STORAGE_DIR, "support_messages.json");
var supportMessages = safeReadJsonSync(SUPPORT_FILE, []);
function saveSupportMessages() {
  safeWriteJsonSync(SUPPORT_FILE, supportMessages.slice(0, 500));
}
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function maskPhone(phone) {
  if (!phone) return "***";
  const clean = normalizeEthiopianPhone(phone);
  if (clean.length >= 9) {
    return clean.slice(0, 4) + "****" + clean.slice(-2);
  }
  return clean;
}
var DEFAULT_REPLY_KEYBOARD = {
  keyboard: [
    [{ text: "\u{1F39F} \u120E\u1270\u122A \u12AD\u1348\u1275" }],
    [{ text: "\u{1F4F1} \u1235\u120D\u12AD \u1241\u1325\u122D" }, { text: "\u{1F4AC} \u12A5\u1308\u12DB / \u12F5\u130B\u134D" }]
  ],
  resize_keyboard: true
};
async function sendTelegramResponse(chatId, text, replyMarkup) {
  try {
    const body = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup !== void 0 ? replyMarkup : DEFAULT_REPLY_KEYBOARD
    };
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (!result?.ok) {
      const desc = result?.description || "";
      if (desc.includes("chat not found") || desc.includes("blocked") || desc.includes("deactivated") || desc.includes("chat_id is empty")) {
        console.info(`[Telegram Notification Skipped: chat ${chatId} unavailable]`);
        if (adminChatIds.includes(chatId)) {
          adminChatIds = adminChatIds.filter((id) => id !== chatId);
          saveAdminChatIds();
        }
        return result;
      }
      console.warn(`[Send Telegram Message HTML failed for chat ${chatId}]:`, desc);
      const plainText = text.replace(/<[^>]*>?/gm, "");
      const fallbackBody = {
        chat_id: chatId,
        text: plainText,
        reply_markup: body.reply_markup
      };
      const fallbackRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fallbackBody)
      });
      return await fallbackRes.json();
    }
    return result;
  } catch (err) {
    console.error("[Send Telegram Message Error]", err);
    return null;
  }
}
async function editTelegramMessage(chatId, messageId, text, inlineKeyboard) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: "HTML",
        reply_markup: inlineKeyboard ? inlineKeyboard : { inline_keyboard: [] }
      })
    });
    const result = await res.json();
    if (!result?.ok) {
      const desc = result?.description || "";
      if (desc.includes("chat not found") || desc.includes("message to edit not found")) {
        return;
      }
      const plainText = text.replace(/<[^>]*>?/gm, "");
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: plainText,
          reply_markup: inlineKeyboard ? inlineKeyboard : { inline_keyboard: [] }
        })
      });
    }
  } catch (err) {
    console.error("[Edit Telegram Message Error]", err);
  }
}
async function answerTelegramCallback(callbackQueryId, text, showAlert) {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert || false
      })
    });
  } catch (err) {
    console.error("[Answer Callback Error]", err);
  }
}
async function notifyAllAdmins(text, inlineKeyboard) {
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          reply_markup: inlineKeyboard
        })
      });
      const data = await res.json();
      if (data.ok) {
        results.push({ chatId, messageId: data.result.message_id });
      } else {
        const desc = data.description || "";
        if (chatId !== PRIMARY_ADMIN_CHAT_ID && (desc.includes("chat not found") || desc.includes("blocked") || desc.includes("deactivated"))) {
          console.info(`[Admin chat ${chatId} unavailable]: ${desc}`);
          adminChatIds = adminChatIds.filter((id) => id !== chatId);
          saveAdminChatIds();
        }
      }
    } catch (err) {
      console.error(`[Notify Admin ${chatId} Error]`, err);
    }
  }
  return results;
}
var notified200FilledRounds = /* @__PURE__ */ new Set();
var CANONICAL_LOTTERIES_MAP = {
  lot_tv_32: { titleAm: "\u12E8 32 \u12A2\u1295\u127D \u12A4\u120D\u12A2\u12F2 \u1272\u126A \u12D5\u1323", jackpot: 0, isItemPrize: true, prizeNameAm: "\u12E8 32 \u12A2\u1295\u127D \u12A4\u120D\u12A2\u12F2 \u1272\u126A" },
  lot_derash_1000: { titleAm: "\u1263\u1208 1,000 \u1265\u122D \u12F0\u122B\u123D", jackpot: 1e3 },
  lot_derash_5000: { titleAm: "\u1263\u1208 5,000 \u1265\u122D \u12F0\u122B\u123D", jackpot: 5e3 },
  lot_derash_10000: { titleAm: "\u1263\u1208 10,000 \u1265\u122D \u12F0\u122B\u123D", jackpot: 1e4 },
  lot_derash_50000: { titleAm: "\u1263\u1208 50,000 \u1265\u122D \u12F0\u122B\u123D", jackpot: 5e4 }
};
async function checkAndNotify200Filled(lotteryId, count, roundNum = 1, customTitle) {
  const cap = lotteryId === "lot_derash_50000" ? 300 : 150;
  if (count < cap) return;
  const key = `${lotteryId}_r${roundNum}`;
  if (notified200FilledRounds.has(key)) return;
  notified200FilledRounds.add(key);
  const info = CANONICAL_LOTTERIES_MAP[lotteryId] || { titleAm: customTitle || lotteryId, jackpot: 1e3, isItemPrize: lotteryId === "lot_tv_32", prizeNameAm: "\u12E8 32 \u12A2\u1295\u127D \u12A4\u120D\u12A2\u12F2 \u1272\u126A" };
  const isTv = lotteryId === "lot_tv_32" || info.isItemPrize || info.titleAm?.includes("\u1272\u126A");
  const timeNow = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { hour12: true, timeZone: "Africa/Addis_Ababa" });
  const prizeDisplay = isTv ? `\u{1F381} <b>\u123D\u120D\u121B\u1275:</b> <b>\u12E8 32 \u12A2\u1295\u127D \u12A4\u120D\u12A2\u12F2 \u1272\u126A (32 Inch TV)</b>
` : `\u{1F4B0} <b>\u123D\u120D\u121B\u1275:</b> <b>${info.jackpot.toLocaleString()} \u1265\u122D</b>
`;
  const msg = `\u{1F6A8} <b>\u12A0\u1235\u1278\u12B3\u12ED \u121B\u1235\u1273\u12C8\u1242\u12EB \u1208\u12A0\u12F5\u121A\u1295 (Admin Alert)!</b>

\u{1F3AF} <b>${cap} \u121E\u120D\u1277\u120D \u12D5\u1323 \u12A0\u12CD\u1323!</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4E6} <b>\u12E8\u12D5\u1323 \u12D3\u12ED\u1290\u1275:</b> <b>${info.titleAm}</b>
\u{1F522} <b>\u12E8\u1270\u1238\u1320 \u1275\u12AC\u1275:</b> <b>${count} / ${cap} (100% \u1219\u1209!)</b>
` + prizeDisplay + `\u{1F3C6} <b>\u12D9\u122D:</b> <b>${roundNum}</b>
\u23F0 <b>\u1230\u12D3\u1275:</b> ${timeNow}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u26A0\uFE0F <b>\u1275\u12A9\u1228\u1275:</b> \u12E8\u12DA\u1205 \u12D5\u1323 \u1275\u12AC\u1276\u127D \u1219\u1209 \u1260\u1219\u1209 \u1270\u1320\u1293\u1240\u12CB\u120D\u1362 \u12A5\u1263\u12AD\u12CE \u12A0\u1201\u1291\u1291 \u12C8\u12F0 \u12A0\u12F5\u121A\u1295 \u12F3\u123D\u1266\u122D\u12F5 \u1260\u1218\u130D\u1263\u1275 \u12D5\u1323\u12CD\u1295 \u12EB\u12CD\u1321!`;
  await notifyAllAdmins(msg);
  console.log(`[Alert Filled] Sent to admins: ${cap} \u121E\u120D\u1277\u120D \u12D5\u1323 \u12A0\u12CD\u1323 for ${lotteryId} (Round ${roundNum})`);
}
function isAuthorizedAdmin(chatId, from, phoneOrPass) {
  if (chatId === PRIMARY_ADMIN_CHAT_ID || from?.id === PRIMARY_ADMIN_CHAT_ID) {
    return true;
  }
  if (from?.username && from.username.toLowerCase().replace("@", "") === "lij_makbel") {
    return true;
  }
  const wallet = userWallets[String(chatId)] || userWallets["0910961881"];
  if (wallet?.phone && normalizeEthiopianPhone(wallet.phone).endsWith("910961881") && (String(chatId) === wallet.telegramId || chatId === PRIMARY_ADMIN_CHAT_ID)) {
    return true;
  }
  return false;
}
async function sendTransactionsOverview(chatId, filter = "all") {
  let list = syncedTransactions;
  let title = "\u{1F4CA} <b>\u12E8\u1308\u1295\u12D8\u1265 \u12DD\u12CD\u12CD\u122E\u127D (All Transactions)</b>";
  if (filter === "deposit") {
    list = syncedTransactions.filter((t) => t.type === "deposit");
    title = "\u{1F4E5} <b>\u12E8\u1308\u1262 \u12AD\u134D\u12EB\u12CE\u127D (Deposits)</b>";
  } else if (filter === "withdrawal") {
    list = syncedTransactions.filter((t) => t.type === "withdrawal");
    title = "\u{1F4E4} <b>\u12E8\u12C8\u132A \u12AD\u134D\u12EB\u12CE\u127D (Withdrawals)</b>";
  } else if (filter === "pending") {
    list = syncedTransactions.filter((t) => t.status === "pending");
    title = "\u23F3 <b>\u121B\u1228\u130B\u1308\u132B \u12E8\u121A\u1320\u1265\u1241 (Pending Approvals)</b>";
  }
  const depSum = syncedTransactions.filter((t) => t.type === "deposit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const wthSum = syncedTransactions.filter((t) => t.type === "withdrawal" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const pendingCount = syncedTransactions.filter((t) => t.status === "pending").length;
  let msg = `${title}

\u{1F4B0} <b>\u1320\u1245\u120B\u120B \u1308\u1262:</b> <b>${depSum.toLocaleString()} \u1265\u122D</b>
\u{1F4B8} <b>\u1320\u1245\u120B\u120B \u12C8\u132A:</b> <b>${wthSum.toLocaleString()} \u1265\u122D</b>
\u23F3 <b>\u12E8\u121A\u1320\u1265\u1241:</b> <b>${pendingCount}</b> | \u{1F4CB} <b>\u1320\u1245\u120B\u120B:</b> <b>${syncedTransactions.length}</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

`;
  if (list.length === 0) {
    msg += `<i>\u121D\u1295\u121D \u12DD\u12CD\u12CD\u122D \u12A0\u120D\u1270\u1308\u1298\u121D</i>`;
  } else {
    for (const tx of list.slice(0, 10)) {
      const isDep = tx.type === "deposit";
      const isWth = tx.type === "withdrawal";
      const icon = isDep ? "\u{1F4E5}" : isWth ? "\u{1F4E4}" : "\u{1F39F}";
      const stBadge = tx.status === "completed" ? "\u2705" : tx.status === "pending" ? "\u23F3" : "\u274C";
      const timeStr = new Date(tx.timestamp).toLocaleString("am-ET", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
      msg += `${icon} <b>${tx.amount.toLocaleString()} \u1265\u122D</b> (${stBadge})
\u{1F464} <b>\u1235\u121D:</b> ${escapeHtml(tx.userName)} (<code>${escapeHtml(tx.userPhone || "\u12E8\u1208\u121D")}</code>)
\u{1F516} <b>\u121B\u1323\u1240\u123B:</b> <code>${escapeHtml(tx.referenceNumber)}</code>
\u23F0 <b>\u1240\u1295:</b> ${timeStr}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
`;
    }
  }
  const ik = {
    inline_keyboard: [
      [
        { text: filter === "all" ? "\u2022 \u1201\u1209\u121D \u2022" : "\u1201\u1209\u121D", callback_data: "txfilter_all" },
        { text: filter === "deposit" ? "\u2022 \u1308\u1262 \u2022" : "\u1308\u1262", callback_data: "txfilter_deposit" }
      ],
      [
        { text: filter === "withdrawal" ? "\u2022 \u12C8\u132A \u2022" : "\u12C8\u132A", callback_data: "txfilter_withdrawal" },
        { text: filter === "pending" ? `\u2022 \u12E8\u121A\u1320\u1265\u1241 (${pendingCount}) \u2022` : `\u12E8\u121A\u1320\u1265\u1241 (${pendingCount})`, callback_data: "txfilter_pending" }
      ],
      [
        { text: "\u{1F310} \u1218\u1270\u130D\u1260\u122A\u12EB \u12AD\u1348\u1275 (Open)", url: APP_URL }
      ]
    ]
  };
  await sendTelegramResponse(chatId, msg, ik);
}
async function handleTelegramMessage(message) {
  try {
    const chatId = message.chat?.id;
    if (!chatId) return;
    const from = message.from;
    const text = (message.text || "").trim();
    const textLower = text.toLowerCase();
    const contact = message.contact;
    const wallet = getOrCreateWallet(chatId, from);
    const hasPhone = Boolean(wallet.phone && wallet.phone.length >= 9);
    const cleanPhone = hasPhone ? normalizeEthiopianPhone(wallet.phone) : "";
    const webAppUrl = cleanPhone ? `${APP_URL}?phone=${cleanPhone}&userId=${wallet.userId}&tg_id=${chatId}&cid=${wallet.customerId}&username=${encodeURIComponent(wallet.username || "")}&name=${encodeURIComponent(wallet.fullName || "")}` : `${APP_URL}?tg_id=${chatId}&cid=${wallet.customerId}&username=${encodeURIComponent(wallet.username || "")}&name=${encodeURIComponent(wallet.fullName || "")}`;
    let detectedPhone = contact?.phone_number ? contact.phone_number.replace(/\D/g, "") : null;
    if (!detectedPhone && text && !text.startsWith("/")) {
      const cleanDigits = text.replace(/[\s-+]/g, "");
      const m = cleanDigits.match(/^(?:251|0)?([79]\d{8})$/);
      if (m) {
        detectedPhone = "0" + m[1];
      }
    }
    if (detectedPhone) {
      let cleanP = detectedPhone;
      if (cleanP.startsWith("251")) {
        cleanP = "0" + cleanP.slice(3);
      } else if (cleanP.startsWith("9") || cleanP.startsWith("7")) {
        cleanP = "0" + cleanP;
      }
      const linkedWallet = findOrCreateWallet({
        phone: cleanP,
        telegramId: String(chatId),
        fullName: from?.first_name ? `${from.first_name} ${from.last_name || ""}`.trim() : wallet.fullName,
        username: from?.username ? `@${from.username}` : wallet.username
      });
      linkedWallet.phone = cleanP;
      linkedWallet.telegramId = String(chatId);
      if (!linkedWallet.customerId) {
        linkedWallet.customerId = "TEWEDAJ-" + String(chatId).slice(-6);
      }
      if (!linkedWallet.registeredAt) {
        linkedWallet.registeredAt = (/* @__PURE__ */ new Date()).toISOString();
      }
      saveUserWallets(true, linkedWallet);
      syncWalletToFirestore(linkedWallet).catch(() => {
      });
      console.log(`[Telegram User Registered & Linked] ChatID: ${chatId}, Phone: ${cleanP}, CID: ${linkedWallet.customerId}, Name: ${linkedWallet.fullName}`);
      if (cleanP.includes("910961881") || from?.username?.toLowerCase() === "lij_makbel") {
        addAdminChatId(chatId);
        await sendTelegramResponse(
          chatId,
          `\u{1F451} <b>\u12A5\u1295\u12B3\u1295 \u12F0\u1205\u1293 \u1218\u1321 \u12A0\u12F5\u121A\u1295 (0910961881)!</b>

\u12E8\u12A0\u12F5\u121A\u1295 \u12F3\u123D\u1266\u122D\u12F1\u1295 \u1208\u1218\u12AD\u1348\u1275 \u12A8\u1273\u127D \u12EB\u1208\u12CD\u1295 \u12ED\u132B\u1291::

\u{1F4E2} <b>\u1274\u120C\u130D\u122B\u121D \u127B\u1293\u120D:</b> <a href="https://t.me/tewedaj_lottery">@tewedaj_lottery</a>
\u{1F4AC} <b>\u12A5\u1308\u12DB / \u12F5\u130B\u134D:</b> <a href="https://t.me/lij_makbel">@lij_makbel</a>`,
          {
            inline_keyboard: [
              [
                { text: "\u{1F451} \u12E8\u12A0\u12F5\u121A\u1295 \u12F3\u123D\u1266\u122D\u12F5 (Admin)", web_app: { url: ADMIN_APP_URL } }
              ],
              [
                { text: "\u{1F4E2} \u1274\u120C\u130D\u122B\u121D \u127B\u1293\u120D", url: "https://t.me/tewedaj_lottery" },
                { text: "\u{1F4AC} \u12A5\u1308\u12DB (@lij_makbel)", url: "https://t.me/lij_makbel" }
              ]
            ]
          }
        );
        return;
      }
      const updatedWebAppUrl = `${APP_URL}?phone=${cleanP}&userId=${wallet.userId}&tg_id=${chatId}&cid=${wallet.customerId}&username=${encodeURIComponent(wallet.username || "")}&name=${encodeURIComponent(wallet.fullName || "")}`;
      const thankYouMsg = `\u{1F1EA}\u{1F1F9} <b>\u12A5\u1295\u12B3\u1295 \u12C8\u12F0 \u1270\u12C8\u12F3\u1305 \u12A6\u1295\u120B\u12ED\u1295 \u120E\u1270\u122A \u1260\u1230\u120B\u121D \u1218\u1321!</b>

\u2705 <b>\u12A5\u1293\u1218\u1230\u130D\u1293\u1208\u1295! \u1235\u120D\u12AD\u12CE \u1260\u1270\u1233\u12AB \u1201\u1294\u1273 \u1270\u1218\u12DD\u130D\u1267\u120D::</b>

\u{1F194} <b>\u1218\u1208\u12EB \u1241\u1325\u122D (ID):</b> <code>${wallet.customerId}</code>
\u{1F4F1} <b>\u1235\u120D\u12AD \u1241\u1325\u122D:</b> <code>${cleanP}</code>
\u{1F464} <b>\u1270\u1320\u1243\u121A:</b> <b>${escapeHtml(wallet.fullName || "\u12F0\u1295\u1260\u129B")}</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F39F} <b>\u120E\u1270\u122A\u12CD\u1295 \u1208\u1218\u12AD\u1348\u1275 \u12A8\u1273\u127D \u12EB\u1208\u12CD\u1295 "\u{1F39F} \u120E\u1270\u122A \u12AD\u1348\u1275" \u12E8\u121A\u1208\u12CD\u1295 \u12ED\u132B\u1291!</b>

\u{1F4E2} <b>\u12E8\u1274\u120C\u130D\u122B\u121D \u127B\u1293\u120D:</b> <a href="https://t.me/tewedaj_lottery">@tewedaj_lottery</a>
\u{1F4AC} <b>\u12A5\u1308\u12DB / \u12F5\u130B\u134D:</b> <a href="https://t.me/lij_makbel">@lij_makbel</a>`;
      await sendTelegramResponse(chatId, thankYouMsg, {
        inline_keyboard: [
          [
            { text: "\u{1F39F} \u120E\u1270\u122A \u12AD\u1348\u1275", web_app: { url: updatedWebAppUrl } }
          ]
        ]
      });
      updateTelegramBotMonthlyUsers().catch(() => {
      });
      if (!cleanP.includes("910961881")) {
        const readableRegDate = (/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "Africa/Addis_Ababa" });
        const tgRegMessage = `\u{1F464} <b>\u1270\u1320\u1243\u121A \u1235\u120D\u12A9\u1295 \u12A0\u130B\u122D\u1277\u120D / \u1270\u1218\u12DD\u130D\u1267\u120D!</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} <b>\u1235\u121D:</b> <b>${escapeHtml(wallet.fullName || "\u12F0\u1295\u1260\u129B")}</b>
\u{1F194} <b>\u1218\u1208\u12EB (CID):</b> <code>${wallet.customerId}</code>
\u{1F4F1} <b>\u1235\u120D\u12AD \u1241\u1325\u122D:</b> <code>${cleanP}</code>
` + (wallet.username ? `\u{1F4AC} <b>\u1274\u120C\u130D\u122B\u121D:</b> @${wallet.username.replace("@", "")}
` : "") + `\u23F0 <b>\u1230\u12D3\u1275:</b> ${readableRegDate}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
<i>\u1270\u12C8\u12F3\u1305 \u12A6\u1295\u120B\u12ED\u1295 \u120E\u1270\u122A (Tewedaj Online Lottery)</i>`;
        notifyAllAdmins(tgRegMessage, {
          inline_keyboard: [
            [
              { text: "\u{1F451} \u12E8\u12A0\u12F5\u121A\u1295 \u12F3\u123D\u1266\u122D\u12F5 (Admin)", web_app: { url: ADMIN_APP_URL } }
            ]
          ]
        }).catch(() => {
        });
      }
      return;
    }
    const isAdmin = isAuthorizedAdmin(chatId, from, text);
    if (isAdmin) {
      addAdminChatId(chatId);
    }
    if (text === "/start" || textLower.startsWith("/start") || textLower === "start") {
      if (!wallet.customerId) {
        wallet.customerId = "TEWEDAJ-" + String(chatId).slice(-6);
      }
      if (from?.username) wallet.username = `@${from.username}`;
      if (from?.first_name) {
        wallet.fullName = `${from.first_name} ${from.last_name || ""}`.trim();
      }
      if (!wallet.registeredAt) {
        wallet.registeredAt = (/* @__PURE__ */ new Date()).toISOString();
      }
      wallet.telegramId = String(chatId);
      saveUserWallets();
      logBotActivity(chatId, "bot_start", "User launched /start command", cleanPhone, wallet.fullName).catch(() => {
      });
      if (!hasPhone) {
        const promptContactMsg = `\u{1F1EA}\u{1F1F9} <b>\u12A5\u1295\u12B3\u1295 \u12C8\u12F0 \u1270\u12C8\u12F3\u1305 \u12A6\u1295\u120B\u12ED\u1295 \u120E\u1270\u122A \u1260\u1230\u120B\u121D \u1218\u1321!</b>

\u{1F194} <b>\u12E8\u12A5\u122D\u1235\u12CE \u1218\u1208\u12EB \u1241\u1325\u122D (ID):</b> <code>${wallet.customerId}</code>
\u{1F464} <b>\u1270\u1320\u1243\u121A:</b> <b>${escapeHtml(wallet.fullName || "\u12F0\u1295\u1260\u129B")}</b>
\u{1F449} <b>\u12A5\u1263\u12AD\u12CE \u1260\u1245\u12F5\u121A\u12EB \u12A8\u1273\u127D \u12EB\u1208\u12CD\u1295 "\u{1F4F1} \u1235\u120D\u12AD\u12CE\u1295 \u12EB\u130B\u1229" \u12E8\u121A\u1208\u12CD\u1295 \u1260\u1218\u132B\u1295 \u12ED\u1218\u12DD\u1308\u1261!</b>

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4E2} <b>\u12E8\u1274\u120C\u130D\u122B\u121D \u127B\u1293\u120D:</b> <a href="https://t.me/tewedaj_lottery">@tewedaj_lottery</a>
\u{1F4AC} <b>\u12A5\u1308\u12DB / \u12F5\u130B\u134D:</b> <a href="https://t.me/lij_makbel">@lij_makbel</a>`;
        await sendTelegramResponse(chatId, promptContactMsg, {
          keyboard: [[{ text: "\u{1F4F1} \u1235\u120D\u12AD\u12CE\u1295 \u12EB\u130B\u1229", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true
        });
      } else {
        const welcomeMsg = `\u{1F1EA}\u{1F1F9} <b>\u12A5\u1295\u12B3\u1295 \u12C8\u12F0 \u1270\u12C8\u12F3\u1305 \u12A6\u1295\u120B\u12ED\u1295 \u120E\u1270\u122A \u1260\u1230\u120B\u121D \u1218\u1321!</b>

\u{1F194} <b>\u1218\u1208\u12EB (ID):</b> <code>${wallet.customerId}</code>
\u{1F4F1} <b>\u1235\u120D\u12AD:</b> <code>${cleanPhone}</code>
\u{1F464} <b>\u1270\u1320\u1243\u121A:</b> <b>${escapeHtml(wallet.fullName || "\u12F0\u1295\u1260\u129B")}</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F39F} <b>\u120E\u1270\u122A \u1208\u1218\u12AD\u1348\u1275 \u12A8\u1273\u127D \u12EB\u1208\u12CD\u1295 "\u{1F39F} \u120E\u1270\u122A \u12AD\u1348\u1275" \u12E8\u121A\u1208\u12CD\u1295 \u12ED\u132B\u1291!</b>

\u{1F4E2} <b>\u12E8\u1274\u120C\u130D\u122B\u121D \u127B\u1293\u120D:</b> <a href="https://t.me/tewedaj_lottery">@tewedaj_lottery</a>
\u{1F4AC} <b>\u12A5\u1308\u12DB / \u12F5\u130B\u134D:</b> <a href="https://t.me/lij_makbel">@lij_makbel</a>`;
        await sendTelegramResponse(chatId, welcomeMsg, {
          inline_keyboard: [
            [
              { text: "\u{1F39F} \u120E\u1270\u122A \u12AD\u1348\u1275", web_app: { url: webAppUrl } }
            ]
          ]
        });
      }
      return;
    }
    if (text === "/lottery" || textLower === "lottery" || text === "\u{1F39F} \u120E\u1270\u122A \u12AD\u1348\u1275" || textLower.includes("\u120E\u1270\u122A")) {
      logBotActivity(chatId, "bot_lottery_view", "User viewed lotteries list in bot", cleanPhone, wallet.fullName).catch(() => {
      });
      const lotteryMsg = `\u{1F39F} <b>\u1270\u12C8\u12F3\u1305 \u12A6\u1295\u120B\u12ED\u1295 \u120E\u1270\u122A (Tewedaj Online Lottery)</b>

\u1260\u1235\u122B \u120B\u12ED \u12EB\u1209 \u1295\u1241 \u12E8\u120E\u1270\u122A \u12D5\u1323\u12CE\u127D\u1366
\u2022 <b>\u1263\u1208 1,000 \u1265\u122D \u12F0\u122B\u123D</b> (\u1260 10 \u1265\u122D \u12ED\u1241\u1228\u1321)
\u2022 <b>\u1263\u1208 5,000 \u1265\u122D \u12F0\u122B\u123D</b> (\u1260 50 \u1265\u122D \u12ED\u1241\u1228\u1321)
\u2022 <b>\u1263\u1208 10,000 \u1265\u122D \u12F0\u122B\u123D</b> (\u1260 100 \u1265\u122D \u12ED\u1241\u1228\u1321)
\u2022 <b>\u1263\u1208 50,000 \u1265\u122D \u12F0\u122B\u123D</b> (\u1260 200 \u1265\u122D \u12ED\u1241\u1228\u1321)
\u2022 <b>\u12E8 32 \u12A2\u1295\u127D \u12A4\u120D\u12A2\u12F2 \u1272\u126A \u12D5\u1323</b> (\u1260 200 \u1265\u122D \u12ED\u1241\u1228\u1321)

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F39F} <b>\u1275\u12AC\u1275 \u1208\u1218\u1241\u1228\u1325 \u12A5\u1293 \u1208\u1218\u132B\u12C8\u1275 \u12A0\u1351\u1295 \u12ED\u12AD\u1348\u1271!</b>`;
      await sendTelegramResponse(chatId, lotteryMsg, {
        inline_keyboard: [
          [
            { text: "\u{1F39F} \u120E\u1270\u122A \u12A0\u1201\u1295 \u12AD\u1348\u1275 (Open App)", web_app: { url: webAppUrl } }
          ]
        ]
      });
      return;
    }
    if (text === "/wallet" || textLower === "wallet" || text === "\u{1F4B3} \u12E8\u12CB\u120C\u1275 \u1212\u1233\u1265" || text === "\u{1F4B3} \u12CB\u120C\u1275" || textLower.includes("\u12CB\u120C\u1275")) {
      logBotActivity(chatId, "bot_wallet_view", "User checked wallet balance in bot", cleanPhone, wallet.fullName).catch(() => {
      });
      const walletMsg = `\u{1F4B3} <b>\u12E8\u12A5\u122D\u1235\u12CE \u12CB\u120C\u1275 \u1218\u1228\u1303 (My Wallet)</b>

\u{1F194} <b>\u1218\u1208\u12EB (CID):</b> <code>${wallet.customerId}</code>
\u{1F4F1} <b>\u1235\u120D\u12AD \u1241\u1325\u122D:</b> <code>${wallet.phone || "\u12EB\u120D\u1270\u1218\u12D8\u1308\u1260"}</code>
\u{1F39F} <b>\u12E8\u1270\u1246\u1228\u1321 \u1275\u12AC\u1276\u127D:</b> <b>${wallet.ticketsCount || 0}</b>
\u{1F3C6} <b>\u12EB\u1238\u1290\u1349\u1275 \u1320\u1245\u120B\u120B:</b> <b>${(wallet.totalWon || 0).toLocaleString()} \u1265\u122D</b>

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4B0} <b>\u12CB\u120C\u1275\u12CE\u1295 \u1208\u1218\u12AD\u1348\u1275 \u12A8\u1273\u127D \u12EB\u1208\u12CD\u1295 \u1241\u120D\u134D \u12ED\u132B\u1291!</b>`;
      await sendTelegramResponse(chatId, walletMsg, {
        inline_keyboard: [
          [
            { text: "\u{1F4B3} \u12CB\u120C\u1275 \u12AD\u1348\u1275 (Open Wallet)", web_app: { url: `${webAppUrl}&tab=wallet` } }
          ]
        ]
      });
      return;
    }
    if (text === "/help" || textLower === "help" || text === "\u{1F4AC} \u12A5\u1308\u12DB / \u12F5\u130B\u134D" || textLower.includes("\u12A5\u1308\u12DB") || textLower.includes("\u12F5\u130B\u134D")) {
      logBotActivity(chatId, "bot_help_view", "User requested help & support in bot", cleanPhone, wallet.fullName).catch(() => {
      });
      const helpMsg = `\u{1F4AC} <b>\u12A5\u1308\u12DB \u12A5\u1293 \u12F5\u130B\u134D (Help & Support)</b>

\u121B\u1295\u129B\u12CD\u121D \u1325\u12EB\u1244\u1363 \u12E8\u1308\u1262/\u12C8\u132A \u127D\u130D\u122D \u12C8\u12ED\u121D \u12A5\u122D\u12F3\u1273 \u1232\u1348\u120D\u1309 \u1260\u1240\u1325\u1273 \u12EB\u130D\u1299\u1295\u1366

\u{1F451} <b>\u12CB\u1293 \u12A0\u12F5\u121A\u1295:</b> <a href="https://t.me/lij_makbel">@lij_makbel</a>
\u{1F4DE} <b>\u1235\u120D\u12AD:</b> <code>0910961881</code>
\u{1F4E2} <b>\u12ED\u134B\u12CA \u127B\u1293\u120D:</b> <a href="https://t.me/tewedaj_lottery">@tewedaj_lottery</a>

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;
      await sendTelegramResponse(chatId, helpMsg, {
        inline_keyboard: [
          [
            { text: "\u{1F4AC} \u12A0\u12F5\u121A\u1291\u1295 \u12EB\u1290\u130B\u130D\u1229 (@lij_makbel)", url: "https://t.me/lij_makbel" }
          ],
          [
            { text: "\u{1F4E2} \u12ED\u134B\u12CA \u127B\u1293\u120D", url: "https://t.me/tewedaj_lottery" }
          ]
        ]
      });
      return;
    }
    if (text === "\u{1F4F1} \u1235\u120D\u12AD \u1241\u1325\u122D") {
      const phoneMsg = `\u{1F4F1} <b>\u12E8\u1270\u1218\u12D8\u1308\u1260 \u1235\u120D\u12AD \u1241\u1325\u122D\u12CE\u1366</b> <code>${wallet.phone || "\u12A0\u120D\u1270\u1218\u12D8\u1308\u1260\u121D (\u12A5\u1263\u12AD\u12CE \u1235\u120D\u12AD\u12CE\u1295 \u12EB\u130B\u1229)"}</code>`;
      await sendTelegramResponse(chatId, phoneMsg);
      return;
    }
    if (isAdmin && (text === "/admin" || text === "2728" || text.includes("0910961881") || textLower.includes("office_makbel_admin"))) {
      addAdminChatId(chatId);
      await sendTransactionsOverview(chatId, "pending");
      return;
    }
    const simpleMsg = `\u{1F1EA}\u{1F1F9} <b>\u1270\u12C8\u12F3\u1305 \u12A6\u1295\u120B\u12ED\u1295 \u120E\u1270\u122A (Tewedaj Online Lottery)</b>

\u1275\u12AC\u1275 \u1208\u1218\u1241\u1228\u1325 \u12A5\u1293 \u12CB\u120C\u1275\u12CE\u1295 \u1208\u1218\u1320\u1240\u121D \u12A8\u1273\u127D <b>'\u{1F39F} \u120E\u1270\u122A \u12AD\u1348\u1275'</b> \u12E8\u121A\u1208\u12CD\u1295 \u12ED\u132B\u1291::

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4E2} <b>\u12E8\u1274\u120C\u130D\u122B\u121D \u127B\u1293\u120D:</b> <a href="https://t.me/tewedaj_lottery">@tewedaj_lottery</a>
\u{1F4AC} <b>\u12A5\u1308\u12DB / \u12F5\u130B\u134D:</b> <a href="https://t.me/lij_makbel">@lij_makbel</a>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;
    await sendTelegramResponse(chatId, simpleMsg, {
      inline_keyboard: [
        [
          { text: "\u{1F39F} \u120E\u1270\u122A \u12AD\u1348\u1275 (OPEN)", web_app: { url: webAppUrl } }
        ]
      ]
    });
    return;
  } catch (e) {
    console.error("[Telegram Message Error]", e);
  }
}
var notifiedUserTxStatus = /* @__PURE__ */ new Set();
async function sendUserTransactionStatusTelegramNotification(tx, status, userWallet) {
  const notifKey = `${tx.id}_${status}`;
  if (notifiedUserTxStatus.has(notifKey)) {
    console.log(`[Telegram Notification Skipped] Duplicate status notification skipped for ${notifKey}`);
    return;
  }
  notifiedUserTxStatus.add(notifKey);
  const customerChatId = Number(userWallet.telegramId || tx.telegramId || tx.userId);
  if (!isNaN(customerChatId) && customerChatId > 0) {
    const isApprove = status === "completed";
    const userNotif = isApprove ? tx.type === "deposit" ? `\u{1F389} <b>\u12E8\u1308\u1295\u12D8\u1265 \u121B\u1235\u1308\u1262\u12EB \u1325\u12EB\u1244\u12CE \u1338\u12F5\u124B\u120D!</b>

\u12E8 <b>${Number(tx.amount).toLocaleString()} \u1265\u122D</b> \u1270\u1240\u1265\u1208\u1295 \u12C8\u12F0 \u12CB\u120C\u1275\u12CE \u1308\u1265\u1277\u120D::

\u1270\u12C8\u12F3\u1305 \u12A6\u1295\u120B\u12ED\u1295 \u120E\u1270\u122A (Tewedaj Online Lottery)` : `\u{1F4B8} <b>\u12E8\u1308\u1295\u12D8\u1265 \u121B\u12CD\u1323\u1275 \u1325\u12EB\u1244\u12CE \u1270\u1348\u133D\u121F\u120D!</b>

\u12E8 <b>${Number(tx.amount).toLocaleString()} \u1265\u122D</b> \u12C8\u12F0 \u12A0\u12AB\u12CD\u1295\u1275\u12CE (<code>${tx.userPhone}</code>) \u1270\u120B\u120D\u134F\u120D::

\u1270\u12C8\u12F3\u1305 \u12A6\u1295\u120B\u12ED\u1295 \u120E\u1270\u122A (Tewedaj Online Lottery)` : tx.type === "deposit" ? `\u274C <b>\u12E8 ${Number(tx.amount).toLocaleString()} \u1265\u122D \u1308\u1262 \u1325\u12EB\u1244\u12CE \u12CD\u12F5\u1245 \u1270\u12F0\u122D\u1313\u120D::</b>
\u1208\u1270\u1328\u121B\u122A \u1218\u1228\u1303 \u12F5\u130B\u134D \u1230\u132A\u12CD\u1295 \u12EB\u1290\u130B\u130D\u1229 (@lij_makbel)` : `\u274C \u12E8 <b>${Number(tx.amount).toLocaleString()} \u1265\u122D</b> \u121B\u12CD\u1323\u1275 \u1325\u12EB\u1244\u12CE \u12CD\u12F5\u1245 \u1270\u12F0\u122D\u1313\u120D\u1364 \u1308\u1295\u12D8\u1261 \u12C8\u12F0 \u12CB\u120C\u1275\u12CE \u1270\u1218\u120D\u1237\u120D::

\u1270\u12C8\u12F3\u1305 \u12A6\u1295\u120B\u12ED\u1295 \u120E\u1270\u122A (Tewedaj Online Lottery)`;
    if (!userWallet.notifications) userWallet.notifications = [];
    userWallet.notifications.push({
      id: "notif_" + Date.now(),
      message: userNotif,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      isRead: false
    });
    saveUserWallets(true, userWallet);
    await sendTelegramResponse(customerChatId, userNotif).catch(() => {
    });
  }
}
async function handleTelegramCallback(callbackQuery) {
  try {
    const callbackId = callbackQuery.id;
    const chatId = callbackQuery.message?.chat?.id;
    const data = callbackQuery.data;
    const firstName = callbackQuery.from?.first_name || "Admin";
    if (data.startsWith("appr:") || data.startsWith("rejc:")) {
      const isApprove = data.startsWith("appr:");
      const txId = data.replace(/^appr:|^rejc:/, "");
      const callerFrom = callbackQuery.from;
      if (!isAuthorizedAdmin(chatId, callerFrom)) {
        await answerTelegramCallback(
          callbackId,
          "\u12ED\u1205\u1295\u1295 \u1208\u121B\u12F5\u1228\u130D \u1348\u1243\u12F5 \u12E8\u1208\u12CE\u1275\u121D (0910961881 \u1265\u127B)::",
          true
        );
        return;
      }
      let tx = syncedTransactions.find((t) => t.id === txId);
      if (!tx) {
        try {
          const snap = await getDoc(doc(firestore, "transactions", txId));
          if (snap.exists()) {
            tx = snap.data();
            syncedTransactions.push(tx);
          }
        } catch (e) {
          console.warn("[Fetch Tx from Firestore Error]", e);
        }
      }
      if (tx) {
        if (tx.status === "completed" || tx.status === "failed") {
          await answerTelegramCallback(callbackId, "\u12ED\u1205 \u1325\u12EB\u1244 \u1240\u12F0\u121D \u1232\u120D \u1270\u12A8\u1293\u12CD\u1297\u120D!", true);
          return;
        }
        const previousStatus = tx.status;
        tx.status = isApprove ? "completed" : "failed";
        tx.approvedBy = `${firstName} (0910961881)`;
        tx.approvedAt = (/* @__PURE__ */ new Date()).toISOString();
        saveTransactions();
        await syncTransactionToFirestore(tx).catch(() => {
        });
        const userWallet = findOrCreateWallet({
          userId: tx.userId,
          phone: tx.userPhone,
          fullName: tx.userName
        });
        if (isApprove && tx.type === "deposit" && previousStatus !== "completed") {
          userWallet.walletBalance = (userWallet.walletBalance || 0) + Number(tx.amount);
          saveUserWallets(true, userWallet);
          await syncWalletToFirestore(userWallet).catch(() => {
          });
          const apprNotif = {
            id: "notif_appr_" + Date.now(),
            userId: tx.userId || userWallet.userId,
            userName: tx.userName,
            userPhone: tx.userPhone,
            lotteryId: "wallet",
            lotteryTitleAm: "\u1308\u1295\u12D8\u1265 \u1308\u1262 \u1270\u12F0\u122D\u1313\u120D",
            ticketNumber: tx.referenceNumber || "",
            amountWon: 0,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            isRead: false,
            messageAm: `\u12E8 ${Number(tx.amount).toLocaleString()} \u1265\u122D \u1308\u1262 \u1325\u12EB\u1244\u12CE \u1260\u12A0\u12F5\u121A\u1295 \u1338\u12F5\u1246 \u12CB\u120C\u1275\u12CE \u120B\u12ED \u1308\u1262 \u1270\u12F0\u122D\u1313\u120D:: (\u121B\u1323\u1240\u123B: ${tx.referenceNumber || ""})`,
            messageEn: `Your deposit of ${Number(tx.amount).toLocaleString()} ETB was approved and credited to your wallet!`
          };
          await setDoc(doc(firestore, "notifications", apprNotif.id), apprNotif, { merge: true }).catch(() => {
          });
        } else if (!isApprove && tx.type === "withdrawal" && previousStatus === "pending") {
          userWallet.walletBalance = (userWallet.walletBalance || 0) + Number(tx.amount);
          saveUserWallets(true, userWallet);
          await syncWalletToFirestore(userWallet).catch(() => {
          });
        }
        syncDashboardToFirestore({
          id: "act_bot_" + (isApprove ? "appr_" : "rejc_") + tx.id,
          type: isApprove ? tx.type === "deposit" ? "deposit_approved" : "withdrawal_approved" : tx.type === "deposit" ? "deposit_request" : "withdrawal_request",
          titleAm: isApprove ? tx.type === "deposit" ? "\u12E8\u1308\u1262 \u1325\u12EB\u1244 \u1260\u1266\u1275 \u1338\u12F5\u124B\u120D" : "\u12E8\u121B\u12CD\u1323\u1275 \u1325\u12EB\u1244 \u1260\u1266\u1275 \u1338\u12F5\u124B\u120D" : tx.type === "deposit" ? "\u12E8\u1308\u1262 \u1325\u12EB\u1244 \u1260\u1266\u1275 \u12CD\u12F5\u1245 \u1270\u12F0\u122D\u1313\u120D" : "\u12E8\u121B\u12CD\u1323\u1275 \u1325\u12EB\u1244 \u1260\u1266\u1275 \u12CD\u12F5\u1245 \u1270\u12F0\u122D\u1313\u120D",
          titleEn: isApprove ? "Deposit Approved via Bot" : "Withdrawal Approved via Bot",
          descriptionAm: isApprove ? tx.type === "deposit" ? `\u2705 \u12E8 ${Number(tx.amount).toLocaleString()} \u1265\u122D \u1308\u1262 \u1338\u12F5\u124B\u120D (${tx.userName} - ${tx.userPhone})` : `\u{1F4B8} \u12E8 ${Number(tx.amount).toLocaleString()} \u1265\u122D \u12C8\u132A \u1338\u12F5\u124B\u120D (${tx.userName} - ${tx.userPhone})` : `\u274C \u12E8 ${Number(tx.amount).toLocaleString()} \u1265\u122D ${tx.type === "deposit" ? "\u1308\u1262" : "\u12C8\u132A"} \u12CD\u12F5\u1245 \u1270\u12F0\u122D\u1313\u120D (${tx.userName})`,
          descriptionEn: `${isApprove ? "Approved" : "Rejected"} ${tx.type} of ${tx.amount} ETB for ${tx.userName}`,
          userPhone: tx.userPhone,
          userName: tx.userName,
          amount: Number(tx.amount),
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }).catch(() => {
        });
        await sendUserTransactionStatusTelegramNotification(tx, isApprove ? "completed" : "failed", userWallet);
      }
      const alertMsg = isApprove ? `\u12E8 ${tx?.amount?.toLocaleString() || ""} \u1265\u122D \u12AD\u134D\u12EB \u1338\u12F5\u124B\u120D!` : `\u12E8 ${tx?.amount?.toLocaleString() || ""} \u1265\u122D \u12AD\u134D\u12EB \u12CD\u12F5\u1245 \u1270\u12F0\u122D\u1313\u120D!`;
      await answerTelegramCallback(callbackId, alertMsg, true);
      if (tx) {
        updateBotMessagesStatus(tx).catch(() => {
        });
      }
      return;
    }
    if (data.startsWith("txfilter_")) {
      const filter = data.replace("txfilter_", "");
      await answerTelegramCallback(callbackId, "\u12DD\u122D\u12DD\u1229 \u1260\u1218\u132B\u1295 \u120B\u12ED...");
      await sendTransactionsOverview(chatId, filter);
      return;
    }
    if (data === "done" || data === "noop") {
      await answerTelegramCallback(callbackId, "\u1270\u1320\u1293\u124B\u120D!");
      return;
    }
    await answerTelegramCallback(callbackId);
  } catch (err) {
    console.error("[Telegram Callback Error]", err);
  }
}
app.get("/api/merchant", (_req, res) => {
  res.json({
    ok: true,
    merchant: OFFICIAL_MERCHANT
  });
});
app.get("/api/lottery/status", (_req, res) => {
  res.json({
    ok: true,
    platform: "Tewedaj Online Lottery (\u1270\u12C8\u12F3\u1305 \u12A6\u1295\u120B\u12ED\u1295 \u120E\u1270\u122A)",
    merchant: OFFICIAL_MERCHANT
  });
});
app.get("/api/telegram/status", async (_req, res) => {
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
    const data = await tgRes.json();
    res.json({
      ok: true,
      bot: data.result,
      configuredUrl: APP_URL,
      adminCount: adminChatIds.length,
      adminChatIds,
      botUsername: BOT_USERNAME,
      officialAdminPhone: OFFICIAL_ADMIN.phone,
      officialSupport: OFFICIAL_ADMIN.supportUsername
    });
  } catch (err) {
    res.json({ ok: false, error: err.message, adminCount: adminChatIds.length });
  }
});
app.post("/api/telegram/test-alert", async (_req, res) => {
  try {
    const timeNow = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US");
    const msg = `\u{1F6A8} <b>\u12E8\u1219\u12A8\u122B \u1218\u120D\u12D5\u12AD\u1275 (Test Alert)</b>

\u12E8\u1270\u12C8\u12F3\u1305 \u120E\u1270\u122A \u1266\u1275 (@${BOT_USERNAME}) \u1260\u1275\u12AD\u12AD\u120D \u12A5\u12E8\u1230\u122B \u1290\u12CD!
\u{1F4DE} \u1235\u120D\u12AD: <b>0910961881</b>
\u{1F4AC} \u1274\u120C\u130D\u122B\u121D: <b>@${OFFICIAL_ADMIN.supportUsername}</b>
\u23F0 \u1230\u12D3\u1275: ${timeNow}`;
    const results = await notifyAllAdmins(msg, {
      inline_keyboard: [
        [
          { text: "\u2705 \u12ED\u1230\u122B\u120D (Working)", callback_data: "done" },
          { text: "\u{1F310} \u12C8\u12F0 \u1218\u1270\u130D\u1260\u122A\u12EB", url: APP_URL }
        ]
      ]
    });
    res.json({ ok: true, sentCount: results.length, totalAdmins: adminChatIds.length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.post("/api/notify-admin", async (req, res) => {
  await ensureFirestoreLoaded();
  const { id, type, userName, userPhone, amount, paymentMethod, referenceNumber, timestamp, userId, telegramId, screenshotUrl } = req.body;
  if (!id) {
    return res.status(400).json({ ok: false, error: "Transaction id is required" });
  }
  const finalUserId = userId || telegramId || "";
  const cleanPhone = normalizeEthiopianPhone(userPhone);
  if (cleanPhone && cleanPhone.length >= 9) {
    const canonicalKey = cleanPhone.length === 10 ? cleanPhone : `0${cleanPhone.slice(-9)}`;
    const existing = userWallets[canonicalKey];
    if (!existing) {
      userWallets[canonicalKey] = {
        userId: finalUserId || `usr_${canonicalKey}`,
        phone: canonicalKey,
        fullName: userName && userName.trim() && userName !== "\u1270\u1320\u1243\u121A" && !userName.startsWith("\u12F0\u1295\u1260\u129B") ? userName.trim() : `\u12F0\u1295\u1260\u129B (${canonicalKey})`,
        walletBalance: 0,
        ticketsCount: 0,
        totalWon: 0,
        language: "am",
        registeredAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    } else {
      if (userName && userName.trim() && userName !== "\u1270\u1320\u1243\u121A" && (!existing.fullName || existing.fullName === "\u1270\u1320\u1243\u121A" || existing.fullName.startsWith("\u12F0\u1295\u1260\u129B"))) {
        existing.fullName = userName.trim();
      }
      if (!existing.phone) existing.phone = canonicalKey;
    }
    saveUserWallets();
  } else {
    findOrCreateWallet({ userId: finalUserId, phone: userPhone, telegramId, fullName: userName });
  }
  const existingIndex = syncedTransactions.findIndex((t) => t.id === id);
  const txStatus = type === "ticket_purchase" ? "completed" : "pending";
  const txRecord = {
    id,
    type: type || "deposit",
    userId: finalUserId,
    userName: userName && userName !== "\u1270\u1320\u1243\u121A" ? userName : userPhone || "\u12F0\u1295\u1260\u129B",
    userPhone: userPhone || "",
    amount: Number(amount) || 0,
    paymentMethod: paymentMethod || "wallet",
    referenceNumber: referenceNumber || "REF-" + Date.now(),
    screenshotUrl: screenshotUrl || void 0,
    timestamp: timestamp || (/* @__PURE__ */ new Date()).toISOString(),
    status: txStatus,
    approvedBy: type === "ticket_purchase" ? "System Auto-Approve" : void 0,
    approvedAt: type === "ticket_purchase" ? (/* @__PURE__ */ new Date()).toISOString() : void 0,
    source: "mini_app"
  };
  const isDeposit = type === "deposit";
  const isWth = type === "withdrawal";
  if (isDeposit) {
    const dAmount = Number(amount) || 0;
    if (dAmount < 10) {
      return res.status(400).json({ ok: false, error: "Minimum deposit is 10 ETB (\u12DD\u1245\u1270\u129B\u12CD \u12E8\u1308\u1262 \u1218\u1320\u1295 10 \u1265\u122D \u1290\u12CD)" });
    }
  }
  if (isWth) {
    const wAmount = Number(amount) || 0;
    if (wAmount < 50) {
      return res.status(400).json({ ok: false, error: "Minimum withdrawal is 50 ETB (\u12DD\u1245\u1270\u129B\u12CD \u12E8\u121B\u12CD\u1323\u1275 \u1218\u1320\u1295 50 \u1265\u122D \u1290\u12CD)" });
    }
    const userWallet = findOrCreateWallet({ userId: finalUserId, phone: userPhone, telegramId, fullName: userName });
    if (userWallet.walletBalance < wAmount) {
      return res.status(400).json({ ok: false, error: "Insufficient balance (\u1260\u1242 \u1212\u1233\u1265 \u12E8\u1208\u12CE\u1275\u121D)" });
    }
  }
  if (existingIndex >= 0) {
    syncedTransactions[existingIndex] = { ...syncedTransactions[existingIndex], ...txRecord };
  } else {
    syncedTransactions.unshift(txRecord);
  }
  saveTransactions();
  recordMiniAppActivity(finalUserId, (type || "deposit") + "_request", {
    userName,
    userPhone,
    amount: Number(amount) || 0,
    referenceNumber,
    paymentMethod
  }).catch(() => {
  });
  await syncTransactionToFirestore(txRecord).catch(() => {
  });
  await reconcileWalletForUser(finalUserId, userPhone, telegramId);
  if (type === "ticket_purchase") {
    return res.json({ ok: true, txId: id, status: "completed" });
  }
  await sendTransactionNotificationToTelegram(txRecord);
  res.json({
    ok: true,
    txId: id,
    status: txStatus
  });
});
if (!isVercel) {
  const sweepInterval = setInterval(async () => {
    let changed = false;
    const now = Date.now();
    const INACTIVE_THRESHOLD_MS = 2 * 60 * 1e3;
    for (const wallet of Object.values(userWallets)) {
      if (wallet.isOnline && wallet.lastActive) {
        const lastActiveTime = new Date(wallet.lastActive).getTime();
        if (now - lastActiveTime > INACTIVE_THRESHOLD_MS) {
          wallet.isOnline = false;
          changed = true;
          syncWalletToFirestore(wallet).catch(() => {
          });
        }
      }
    }
    if (changed) {
      saveUserWallets(false);
    }
  }, 6e4);
  if (sweepInterval.unref) sweepInterval.unref();
}
var notifiedTxIds = /* @__PURE__ */ new Set();
async function sendTransactionNotificationToTelegram(tx) {
  if (notifiedTxIds.has(tx.id)) return;
  if (tx.type === "ticket_purchase") {
    const tgMessage2 = `\u{1F39F} <b>\u12A0\u12F2\u1235 \u12E8\u1275\u12AC\u1275 \u130D\u12E2 (New Ticket Purchase)</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} <b>\u12F0\u1295\u1260\u129B:</b> <b>${escapeHtml(tx.userName)}</b>
\u{1F4F1} <b>\u1235\u120D\u12AD:</b> <code>${escapeHtml(tx.userPhone)}</code>
\u{1F4B0} <b>\u12E8\u1270\u12A8\u1348\u1208\u12CD:</b> <b>${tx.amount.toLocaleString()} \u1265\u122D</b>
\u{1F516} <b>\u121B\u1323\u1240\u123B:</b> <code>${escapeHtml(tx.referenceNumber)}</code>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;
    const res = await notifyAllAdmins(tgMessage2);
    if (res && res.length > 0) {
      notifiedTxIds.add(tx.id);
    }
    return;
  }
  const isDeposit = tx.type === "deposit";
  let tgMessage = "";
  if (isDeposit) {
    tgMessage = `\u{1F4E5} <b>\u12A0\u12F2\u1235 \u12E8\u1308\u1295\u12D8\u1265 \u121B\u1235\u1308\u1262\u12EB \u1325\u12EB\u1244</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} <b>\u12E8\u12F0\u1295\u1260\u129B \u1235\u121D:</b> <b>${escapeHtml(tx.userName)}</b>
\u{1F4F1} <b>\u1235\u120D\u12AD \u1241\u1325\u122D:</b> <code>${escapeHtml(tx.userPhone)}</code>
\u{1F4B0} <b>\u12E8\u1265\u122D \u1218\u1320\u1295:</b> <b>${Number(tx.amount).toLocaleString()} \u1265\u122D (ETB)</b>
\u{1F4B3} <b>\u12E8\u12AD\u134D\u12EB \u12D8\u12F4:</b> <b>${String(tx.paymentMethod).toUpperCase()}</b>
\u{1F516} <b>\u12E8\u121B\u1323\u1240\u123B \u1241\u1325\u122D:</b> <code>${escapeHtml(tx.referenceNumber)}</code>
` + (tx.screenshotUrl ? `\u{1F4F8} <b>\u12F0\u1228\u1230\u129D:</b> \u134E\u1276 \u1260\u12F3\u123D\u1266\u122D\u12F5 \u12ED\u1308\u129B\u120D
` : "") + `\u23F0 <b>\u1230\u12D3\u1275:</b> ${new Date(tx.timestamp || Date.now()).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Addis_Ababa" })}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
<i>\u12A5\u1263\u12AD\u12CE \u12AD\u134D\u12EB\u12CD\u1295 \u12AB\u1228\u130B\u1308\u1321 \u1260\u128B\u120B '\u12A0\u133D\u12F5\u1245' \u12E8\u121A\u1208\u12CD\u1295 \u12ED\u132B\u1291::</i>`;
  } else {
    tgMessage = `\u{1F4E4} <b>\u12A0\u12F2\u1235 \u12E8\u1308\u1295\u12D8\u1265 \u121B\u12CD\u1323\u1275 \u1325\u12EB\u1244</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} <b>\u12E8\u12F0\u1295\u1260\u129B \u1235\u121D:</b> <b>${escapeHtml(tx.userName)}</b>
\u{1F4F1} <b>\u1218\u1240\u1260\u12EB \u12A0\u12AB\u12CD\u1295\u1275:</b> <code>${escapeHtml(tx.userPhone)}</code>
\u{1F4B8} <b>\u12E8\u121A\u12C8\u1323\u12CD \u1218\u1320\u1295:</b> <b>${Number(tx.amount).toLocaleString()} \u1265\u122D (ETB)</b>
\u23F0 <b>\u1230\u12D3\u1275:</b> ${new Date(tx.timestamp || Date.now()).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Addis_Ababa" })}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
<i>\u1308\u1295\u12D8\u1261\u1295 \u12C8\u12F0 <code>${escapeHtml(tx.userPhone)}</code> \u120D\u12A8\u12CD \u1232\u12EB\u1320\u1293\u1245\u1241 '\u12A0\u133D\u12F5\u1245' \u12E8\u121A\u1208\u12CD\u1295 \u12ED\u132B\u1291::</i>`;
  }
  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: "\u2705 \u12A0\u133D\u12F5\u1245", callback_data: `appr:${tx.id}` },
        { text: "\u274C \u12CD\u12F5\u1245", callback_data: `rejc:${tx.id}` }
      ],
      [
        { text: "\u{1F451} \u12E8\u12A0\u12F5\u121A\u1295 \u12F3\u123D\u1266\u122D\u12F5", web_app: { url: ADMIN_APP_URL } }
      ]
    ]
  };
  const results = await notifyAllAdmins(tgMessage, inlineKeyboard);
  if (results && results.length > 0) {
    notifiedTxIds.add(tx.id);
    tx.notifiedAdminMessages = results.map((r) => ({ chatId: r.chatId, messageId: r.messageId, text: tgMessage }));
    saveTransactions();
  }
}
async function updateBotMessagesStatus(tx) {
  if (!tx.notifiedAdminMessages || tx.notifiedAdminMessages.length === 0) return;
  const isApprove = tx.status === "completed";
  const timeNow = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Addis_Ababa" });
  const badge = isApprove ? `

\u2705 <b>\u1270\u1348\u1245\u12F7\u120D (APPROVED)</b>
\u{1F464} <b>${tx.approvedBy || "Admin"}</b>
\u23F0 ${timeNow}` : `

\u274C <b>\u12CD\u12F5\u1245 \u1270\u12F0\u122D\u1313\u120D (REJECTED)</b>
\u{1F464} <b>${tx.approvedBy || "Admin"}</b>
\u23F0 ${timeNow}`;
  const updatedKeyboard = {
    inline_keyboard: [
      [
        {
          text: isApprove ? "\u2705 \u1338\u12F5\u124B\u120D" : "\u274C \u12CD\u12F5\u1245 \u1206\u1297\u120D",
          callback_data: "done"
        }
      ],
      [
        {
          text: "\u{1F310} \u1218\u1270\u130D\u1260\u122A\u12EB \u12AD\u1348\u1275 (Open)",
          url: APP_URL
        }
      ]
    ]
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
    const q = query(collection(firestore, "transactions"), limit(250));
    onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const tx = change.doc.data();
          if (tx && tx.id) {
            const idx = syncedTransactions.findIndex((t) => t.id === tx.id);
            if (idx >= 0) {
              const oldStatus = syncedTransactions[idx].status;
              syncedTransactions[idx] = { ...syncedTransactions[idx], ...tx };
              if (oldStatus === "pending" && tx.status !== "pending") {
                console.log(`[Firestore Sync] Transaction ${tx.id} status updated to ${tx.status}`);
                saveTransactions();
                reconcileWalletForUser(tx.userId, tx.userPhone).catch(() => {
                });
              }
            } else {
              syncedTransactions.unshift(tx);
              saveTransactions();
              if (tx.status === "pending" && !notifiedTxIds.has(tx.id)) {
                sendTransactionNotificationToTelegram(tx).catch(() => {
                });
              }
              reconcileWalletForUser(tx.userId, tx.userPhone).catch(() => {
              });
            }
          }
        } else if (change.type === "removed") {
          const tx = change.doc.data();
          if (tx && tx.id) {
            const idx = syncedTransactions.findIndex((t) => t.id === tx.id);
            if (idx >= 0) {
              syncedTransactions.splice(idx, 1);
              saveTransactions();
            }
            reconcileWalletForUser(tx.userId, tx.userPhone).catch(() => {
            });
          }
        }
      });
    }, (err) => {
      console.warn("[Firestore Tx Watcher Error]", err);
    });
  } catch (err) {
    console.warn("[Firestore Tx Watcher init failed]", err);
  }
}
function initFirestoreTicketsWatcher() {
  try {
    const q = query(collection(firestore, "tickets"));
    onSnapshot(q, (snapshot) => {
      let changed = false;
      const affectedUsers = /* @__PURE__ */ new Set();
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const data = change.doc.data();
          const id = data?.id || change.doc.id;
          const ticketNumber = data?.ticketNumber || data?.ticket_number || data?.number || id.replace("tkt_", "");
          const userPhone = data?.userPhone || data?.phone || "";
          const wallet = userPhone ? findWalletByPhone(userPhone) : data?.userId ? findOrCreateWallet({ userId: data.userId }) : void 0;
          const userName = data?.userName && data.userName !== "\u1270\u1320\u1243\u121A" ? data.userName : wallet?.fullName || (userPhone ? `\u12F0\u1295\u1260\u129B (${userPhone})` : "\u12F0\u1295\u1260\u129B");
          const tk = {
            id,
            lotteryId: data?.lotteryId || (data?.pricePaid === 10 ? "lot_derash_1000" : data?.pricePaid === 50 ? "lot_derash_5000" : data?.pricePaid === 100 ? "lot_derash_10000" : "lot_derash_50000"),
            lotteryTitleAm: data?.lotteryTitleAm || "\u1263\u1208 1,000 \u1265\u122D \u12F0\u122B\u123D",
            lotteryTitleEn: data?.lotteryTitleEn || "Bale 1,000 ETB Derash",
            ticketNumber: String(ticketNumber),
            userId: data?.userId || wallet?.userId || "0920561776",
            userName,
            userPhone: userPhone || wallet?.phone || "",
            userTelegram: data?.userTelegram || wallet?.username || "",
            pricePaid: Number(data?.pricePaid) || 10,
            purchasedAt: data?.purchasedAt || data?.purchaseDate || (/* @__PURE__ */ new Date()).toISOString(),
            paymentMethod: data?.paymentMethod || "wallet",
            paymentReference: data?.paymentReference || `TKT-${ticketNumber}`,
            round: Number(data?.round) || 1,
            status: data?.status || "active",
            securityHash: data?.securityHash || `ETH-${ticketNumber}`
          };
          const idx = syncedTickets.findIndex((t) => t.id === id || t.ticketNumber === tk.ticketNumber);
          if (idx >= 0) {
            syncedTickets[idx] = { ...syncedTickets[idx], ...tk };
          } else {
            syncedTickets.unshift(tk);
          }
          changed = true;
          if (tk.userId) affectedUsers.add(tk.userId);
          if (tk.userPhone) affectedUsers.add(tk.userPhone);
        } else if (change.type === "removed") {
          const id = change.doc.id;
          const idx = syncedTickets.findIndex((t) => t.id === id);
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
        syncDashboardToFirestore().catch(() => {
        });
        affectedUsers.forEach((id) => reconcileWalletForUser(id, id).catch(() => {
        }));
      }
    }, (err) => {
      console.warn("[Firestore Tickets Watcher Error]", err);
    });
  } catch (err) {
    console.warn("[Firestore Tickets Watcher init failed]", err);
  }
}
app.post("/api/admin/users/delete", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ ok: false, error: "User ID required" });
  delete userWallets[userId];
  saveUserWallets(true);
  try {
    await deleteDoc(doc(firestore, "wallets", userId));
  } catch (err) {
    console.error(`[Firestore Delete User Error] ${userId}:`, err);
  }
  res.json({ ok: true, message: `User ${userId} deleted` });
});
app.post("/api/auth/register", (req, res) => {
  const { fullName, phone, password, username, profileImage } = req.body;
  if (!phone || !phone.trim()) {
    return res.status(400).json({ ok: false, error: "\u1235\u120D\u12AD \u1241\u1325\u122D \u12EB\u1235\u1348\u120D\u130B\u120D" });
  }
  if (!password || !password.trim()) {
    return res.status(400).json({ ok: false, error: "\u12E8\u12ED\u1208\u134D \u1243\u120D \u12EB\u1235\u1348\u120D\u130B\u120D" });
  }
  const clean = normalizeEthiopianPhone(phone);
  if (clean.length < 10) {
    return res.status(400).json({ ok: false, error: "\u12A5\u1263\u12AD\u12CE \u1275\u12AD\u12AD\u1208\u129B \u1263\u1208 10 \u12A0\u1203\u12DD \u1235\u120D\u12AD \u1241\u1325\u122D \u12EB\u1235\u1308\u1261 (\u121D\u1233\u120C: 09... \u12C8\u12ED\u121D 07...)" });
  }
  const trimmedPassword = password.trim();
  if (trimmedPassword.length < 4) {
    return res.status(400).json({ ok: false, error: "\u12E8\u12ED\u1208\u134D \u1243\u120D \u1262\u12EB\u1295\u1235 4 \u134A\u12F0\u120B\u1275 \u12C8\u12ED\u121D \u1241\u1325\u122E\u127D \u1218\u1206\u1295 \u12A0\u1208\u1260\u1275" });
  }
  deduplicateWallets();
  const existingWallet = findWalletByPhone(clean);
  if (existingWallet) {
    return res.status(409).json({
      ok: false,
      error: '\u12ED\u1205 \u1235\u120D\u12AD \u1241\u1325\u122D \u1240\u12F0\u121D \u1232\u120D \u1270\u1218\u12DD\u130D\u1267\u120D\u1362 \u12A5\u1263\u12AD\u12CE "\u130D\u1263 (Login)" \u12E8\u121A\u1208\u12CD\u1295 \u12ED\u132B\u1291',
      isExisting: true
    });
  }
  const regDateIso = (/* @__PURE__ */ new Date()).toISOString();
  const readableRegDate = (/* @__PURE__ */ new Date()).toLocaleTimeString("am-ET", { hour: "2-digit", minute: "2-digit" }) + " " + (/* @__PURE__ */ new Date()).toLocaleDateString("am-ET");
  const walletKey = clean;
  const newWallet = {
    userId: `usr_${clean}`,
    phone: clean,
    fullName: (fullName && typeof fullName === "string" ? fullName.trim() : "") || "\u1270\u1320\u1243\u121A",
    password: trimmedPassword,
    username: username || "",
    profileImage: (profileImage && typeof profileImage === "string" ? profileImage.trim() : "") || "",
    walletBalance: 0,
    ticketsCount: 0,
    totalWon: 0,
    language: "am",
    registeredAt: regDateIso
  };
  userWallets[walletKey] = newWallet;
  saveUserWallets();
  const tgRegMessage = `\u{1F464} <b>\u12A0\u12F2\u1235 \u1270\u1320\u1243\u121A \u1270\u1218\u12DD\u130D\u1267\u120D! (New User Registered)</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} <b>\u1219\u1209 \u1235\u121D (Full Name):</b> <b>${newWallet.fullName || "\u12A0\u120D\u1270\u121E\u120B\u121D"}</b>
\u{1F4F1} <b>\u1235\u120D\u12AD \u1241\u1325\u122D (Phone):</b> <code>${clean}</code>
` + (username ? `\u{1F4AC} <b>\u1274\u120C\u130D\u122B\u121D (Telegram):</b> @${username.replace("@", "")}
` : "") + `\u23F0 <b>\u12E8\u1270\u1218\u12D8\u1308\u1260\u1260\u1275 \u1240\u1295:</b> ${readableRegDate}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
<i>\u1270\u12C8\u12F3\u1305 \u12A6\u1295\u120B\u12ED\u1295 \u120E\u1270\u122A (Tewedaj Online Lottery)</i>`;
  notifyAllAdmins(tgRegMessage, {
    inline_keyboard: [
      [
        { text: "\u{1F451} \u12E8\u12A0\u12F5\u121A\u1295 \u12F3\u123D\u1266\u122D\u12F5 (Admin)", web_app: { url: ADMIN_APP_URL } }
      ]
    ]
  }).catch((err) => console.error("[Register Notify Error]", err));
  const userTickets = syncedTickets.filter((t) => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)));
  const userTxs = syncedTransactions.filter((t) => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)));
  res.json({
    ok: true,
    user: newWallet,
    tickets: userTickets,
    transactions: userTxs
  });
});
app.post("/api/auth/login", (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !phone.trim()) {
    return res.status(400).json({ ok: false, error: "\u1235\u120D\u12AD \u1241\u1325\u122D \u12EB\u1235\u1308\u1261" });
  }
  if (!password || !password.trim()) {
    return res.status(400).json({ ok: false, error: "\u12E8\u12ED\u1208\u134D \u1243\u120D \u12EB\u1235\u1308\u1261" });
  }
  const clean = normalizeEthiopianPhone(phone);
  if (clean.length < 9) {
    return res.status(400).json({ ok: false, error: "\u1275\u12AD\u12AD\u1208\u129B \u1235\u120D\u12AD \u1241\u1325\u122D \u12EB\u1235\u1308\u1261" });
  }
  deduplicateWallets();
  const matchedWallet = findWalletByPhone(clean);
  if (!matchedWallet) {
    return res.status(404).json({
      ok: false,
      error: '\u12ED\u1205 \u1235\u120D\u12AD \u1241\u1325\u122D \u12A0\u120D\u1270\u1308\u1298\u121D\u1362 \u12A5\u1263\u12AD\u12CE \u12A0\u1235\u1240\u12F5\u1218\u12CD "\u1270\u1218\u12DD\u1308\u1265 (Register)" \u12E8\u121A\u1208\u12CD\u1295 \u12ED\u132B\u1291',
      notFound: true
    });
  }
  const trimmedPassword = password.trim();
  if (!matchedWallet.password || matchedWallet.password !== trimmedPassword) {
    return res.status(401).json({
      ok: false,
      error: "\u12E8\u1270\u1233\u1233\u1270 \u12E8\u12ED\u1208\u134D \u1243\u120D (Password)! \u12A5\u1263\u12AD\u12CE \u12F0\u130D\u1218\u12CD \u12ED\u121E\u12AD\u1229",
      invalidPassword: true
    });
  }
  const isMakbelAdmin = clean.endsWith("910961881") || matchedWallet.username && matchedWallet.username.toLowerCase().replace("@", "") === "lij_makbel";
  if (isMakbelAdmin) {
    matchedWallet.isAdmin = true;
  }
  const userTickets = syncedTickets.filter((t) => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)));
  const userTxs = syncedTransactions.filter((t) => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)));
  res.json({
    ok: true,
    user: matchedWallet,
    tickets: userTickets,
    transactions: userTxs
  });
});
app.post("/api/tickets/save", async (req, res) => {
  const { newTickets, phone, userId } = req.body;
  if (Array.isArray(newTickets) && newTickets.length > 0) {
    for (const tk of newTickets) {
      const idx = syncedTickets.findIndex((t) => t.id === tk.id);
      if (idx >= 0) {
        syncedTickets[idx] = { ...syncedTickets[idx], ...tk };
      } else {
        syncedTickets.unshift(tk);
      }
      await saveTickets(tk);
    }
    const firstTk = newTickets[0];
    const tkCount = newTickets.length;
    const buyerPhone = phone || firstTk.userPhone || "";
    const buyerName = firstTk.userName && firstTk.userName !== "\u1270\u1320\u1243\u121A" ? firstTk.userName : buyerPhone || "\u12F0\u1295\u1260\u129B";
    const totalCost = newTickets.reduce((s, t) => s + (Number(t.pricePaid) || 0), 0);
    const nums = newTickets.map((t) => t.ticketNumber).join(", ");
  }
  const clean = phone ? phone.replace(/\D/g, "") : "";
  if (clean) {
    for (const w of Object.values(userWallets)) {
      if (w.phone && w.phone.replace(/\D/g, "").endsWith(clean.slice(-9))) {
        w.ticketsCount = syncedTickets.filter((t) => t.userPhone && t.userPhone.replace(/\D/g, "").endsWith(clean.slice(-9))).length;
        saveUserWallets();
        break;
      }
    }
  }
  const userTickets = clean ? syncedTickets.filter((t) => t.userPhone && t.userPhone.replace(/\D/g, "").endsWith(clean.slice(-9))) : syncedTickets;
  const lotteryCounts = computeActiveLotteryCounts();
  for (const [lotId, count] of Object.entries(lotteryCounts)) {
    if (count >= 150) {
      checkAndNotify200Filled(lotId, count, 1);
    }
  }
  await reconcileWalletForUser(userId, phone);
  res.json({ ok: true, tickets: userTickets, lotteryCounts });
});
app.get("/api/lotteries/live-counts", (_req, res) => {
  res.json({
    ok: true,
    lotteryCounts: computeActiveLotteryCounts(),
    totalActive: syncedTickets.filter((t) => t.status === "active").length,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/dashboard/stats", async (_req, res) => {
  try {
    const totalTicketsSold = syncedTickets.length;
    const activeTickets = syncedTickets.filter((t) => t.status === "active");
    const buyersMap = /* @__PURE__ */ new Map();
    for (const t of syncedTickets) {
      const p = t.userPhone ? normalizeEthiopianPhone(t.userPhone) : t.userId || "unknown";
      if (!buyersMap.has(p)) {
        buyersMap.set(p, {
          phone: p,
          name: t.userName && t.userName !== "\u1270\u1320\u1243\u121A" ? t.userName : p,
          ticketsCount: 0,
          totalSpent: 0
        });
      }
      const b = buyersMap.get(p);
      b.ticketsCount++;
      b.totalSpent += Number(t.pricePaid) || 0;
      if (t.userName && t.userName !== "\u1270\u1320\u1243\u121A" && (!b.name || b.name === p)) {
        b.name = t.userName;
      }
    }
    const uniqueBuyers = Array.from(buyersMap.values());
    uniqueBuyers.sort((a, b) => b.ticketsCount - a.ticketsCount);
    const keriEtsaSummary = {};
    for (const [lotId, conf] of Object.entries(CANONICAL_LOTTERY_CAPACITIES)) {
      const isTv = lotId === "lot_tv_32";
      const soldForThis = activeTickets.filter((t) => {
        if (isTv) {
          return t.lotteryId === "lot_tv_32" || t.lotteryTitleAm?.includes("\u1272\u126A") || t.lotteryTitleAm?.includes("TV");
        }
        if (lotId === "lot_derash_50000") {
          return t.lotteryId === "lot_derash_50000" || t.pricePaid === 200 && !t.lotteryId?.includes("tv") && !t.lotteryTitleAm?.includes("\u1272\u126A") && !t.lotteryTitleAm?.includes("TV");
        }
        return t.lotteryId === lotId || t.pricePaid === conf.price && (lotId.includes(String(conf.jackpot)) || lotId.includes("derash"));
      }).length;
      const keriEtsa = Math.max(0, conf.capacity - soldForThis);
      const buyersForThis = new Set(
        activeTickets.filter((t) => {
          if (isTv) return t.lotteryId === "lot_tv_32" || t.lotteryTitleAm?.includes("\u1272\u126A") || t.lotteryTitleAm?.includes("TV");
          if (lotId === "lot_derash_50000") return t.lotteryId === "lot_derash_50000" || t.pricePaid === 200 && !t.lotteryId?.includes("tv") && !t.lotteryTitleAm?.includes("\u1272\u126A") && !t.lotteryTitleAm?.includes("TV");
          return t.lotteryId === lotId || t.pricePaid === conf.price;
        }).map((t) => t.userPhone ? normalizeEthiopianPhone(t.userPhone) : t.userId)
      ).size;
      const itemInfo = {
        lotteryId: lotId,
        titleAm: conf.titleAm,
        titleEn: conf.titleEn,
        ticketPrice: conf.price,
        totalInventory: conf.capacity,
        ticketsSold: soldForThis,
        keriEtsa,
        // ቀሪ ዕጣ
        round: 1,
        buyersCount: buyersForThis,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (conf.isItemPrize || isTv) {
        itemInfo.isItemPrize = true;
        itemInfo.prizeName = "32 Inch Smart TV";
        itemInfo.prizeAm = "\u12E8 32 \u12A2\u1295\u127D \u12A4\u120D\u12A2\u12F2 \u1272\u126A";
      } else {
        itemInfo.jackpotAmount = conf.jackpot;
      }
      keriEtsaSummary[lotId] = itemInfo;
    }
    const completedDeposits = syncedTransactions.filter((t) => t.type === "deposit" && t.status === "completed");
    const totalDepositedAmount = completedDeposits.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const completedWithdrawals = syncedTransactions.filter((t) => t.type === "withdrawal" && t.status === "completed");
    const totalWithdrawnAmount = completedWithdrawals.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const pendingDepositsCount = syncedTransactions.filter((t) => t.type === "deposit" && t.status === "pending").length;
    const pendingWithdrawalsCount = syncedTransactions.filter((t) => t.type === "withdrawal" && t.status === "pending").length;
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
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.post("/api/dashboard/refresh", async (_req, res) => {
  try {
    await syncDashboardToFirestore();
    res.json({ ok: true, message: "Firestore Dashboard synchronized successfully" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.get("/api/admin/all-tickets", (_req, res) => {
  res.json({
    ok: true,
    tickets: syncedTickets,
    total: syncedTickets.length,
    active: syncedTickets.filter((t) => t.status === "active").length
  });
});
var LOCKS_FILE = path.join(STORAGE_DIR, "lottery_locks_store.json");
var serverLockedLotteryIds = safeReadJsonSync(LOCKS_FILE, []);
async function saveLotteryLocks() {
  safeWriteJsonSync(LOCKS_FILE, serverLockedLotteryIds);
  if (isFirestoreQuotaActive()) {
    try {
      await setDoc(doc(firestore, "system_settings", "lottery_locks"), {
        lockedLotteryIds: serverLockedLotteryIds,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, "saveLotteryLocks");
    }
  }
}
app.get("/api/lottery/locks", (_req, res) => {
  res.json({ ok: true, lockedLotteryIds: serverLockedLotteryIds });
});
app.post("/api/lottery/locks", async (req, res) => {
  try {
    const { isLocked } = req.body;
    const allActiveIds = ["lot_tv_32", "lot_derash_1000", "lot_derash_5000", "lot_derash_10000", "lot_derash_50000"];
    if (isLocked) {
      serverLockedLotteryIds = allActiveIds;
    } else {
      serverLockedLotteryIds = [];
    }
    await saveLotteryLocks();
    res.json({ ok: true, lockedLotteryIds: serverLockedLotteryIds });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.post("/api/admin/notify-200-filled", async (req, res) => {
  try {
    const { lotteryId, titleAm, round, ticketsSold } = req.body;
    if (!lotteryId) {
      return res.status(400).json({ ok: false, error: "lotteryId is required" });
    }
    const count = Number(ticketsSold) || 200;
    const roundNum = Number(round) || 1;
    await checkAndNotify200Filled(lotteryId, count, roundNum, titleAm);
    res.json({ ok: true });
  } catch (err) {
    console.error("[Notify 200 Filled Error]", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.post("/api/lottery/draw-executed", async (req, res) => {
  console.log("[API] /api/lottery/draw-executed called with body:", req.body);
  try {
    const { lotteryId, round, winningNumbers } = req.body;
    const roundNum = Number(round) || 1;
    const key = `${lotteryId}_r${roundNum}`;
    notified200FilledRounds.delete(key);
    const info = CANONICAL_LOTTERIES_MAP[lotteryId] || {
      titleAm: lotteryId,
      jackpot: 1e3,
      isItemPrize: lotteryId === "lot_tv_32",
      prizeNameAm: "\u12E8 32 \u12A2\u1295\u127D \u12A4\u120D\u12A2\u12F2 \u1272\u126A"
    };
    const firstWinningRaw = winningNumbers?.firstPrize || "";
    const cleanWinningNum = String(firstWinningRaw).replace(/\D/g, "");
    const prizeAmount = info.isItemPrize ? 0 : info.jackpot || 0;
    const matchingTickets = [];
    for (const t of syncedTickets) {
      if (t.status === "refunded") continue;
      const tNum = String(t.ticketNumber || "").replace(/\D/g, "");
      const numMatch = Boolean(tNum && cleanWinningNum && tNum === cleanWinningNum);
      const isTv = lotteryId === "lot_tv_32" || info.isItemPrize;
      const ticketIsTv = t.lotteryId === "lot_tv_32" || t.lotteryTitleAm?.includes("\u1272\u126A") || t.lotteryTitleAm?.includes("TV");
      const lotMatch = t.lotteryId === lotteryId || isTv && ticketIsTv || t.pricePaid === (lotteryId === "lot_derash_1000" ? 10 : lotteryId === "lot_derash_5000" ? 50 : lotteryId === "lot_derash_10000" ? 100 : 200);
      const roundMatch = !t.round || Number(t.round) === roundNum;
      if (numMatch && (lotMatch || t.lotteryId === lotteryId) && roundMatch) {
        matchingTickets.push(t);
      }
    }
    const winnersProcessed = [];
    for (const winTicket of matchingTickets) {
      winTicket.status = "won";
      winTicket.prizeWon = prizeAmount;
      winTicket.prizeTitleAm = info.isItemPrize ? info.prizeNameAm : "1\u129B \u12D5\u1323 \u12A0\u1238\u1293\u134A";
      winTicket.prizeTitleEn = "1st Prize Winner";
      await syncTicketToFirestore(winTicket).catch(() => {
      });
      let winnerWallet = findWalletByPhone(winTicket.userPhone);
      if (!winnerWallet && winTicket.userId) {
        winnerWallet = userWallets[winTicket.userId];
      }
      if (!winnerWallet && winTicket.userTelegram) {
        winnerWallet = Object.values(userWallets).find((w) => w.telegramId && w.telegramId === winTicket.userTelegram);
      }
      if (!winnerWallet) {
        winnerWallet = findOrCreateWallet({
          userId: winTicket.userId,
          phone: winTicket.userPhone,
          telegramId: winTicket.userTelegram,
          fullName: winTicket.userName
        });
      }
      if (winnerWallet && prizeAmount > 0) {
        winnerWallet.walletBalance = (Number(winnerWallet.walletBalance) || 0) + prizeAmount;
        winnerWallet.totalWon = (Number(winnerWallet.totalWon) || 0) + prizeAmount;
        saveUserWallets(true, winnerWallet);
        await syncWalletToFirestore(winnerWallet).catch(() => {
        });
      }
      const payoutTx = {
        id: `tx_payout_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
        ticketId: winTicket.id,
        lotteryId,
        lotteryTitleAm: info.titleAm,
        userId: winnerWallet?.userId || winTicket.userId,
        userName: winnerWallet?.fullName || winTicket.userName || "\u12A0\u1238\u1293\u134A \u12F0\u1295\u1260\u129B",
        userPhone: winnerWallet?.phone || winTicket.userPhone || "",
        telegramId: winnerWallet?.telegramId || winTicket.userTelegram || "",
        amount: prizeAmount,
        type: "prize_payout",
        paymentMethod: "wallet",
        referenceNumber: "WIN-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "completed",
        gatewayFee: 0
      };
      syncedTransactions.unshift(payoutTx);
      saveTransactions(payoutTx);
      await syncTransactionToFirestore(payoutTx).catch(() => {
      });
      const winMsgAm = info.isItemPrize ? `\u{1F389} \u12A5\u1295\u12B3\u1295 \u12F0\u1235 \u12A0\u1208\u12CE\u1275! \u1260${info.titleAm} (\u12D9\u122D ${roundNum}) ${info.prizeNameAm} \u12A0\u1238\u1295\u1348\u12CB\u120D! \u1275\u12AC\u1275 \u1241\u1325\u122D: #${cleanWinningNum}` : `\u{1F389} \u12A5\u1295\u12B3\u1295 \u12F0\u1235 \u12A0\u1208\u12CE\u1275! \u1260${info.titleAm} (\u12D9\u122D ${roundNum}) ${prizeAmount.toLocaleString()} \u1265\u122D \u12A0\u1238\u1295\u1348\u12CB\u120D! \u1275\u12AC\u1275 \u1241\u1325\u122D: #${cleanWinningNum} (\u1308\u1295\u12D8\u1261 \u1260\u1240\u1325\u1273 \u12CB\u120C\u1275\u12CE \u120B\u12ED \u1308\u1262 \u1270\u12F0\u122D\u1313\u120D)`;
      const winMsgEn = info.isItemPrize ? `\u{1F389} Congratulations! You won ${info.prizeNameAm} in ${info.titleAm}! Ticket: #${cleanWinningNum}` : `\u{1F389} Congratulations! You won ${prizeAmount.toLocaleString()} ETB in ${info.titleAm}! Ticket: #${cleanWinningNum} (Credited to wallet)`;
      const winnerNotif = {
        id: `notif_win_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
        userId: winnerWallet?.userId || winTicket.userId,
        userName: winnerWallet?.fullName || winTicket.userName,
        userPhone: winnerWallet?.phone || winTicket.userPhone,
        userTelegram: winnerWallet?.telegramId || winTicket.userTelegram,
        lotteryId,
        lotteryTitleAm: info.titleAm,
        ticketNumber: cleanWinningNum,
        amountWon: prizeAmount,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        isRead: false,
        messageAm: winMsgAm,
        messageEn: winMsgEn
      };
      syncedNotifications.unshift(winnerNotif);
      await saveNotifications(winnerNotif);
      let winnerChatId = null;
      if (winnerWallet?.telegramId && !isNaN(Number(winnerWallet.telegramId))) {
        winnerChatId = Number(winnerWallet.telegramId);
      } else if (winTicket.userTelegram && !isNaN(Number(winTicket.userTelegram))) {
        winnerChatId = Number(winTicket.userTelegram);
      } else if (winTicket.userId && winTicket.userId.startsWith("tg_")) {
        const parsed = Number(winTicket.userId.replace("tg_", ""));
        if (!isNaN(parsed)) winnerChatId = parsed;
      }
      if (winnerChatId) {
        const winnerCleanPhone = winnerWallet?.phone ? normalizeEthiopianPhone(winnerWallet.phone) : "";
        const winnerWalletAppUrl = winnerCleanPhone ? `${APP_URL}?tab=wallet&phone=${winnerCleanPhone}&userId=${winnerWallet?.userId || ""}&tg_id=${winnerChatId}` : `${APP_URL}?tab=wallet&tg_id=${winnerChatId}`;
        const winnerTgMsg = `\u{1F389} <b>\u12A5\u1295\u12B3\u1295 \u12F0\u1235 \u12A0\u1208\u12CE\u1275! \u12A0\u1238\u1293\u134A \u1206\u1290\u12CB\u120D! (Congratulations! You Won!)</b> \u{1F3C6}

\u12CD\u12F5 <b>${winnerWallet?.fullName || winTicket.userName || "\u1270\u1320\u1243\u121A"}</b>\u1363
\u1260\u1270\u12C8\u12F3\u1305 \u12A6\u1295\u120B\u12ED\u1295 \u120E\u1270\u122A \u1260\u1246\u1228\u1321\u1275 \u1275\u12AC\u1275 \u12A0\u1238\u1293\u134A \u1206\u1290\u12CB\u120D!

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4E6} <b>\u12E8\u12D5\u1323 \u12D3\u12ED\u1290\u1275:</b> <b>${info.titleAm}</b>
\u{1F3C6} <b>\u12D9\u122D:</b> <b>${roundNum}</b>
\u{1F39F} <b>\u12E8\u12A0\u1238\u1293\u134A \u1275\u12AC\u1275 \u1241\u1325\u122D:</b> <code>#${cleanWinningNum}</code>
` + (info.isItemPrize ? `\u{1F381} <b>\u12EB\u1238\u1290\u1349\u1275 \u123D\u120D\u121B\u1275:</b> <b>${info.prizeNameAm}</b>
` : `\u{1F4B0} <b>\u12EB\u1238\u1290\u1349\u1275 \u123D\u120D\u121B\u1275:</b> <b>${prizeAmount.toLocaleString()} \u1265\u122D</b>
\u{1F4B3} <b>\u12E8\u12CB\u120C\u1275 \u1201\u1294\u1273:</b> <b>\u1308\u1295\u12D8\u1261 \u1260\u1240\u1325\u1273 \u12C8\u12F0 \u12CB\u120C\u1275\u12CE \u1308\u1262 \u1270\u12F0\u122D\u1313\u120D!</b>
`) + `\u23F0 <b>\u1240\u1295:</b> ${(/* @__PURE__ */ new Date()).toLocaleDateString("am-ET")} ${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { hour12: true, timeZone: "Africa/Addis_Ababa" })}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

\u2728 \u12A0\u1201\u1291\u1291 \u12CB\u120C\u1275\u12CE\u1295 \u1260\u1218\u12AD\u1348\u1275 \u123D\u120D\u121B\u1275\u12CE\u1295 \u121B\u12E8\u1275 \u12C8\u12ED\u121D \u12C8\u12F0 \u1274\u120C\u1265\u122D \u121B\u12CD\u1323\u1275 \u12ED\u127D\u120B\u1209!`;
        try {
          await sendTelegramResponse(winnerChatId, winnerTgMsg, {
            inline_keyboard: [
              [
                { text: "\u{1F4B3} \u12CB\u120C\u1275\u12CE\u1295 \u12ED\u12AD\u1348\u1271 (Open Wallet)", web_app: { url: winnerWalletAppUrl } }
              ],
              [
                { text: "\u{1F39F} \u12A0\u12F2\u1235 \u1275\u12AC\u1275 \u12ED\u1241\u1228\u1321", web_app: { url: APP_URL } }
              ]
            ]
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
        telegramChatId: winnerChatId
      });
    }
    syncedTickets.forEach((t) => {
      if (t.status === "active" && t.lotteryId === lotteryId && (!t.round || Number(t.round) === roundNum)) {
        if (String(t.ticketNumber).replace(/\D/g, "") !== cleanWinningNum) {
          t.status = "lost";
          syncTicketToFirestore(t).catch(() => {
          });
        }
      }
    });
    saveTickets();
    const generalNotif = {
      id: `notif_draw_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      userId: "all",
      lotteryId,
      lotteryTitleAm: info.titleAm,
      ticketNumber: cleanWinningNum,
      amountWon: 0,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      isRead: false,
      messageAm: `\u12E8${info.titleAm} (\u12D9\u122D ${roundNum}) \u12D5\u1323 \u12C8\u1325\u1277\u120D! \u12A0\u1238\u1293\u134A \u1241\u1325\u122D: #${cleanWinningNum} ${matchingTickets.length > 0 ? `(\u12A0\u1238\u1293\u134A: ${matchingTickets[0].userName})` : ""}`,
      messageEn: `Draw completed for ${info.titleAm} (Round ${roundNum})! Winning Number: #${cleanWinningNum}`
    };
    syncedNotifications.unshift(generalNotif);
    await saveNotifications(generalNotif);
    const winnerDisplay = matchingTickets.length > 0 ? `
\u{1F464} <b>\u12A0\u1238\u1293\u134A:</b> <b>${matchingTickets[0].userName || "\u1270\u1320\u1243\u121A"} (${maskPhone(matchingTickets[0].userPhone)})</b>
\u{1F4B3} <b>\u12CB\u120C\u1275:</b> <b>\u12E8\u123D\u120D\u121B\u1275 \u1308\u1295\u12D8\u1261 \u1260\u122B\u1235-\u1230\u122D \u1270\u12A8\u134D\u120F\u120D!</b>
\u{1F4F2} <b>\u1266\u1275 \u1218\u120D\u12D5\u12AD\u1275:</b> <b>\u1208\u12A0\u1238\u1293\u134A\u12CD \u1260\u122B\u1235-\u1230\u122D \u1270\u120D\u12B3\u120D!</b>` : `
\u2139\uFE0F <i>\u12ED\u1205\u1295\u1295 \u1275\u12AC\u1275 \u12E8\u1246\u1228\u1320 \u1270\u1320\u1243\u121A \u12A0\u120D\u1270\u1308\u1298\u121D::</i>`;
    const announceMsg = `\u{1F389} <b>\u12E8\u12D5\u1323 \u12CD\u1324\u1275 \u12ED\u134B \u1206\u1290! (Draw Results Published)</b>

\u{1F4E6} <b>\u12E8\u12D5\u1323 \u12D3\u12ED\u1290\u1275:</b> <b>${info.titleAm}</b>
\u{1F3C6} <b>\u12D9\u122D:</b> <b>${roundNum}</b>
\u{1F947} <b>1\u129B \u12A0\u1238\u1293\u134A \u1241\u1325\u122D:</b> <code>#${cleanWinningNum || "N/A"}</code>
` + (info.isItemPrize ? `\u{1F381} <b>\u123D\u120D\u121B\u1275:</b> <b>${info.prizeNameAm}</b>` : `\u{1F4B0} <b>\u123D\u120D\u121B\u1275:</b> <b>${info.jackpot.toLocaleString()} \u1265\u122D</b>`) + winnerDisplay + `
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u2728 \u12A0\u12F2\u1231 \u12D9\u122D ${roundNum + 1} \u1270\u1300\u121D\u122F\u120D!`;
    await notifyAllAdmins(announceMsg, {
      inline_keyboard: [
        [
          { text: "\u{1F310} \u12C8\u12F0 \u1218\u1270\u130D\u1260\u122A\u12EB (Open App)", url: APP_URL }
        ]
      ]
    });
    res.json({
      ok: true,
      winnersCount: matchingTickets.length,
      winners: winnersProcessed
    });
  } catch (err) {
    console.error("[Draw Executed Broadcast Error]", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.get("/api/notifications", (req, res) => {
  const userId = req.query.userId;
  const phone = req.query.phone;
  const tgId = req.query.tgId;
  const clean = phone ? phone.replace(/\D/g, "") : "";
  const searchTg = tgId ? String(tgId) : "";
  const searchUid = userId ? String(userId) : "";
  const userNotifs = syncedNotifications.filter((n) => {
    if (n.userId === "all") return true;
    if (searchUid && n.userId === searchUid) return true;
    if (clean && n.userPhone) {
      const p = n.userPhone.replace(/\D/g, "");
      if (p.endsWith(clean.slice(-9)) || clean.endsWith(p.slice(-9))) return true;
    }
    if (searchTg && (n.userId === searchTg || n.userId === `tg_${searchTg}` || n.userTelegram === searchTg)) return true;
    return false;
  });
  res.json({ ok: true, notifications: userNotifs });
});
app.post("/api/notifications/:id/read", (req, res) => {
  const notifId = req.params.id;
  const target = syncedNotifications.find((n) => n.id === notifId);
  if (target) {
    target.isRead = true;
    saveNotifications(target);
  }
  res.json({ ok: true });
});
app.get("/api/transactions/sync", (req, res) => {
  const userId = req.query.userId;
  const phone = req.query.phone;
  const tgId = req.query.tgId;
  const isAdmin = req.query.isAdmin === "true";
  let wallet = void 0;
  if (userId || phone || tgId) {
    wallet = findOrCreateWallet({ userId, phone, telegramId: tgId });
  }
  const clean = phone ? phone.replace(/\D/g, "") : "";
  const searchTg = tgId ? String(tgId) : "";
  const searchUid = userId ? String(userId) : "";
  const isUserMatch = (tPhone, tUid) => {
    if (clean && tPhone) {
      const p = tPhone.replace(/\D/g, "");
      if (p.endsWith(clean.slice(-9)) || clean.endsWith(p.slice(-9))) return true;
    }
    if (tUid) {
      if (searchUid && tUid === searchUid) return true;
      if (searchTg && (tUid === searchTg || tUid === `tg_${searchTg}`)) return true;
    }
    return false;
  };
  const userTickets = clean || searchTg || searchUid ? syncedTickets.filter((t) => isUserMatch(t.userPhone, t.userId)) : [];
  const userTransactions = clean || searchTg || searchUid ? syncedTransactions.filter((t) => isUserMatch(t.userPhone, t.userId)) : [];
  const userNotifications = syncedNotifications.filter((n) => {
    if (n.userId === "all") return true;
    if (searchUid && n.userId === searchUid) return true;
    if (clean && n.userPhone) {
      const p = n.userPhone.replace(/\D/g, "");
      if (p.endsWith(clean.slice(-9)) || clean.endsWith(p.slice(-9))) return true;
    }
    if (searchTg && (n.userId === searchTg || n.userId === `tg_${searchTg}` || n.userTelegram === searchTg)) return true;
    return false;
  });
  const adminPhoneSuffix = OFFICIAL_ADMIN.phone.replace(/\D/g, "").slice(-9);
  const isVerifiedAdmin = Boolean(
    clean && clean.endsWith(adminPhoneSuffix) || wallet?.username && wallet.username.toLowerCase().replace("@", "") === "lij_makbel" || wallet?.telegramId === "5588110290" || searchTg === "5588110290"
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
      isAdmin: isVerifiedAdmin
    } : null
  });
});
app.get("/api/admin/transactions", async (_req, res) => {
  try {
    const txSnap = await getDocs(collection(firestore, "transactions"));
    const firestoreTxs = [];
    txSnap.forEach((docSnap) => {
      const tx = docSnap.data();
      if (tx && tx.id) {
        firestoreTxs.push(tx);
      }
    });
    if (firestoreTxs.length > 0) {
      const existingIds = new Set(syncedTransactions.map((t) => t.id));
      for (const ft of firestoreTxs) {
        if (!existingIds.has(ft.id)) {
          syncedTransactions.unshift(ft);
        }
      }
    }
  } catch (err) {
    console.error("[Admin Transactions Sync Firestore Error]", err);
  }
  res.json({
    ok: true,
    transactions: syncedTransactions
  });
});
app.get("/api/admin/users", async (_req, res) => {
  try {
    const walletsSnap = await getDocs(collection(firestore, "wallets"));
    walletsSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && (data.userId || data.phone || data.telegramId)) {
        if (!data.fullName && data.name) {
          data.fullName = data.name;
        }
        delete data.name;
        const cleanPhone = data.phone ? normalizeEthiopianPhone(data.phone) : "";
        const key = cleanPhone && cleanPhone.length >= 9 ? cleanPhone.length === 10 ? cleanPhone : `0${cleanPhone.slice(-9)}` : data.telegramId ? `tg_${data.telegramId}` : data.userId || docSnap.id;
        userWallets[key] = {
          ...userWallets[key],
          ...data,
          userId: key
        };
      }
    });
    deduplicateWallets(true);
  } catch (err) {
    console.error("[Admin Users Sync Firestore Error]", err);
  }
  const seenPhones = /* @__PURE__ */ new Set();
  const seenTgIds = /* @__PURE__ */ new Set();
  const seenIds = /* @__PURE__ */ new Set();
  const usersList = [];
  for (const w of Object.values(userWallets)) {
    const clean = normalizeEthiopianPhone(w.phone);
    const phoneSuffix = clean && clean.length >= 9 ? clean.slice(-9) : "";
    const tgId = w.telegramId ? String(w.telegramId) : "";
    const uid = String(w.userId || "");
    if (phoneSuffix && seenPhones.has(phoneSuffix)) continue;
    if (tgId && seenTgIds.has(tgId)) continue;
    if (uid && seenIds.has(uid)) continue;
    if (phoneSuffix) seenPhones.add(phoneSuffix);
    if (tgId) seenTgIds.add(tgId);
    if (uid) seenIds.add(uid);
    const userTickets = clean ? syncedTickets.filter((t) => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9))) : [];
    const userTxs = clean ? syncedTransactions.filter((t) => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9))) : [];
    const displayName = w.fullName && w.fullName.trim() && w.fullName !== "\u1270\u1320\u1243\u121A" && !w.fullName.startsWith("\u1270\u1320\u1243\u121A (") ? w.fullName.trim() : clean ? `\u12F0\u1295\u1260\u129B (${clean})` : w.username ? w.username : `\u1270\u1320\u1243\u121A (TG: ${w.telegramId || w.userId})`;
    usersList.push({
      userId: w.userId,
      telegramId: w.telegramId || "",
      customerId: w.customerId || "TEWEDAJ-" + (w.telegramId || w.phone || w.userId).slice(-6),
      phone: clean || (w.telegramId ? `TG: ${w.telegramId}` : "\u1235\u120D\u12AD \u12A0\u120D\u1270\u130B\u122B\u121D"),
      fullName: displayName,
      username: w.username || "",
      profileImage: w.profileImage || "",
      registeredAt: w.registeredAt || (/* @__PURE__ */ new Date()).toISOString(),
      password: w.password || "",
      walletBalance: Number(w.walletBalance) || 0,
      ticketsCount: userTickets.length || w.ticketsCount || 0,
      totalWon: Number(w.totalWon) || 0,
      isOnline: Boolean(w.isOnline),
      lastActive: w.lastActive || ""
    });
  }
  usersList.sort((a, b) => {
    const aIsOwner = a.phone && a.phone.includes("0910961881") || a.username && a.username.toLowerCase().includes("lij_makbel");
    const bIsOwner = b.phone && b.phone.includes("0910961881") || b.username && b.username.toLowerCase().includes("lij_makbel");
    if (aIsOwner && !bIsOwner) return -1;
    if (!aIsOwner && bIsOwner) return 1;
    const timeA = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
    const timeB = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
    return timeB - timeA;
  });
  res.json({
    ok: true,
    users: usersList,
    total: usersList.length
  });
});
app.post("/api/admin/transactions/delete", async (req, res) => {
  const { transactionId } = req.body;
  if (!transactionId) return res.status(400).json({ ok: false, error: "Transaction ID required" });
  const targetTx = syncedTransactions.find((t) => String(t.id) === String(transactionId));
  syncedTransactions = syncedTransactions.filter((t) => String(t.id) !== String(transactionId));
  safeWriteJsonSync(TX_FILE, syncedTransactions);
  try {
    await deleteDoc(doc(firestore, "transactions", String(transactionId)));
  } catch (err) {
    console.warn(`[Firestore Delete tx ${transactionId} Error]`, err);
  }
  let affectedWallet;
  if (targetTx) {
    const cleanPhone = targetTx.userPhone ? normalizeEthiopianPhone(targetTx.userPhone) : "";
    affectedWallet = cleanPhone ? findWalletByPhone(cleanPhone) : targetTx.userId ? userWallets[targetTx.userId] : void 0;
    if (affectedWallet) {
      const amount = Number(targetTx.amount) || 0;
      if (targetTx.type === "deposit") {
        if (targetTx.status === "completed") {
          affectedWallet.walletBalance = Math.max(0, (affectedWallet.walletBalance || 0) - amount);
        }
      } else if (targetTx.type === "withdrawal") {
        if (targetTx.status === "completed") {
          affectedWallet.walletBalance = (affectedWallet.walletBalance || 0) + amount;
        } else if (targetTx.status === "pending") {
          affectedWallet.walletBalance = (affectedWallet.walletBalance || 0) + amount;
        }
      }
      saveUserWallets(true, affectedWallet);
      await syncWalletToFirestore(affectedWallet).catch(() => {
      });
    }
  }
  await syncDashboardToFirestore(void 0, true);
  console.log(`[Admin Delete Transaction] ID: ${transactionId}, Type: ${targetTx?.type}, Amount: ${targetTx?.amount}. Synced and deducted from Firebase.`);
  res.json({
    ok: true,
    message: "Transaction deleted successfully and deducted from Firebase",
    wallet: affectedWallet,
    remainingTransactions: syncedTransactions.length
  });
});
app.post("/api/admin/users/delete", async (req, res) => {
  const { userId, phone } = req.body;
  if (!userId && !phone) return res.status(400).json({ ok: false, error: "User identifier required" });
  const keysToDelete = /* @__PURE__ */ new Set();
  const phoneToDelete = phone ? normalizeEthiopianPhone(phone) : "";
  if (userId) keysToDelete.add(String(userId));
  if (phoneToDelete) keysToDelete.add(phoneToDelete);
  for (const [k, w] of Object.entries(userWallets)) {
    const wPhone = w.phone ? normalizeEthiopianPhone(w.phone) : "";
    const matchesPhone = phoneToDelete && wPhone && (wPhone === phoneToDelete || wPhone.endsWith(phoneToDelete.slice(-9)));
    const matchesId = userId && (k === userId || w.userId === userId || w.telegramId && (w.telegramId === userId || `tg_${w.telegramId}` === userId));
    if (matchesPhone || matchesId) {
      if (w.phone && w.phone.includes("0910961881")) {
        return res.status(403).json({ ok: false, error: "Cannot delete owner account" });
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
  try {
    const walletsSnap = await getDocs(collection(firestore, "wallets"));
    walletsSnap.forEach((d) => {
      const data = d.data();
      const dPhone = data.phone ? normalizeEthiopianPhone(data.phone) : "";
      const dId = data.userId || "";
      const phoneMatch = phoneToDelete && dPhone && (dPhone === phoneToDelete || dPhone.endsWith(phoneToDelete.slice(-9)));
      const idMatch = userId && (dId === userId || d.id === userId);
      if (phoneMatch || idMatch) {
        keysToDelete.add(d.id);
      }
    });
  } catch (err) {
  }
  const deletedKeys = [];
  keysToDelete.forEach((key) => {
    if (userWallets[key]) {
      delete userWallets[key];
      deletedKeys.push(key);
    }
  });
  if (deletedKeys.length > 0) {
    safeWriteJsonSync(WALLETS_FILE, userWallets);
  }
  const firestoreDeleted = [];
  for (const key of Array.from(keysToDelete)) {
    try {
      await deleteDoc(doc(firestore, "wallets", key));
      firestoreDeleted.push(key);
    } catch (err) {
      console.warn(`[Admin User Delete] Error deleting Firestore key ${key}:`, err);
    }
  }
  await syncDashboardToFirestore(void 0, true);
  console.log(`[Admin User Delete] Permanently deleted user. Memory keys: ${deletedKeys.join(", ")}. Firestore keys: ${firestoreDeleted.join(", ")}.`);
  res.json({
    ok: true,
    message: "User permanently deleted from memory and Firebase",
    deletedKeys,
    firestoreDeleted
  });
});
app.post("/api/admin/tickets/delete", async (req, res) => {
  const { ticketId, userPhone } = req.body;
  if (!ticketId) return res.status(400).json({ ok: false, error: "Ticket ID required" });
  const targetTicket = syncedTickets.find((t) => String(t.id) === String(ticketId));
  syncedTickets = syncedTickets.filter((t) => String(t.id) !== String(ticketId));
  syncedTransactions = syncedTransactions.filter((t) => String(t.id) !== String(ticketId) && String(t.ticketId) !== String(ticketId));
  safeWriteJsonSync(TICKETS_FILE, syncedTickets);
  safeWriteJsonSync(TX_FILE, syncedTransactions);
  try {
    await deleteDoc(doc(firestore, "tickets", String(ticketId)));
    await deleteDoc(doc(firestore, "transactions", String(ticketId)));
  } catch (err) {
    console.error(`[Firestore Delete Error] ticketId: ${ticketId}`, err);
    return res.status(500).json({ ok: false, error: "Failed to delete ticket from Firebase" });
  }
  const phoneToUse = targetTicket?.userPhone || userPhone;
  if (phoneToUse) {
    const clean = normalizeEthiopianPhone(phoneToUse);
    const wallet = findWalletByPhone(clean) || (targetTicket?.userId ? userWallets[targetTicket.userId] : void 0);
    if (wallet) {
      wallet.ticketsCount = Math.max(0, syncedTickets.filter((t) => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9))).length);
      saveUserWallets(true, wallet);
      await syncWalletToFirestore(wallet).catch((e) => console.error("[Sync Wallet Error]", e));
    }
  }
  const lotId = targetTicket?.lotteryId || (targetTicket?.pricePaid === 10 ? "lot_derash_1000" : targetTicket?.pricePaid === 50 ? "lot_derash_5000" : targetTicket?.pricePaid === 100 ? "lot_derash_10000" : "lot_derash_50000");
  const remainingForLot = syncedTickets.filter((t) => t.status === "active" && (t.lotteryId === lotId || targetTicket && t.pricePaid === targetTicket.pricePaid));
  const capacity = lotId === "lot_derash_50000" ? 300 : 150;
  const sold = remainingForLot.length;
  const keri = Math.max(0, capacity - sold);
  const buyersCount = new Set(remainingForLot.map((t) => t.userPhone ? normalizeEthiopianPhone(t.userPhone) : t.userId)).size;
  try {
    await setDoc(doc(firestore, "keri_etsa", lotId), {
      lotteryId: lotId,
      ticketsSold: sold,
      keriEtsa: keri,
      buyersCount,
      totalInventory: capacity,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      kuankua: "\u12A0\u121B\u122D\u129B"
    }, { merge: true });
  } catch (err) {
    console.error("[Firestore Update Keri Etsa Error]", err);
  }
  await syncDashboardToFirestore(void 0, true);
  const lotteryCounts = computeActiveLotteryCounts();
  console.log(`[Admin Delete Ticket] ID: ${ticketId}, Lottery: ${lotId}. Updated keri_etsa (Sold: ${sold}, Keri: ${keri}) in Firebase.`);
  res.json({
    ok: true,
    lotteryCounts,
    deletedTicketId: ticketId,
    message: "Ticket deleted successfully and volume deducted from Firebase"
  });
});
app.post("/api/tickets/user-delete", async (req, res) => {
  const { ticketId, userPhone } = req.body;
  if (!ticketId) return res.status(400).json({ ok: false, error: "Ticket ID is required" });
  const targetTicket = syncedTickets.find((t) => String(t.id) === String(ticketId));
  syncedTickets = syncedTickets.filter((t) => String(t.id) !== String(ticketId));
  syncedTransactions = syncedTransactions.filter((t) => String(t.id) !== String(ticketId) && String(t.ticketId) !== String(ticketId));
  safeWriteJsonSync(TICKETS_FILE, syncedTickets);
  safeWriteJsonSync(TX_FILE, syncedTransactions);
  try {
    await deleteDoc(doc(firestore, "tickets", String(ticketId)));
    await deleteDoc(doc(firestore, "transactions", String(ticketId)));
  } catch (err) {
    console.error(`[Firestore Delete Error] ticketId: ${ticketId}`, err);
  }
  const phoneToUse = targetTicket?.userPhone || userPhone;
  if (phoneToUse) {
    const clean = normalizeEthiopianPhone(phoneToUse);
    const wallet = findWalletByPhone(clean) || (targetTicket?.userId ? userWallets[targetTicket.userId] : void 0);
    if (wallet) {
      wallet.ticketsCount = Math.max(0, syncedTickets.filter((t) => t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9))).length);
      saveUserWallets(true, wallet);
      await syncWalletToFirestore(wallet).catch((e) => console.error("[Sync Wallet Error]", e));
    }
  }
  const lotId = targetTicket?.lotteryId || (targetTicket?.pricePaid === 10 ? "lot_derash_1000" : targetTicket?.pricePaid === 50 ? "lot_derash_5000" : targetTicket?.pricePaid === 100 ? "lot_derash_10000" : "lot_derash_50000");
  const remainingForLot = syncedTickets.filter((t) => t.status === "active" && (t.lotteryId === lotId || targetTicket && t.pricePaid === targetTicket.pricePaid));
  const capacity = lotId === "lot_derash_50000" ? 300 : 150;
  const sold = remainingForLot.length;
  const keri = Math.max(0, capacity - sold);
  try {
    await setDoc(doc(firestore, "keri_etsa", lotId), {
      lotteryId: lotId,
      ticketsSold: sold,
      keriEtsa: keri,
      totalInventory: capacity,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      kuankua: "\u12A0\u121B\u122D\u129B"
    }, { merge: true });
  } catch (err) {
    console.error("[Firestore Update Keri Etsa Error]", err);
  }
  await syncDashboardToFirestore(void 0, true);
  const lotteryCounts = computeActiveLotteryCounts();
  res.json({
    ok: true,
    lotteryCounts,
    deletedTicketId: ticketId,
    message: "Ticket deleted successfully and volume deducted from Firebase"
  });
});
app.post("/api/admin/deduplicate", async (_req, res) => {
  const result = deduplicateWallets(true);
  await syncDashboardToFirestore(void 0, true);
  res.json({
    ok: true,
    ...result
  });
});
app.get("/api/user/profile", (req, res) => {
  const telegramId = req.query.telegramId || req.query.tg_id;
  const phone = req.query.phone;
  const userId = req.query.userId;
  if (!telegramId && !phone && !userId) {
    return res.status(400).json({ ok: false, error: "Identifier required" });
  }
  const cleanPhone = normalizeEthiopianPhone(phone);
  let wallet;
  if (cleanPhone && cleanPhone.length >= 9) {
    wallet = findWalletByPhone(cleanPhone);
  }
  if (!wallet && (telegramId || userId)) {
    const searchId = telegramId ? String(telegramId) : String(userId);
    for (const [k, w] of Object.entries(userWallets)) {
      if (k === searchId || k === `tg_${searchId}` || w.userId === searchId || w.telegramId && w.telegramId === searchId) {
        wallet = w;
        break;
      }
    }
  }
  if (!wallet) {
    return res.status(404).json({ ok: false, error: "User not found" });
  }
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
  wallet.lastActive = (/* @__PURE__ */ new Date()).toISOString();
  const userClean = normalizeEthiopianPhone(wallet.phone);
  const tgIdStr = wallet.telegramId ? String(wallet.telegramId) : "";
  const walletUid = wallet.userId ? String(wallet.userId) : "";
  const isUserMatch = (phoneStr, uidStr) => {
    if (userClean && phoneStr) {
      const pClean = normalizeEthiopianPhone(phoneStr);
      if (pClean && pClean.length >= 9 && (pClean === userClean || pClean.slice(-9) === userClean.slice(-9))) {
        return true;
      }
    }
    if (uidStr) {
      if (uidStr === walletUid || tgIdStr && (uidStr === tgIdStr || uidStr === `tg_${tgIdStr}`)) {
        return true;
      }
    }
    return false;
  };
  const userTickets = syncedTickets.filter((t) => isUserMatch(t.userPhone, t.userId));
  const userTxs = syncedTransactions.filter((t) => isUserMatch(t.userPhone, t.userId));
  const userGebi = userTxs.filter((t) => (t.type === "deposit" || t.type === "xo_win") && t.status === "completed").reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const userWechi = userTxs.filter((t) => (t.type === "withdrawal" || t.type === "xo_loss") && (t.status === "completed" || t.status === "pending")).reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const userSpend = userTickets.reduce((s, t) => s + (Number(t.pricePaid) || 0), 0);
  const calculatedBal = Math.max(0, userGebi + (Number(wallet.totalWon) || 0) - userWechi - userSpend);
  wallet.walletBalance = calculatedBal;
  saveUserWallets(true, wallet);
  res.json({
    ok: true,
    user: {
      userId: wallet.userId,
      telegramId: wallet.telegramId || "",
      customerId: wallet.customerId || "TEWEDAJ-" + (wallet.telegramId || wallet.userId || wallet.phone).slice(-6),
      phone: userClean || wallet.phone || "",
      fullName: wallet.fullName || "\u1270\u1320\u1243\u121A",
      username: wallet.username || "",
      profileImage: wallet.profileImage || "",
      walletBalance: wallet.walletBalance,
      ticketsCount: userTickets.length || wallet.ticketsCount || 0,
      totalWon: wallet.totalWon || 0,
      isAdmin: Boolean(
        userClean && userClean.endsWith("0910961881") || wallet.username && wallet.username.toLowerCase().replace("@", "") === "lij_makbel" || wallet.telegramId === "5588110290"
      )
    },
    tickets: userTickets
  });
});
app.post("/api/admin/users/full-reset", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ ok: false, error: "Phone required" });
  const clean = normalizeEthiopianPhone(phone);
  if (clean.includes("0910961881")) return res.status(403).json({ ok: false, error: "Cannot reset owner" });
  syncedTickets = syncedTickets.filter((t) => !t.userPhone || !normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)));
  safeWriteJsonSync(TICKETS_FILE, syncedTickets);
  syncedTransactions = syncedTransactions.filter((t) => !t.userPhone || !normalizeEthiopianPhone(t.userPhone).endsWith(clean.slice(-9)));
  safeWriteJsonSync(TX_FILE, syncedTransactions);
  const wallet = findWalletByPhone(clean);
  if (wallet) {
    wallet.walletBalance = 0;
    wallet.totalWon = 0;
    wallet.ticketsCount = 0;
    wallet.notifications = [];
    saveUserWallets(true, wallet);
    await syncWalletToFirestore(wallet).catch(() => {
    });
  }
  try {
    const ticketsSnap = await getDocs(collection(firestore, "tickets"));
    for (const d of ticketsSnap.docs) {
      const data = d.data();
      if (data.userPhone && normalizeEthiopianPhone(data.userPhone).endsWith(clean.slice(-9))) {
        await deleteDoc(doc(firestore, "tickets", d.id));
      }
    }
    const txSnap = await getDocs(collection(firestore, "transactions"));
    for (const d of txSnap.docs) {
      const data = d.data();
      if (data.userPhone && normalizeEthiopianPhone(data.userPhone).endsWith(clean.slice(-9))) {
        await deleteDoc(doc(firestore, "transactions", d.id));
      }
    }
  } catch (err) {
  }
  await syncDashboardToFirestore(void 0, true);
  res.json({ ok: true, message: `User ${phone} reset to 0` });
});
app.post("/api/user/status", async (req, res) => {
  const { userId, phone, status } = req.body;
  if (!userId && !phone) return res.status(400).json({ ok: false, error: "User identifier required" });
  const cleanPhone = normalizeEthiopianPhone(phone);
  let wallet = cleanPhone ? findWalletByPhone(cleanPhone) : userId ? userWallets[userId] : void 0;
  if (!wallet && userId) {
    for (const w of Object.values(userWallets)) {
      if (w.userId === userId || w.telegramId === userId || `tg_${w.telegramId}` === userId) {
        wallet = w;
        break;
      }
    }
  }
  if (wallet) {
    wallet.isOnline = status === "online";
    wallet.lastActive = (/* @__PURE__ */ new Date()).toISOString();
    saveUserWallets(false, wallet);
  }
  res.json({ ok: true });
});
app.post("/api/user/wallet/update", (req, res) => {
  const { userId, phone, telegramId, walletBalance, ticketsCount, totalWon, fullName, username, profileImage, action } = req.body;
  if (!userId && !phone && !telegramId) {
    return res.status(400).json({ ok: false, error: "User identifier required" });
  }
  const wallet = findOrCreateWallet({ userId, phone, telegramId, fullName, username, profileImage });
  if (typeof walletBalance === "number") {
    if (action === "ticket_purchase" || action === "deduct") {
      wallet.walletBalance = Math.max(0, walletBalance);
    }
  }
  if (typeof ticketsCount === "number") wallet.ticketsCount = ticketsCount;
  if (typeof totalWon === "number") wallet.totalWon = totalWon;
  if (fullName && fullName.trim() && fullName !== "\u1270\u1320\u1243\u121A") wallet.fullName = fullName.trim();
  if (phone) wallet.phone = normalizeEthiopianPhone(phone);
  if (username) wallet.username = username;
  if (profileImage) wallet.profileImage = profileImage;
  if (telegramId) wallet.telegramId = String(telegramId);
  saveUserWallets(false, wallet);
  syncWalletToFirestore(wallet).catch(() => {
  });
  syncDashboardToFirestore().catch(() => {
  });
  res.json({ ok: true, wallet });
});
app.post("/api/xo/settle", async (req, res) => {
  const { userId, phone, telegramId, outcome, betAmount, txId } = req.body;
  if (!userId && !phone && !telegramId) {
    return res.status(400).json({ ok: false, error: "User identifier required" });
  }
  const bet = Math.max(0, Number(betAmount) || 0);
  const cut = Math.round(bet * 0.2);
  const netWin = Math.max(0, bet - cut);
  const wallet = findOrCreateWallet({ userId, phone, telegramId });
  if (!wallet) {
    return res.status(404).json({ ok: false, error: "Wallet not found" });
  }
  const cleanPhone = normalizeEthiopianPhone(wallet.phone || phone);
  const finalTxId = txId || `tx_xo_${outcome}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  if (outcome === "win") {
    wallet.walletBalance = (Number(wallet.walletBalance) || 0) + netWin;
    wallet.totalWon = (Number(wallet.totalWon) || 0) + netWin;
    const tx = {
      id: finalTxId,
      lotteryId: "xo_game",
      lotteryTitleAm: "XO \u1328\u12CB\u1273",
      userId: wallet.userId,
      userName: wallet.fullName || "\u1270\u1320\u1243\u121A",
      userPhone: cleanPhone,
      telegramId: wallet.telegramId || "",
      amount: netWin,
      type: "xo_win",
      paymentMethod: "wallet",
      referenceNumber: "XO-WIN-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      timestamp: now,
      status: "completed",
      gatewayFee: cut
    };
    syncedTransactions.unshift(tx);
    saveTransactions(tx);
    saveUserWallets(true, wallet);
    await syncWalletToFirestore(wallet).catch(() => {
    });
    await syncTransactionToFirestore(tx).catch(() => {
    });
    console.log(`[XO Settle - WIN] User: ${wallet.userId}, Bet: ${bet}, NetWin: ${netWin}, Cut: ${cut}, NewBal: ${wallet.walletBalance}`);
    return res.json({
      ok: true,
      outcome: "win",
      walletBalance: wallet.walletBalance,
      netWin,
      cut,
      txId: finalTxId
    });
  } else if (outcome === "lose") {
    wallet.walletBalance = Math.max(0, (Number(wallet.walletBalance) || 0) - bet);
    const tx = {
      id: finalTxId,
      lotteryId: "xo_game",
      lotteryTitleAm: "XO \u1328\u12CB\u1273",
      userId: wallet.userId,
      userName: wallet.fullName || "\u1270\u1320\u1243\u121A",
      userPhone: cleanPhone,
      telegramId: wallet.telegramId || "",
      amount: bet,
      type: "xo_loss",
      paymentMethod: "wallet",
      referenceNumber: "XO-LOSS-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      timestamp: now,
      status: "completed",
      gatewayFee: 0
    };
    syncedTransactions.unshift(tx);
    saveTransactions(tx);
    saveUserWallets(true, wallet);
    await syncWalletToFirestore(wallet).catch(() => {
    });
    await syncTransactionToFirestore(tx).catch(() => {
    });
    console.log(`[XO Settle - LOSE] User: ${wallet.userId}, Bet: ${bet}, Deducted: ${bet}, NewBal: ${wallet.walletBalance}`);
    return res.json({
      ok: true,
      outcome: "lose",
      walletBalance: wallet.walletBalance,
      deducted: bet,
      txId: finalTxId
    });
  } else {
    return res.json({
      ok: true,
      outcome: "draw",
      walletBalance: wallet.walletBalance
    });
  }
});
app.post("/api/transactions/delete-batch", async (req, res) => {
  const { transactionIds } = req.body;
  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    return res.status(400).json({ ok: false, error: "Transaction IDs are required" });
  }
  const idsSet = new Set(transactionIds.map(String));
  const toDelete = syncedTransactions.filter((t) => idsSet.has(String(t.id)));
  for (const tx of toDelete) {
    const cleanPhone = tx.userPhone ? normalizeEthiopianPhone(tx.userPhone) : "";
    const wallet = cleanPhone ? findWalletByPhone(cleanPhone) : tx.userId ? userWallets[tx.userId] : void 0;
    if (wallet) {
      const amount = Number(tx.amount) || 0;
      if (tx.type === "deposit" && tx.status === "completed") {
        wallet.walletBalance = Math.max(0, (wallet.walletBalance || 0) - amount);
      } else if (tx.type === "withdrawal" && tx.status === "completed") {
        wallet.walletBalance = (wallet.walletBalance || 0) + amount;
      } else if (tx.type === "withdrawal" && tx.status === "pending") {
        wallet.walletBalance = (wallet.walletBalance || 0) + amount;
      }
      saveUserWallets(true, wallet);
      await syncWalletToFirestore(wallet).catch(() => {
      });
    }
  }
  syncedTransactions = syncedTransactions.filter((t) => !idsSet.has(String(t.id)));
  safeWriteJsonSync(TX_FILE, syncedTransactions);
  for (const id of transactionIds) {
    try {
      await deleteDoc(doc(firestore, "transactions", String(id)));
    } catch (err) {
      console.warn(`[Firestore Delete Error] tx ${id}:`, err);
    }
  }
  await syncDashboardToFirestore(void 0, true);
  res.json({
    ok: true,
    deletedCount: toDelete.length,
    message: `Successfully deleted ${toDelete.length} transactions and deducted from Firebase`,
    remaining: syncedTransactions.length
  });
});
app.post("/api/admin/group/permissions", async (req, res) => {
  const { chatId, canSendMedia, adminPhone, adminUsername } = req.body;
  const cleanPhone = adminPhone ? String(adminPhone).replace(/\D/g, "") : "";
  const isOwner = cleanPhone.includes("910961881") || adminUsername && String(adminUsername).toLowerCase().includes("lij_makbel");
  if (!isOwner) return res.status(403).json({ ok: false, error: "Unauthorized" });
  try {
    const permissions = {
      can_send_messages: true,
      can_send_media_messages: canSendMedia,
      // Allow/Restrict images/videos
      can_send_polls: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false,
      can_change_info: false,
      can_invite_users: false,
      can_pin_messages: false
    };
    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setChatPermissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, permissions })
    });
    const data = await tgRes.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.post("/api/admin/reconcile-all", async (req, res) => {
  try {
    console.log("[Admin] Running global balance reconciliation...");
    let changedCount = 0;
    for (const wallet of Object.values(userWallets)) {
      const cleanPhone = wallet.phone ? normalizeEthiopianPhone(wallet.phone) : "";
      const tgId = wallet.telegramId || "";
      const userTxs = syncedTransactions.filter((t) => {
        if (cleanPhone && t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(cleanPhone.slice(-9))) return true;
        if (t.userId === wallet.userId || t.userId === tgId || t.userId === `tg_${tgId}`) return true;
        return false;
      });
      const userTickets = syncedTickets.filter((t) => {
        if (cleanPhone && t.userPhone && normalizeEthiopianPhone(t.userPhone).endsWith(cleanPhone.slice(-9))) return true;
        if (t.userId === wallet.userId || t.userId === tgId || t.userId === `tg_${tgId}`) return true;
        return false;
      });
      const totalGebi = userTxs.filter((t) => t.type === "deposit" && t.status === "completed").reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const totalWechi = userTxs.filter((t) => t.type === "withdrawal" && t.status === "completed").reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const totalWon = Number(wallet.totalWon) || 0;
      const totalSpend = userTickets.reduce((s, t) => s + (Number(t.pricePaid) || 0), 0);
      const calculatedBal = Math.max(0, totalGebi + totalWon - totalWechi - totalSpend);
      if (Math.abs(wallet.walletBalance - calculatedBal) > 0.01) {
        wallet.walletBalance = calculatedBal;
        wallet.ticketsCount = userTickets.length;
        changedCount++;
        syncWalletToFirestore(wallet).catch(() => {
        });
      }
    }
    if (changedCount > 0) {
      saveUserWallets(true);
    }
    await syncDashboardToFirestore(void 0, true);
    res.json({ ok: true, changedCount, totalUsers: Object.keys(userWallets).length });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
app.post("/api/transactions/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, approvedBy } = req.body;
  let tx = syncedTransactions.find((t) => t.id === id);
  if (!tx) {
    try {
      const snap = await getDoc(doc(firestore, "transactions", id));
      if (snap.exists()) {
        tx = snap.data();
        syncedTransactions.unshift(tx);
        saveTransactions();
      }
    } catch (e) {
      console.warn("[Fetch Tx from Firestore error]", e);
    }
  }
  if (!tx) {
    return res.status(404).json({ ok: false, error: "Transaction not found" });
  }
  const previousStatus = tx.status;
  if (previousStatus === status) {
    return res.json({ ok: true, transaction: tx, message: "Already processed" });
  }
  tx.status = status;
  tx.approvedBy = approvedBy || "Admin 0910961881";
  saveTransactions(tx);
  await syncTransactionToFirestore(tx).catch(() => {
  });
  const userWallet = findOrCreateWallet({
    userId: tx.userId,
    phone: tx.userPhone,
    telegramId: tx.telegramId || (tx.userId?.startsWith("tg_") ? tx.userId.replace("tg_", "") : void 0),
    fullName: tx.userName
  });
  await reconcileWalletForUser(userWallet.userId, userWallet.phone, userWallet.telegramId);
  await sendUserTransactionStatusTelegramNotification(tx, status, userWallet);
  updateBotMessagesStatus(tx).catch(() => {
  });
  res.json({ ok: true, transaction: tx });
});
app.get("/api/support/messages", (req, res) => {
  const userPhone = req.query.phone;
  if (!userPhone) {
    return res.json({ ok: true, messages: supportMessages.slice(-50) });
  }
  const cleanPhone = userPhone.replace(/\s+/g, "");
  const userFiltered = supportMessages.filter(
    (m) => m.userPhone.replace(/\s+/g, "").includes(cleanPhone) || cleanPhone.includes(m.userPhone.replace(/\s+/g, ""))
  );
  res.json({ ok: true, messages: userFiltered });
});
app.post("/api/support/send", async (req, res) => {
  const { userName, userPhone, text, userId } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ ok: false, error: "Message text is required" });
  }
  const newMsg = {
    id: "sup_" + Date.now(),
    userId: userId || "user",
    userName: userName && userName !== "\u1270\u1320\u1243\u121A" ? userName : userPhone || "\u12F0\u1295\u1260\u129B",
    userPhone: userPhone || "",
    sender: "user",
    text: text.trim(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  supportMessages.push(newMsg);
  saveSupportMessages();
  recordMiniAppActivity(userId || userPhone || "support_user", "support_message_sent", {
    userName: newMsg.userName,
    userPhone: newMsg.userPhone,
    text: newMsg.text
  }).catch(() => {
  });
  const adminNotification = `\u{1F4AC} <b>\u12A0\u12F2\u1235 \u12E8\u12F5\u130B\u134D \u1218\u120D\u12D5\u12AD\u1275 (Support Inquiry)</b>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} <b>\u1235\u121D:</b> <b>${newMsg.userName}</b>
\u{1F4F1} <b>\u1235\u120D\u12AD:</b> <code>${newMsg.userPhone}</code>
\u{1F4DD} <b>\u1218\u120D\u12D5\u12AD\u1275:</b>
<i>"${newMsg.text}"</i>
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;
  await notifyAllAdmins(adminNotification);
  res.json({ ok: true, message: newMsg });
});
app.all(["/api/telegram/webhook", "/api/webhook", "/telegram/webhook", "/webhook"], async (req, res) => {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      status: "Telegram Webhook is Active & Ready 24/7 (Vercel Serverless & Express)",
      bot: BOT_USERNAME,
      url: `${APP_URL}/api/telegram/webhook`
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
  } catch (err) {
    console.error("[Telegram Webhook Error]", err?.message || err);
  }
  return res.status(200).send("OK");
});
var UPDATE_ID_FILE = path.join(STORAGE_DIR, "last_update_id.txt");
var lastUpdateId = 0;
try {
  if (fs.existsSync(UPDATE_ID_FILE)) {
    lastUpdateId = parseInt(fs.readFileSync(UPDATE_ID_FILE, "utf-8").trim(), 10) || 0;
  }
} catch {
  lastUpdateId = 0;
}
function saveLastUpdateId(id) {
  try {
    fs.writeFileSync(UPDATE_ID_FILE, String(id));
  } catch {
  }
}
var asyncSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function setupTelegramBotCommandsAndMenu() {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "start", description: "\u{1F680} \u1266\u1271\u1295 \u1300\u121D\u122D / \u120E\u1270\u122A \u12AD\u1348\u1275 (Start Bot)" },
          { command: "lottery", description: "\u{1F39F} \u1295\u1241 \u12D5\u1323\u12CE\u127D\u1293 \u1275\u12AC\u1276\u127D (Active Lotteries)" },
          { command: "wallet", description: "\u{1F4B3} \u12E8\u1294 \u12CB\u120C\u1275 (My Wallet)" },
          { command: "help", description: "\u2753 \u12A5\u122D\u12F3\u1273\u1293 \u12F5\u130B\u134D (Help & Support)" }
        ]
      })
    });
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setChatMenuButton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_button: {
          type: "commands"
        }
      })
    });
    await updateTelegramBotMonthlyUsers();
  } catch (err) {
    console.warn("[Bot Commands & Menu Warning]", err?.message || err);
  }
}
async function startTelegramPolling() {
  console.log(`[Telegram Bot] Starting non-blocking 24/7 async polling for @${BOT_USERNAME}...`);
  try {
    const delRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`);
    const delData = await delRes.json();
    console.log(`[Telegram Bot Webhook Clear] Success:`, delData?.ok);
    await setupTelegramBotCommandsAndMenu();
  } catch (err) {
    console.error("[Bot Polling Init Warning]", err);
  }
  let consecutiveErrors = 0;
  while (true) {
    try {
      const offset = lastUpdateId > 0 ? lastUpdateId + 1 : 0;
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=20`,
        { signal: AbortSignal.timeout(3e4) }
      );
      if (!res.ok) {
        consecutiveErrors++;
        if (res.status === 409) {
          console.warn("[Bot Polling] 409 Conflict detected (active webhook or duplicate instance). Resetting webhook...");
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`).catch(() => {
          });
        } else {
          console.warn(`[Bot Polling] getUpdates failed: ${res.status} ${res.statusText}`);
        }
        await asyncSleep(consecutiveErrors > 5 ? 4e3 : 1500);
        continue;
      }
      consecutiveErrors = 0;
      const data = await res.json();
      if (data && data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;
          saveLastUpdateId(lastUpdateId);
          try {
            if (update.message) {
              console.log(`[Telegram Bot Incoming Message] From: ${update.message.from?.id} (${update.message.from?.username || ""}), Text: "${update.message.text || ""}"`);
              await handleTelegramMessage(update.message);
            } else if (update.callback_query) {
              console.log(`[Telegram Bot Incoming Callback] From: ${update.callback_query.from?.id}, Data: "${update.callback_query.data || ""}"`);
              await handleTelegramCallback(update.callback_query);
            }
          } catch (innerErr) {
            console.error("[Update Processing Error]", update.update_id, innerErr);
          }
        }
        if (data.result.length > 0) {
          await asyncSleep(50);
          continue;
        }
      } else if (data && !data.ok) {
        console.error("[Bot Polling Error from Telegram]", data);
        if (data.error_code === 409) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`).catch(() => {
          });
        }
        await asyncSleep(2e3);
      }
    } catch (err) {
      if (err.name !== "TimeoutError" && !err.message?.includes("timeout")) {
        console.error("[Bot Polling Cycle Error]", err.message || err);
      }
      await asyncSleep(1500);
    }
    await asyncSleep(300);
  }
}
async function initTelegramBotService() {
  if (isVercel) {
    return;
  }
  console.log(`[Telegram Bot] Initializing bot service for @${BOT_USERNAME}...`);
  await setupTelegramBotCommandsAndMenu();
  if (process.env.TELEGRAM_USE_WEBHOOK === "true" && APP_URL && !APP_URL.includes("localhost")) {
    try {
      const webhookUrl = `${APP_URL}/api/telegram/webhook`;
      const whRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ["message", "callback_query"],
          drop_pending_updates: false
        })
      });
      const whData = await whRes.json();
      console.log(`[Telegram 24/7 Webhook Configured] URL: ${webhookUrl}, Success: ${whData?.ok}`);
      return;
    } catch (whErr) {
      console.warn("[Webhook Registration Warning]", whErr?.message || whErr);
    }
    return;
  }
  startTelegramPolling();
}
app.post("/api/admin/tickets/clear-all", async (req, res) => {
  syncedTickets = [];
  syncedTransactions = syncedTransactions.filter((t) => t.type !== "ticket_purchase");
  safeWriteJsonSync(TICKETS_FILE, syncedTickets);
  safeWriteJsonSync(TX_FILE, syncedTransactions);
  const ticketsSnap = await getDocs(collection(firestore, "tickets"));
  for (const docSnap of ticketsSnap.docs) {
    await deleteDoc(doc(firestore, "tickets", docSnap.id)).catch(() => {
    });
  }
  for (const [lotId, conf] of Object.entries(CANONICAL_LOTTERY_CAPACITIES)) {
    await setDoc(doc(firestore, "keri_etsa", lotId), {
      lotteryId: lotId,
      ticketsSold: 0,
      keriEtsa: conf.capacity,
      buyersCount: 0,
      totalInventory: conf.capacity,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      kuankua: "\u12A0\u121B\u122D\u129B"
    }, { merge: true }).catch(() => {
    });
  }
  await syncDashboardToFirestore(void 0, true);
  res.json({ ok: true, message: "All tickets cleared" });
});
app.post("/api/admin/broadcast", async (req, res) => {
  const { message, title } = req.body;
  if (!message) {
    return res.status(400).json({ ok: false, error: "Message is required" });
  }
  const broadcastText = `\u{1F4E2} <b>${escapeHtml(title || "\u12E8\u1270\u12C8\u12F3\u1305 \u120E\u1270\u122A \u121B\u1235\u1273\u12C8\u1242\u12EB (Announcement)")}</b>

${escapeHtml(message)}

\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
<i>\u1270\u12C8\u12F3\u1305 \u12A6\u1295\u120B\u12ED\u1295 \u120E\u1270\u122A (Tewedaj Online Lottery)</i>`;
  const uniqueChatIds = /* @__PURE__ */ new Set();
  for (const w of Object.values(userWallets)) {
    if (w.telegramId) {
      const num = Number(w.telegramId);
      if (!isNaN(num) && num > 0) uniqueChatIds.add(num);
    }
  }
  adminChatIds.forEach((id) => uniqueChatIds.add(id));
  uniqueChatIds.add(PRIMARY_ADMIN_CHAT_ID);
  let successCount = 0;
  for (const cid of uniqueChatIds) {
    try {
      await sendTelegramResponse(cid, broadcastText, {
        inline_keyboard: [[{ text: "\u{1F39F} \u12A0\u1351\u1295 \u12AD\u1348\u1275 (Open Lottery)", url: APP_URL }]]
      });
      successCount++;
    } catch {
    }
  }
  res.json({ ok: true, sentCount: successCount });
});
app.all("/api/health", (_req, res) => {
  res.json({
    ok: true,
    status: "running",
    uptime: process.uptime(),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    bot: BOT_USERNAME
  });
});
app.all("/api/ping", (_req, res) => {
  res.status(200).send("pong - Tewedaj Bot & Mini App is awake 24/7!");
});
app.all("/api/keep-alive", (_req, res) => {
  res.status(200).json({
    ok: true,
    status: "active_24_7",
    service: "Tewedaj Online Lottery Bot & Mini App Keep-Alive",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptimerobot: {
      url: `${APP_URL}/api/keep-alive`,
      interval: "5 minutes",
      method: "GET or HEAD",
      purpose: "Prevents free hosting sleep/idle timeouts 24/7"
    }
  });
});
app.use((err, req, res, _next) => {
  console.error(`[Express Global Error] ${req.method} ${req.url}:`, err);
  if (!res.headersSent) {
    res.status(200).json({
      ok: false,
      error: err?.message || "Server error occurred, handled gracefully"
    });
  }
});
async function startServer() {
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  const server = app.listen(PORT, async () => {
    console.log(`[Tewedaj Server] Running on http://0.0.0.0:${PORT}`);
    await loadAllFromFirestore();
    initFirestoreTransactionsWatcher();
    initFirestoreTicketsWatcher();
    await initTelegramBotService();
    const keepAliveTargets = [`http://127.0.0.1:${PORT}/api/keep-alive`];
    if (APP_URL && !APP_URL.includes("localhost") && !APP_URL.includes("127.0.0.1")) {
      keepAliveTargets.push(`${APP_URL}/api/keep-alive`);
    }
    if (process.env.RENDER_EXTERNAL_URL) {
      keepAliveTargets.push(`${process.env.RENDER_EXTERNAL_URL}/api/keep-alive`);
    }
    const keepAliveInterval = setInterval(async () => {
      for (const targetUrl of keepAliveTargets) {
        try {
          await fetch(targetUrl, { signal: AbortSignal.timeout(8e3) });
        } catch {
        }
      }
    }, 12e4);
    if (keepAliveInterval.unref) keepAliveInterval.unref();
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[Server Error] Port ${PORT} is already in use.`);
      process.exit(1);
    } else {
      console.error("[Server Error]", err);
    }
  });
}
if (process.env.VERCEL !== "1") {
  startServer();
}
var server_default = app;
export {
  CANONICAL_LOTTERY_CAPACITIES,
  computeActiveLotteryCounts,
  deduplicateWallets,
  server_default as default,
  ensureFirestoreLoaded,
  findOrCreateWallet,
  findWalletByPhone,
  getRegisteredUsersCount,
  handleFirestoreError,
  isFirestoreQuotaActive,
  loadAllFromFirestore,
  logBotActivity,
  logDashboardActivity,
  normalizeEthiopianPhone,
  reconcileWalletForUser,
  recordMiniAppActivity,
  sanitizeForFirestore,
  saveLotteryLocks,
  syncDashboardToFirestore,
  syncNotificationToFirestore,
  syncTicketToFirestore,
  syncTransactionToFirestore,
  syncWalletToFirestore,
  updateTelegramBotMonthlyUsers
};
