import React, { useState, useEffect } from 'react';
import { 
  Ticket as TicketIcon, 
  DollarSign, 
  Search, 
  Plus, 
  CheckCircle2, 
  Trophy, 
  X,
  ArrowLeft,
  Copy,
  Check,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  Phone,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  RotateCw,
  RotateCcw,
  Crown,
  LayoutDashboard,
  Activity,
  RefreshCw,
  Key,
  Lock,
  Unlock,
} from 'lucide-react';
import { Language, LotteryDraw, Ticket, Transaction } from '../../types/lottery';
import { formatETB, formatEthiopianDate, generateLuckyNumber, playNotificationSound, triggerConfetti, normalizeEthiopianPhone } from '../../utils/lotteryUtils';
import { triggerHaptic, setupTelegramBackButton, isTelegramMiniApp } from '../../utils/telegram';
import { getBanknoteForLottery } from '../../assets/banknotes';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db, subscribeToDashboard, handleFirestoreError, OperationType } from '../../lib/firebase';

interface AdminDashboardProps {
  lang: Language;
  lotteries: LotteryDraw[];
  tickets: Ticket[];
  transactions: Transaction[];
  onAddLottery: (newLottery: LotteryDraw) => void;
  onExecuteDraw: (lotteryId: string, winningNumbers: { firstPrize: string; secondPrize: string; thirdPrize: string; consolationSuffix: string }) => void;
  onBroadcastNotification?: (messageAm: string, messageEn: string) => void;
  onApproveDeposit?: (txId: string) => void;
  onRejectDeposit?: (txId: string) => void;
  onApproveWithdrawal?: (txId: string) => void;
  onRejectWithdrawal?: (txId: string) => void;
  onDeleteTransaction?: (txId: string) => void;
  onDeleteUser?: (userId: string, phone: string) => Promise<boolean>;
  onDeleteTicket?: (ticketId: string) => void;
  onFullResetUser?: (phone: string) => Promise<boolean>;
  lockedLotteryIds?: string[];
  onToggleLotteryLock?: (lotteryId: string, isLocked: boolean) => void;
  onBack?: () => void;
}

const CANONICAL_ADMIN_LOTTERIES: Array<{
  id: string;
  titleAm: string;
  titleEn: string;
  code: string;
  ticketPrice: number;
  jackpotAmount: number;
  isItemPrize?: boolean;
  prizeItemName?: string;
  prizeItemNameAm?: string;
  totalInventory?: number;
  isGame?: boolean;
}> = [
  { id: 'lot_tv_32', titleAm: '32 Inch TV ዕጣ', titleEn: '32 Inch TV Draw', code: 'TV-32', ticketPrice: 200, jackpotAmount: 0, isItemPrize: true, prizeItemName: '32 Inch TV', prizeItemNameAm: '32 Inch TV', totalInventory: 150 },
  { id: 'lot_derash_1000', titleAm: 'ባለ 1,000 ብር ደራሽ', titleEn: 'Bale 1,000 ETB Derash', code: 'DERASH-1K', ticketPrice: 10, jackpotAmount: 1000, totalInventory: 150 },
  { id: 'lot_derash_5000', titleAm: 'ባለ 5,000 ብር ደራሽ', titleEn: 'Bale 5,000 ETB Derash', code: 'DERASH-5K', ticketPrice: 50, jackpotAmount: 5000, totalInventory: 150 },
  { id: 'lot_derash_10000', titleAm: 'ባለ 10,000 ብር ደራሽ', titleEn: 'Bale 10,000 ETB Derash', code: 'DERASH-10K', ticketPrice: 100, jackpotAmount: 10000, totalInventory: 150 },
  { id: 'lot_derash_50000', titleAm: 'ባለ 50,000 ብር ደራሽ', titleEn: 'Bale 50,000 ETB Derash', code: 'DERASH-50K', ticketPrice: 200, jackpotAmount: 50000, totalInventory: 300 },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  lang,
  lotteries,
  tickets,
  transactions,
  onAddLottery,
  onExecuteDraw,
  onApproveDeposit,
  onRejectDeposit,
  onApproveWithdrawal,
  onRejectWithdrawal,
  onDeleteTransaction,
  onDeleteUser,
  onDeleteTicket,
  onFullResetUser,
  lockedLotteryIds = [],
  onToggleLotteryLock,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'users' | 'tickets' | 'draw' | 'inventories'>('transactions');
  const [lockTargetLottery, setLockTargetLottery] = useState<LotteryDraw | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [isSyncingDashboard, setIsSyncingDashboard] = useState(false);
  const [dashboardSyncSuccess, setDashboardSyncSuccess] = useState<string | null>(null);
  const [previewScreenshot, setPreviewScreenshot] = useState<string | null>(null);

  const refreshDashboard = async () => {
    setIsSyncingDashboard(true);
    try {
      const res = await fetch('/api/dashboard/refresh', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setDashboardSyncSuccess('Firebase Firestore ዳሽቦርድ በተሳካ ሁኔታ ተመሳስሏል!');
        setTimeout(() => setDashboardSyncSuccess(null), 3500);
      }
      const statsRes = await fetch('/api/dashboard/stats');
      const statsData = await statsRes.json();
      if (statsData.ok) {
        setDashboardStats(statsData);
      }
      triggerHaptic('light');
      playNotificationSound('click');
    } catch (e) {
      console.warn(e);
    } finally {
      setIsSyncingDashboard(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchDashStats = () => {
      fetch('/api/dashboard/stats')
        .then(r => r.json())
        .then(data => {
          if (isMounted && data.ok) {
            setDashboardStats(data);
          }
        })
        .catch(() => {});
    };
    fetchDashStats();
    const interval = setInterval(fetchDashStats, 3000);

    const unsub = subscribeToDashboard((liveData) => {
      if (isMounted && liveData) {
        setDashboardStats((prev: any) => ({
          ...prev,
          ...liveData,
        }));
      }
    });

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const activeLotteryList: LotteryDraw[] = CANONICAL_ADMIN_LOTTERIES.map((config) => {
    const found = lotteries.find(
      l => (l.status === 'active' || l.status === 'upcoming') && (
        l.id === config.id ||
        (config.id === 'lot_tv_32' && (l.id.includes('tv') || l.titleAm?.includes('ቲቪ'))) ||
        (config.id === 'lot_derash_50000' && (l.id.includes('50000') || (l.ticketPrice === 200 && !l.id.includes('tv') && !l.titleAm?.includes('ቲቪ')))) ||
        (config.id === 'lot_derash_1000' && (l.id.includes('1000') || l.ticketPrice === 10)) ||
        (config.id === 'lot_derash_5000' && (l.id.includes('5000') || l.ticketPrice === 50)) ||
        (config.id === 'lot_derash_10000' && (l.id.includes('10000') || l.ticketPrice === 100))

      )
    );
    const defaultInventory = config.totalInventory || (config.jackpotAmount === 50000 ? 300 : 150);
    if (found) {
      return {
        ...found,
        id: config.id,
        totalInventory: config.totalInventory || found.totalInventory || defaultInventory,
        round: found.round || 1,
        isItemPrize: config.isItemPrize,
        prizeItemName: config.prizeItemName,
        prizeItemNameAm: config.prizeItemNameAm,
      };
    }
    const completedList = lotteries.filter(
      l => (l.status === 'completed' || !!l.winningNumbers) && (
        l.id === config.id ||
        (config.id === 'lot_tv_32' && (l.id.includes('tv') || l.titleAm?.includes('ቲቪ'))) ||
        (config.id === 'lot_derash_50000' && (l.id.includes('50000') || (l.ticketPrice === 200 && !l.id.includes('tv') && !l.titleAm?.includes('ቲቪ')))) ||
        (config.id === 'lot_derash_1000' && (l.id.includes('1000') || l.ticketPrice === 10)) ||
        (config.id === 'lot_derash_5000' && (l.id.includes('5000') || l.ticketPrice === 50)) ||
        (config.id === 'lot_derash_10000' && (l.id.includes('10000') || l.ticketPrice === 100))
      )
    );
    const maxCompletedRound = completedList.reduce((max, l) => Math.max(max, l.round || 1), 0);
    const nextRound = maxCompletedRound > 0 ? maxCompletedRound + 1 : 1;

    return {
      id: config.id,
      titleAm: config.titleAm,
      titleEn: config.titleEn,
      code: config.code,
      category: 'instant' as const,
      bannerUrl: getBanknoteForLottery(config.ticketPrice, undefined, config.id),
      ticketPrice: config.ticketPrice,
      totalInventory: defaultInventory,
      ticketsSold: 0,
      round: nextRound,
      jackpotAmount: config.jackpotAmount,
      isItemPrize: config.isItemPrize,
      prizeItemName: config.prizeItemName,
      prizeItemNameAm: config.prizeItemNameAm,
      drawDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      status: 'active' as const,
      prizes: [
        { rank: 1, titleAm: config.isItemPrize ? config.titleAm : '1ኛ ዕጣ ሽልማት', titleEn: '1st Prize', amount: config.jackpotAmount, winnersCount: 1 },
      ],
    };
  });

  const [selectedDrawTabLotteryId, setSelectedDrawTabLotteryId] = useState<string>(
    activeLotteryList[0]?.id || ''
  );
  const [tabDrawRolling, setTabDrawRolling] = useState(false);
  const [tabFirstPrize, setTabFirstPrize] = useState('');
  const [tabDrawSuccessMsg, setTabDrawSuccessMsg] = useState<string | null>(null);

  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'pending' | 'deposit' | 'withdrawal'>('all');
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [isAddLotteryOpen, setIsAddLotteryOpen] = useState(false);
  const [newTitleAm, setNewTitleAm] = useState('');
  const [newPrice, setNewPrice] = useState('50');
  const [newJackpot, setNewJackpot] = useState('5000');

  const [registeredUsers, setRegisteredUsers] = useState<Array<{
    userId: string;
    phone: string;
    fullName: string;
    username?: string;
    profileImage?: string;
    registeredAt?: string;
    password?: string;
    walletBalance?: number;
    ticketsCount?: number;
    totalWon?: number;
    customerId?: string;
    isOnline?: boolean;
    lastActive?: string;
  }>>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userActionSuccessMsg, setUserActionSuccessMsg] = useState<string | null>(null);
  const [isRefreshingUsers, setIsRefreshingUsers] = useState(false);
  const [liveTickets, setLiveTickets] = useState<Ticket[]>([]);
  const [liveAdminTransactions, setLiveAdminTransactions] = useState<Transaction[]>([]);
  const [ticketViewMode, setTicketViewMode] = useState<'table' | 'list'>('table');

  const [isDeduplicating, setIsDeduplicating] = useState(false);

  const consolidateAdminUsers = (rawList: any[]): any[] => {
    const consolidated: any[] = [];

    for (const doc of rawList) {
      if (!doc) continue;
      const phone = doc.phone ? normalizeEthiopianPhone(doc.phone) : '';
      const phoneSuffix = phone && phone.length >= 9 ? phone.slice(-9) : '';
      const tgId = doc.telegramId ? String(doc.telegramId) : '';
      const cid = doc.customerId || '';
      const uid = String(doc.userId || '');

      // Check if a candidate already exists in consolidated list
      const candidate = consolidated.find(c => {
        const cPhone = c.phone ? normalizeEthiopianPhone(c.phone) : '';
        const cSuffix = cPhone && cPhone.length >= 9 ? cPhone.slice(-9) : '';
        const cTgId = c.telegramId ? String(c.telegramId) : '';

        const phoneMatch = Boolean(phoneSuffix && cSuffix && phoneSuffix === cSuffix);
        const tgMatch = Boolean(tgId && cTgId && tgId === cTgId);
        const keyTgMatch = Boolean((tgId && (c.userId === `tg_${tgId}` || c.userId === tgId)) || (cTgId && (uid === `tg_${cTgId}` || uid === cTgId)));
        const cidMatch = Boolean(cid && c.customerId && cid === c.customerId);
        const uidMatch = Boolean(uid && c.userId && uid === c.userId);

        return phoneMatch || tgMatch || keyTgMatch || cidMatch || uidMatch;
      });

      const fullName = (doc.fullName && doc.fullName !== 'ተጠቃሚ' && !doc.fullName.startsWith('ተጠቃሚ ('))
        ? doc.fullName.trim()
        : (doc.name ? doc.name.trim() : '');

      if (candidate) {
        if (phone && phone.length >= 9) candidate.phone = phone;
        if (tgId && !candidate.telegramId) candidate.telegramId = tgId;
        if (fullName && (!candidate.fullName || candidate.fullName === 'ተጠቃሚ' || candidate.fullName.startsWith('ተጠቃሚ ('))) {
          candidate.fullName = fullName;
        }
        if (doc.username && !candidate.username) candidate.username = doc.username;
        if (doc.profileImage && !candidate.profileImage) candidate.profileImage = doc.profileImage;
        if (cid && !candidate.customerId) candidate.customerId = cid;
        if (doc.password && !candidate.password) candidate.password = doc.password;

        candidate.walletBalance = Math.max(Number(candidate.walletBalance) || 0, Number(doc.walletBalance) || 0);
        candidate.ticketsCount = Math.max(Number(candidate.ticketsCount) || 0, Number(doc.ticketsCount) || 0);
        candidate.totalWon = Math.max(Number(candidate.totalWon) || 0, Number(doc.totalWon) || 0);
        candidate.isOnline = candidate.isOnline || Boolean(doc.isOnline);
        if (doc.registeredAt && (!candidate.registeredAt || new Date(doc.registeredAt) < new Date(candidate.registeredAt))) {
          candidate.registeredAt = doc.registeredAt;
        }
        if (doc.lastActive && (!candidate.lastActive || new Date(doc.lastActive) > new Date(candidate.lastActive))) {
          candidate.lastActive = doc.lastActive;
        }
      } else {
        consolidated.push({
          userId: uid || (phone || (tgId ? `tg_${tgId}` : 'usr_' + Math.random().toString(36).substring(2, 6))),
          telegramId: tgId,
          customerId: cid || ('TEWEDAJ-' + (tgId || phone || uid).slice(-6)),
          phone: phone || (tgId ? `TG: ${tgId}` : 'ስልክ አልተጋራም'),
          fullName: fullName || (phone ? `ደንበኛ (${phone})` : (doc.username ? doc.username : `ተጠቃሚ (${tgId || uid})`)),
          username: doc.username || '',
          profileImage: doc.profileImage || '',
          registeredAt: doc.registeredAt || new Date().toISOString(),
          password: doc.password || '',
          walletBalance: Number(doc.walletBalance) || 0,
          ticketsCount: Number(doc.ticketsCount) || 0,
          totalWon: Number(doc.totalWon) || 0,
          isOnline: Boolean(doc.isOnline),
          lastActive: doc.lastActive || '',
        });
      }
    }

    consolidated.sort((a, b) => {
      const aIsOwner = (a.phone && (a.phone.includes('0910961881') || a.phone.includes('910961881'))) || (a.username && a.username.toLowerCase().includes('lij_makbel')) || a.telegramId === '5588110290';
      const bIsOwner = (b.phone && (b.phone.includes('0910961881') || b.phone.includes('910961881'))) || (b.username && b.username.toLowerCase().includes('lij_makbel')) || b.telegramId === '5588110290';
      if (aIsOwner && !bIsOwner) return -1;
      if (!aIsOwner && bIsOwner) return 1;

      const now = Date.now();
      const aOnline = Boolean(a.isOnline || (a.lastActive && (now - new Date(a.lastActive).getTime() < 45000)));
      const bOnline = Boolean(b.isOnline || (b.lastActive && (now - new Date(b.lastActive).getTime() < 45000)));

      if (aOnline && !bOnline) return -1;
      if (!aOnline && bOnline) return 1;

      const timeA = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
      const timeB = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
      return timeB - timeA;
    });

    return consolidated;
  };

  const handleDeduplicate = async () => {
    setIsDeduplicating(true);
    try {
      const res = await fetch('/api/admin/deduplicate', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setUserActionSuccessMsg(`ተደጋጋሚ ተጠቃሚዎች ተጠርገዋል! (${data.removedCount || 0} ተደጋጋሚ ተወግዶ ${data.remainingCount || 0} ተጠቃሚዎች ቀርተዋል)`);
        setTimeout(() => setUserActionSuccessMsg(null), 4000);
        await fetchUsers();
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setIsDeduplicating(false);
    }
  };

  const fetchUsers = async () => {
    setIsRefreshingUsers(true);
    try {
      // 1. Direct fetch from Firebase Firestore wallets collection
      const snap = await getDocs(collection(db, 'wallets'));
      if (!snap.empty) {
        const rawDocs = snap.docs.map(d => ({ ...d.data(), userId: d.data().userId || d.id }));
        const list = consolidateAdminUsers(rawDocs);
        if (list.length > 0) {
          setRegisteredUsers(list);
        }
      }
    } catch (e) {
      console.warn('[Fetch Users Firestore Error]', e);
    }

    // 2. Secondary fallback to /api/admin/users
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.ok && Array.isArray(data.users) && data.users.length > 0) {
        setRegisteredUsers(consolidateAdminUsers(data.users));
      }
    } catch {}
    setIsRefreshingUsers(false);
  };

  // Authoritative Real-time User/Wallet Sync
  useEffect(() => {
    let isMounted = true;
    
    const walletsRef = collection(db, 'wallets');
    const unsub = onSnapshot(walletsRef, (snapshot) => {
      if (!isMounted) return;
      const rawDocs = snapshot.docs.map(docSnap => ({
        ...docSnap.data(),
        userId: docSnap.data().userId || docSnap.id,
      }));
      const list = consolidateAdminUsers(rawDocs);
      setRegisteredUsers(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'wallets');
    });

    const ticketsRef = collection(db, 'tickets');
    const unsubTickets = onSnapshot(ticketsRef, (snapshot) => {
      if (!isMounted) return;
      const list: Ticket[] = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const num = data?.ticketNumber || data?.ticket_number || data?.number || (docSnap.id.startsWith('tkt_') ? docSnap.id.replace('tkt_', '') : docSnap.id);
        if (data) {
          const tktPrice = Number(data.pricePaid) || (data.lotteryId === 'lot_derash_5000' ? 50 : data.lotteryId === 'lot_derash_10000' ? 100 : (data.lotteryId === 'lot_derash_50000' || data.lotteryId === 'lot_tv_32') ? 200 : 10);
          const userPhone = data.userPhone || data.phone || '';
          const userName = (data.userName && data.userName !== 'ተጠቃሚ') ? data.userName : (data.name || data.fullName || (userPhone ? `ደንበኛ (${userPhone})` : 'ተጠቃሚ'));
          list.push({
            id: docSnap.id,
            ticketNumber: String(num),
            lotteryId: data.lotteryId || (tktPrice === 10 ? 'lot_derash_1000' : tktPrice === 50 ? 'lot_derash_5000' : tktPrice === 100 ? 'lot_derash_10000' : 'lot_derash_50000'),
            lotteryTitleAm: data.lotteryTitleAm || (tktPrice === 10 ? 'ባለ 1,000 ብር ደራሽ' : tktPrice === 50 ? 'ባለ 5,000 ብር ደራሽ' : tktPrice === 100 ? 'ባለ 10,000 ብር ደራሽ' : 'ባለ 50,000 ብር ደራሽ'),
            lotteryTitleEn: data.lotteryTitleEn || 'Derash Lottery',
            pricePaid: tktPrice,
            purchasedAt: data.purchasedAt || data.purchaseDate || new Date().toISOString(),
            status: data.status || 'active',
            userName,
            userPhone,
            userTelegram: data.userTelegram || data.telegram || '',
            userId: data.userId || 'usr_anon',
            paymentMethod: data.paymentMethod || 'wallet',
            paymentReference: data.paymentReference || `TKT-${num}`,
            securityHash: data.securityHash || 'hash_live',
          });
        }
      });
      list.sort((a, b) => new Date(b.purchasedAt || 0).getTime() - new Date(a.purchasedAt || 0).getTime());
      setLiveTickets(list);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'tickets');
    });

    // 3. Authoritative Real-time Transactions Sync for Admin
    const fetchAdminTxs = async () => {
      try {
        const res = await fetch('/api/admin/transactions');
        const data = await res.json();
        if (data.ok && Array.isArray(data.transactions) && isMounted) {
          setLiveAdminTransactions(data.transactions);
        }
      } catch {}
    };
    fetchAdminTxs();
    const txInterval = setInterval(fetchAdminTxs, 3000);

    const txRef = collection(db, 'transactions');
    const unsubTransactions = onSnapshot(txRef, (snapshot) => {
      if (!isMounted) return;
      const list: Transaction[] = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (data && (data.amount !== undefined || data.type)) {
          list.push({ ...data, id: docSnap.id } as Transaction);
        }
      });
      list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      if (list.length > 0) {
        setLiveAdminTransactions(list);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'transactions');
    });

    return () => {
      isMounted = false;
      unsub();
      unsubTickets();
      unsubTransactions();
      clearInterval(txInterval);
    };
  }, []);

  useEffect(() => {
    if (onBack) {
      const cleanup = setupTelegramBackButton(() => {
        triggerHaptic('medium');
        playNotificationSound('click');
        onBack();
      }, true);
      return cleanup;
    }
  }, [onBack]);

  // Unified transactions combining props and live Firestore/API feed
  const allTransactions = React.useMemo(() => {
    const map = new Map<string, Transaction>();
    if (Array.isArray(transactions)) {
      transactions.forEach(t => { if (t && t.id) map.set(t.id, t); });
    }
    if (Array.isArray(liveAdminTransactions)) {
      liveAdminTransactions.forEach(t => { if (t && t.id) map.set(t.id, t); });
    }
    const list = Array.from(map.values());
    list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    return list;
  }, [transactions, liveAdminTransactions]);

  const filteredUsers = registeredUsers.filter(u => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.trim().toLowerCase();
    return (
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q))
    );
  });

  const pendingApprovals = allTransactions.filter(t => t.status === 'pending');
  const filledLotteries = lotteries.filter(l => {
    const threshold = l.jackpotAmount === 50000 ? 300 : 150;
    return l.status === 'active' && (l.ticketsSold || 0) >= threshold;
  });

  useEffect(() => {
    filledLotteries.forEach(l => {
      const threshold = l.jackpotAmount === 50000 ? 300 : 150;
      const key = `enat_notified_${threshold}_${l.id}_r${l.round || 1}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, 'true');
        fetch('/api/admin/notify-200-filled', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lotteryId: l.id,
            titleAm: l.titleAm,
            round: l.round || 1,
            ticketsSold: l.ticketsSold || threshold,
          }),
        }).catch(() => {});
      }
    });
  }, [filledLotteries]);

  const filteredTickets = tickets.filter(tk => {
    if (!ticketSearchQuery.trim()) return true;
    const q = ticketSearchQuery.trim().toLowerCase();
    return (
      tk.ticketNumber.toLowerCase().includes(q) ||
      tk.userName.toLowerCase().includes(q) ||
      tk.userPhone.includes(q) ||
      tk.lotteryTitleAm.toLowerCase().includes(q)
    );
  });

  const filteredTransactions = allTransactions.filter(tx => {
    if (txTypeFilter === 'pending' && tx.status !== 'pending') return false;
    if (txTypeFilter === 'deposit' && tx.type !== 'deposit') return false;
    if (txTypeFilter === 'withdrawal' && tx.type !== 'withdrawal') return false;
    if (txSearchQuery.trim()) {
      const q = txSearchQuery.trim().toLowerCase();
      return (
        tx.referenceNumber.toLowerCase().includes(q) ||
        tx.userName.toLowerCase().includes(q) ||
        tx.userPhone.includes(q) ||
        String(tx.amount).includes(q)
      );
    }
    return true;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(id);
    triggerHaptic('light');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateLottery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleAm) return;
    const newDraw: LotteryDraw = {
      id: 'lot_' + Date.now(),
      titleAm: newTitleAm,
      titleEn: newTitleAm,
      code: 'DERASH-' + Math.floor(100 + Math.random() * 900),
      category: 'digital',
      bannerUrl: getBanknoteForLottery(parseFloat(newPrice) || 50),
      ticketPrice: parseFloat(newPrice) || 50,
      totalInventory: 150,
      ticketsSold: 0,
      round: 1,
      jackpotAmount: parseFloat(newJackpot) || 5000,
      drawDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      status: 'active',
      prizes: [
        { rank: 1, titleAm: '1ኛ ዕጣ ሽልማት', titleEn: '1st Prize', amount: parseFloat(newJackpot) || 5000, winnersCount: 1 },
      ],
      provablyFairSeed: '0x' + Math.random().toString(16).substring(2, 18),
    };
    onAddLottery(newDraw);
    setIsAddLotteryOpen(false);
    setNewTitleAm('');
    playNotificationSound('success');
  };

  const createReceiptDataUrl = (tx: Transaction) => {
    if (tx.screenshotUrl) return tx.screenshotUrl;
    const isDep = tx.type === 'deposit';
    const method = tx.paymentMethod === 'telebirr' ? 'Telebirr (ቴሌብር)' : 'CBE (ንግድ ባንክ)';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="750" viewBox="0 0 600 750" fill="none">
      <rect width="600" height="750" rx="32" fill="#0f172a"/>
      <rect x="20" y="20" width="560" height="710" rx="24" fill="#020617" stroke="#1e293b" stroke-width="3"/>
      <circle cx="300" cy="110" r="45" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="3"/>
      <path d="M280 110L295 125L325 95" stroke="#10b981" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="300" y="190" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="900" text-anchor="middle">የክፍያ ማረጋገጫ ደረሰኝ</text>
      <text x="300" y="220" fill="#94a3b8" font-family="sans-serif" font-size="14" text-anchor="middle">Tewedaj Online Lottery Official Payment Receipt</text>
      <line x1="60" y1="250" x2="540" y2="250" stroke="#334155" stroke-dasharray="8 8" stroke-width="2"/>
      <text x="70" y="295" fill="#94a3b8" font-family="sans-serif" font-size="15" font-weight="700">የአገልግሎት ዓይነት:</text>
      <text x="530" y="295" fill="#38bdf8" font-family="sans-serif" font-size="16" font-weight="900" text-anchor="end">${isDep ? 'የገንዘብ ማስገቢያ (Deposit)' : 'የገንዘብ ማውጣት (Withdrawal)'}</text>
      <text x="70" y="345" fill="#94a3b8" font-family="sans-serif" font-size="15" font-weight="700">ተጠቃሚ / ደንበኛ:</text>
      <text x="530" y="345" fill="#ffffff" font-family="sans-serif" font-size="16" font-weight="900" text-anchor="end">${tx.userName || 'ደንበኛ'}</text>
      <text x="70" y="395" fill="#94a3b8" font-family="sans-serif" font-size="15" font-weight="700">ስልክ ቁጥር / አካውንት:</text>
      <text x="530" y="395" fill="#34d399" font-family="sans-serif" font-size="17" font-weight="900" text-anchor="end">${tx.userPhone || 'N/A'}</text>
      <text x="70" y="445" fill="#94a3b8" font-family="sans-serif" font-size="15" font-weight="700">የክፍያ መንገድ:</text>
      <text x="530" y="445" fill="#fbbf24" font-family="sans-serif" font-size="16" font-weight="900" text-anchor="end">${method}</text>
      <text x="70" y="495" fill="#94a3b8" font-family="sans-serif" font-size="15" font-weight="700">የማጣቀሻ ቁጥር (Ref No):</text>
      <text x="530" y="495" fill="#e2e8f0" font-family="sans-serif" font-size="18" font-weight="900" text-anchor="end">${tx.referenceNumber || 'N/A'}</text>
      <line x1="60" y1="535" x2="540" y2="535" stroke="#334155" stroke-dasharray="8 8" stroke-width="2"/>
      <text x="70" y="590" fill="#94a3b8" font-family="sans-serif" font-size="16" font-weight="700">የገንዘብ መጠን:</text>
      <text x="530" y="590" fill="#34d399" font-family="sans-serif" font-size="28" font-weight="900" text-anchor="end">${(tx.amount || 0).toLocaleString()} ETB (ብር)</text>
      <rect x="60" y="630" width="480" height="60" rx="16" fill="#1e293b"/>
      <text x="300" y="665" fill="#94a3b8" font-family="sans-serif" font-size="13" text-anchor="middle">ተወዳጅ ኦንላይን ሎተሪ • በራስ-ሰር የተፈጠረ የማረጋገጫ ደረሰኝ</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  };

  return (
    <div className="w-full max-w-md sm:max-w-lg mx-auto p-3 sm:p-4 space-y-4 pb-28 text-slate-100">
      
      {/* Fallback back button if viewed on desktop / outside Telegram */}
      {!isTelegramMiniApp() && onBack && (
        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              playNotificationSound('click');
              onBack();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-400 border border-slate-800 text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>ወደ ዋና ገጽ (Home)</span>
          </button>
        </div>
      )}



      {/* 3. TAB 1: Transactions & Pending Approvals */}
      {activeTab === 'transactions' && (
        <div className="space-y-3.5">
          {/* Pending Approvals Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="text-sm font-black text-white">
                  {lang === 'am' ? 'ማረጋገጫ የሚጠብቁ ክፍያዎች' : 'Pending Approvals'}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {pendingApprovals.length} {lang === 'am' ? 'በመጠባበቅ ላይ' : 'Pending'}
              </span>
            </div>

            {pendingApprovals.length === 0 ? (
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center text-xs text-slate-400 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto opacity-70" />
                <div className="font-semibold text-slate-300">
                  {lang === 'am' ? 'በአሁኑ ሰዓት ማረጋገጫ የሚጠብቅ ክፍያ የለም' : 'No pending payments at this moment'}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingApprovals.map((tx) => {
                  const isDeposit = tx.type === 'deposit';
                  return (
                    <div
                      key={tx.id}
                      className="bg-slate-950 border-2 border-amber-500/40 rounded-2xl p-3.5 space-y-3 shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            isDeposit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {isDeposit ? 'ገቢ (Deposit)' : 'ወጪ (Withdrawal)'}
                          </span>
                          <h4 className="text-sm font-bold text-white mt-1 truncate">
                            {tx.userName && tx.userName.trim() ? tx.userName : (tx.userPhone || 'ደንበኛ')}
                          </h4>
                          <div className="text-xs text-teal-400 font-mono">
                            {isDeposit ? 'ስልክ ቁጥር:' : 'የመቀበያ አካውንት:'} {tx.userPhone}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <div className="text-lg font-black text-emerald-400 font-sans tabular-nums">
                              {formatETB(tx.amount)}
                            </div>
                            {onDeleteTransaction && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm('ይህንን ግብይት በእርግጠኝነት መሰረዝ ይፈልጋሉ?')) {
                                    onDeleteTransaction(tx.id);
                                  }
                                }}
                                className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                title="ሰርዝ (Delete)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            {tx.paymentMethod}
                          </span>
                        </div>
                      </div>

                      <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400 text-[11px]">የማጣቀሻ ቁጥር:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">{tx.referenceNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(tx.referenceNumber, tx.id)}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            {copiedKey === tx.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Screenshot / Receipt Preview Button & Thumbnail */}
                      <div className="space-y-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const url = tx.screenshotUrl || createReceiptDataUrl(tx);
                            setPreviewScreenshot(url);
                            triggerHaptic('medium');
                          }}
                          className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/50 rounded-xl text-xs font-black transition active:scale-95 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                        >
                          <Eye className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>📷 የደረሰኝ ፎቶ / ስክሪንሾት ይመልከቱ (View Screenshot)</span>
                        </button>

                        {tx.screenshotUrl && (
                          <div 
                            className="rounded-xl overflow-hidden border border-amber-500/30 bg-slate-950 max-h-52 flex items-center justify-center cursor-pointer group relative mt-1"
                            onClick={() => {
                              setPreviewScreenshot(tx.screenshotUrl!);
                              triggerHaptic('medium');
                            }}
                            title="በሙሉ ገጽ ለማየት ይጫኑ"
                          >
                            <img src={tx.screenshotUrl} alt="Receipt Screenshot" className="max-h-52 w-auto object-contain group-hover:opacity-80 transition" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40 backdrop-blur-xs">
                              <div className="px-3.5 py-1.5 bg-emerald-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-lg">
                                <Eye className="w-4 h-4" />
                                <span>በሙሉ ገጽ ክፈት (Open Screenshot)</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setLiveAdminTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'completed' as const } : t));
                            if (isDeposit && onApproveDeposit) onApproveDeposit(tx.id);
                            if (!isDeposit && onApproveWithdrawal) onApproveWithdrawal(tx.id);
                            triggerHaptic('medium');
                            playNotificationSound('win');
                          }}
                          className="py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>{lang === 'am' ? 'አጽድቅ (Approve)' : 'Approve'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLiveAdminTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, status: 'failed' as const } : t));
                            if (isDeposit && onRejectDeposit) onRejectDeposit(tx.id);
                            if (!isDeposit && onRejectWithdrawal) onRejectWithdrawal(tx.id);
                            triggerHaptic('light');
                            playNotificationSound('alert');
                          }}
                          className="py-2.5 px-3 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 font-bold rounded-xl text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                          <span>{lang === 'am' ? 'ውድቅ አድርግ (Reject)' : 'Reject'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* All Transactions Feed */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black text-white">
                {lang === 'am' ? 'የክፍያዎች ታሪክ' : 'Transaction History'}
              </h3>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setTxTypeFilter('all')}
                  className={`px-2 py-0.5 rounded-lg font-bold ${txTypeFilter === 'all' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
                >
                  ሁሉም
                </button>
                <button
                  type="button"
                  onClick={() => setTxTypeFilter('deposit')}
                  className={`px-2 py-0.5 rounded-lg font-bold ${txTypeFilter === 'deposit' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
                >
                  ገቢ
                </button>
                <button
                  type="button"
                  onClick={() => setTxTypeFilter('withdrawal')}
                  className={`px-2 py-0.5 rounded-lg font-bold ${txTypeFilter === 'withdrawal' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
                >
                  ወጪ
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={txSearchQuery}
                onChange={(e) => setTxSearchQuery(e.target.value)}
                placeholder="በስም ወይም ማጣቀሻ ፈልግ..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Mobile Card List */}
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                ምንም ዝውውር አልተገኘም
              </div>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {filteredTransactions.map((tx) => {
                  const isDep = tx.type === 'deposit';
                  const isWth = tx.type === 'withdrawal';
                  return (
                    <div
                      key={tx.id}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isDep ? 'bg-emerald-500/15 text-emerald-400' : isWth ? 'bg-amber-500/15 text-amber-400' : 'bg-teal-500/15 text-teal-400'
                        }`}>
                          {isDep ? <ArrowDownLeft className="w-4 h-4" /> : isWth ? <ArrowUpRight className="w-4 h-4" /> : <TicketIcon className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white text-xs truncate">
                            {tx.userName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {tx.userPhone} • {tx.referenceNumber}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className={`font-mono font-bold text-xs ${isDep ? 'text-emerald-400' : isWth ? 'text-amber-400' : 'text-slate-300'}`}>
                            {isDep ? '+' : '-'}{tx.amount.toLocaleString()} ብር
                          </div>
                          <span className={`text-[9px] font-bold ${
                            tx.status === 'completed' ? 'text-emerald-400' : tx.status === 'pending' ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {tx.status === 'completed' ? 'ተጠናቋል' : tx.status === 'pending' ? 'በመጠባበቅ ላይ' : 'ውድቅ ተደርጓል'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const url = tx.screenshotUrl || createReceiptDataUrl(tx);
                            setPreviewScreenshot(url);
                            triggerHaptic('medium');
                          }}
                          className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition"
                          title="የደረሰኝ ፎቶ/መረጃ ይመልከቱ (View Receipt)"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteTransaction && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('ይህንን ግብይት ከዳታቤዝ በእርግጠኝነት መሰረዝ ይፈልጋሉ?')) {
                                onDeleteTransaction(tx.id);
                              }
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                            title="ሰርዝ (Delete)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Registered Users */}
      {activeTab === 'users' && (
        <div className="space-y-3.5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black text-white">
                  የዳታቤዝ ተጠቃሚዎች (Database)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500 text-slate-950 font-mono">
                  {registeredUsers.length}
                </span>
                <button
                  type="button"
                  onClick={handleDeduplicate}
                  disabled={isDeduplicating}
                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  title="ተደጋጋሚ ተጠቃሚዎችን አጽዳ (Clean Duplicates)"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isDeduplicating ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">ተደጋጋሚ አጽዳ (Deduplicate)</span>
                </button>
                <button
                  type="button"
                  onClick={fetchUsers}
                  disabled={isRefreshingUsers}
                  className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition active:scale-95"
                  title="አድስ (Refresh)"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRefreshingUsers ? 'animate-spin text-emerald-400' : ''}`} />
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-r from-emerald-950/60 to-slate-950 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>ጠቅላላ ተጠቃሚዎች</span>
                </div>
                <div className="text-xl font-black text-white font-mono mt-0.5">
                  {registeredUsers.length.toLocaleString()} <span className="text-xs text-slate-400 font-sans font-medium">ተጠቃሚዎች</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/90 px-3 py-2 rounded-lg border border-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-500/50 inline-block" />
              </div>
            </div>

            {userActionSuccessMsg && (
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{userActionSuccessMsg}</span>
              </div>
            )}

            {/* Search Input */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="በስም ወይም ስልክ ፈልግ..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
                {/* Reconcile and Deduplicate buttons removed as requested */}
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800/80">
                ምንም ተጠቃሚ አልተገኘም
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[520px] rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase font-bold">
                      <th className="py-2.5 px-3">ተ.ቁ</th>
                      <th className="py-2.5 px-3">ስም (Name)</th>
                      <th className="py-2.5 px-3">ስልክ ቁጥር</th>
                      <th className="py-2.5 px-3">መለያ (ID)</th>
                      <th className="py-2.5 px-3">ቀሪ ሒሳብ</th>
                      <th className="py-2.5 px-3">ትኬቶች</th>
                      <th className="py-2.5 px-3 text-right">ሁኔታ (Status)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                    {filteredUsers.map((u, idx) => {
                      const userTickets = tickets.filter(tk => tk.userPhone === u.phone || (u.phone && tk.userPhone.includes(u.phone.slice(-9))));
                      const currentBalance = u.walletBalance || 0;
                      const userClean = (u.phone || '').replace(/\D/g, '');
                      const userTxs = userClean ? transactions.filter(t => t.userPhone && t.userPhone.replace(/\D/g, '').endsWith(userClean.slice(-9))) : [];
                      const userGebi = userTxs.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((s, t) => s + (t.amount || 0), 0);
                      const userWechi = userTxs.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((s, t) => s + (t.amount || 0), 0);

                      const isOwner = Boolean(
                        (u.phone && (u.phone.includes('0910961881') || u.phone.includes('910961881'))) ||
                        (u.username && u.username.toLowerCase().includes('lij_makbel')) ||
                        (u.userId && u.userId.includes('0910961881'))
                      );

                      return (
                        <tr 
                          key={u.userId || u.phone} 
                          className={`transition ${isOwner ? 'bg-amber-950/30 border-l-4 border-amber-400 hover:bg-amber-900/40' : 'hover:bg-slate-900/60'}`}
                        >
                          <td className="py-3 px-3 text-slate-400 font-bold">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3 font-bold text-white">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center font-bold text-xs shrink-0 ${
                                isOwner ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/60' : 'bg-emerald-600/20 text-emerald-400'
                              }`}>
                                {isOwner ? (
                                  <Crown className="w-4 h-4 text-amber-400" />
                                ) : u.profileImage ? (
                                  <img src={u.profileImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  (u.fullName ? u.fullName[0].toUpperCase() : 'U')
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate max-w-[120px]">{u.fullName || 'ተጠቃሚ'}</span>
                                  
                                  {/* Online / Offline Status Badge */}
                                  {(() => {
                                    const now = Date.now();
                                    const lastSeen = u.lastActive ? new Date(u.lastActive).getTime() : 0;
                                    const isRecent = (now - lastSeen) < 45000; // seen within last 45 seconds
                                    const online = Boolean(u.isOnline && isRecent);
                                    
                                    return online ? (
                                      <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/50 px-1.5 py-0.5 rounded-full text-emerald-400 font-black text-[9px] shadow-sm shrink-0" title="በመስመር ላይ ይገኛሉ (Online)">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.9)] shrink-0" />
                                        <span>Online</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 bg-slate-800/80 border border-slate-700/60 px-1.5 py-0.5 rounded-full text-slate-400 font-bold text-[9px] shrink-0 opacity-75" title="መስመር ላይ የሉም (Offline)">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                                        <span>Offline</span>
                                      </div>
                                    );
                                  })()}

                                  {isOwner && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/25 text-amber-300 border border-amber-500/40 font-black text-[9px] shadow-sm">
                                      👑 OWNER
                                    </span>
                                  )}
                                </div>
                                {u.username && (
                                  <span className="text-[10px] text-sky-400 font-normal">@{u.username.replace('@', '')}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-bold font-mono">
                            {isOwner ? (
                              <div className="flex items-center gap-1 text-amber-300">
                                <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span>{u.phone ? u.phone.replace(/[()\[\]]/g, '') : ''}</span>
                              </div>
                            ) : (
                              <span className="text-emerald-400 font-mono">{u.phone ? u.phone.replace(/[()\[\]]/g, '') : ''}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-amber-300 font-bold">{u.customerId || 'N/A'}</td>
                          <td className="py-3 px-3 text-emerald-300 font-black">{currentBalance.toLocaleString()} ብር</td>
                          <td className="py-3 px-3 text-white font-bold">{userTickets.length}</td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isOwner ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-black text-[10px]" title="Owner Account">
                                  👑 Owner
                                </span>
                              ) : (
                                <>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-[10px]" title="በFirebase በቋሚነት የተጠበቀ">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    <span>ቋሚ</span>
                                  </span>
                                  {onFullResetUser && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (confirm(`ተጠቃሚውን (${u.fullName || u.phone}) ሙሉ በሙሉ ዳታውን ማጥፋት (Reset to 0) ይፈልጋሉ? ይህ ትኬቶችንና ሒሳቡን ሁሉ ያጠፋል።`)) {
                                          triggerHaptic('medium');
                                          try {
                                            const ok = await onFullResetUser(u.phone);
                                            if (ok === true) {
                                              // Immediately update local state to 0 for this user
                                              setRegisteredUsers(prev => prev.map(user => {
                                                if (user.phone === u.phone) {
                                                  return {
                                                    ...user,
                                                    walletBalance: 0,
                                                    ticketsCount: 0,
                                                    totalWon: 0
                                                  };
                                                }
                                                return user;
                                              }));
                                              setUserActionSuccessMsg(lang === 'am' ? 'ዳታው ጠፍቷል' : 'User data reset');
                                              triggerHaptic('success');
                                              setTimeout(() => setUserActionSuccessMsg(null), 3000);
                                            }
                                          } catch (err) {
                                            alert(lang === 'am' ? 'መሰረዝ አልተቻለም' : 'Reset failed');
                                          }
                                        }
                                      }}
                                      className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition"
                                      title="ሙሉ ዳታ አጥፋ (Full Reset to 0)"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {onDeleteUser && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        if (confirm(`ተጠቃሚውን (${u.fullName || u.phone}) ከነዳታው በእርግጠኝነት መሰረዝ ይፈልጋሉ?`)) {
                                          triggerHaptic('medium');
                                          try {
                                            // 1. Call parent handler
                                            await onDeleteUser(u.userId || u.phone, u.phone);
                                            
                                            // 2. Immediately update local state for instant feedback
                                            setRegisteredUsers(prev => prev.filter(user => {
                                              if (u.userId && user.userId === u.userId) return false;
                                              if (u.phone && user.phone === u.phone) return false;
                                              return true;
                                            }));
                                            
                                            setUserActionSuccessMsg(lang === 'am' ? 'ተጠቃሚው ተሰርዟል' : 'User deleted');
                                            triggerHaptic('success');
                                            setTimeout(() => setUserActionSuccessMsg(null), 3000);
                                          } catch (err) {
                                            alert(lang === 'am' ? 'መሰረዝ አልተቻለም' : 'Delete failed');
                                          }
                                        }
                                      }}
                                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                      title="ተጠቃሚውን ሰርዝ (Delete User)"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TAB 3: Sold Tickets Categories & Table Grid */}
      {activeTab === 'tickets' && (() => {
        const ticketMap = new Map<string, Ticket>();
        (tickets || []).forEach(t => { if (t && (t.id || t.ticketNumber)) ticketMap.set(t.id || t.ticketNumber, t); });
        (liveTickets || []).forEach(t => { if (t && (t.id || t.ticketNumber)) ticketMap.set(t.id || t.ticketNumber, t); });
        const effectiveTickets = Array.from(ticketMap.values()).sort((a, b) => new Date(b.purchasedAt || Date.now()).getTime() - new Date(a.purchasedAt || Date.now()).getTime());
        
        const ticketsTv = effectiveTickets.filter(t => t.status !== 'refunded' && (t.lotteryId === 'lot_tv_32' || t.lotteryTitleAm?.includes('ቲቪ') || t.lotteryTitleAm?.includes('TV')));
        const tickets1k = effectiveTickets.filter(t => t.status !== 'refunded' && (t.lotteryId === 'lot_derash_1000' || t.pricePaid === 10 || t.lotteryTitleAm?.includes('1,000') || t.lotteryTitleAm?.includes('1000')));
        const tickets5k = effectiveTickets.filter(t => t.status !== 'refunded' && (t.lotteryId === 'lot_derash_5000' || t.pricePaid === 50 || t.lotteryTitleAm?.includes('5,000') || t.lotteryTitleAm?.includes('5000')));
        const tickets10k = effectiveTickets.filter(t => t.status !== 'refunded' && (t.lotteryId === 'lot_derash_10000' || t.pricePaid === 100 || t.lotteryTitleAm?.includes('10,000') || t.lotteryTitleAm?.includes('10000')));
        const tickets50k = effectiveTickets.filter(t => t.status !== 'refunded' && (t.lotteryId === 'lot_derash_50000' || (t.pricePaid === 200 && !t.lotteryTitleAm?.includes('ቲቪ') && !t.lotteryTitleAm?.includes('TV')) || t.lotteryTitleAm?.includes('50,000') || t.lotteryTitleAm?.includes('50000')));

        const maxRows = Math.max(ticketsTv.length, tickets1k.length, tickets5k.length, tickets10k.length, tickets50k.length, 1);

        const filteredTicketsList = effectiveTickets.filter(tk => {
          if (!ticketSearchQuery.trim()) return true;
          const q = ticketSearchQuery.trim().toLowerCase();
          return (
            tk.ticketNumber.toLowerCase().includes(q) ||
            tk.userName.toLowerCase().includes(q) ||
            tk.userPhone.includes(q) ||
            tk.lotteryTitleAm.toLowerCase().includes(q)
          );
        });

        return (
          <div className="space-y-3.5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3 shadow-xl">
              
              {/* Header & Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2.5 border-b border-slate-800 pb-3">
                
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                  <button
                    type="button"
                    onClick={() => setTicketViewMode('table')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      ticketViewMode === 'table'
                        ? 'bg-emerald-500 text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>📊 ሰንጠረዥ (Table)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketViewMode('list')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      ticketViewMode === 'list'
                        ? 'bg-emerald-500 text-slate-950 font-black shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>📋 ዝርዝር (List)</span>
                  </button>
                </div>
              </div>

              {/* View Mode 1: 5-Category Matrix Table Grid (TV + 4 Derash lotteries) */}
              {ticketViewMode === 'table' && (
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-2xl border-2 border-emerald-500/40 bg-slate-950 shadow-2xl">
                    <table className="w-full border-collapse text-left text-xs min-w-[750px]">
                      <thead>
                        <tr className="bg-slate-900 border-b-2 border-slate-800 text-white">
                          <th className="py-3 px-2 text-center border-r border-slate-800 bg-slate-950 font-black text-slate-400 w-10">
                            ተ.ቁ
                          </th>
                          <th className="py-2.5 px-2 text-center border-r border-slate-800 bg-sky-950/40">
                            <div className="px-2 py-1 rounded-xl bg-sky-500 text-slate-950 font-black text-xs shadow inline-block">
                              32" TV
                            </div>
                            <div className="text-[10px] text-sky-300 font-bold mt-1">
                              (200 ብር • {ticketsTv.length}/150)
                            </div>
                          </th>
                          <th className="py-2.5 px-2 text-center border-r border-slate-800 bg-emerald-950/40">
                            <div className="px-2 py-1 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs shadow inline-block">
                              1,000 ብር
                            </div>
                            <div className="text-[10px] text-emerald-300 font-bold mt-1">
                              (10 ብር • {tickets1k.length}/150)
                            </div>
                          </th>
                          <th className="py-2.5 px-2 text-center border-r border-slate-800 bg-teal-950/40">
                            <div className="px-2 py-1 rounded-xl bg-teal-500 text-slate-950 font-black text-xs shadow inline-block">
                              5,000 ብር
                            </div>
                            <div className="text-[10px] text-teal-300 font-bold mt-1">
                              (50 ብር • {tickets5k.length}/150)
                            </div>
                          </th>
                          <th className="py-2.5 px-2 text-center border-r border-slate-800 bg-indigo-950/40">
                            <div className="px-2 py-1 rounded-xl bg-indigo-500 text-white font-black text-xs shadow inline-block">
                              10,000 ብር
                            </div>
                            <div className="text-[10px] text-indigo-300 font-bold mt-1">
                              (100 ብር • {tickets10k.length}/150)
                            </div>
                          </th>
                          <th className="py-2.5 px-2 text-center bg-amber-950/40">
                            <div className="px-2 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs shadow inline-block">
                              50,000 ብር
                            </div>
                            <div className="text-[10px] text-amber-300 font-bold mt-1">
                              (200 ብር • {tickets50k.length}/300)
                            </div>
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-800/80 bg-slate-950/60">
                        {Array.from({ length: maxRows }).map((_, rowIdx) => {
                          const tTv = ticketsTv[rowIdx];
                          const t1k = tickets1k[rowIdx];
                          const t5k = tickets5k[rowIdx];
                          const t10k = tickets10k[rowIdx];
                          const t50k = tickets50k[rowIdx];

                          return (
                            <tr key={rowIdx} className="hover:bg-slate-900/50 transition">
                              <td className="py-2 px-2 text-center font-bold text-slate-400 border-r border-slate-800/80 bg-slate-950/90 text-[11px]">
                                {rowIdx + 1}
                              </td>

                              <td className="py-2 px-2 border-r border-slate-800/80 align-top">
                                {tTv ? (
                                  <div className="p-2 bg-slate-900/90 border border-sky-500/30 rounded-xl space-y-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-black text-sky-300 text-xs bg-sky-500/20 px-1.5 py-0.5 rounded border border-sky-500/30">
                                        #{tTv.ticketNumber}
                                      </span>
                                      {onDeleteTicket && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (confirm(`ትኬት #${tTv.ticketNumber} ከFirebase በቋሚነት ማጥፋት ይፈልጋሉ?`)) {
                                              onDeleteTicket(tTv.id);
                                            }
                                          }}
                                          className="p-1 text-slate-500 hover:text-rose-400"
                                          title="ሰርዝ"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-2 text-[10px] text-slate-600 italic">-</div>
                                )}
                              </td>

                              <td className="py-2 px-2 border-r border-slate-800/80 align-top">
                                {t1k ? (
                                  <div className="p-2 bg-slate-900/90 border border-emerald-500/30 rounded-xl space-y-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-black text-amber-300 text-xs bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                                        #{t1k.ticketNumber}
                                      </span>
                                      {onDeleteTicket && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (confirm(`ትኬት #${t1k.ticketNumber} ከFirebase በቋሚነት ማጥፋት ይፈልጋሉ?`)) {
                                              onDeleteTicket(t1k.id);
                                            }
                                          }}
                                          className="p-1 text-slate-500 hover:text-rose-400"
                                          title="ሰርዝ"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-2 text-[10px] text-slate-600 italic">-</div>
                                )}
                              </td>

                              <td className="py-2 px-2 border-r border-slate-800/80 align-top">
                                {t5k ? (
                                  <div className="p-2 bg-slate-900/90 border border-teal-500/30 rounded-xl space-y-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-black text-amber-300 text-xs bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                                        #{t5k.ticketNumber}
                                      </span>
                                      {onDeleteTicket && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (confirm(`ትኬት #${t5k.ticketNumber} ከFirebase በቋሚነት ማጥፋት ይፈልጋሉ?`)) {
                                              onDeleteTicket(t5k.id);
                                            }
                                          }}
                                          className="p-1 text-slate-500 hover:text-rose-400"
                                          title="ሰርዝ"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-2 text-[10px] text-slate-600 italic">-</div>
                                )}
                              </td>

                              <td className="py-2 px-2 border-r border-slate-800/80 align-top">
                                {t10k ? (
                                  <div className="p-2 bg-slate-900/90 border border-sky-500/30 rounded-xl space-y-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-black text-amber-300 text-xs bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                                        #{t10k.ticketNumber}
                                      </span>
                                      {onDeleteTicket && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (confirm(`ትኬት #${t10k.ticketNumber} ከFirebase በቋሚነት ማጥፋት ይፈልጋሉ?`)) {
                                              onDeleteTicket(t10k.id);
                                            }
                                          }}
                                          className="p-1 text-slate-500 hover:text-rose-400"
                                          title="ሰርዝ"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-2 text-[10px] text-slate-600 italic">-</div>
                                )}
                              </td>

                              <td className="py-2 px-2 align-top">
                                {t50k ? (
                                  <div className="p-2 bg-slate-900/90 border border-amber-500/30 rounded-xl space-y-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-black text-amber-300 text-xs bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                                        #{t50k.ticketNumber}
                                      </span>
                                      {onDeleteTicket && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (confirm(`ትኬት #${t50k.ticketNumber} ከFirebase በቋሚነት ማጥፋት ይፈልጋሉ?`)) {
                                              onDeleteTicket(t50k.id);
                                            }
                                          }}
                                          className="p-1 text-slate-500 hover:text-rose-400"
                                          title="ሰርዝ"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-2 text-[10px] text-slate-600 italic">-</div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* View Mode 2: Detailed List / Search */}
              {ticketViewMode === 'list' && (
                <div className="space-y-3">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={ticketSearchQuery}
                      onChange={(e) => setTicketSearchQuery(e.target.value)}
                      placeholder="በትኬት ቁጥር ወይም በስልክ ፈልግ..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {filteredTicketsList.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800/80">
                      ምንም ትኬት አልተገኘም
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                      {filteredTicketsList.map((tk) => (
                        <div
                          key={tk.id}
                          className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2.5 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="px-2.5 py-1.5 bg-slate-900 border border-amber-500/40 rounded-xl text-center shrink-0">
                              <span className="text-[9px] text-slate-400 block font-semibold">ቁጥር</span>
                              <span className="text-sm font-black text-amber-300">#{tk.ticketNumber}</span>
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-white text-xs truncate">
                                {lang === 'am' ? 'ቲኬት ቁጥር:' : 'Ticket No:'} #{tk.ticketNumber}
                              </h4>
                              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                {tk.lotteryTitleAm}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="text-right">
                              <div className="text-xs font-bold text-emerald-400">
                                {tk.pricePaid} ብር
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                tk.status === 'won' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              }`}>
                                {tk.status === 'won' ? 'አሸናፊ' : 'ተመዝግቧል'}
                              </span>
                            </div>
                            {onDeleteTicket && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`ትኬት #${tk.ticketNumber} ከዳታቤዝ በእርግጠኝነት መሰረዝ ይፈልጋሉ?`)) {
                                    onDeleteTicket(tk.id);
                                  }
                                }}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                                title="ትኬት ሰርዝ (Delete Ticket)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* 5. TAB 4: Draw Studio */}
      {activeTab === 'draw' && (
        <div className="space-y-3.5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-4">
            {tabDrawSuccessMsg && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{tabDrawSuccessMsg}</span>
              </div>
            )}

            {/* Lottery Selector Grid */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase block">
                1. የሚወጣውን ሎተሪ ይምረጡ
              </label>
              <div className="grid grid-cols-2 gap-2">
                {activeLotteryList.map((lot) => {
                  const isSelected = (selectedDrawTabLotteryId || activeLotteryList[0]?.id) === lot.id;
                  return (
                    <button
                      key={lot.id}
                      type="button"
                      onClick={() => {
                        setSelectedDrawTabLotteryId(lot.id);
                        setTabFirstPrize('');
                        setTabDrawSuccessMsg(null);
                        triggerHaptic('light');
                      }}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500 shadow-md ring-1 ring-amber-500/50'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white text-xs truncate">{lot.titleAm}</div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLockTargetLottery(lot);
                            triggerHaptic('medium');
                            playNotificationSound('click');
                          }}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5 transition active:scale-95 ${
                            lockedLotteryIds?.includes(lot.id)
                              ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50'
                              : 'bg-slate-800 text-amber-400 border border-slate-700 hover:border-amber-500/50'
                          }`}
                          title={lockedLotteryIds?.includes(lot.id) ? "Unlock" : "Lock"}
                        >
                          <Key className="w-3 h-3" />
                          <span>{lockedLotteryIds?.includes(lot.id) ? '🔒' : '🔑'}</span>
                        </button>
                      </div>
                      <div className="text-amber-400 font-bold text-[11px] font-mono mt-0.5">
                        {lot.id === 'lot_tv_32' || lot.isItemPrize ? '32 Inch TV' : formatETB(lot.jackpotAmount)}
                      </div>
                      <div className="text-[10px] text-slate-400 flex justify-between mt-0.5">
                        <span>{lot.ticketPrice} ብር</span>
                        <span className="text-emerald-400 font-bold">ዙር {lot.round || 1}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rolling Machine */}
            {(() => {
              const currentSelected = activeLotteryList.find(
                l => l.id === (selectedDrawTabLotteryId || activeLotteryList[0]?.id)
              );
              if (!currentSelected) return null;

              const handleRollNumbers = () => {
                setTabDrawRolling(true);
                setTabDrawSuccessMsg(null);
                playNotificationSound('click');

                // Get active tickets for the currently selected lottery draw
                const activeTicketsForDraw = tickets.filter(t => 
                  t.lotteryId === currentSelected.id && 
                  t.status === 'active' && 
                  (!t.round || t.round === currentSelected.round)
                );

                let count = 0;
                const interval = setInterval(() => {
                  setTabFirstPrize(generateLuckyNumber());
                  count++;
                  if (count > 25) {
                    clearInterval(interval);
                    
                    let finalWinner = '';
                    if (activeTicketsForDraw.length > 0) {
                      // Pick a REAL winner from the purchased tickets pool
                      const randomIndex = Math.floor(Math.random() * activeTicketsForDraw.length);
                      const winningTicket = activeTicketsForDraw[randomIndex];
                      finalWinner = winningTicket.ticketNumber.replace('#', '');
                      console.log(`[Draw] Selecting REAL winner from ${activeTicketsForDraw.length} tickets: #${finalWinner}`);
                    } else {
                      // Fallback to random if no tickets sold
                      finalWinner = generateLuckyNumber();
                      console.log(`[Draw] No tickets sold for ${currentSelected.id}, generated random number: #${finalWinner}`);
                    }

                    setTabFirstPrize(finalWinner);
                    setTabDrawRolling(false);
                    playNotificationSound('win');
                    triggerConfetti();
                  }
                }, 75);
              };

              const handlePublish = () => {
                if (!tabFirstPrize || tabDrawRolling) return;
                const consolation = tabFirstPrize.slice(3);
                const finalWinning = {
                  firstPrize: tabFirstPrize,
                  secondPrize: '',
                  thirdPrize: '',
                  consolationSuffix: consolation,
                };
                onExecuteDraw(currentSelected.id, finalWinning);
                fetch('/api/lottery/draw-executed', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    lotteryId: currentSelected.id,
                    round: currentSelected.round || 1,
                    winningNumbers: finalWinning,
                  }),
                }).catch(() => {});
                triggerHaptic('medium');
                playNotificationSound('win');
                triggerConfetti();
                setTabDrawSuccessMsg(`የ${currentSelected.titleAm} (ዙር ${currentSelected.round || 1}) ዕጣ ይፋ ወጥቷል!`);
                setTabFirstPrize('');
              };

              return (
                <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 space-y-3 text-center">
                  {/* Drum */}
                  <div className="py-2">
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                      1ኛ አሸናፊ ቁጥር (ሽልማት)
                    </span>
                    <div className={`text-4xl sm:text-5xl font-black font-mono tracking-widest my-1 ${
                      tabDrawRolling ? 'text-emerald-400 animate-pulse' : tabFirstPrize ? 'text-amber-400' : 'text-slate-600'
                    }`}>
                      #{tabFirstPrize || '------'}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      disabled={tabDrawRolling}
                      onClick={handleRollNumbers}
                      className="py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-xl text-xs transition active:scale-95 shadow disabled:opacity-50"
                    >
                      {tabDrawRolling ? 'እየተሽከረከረ ነው...' : tabFirstPrize ? 'ድጋሚ አሽከርክር' : 'ዕጣውን አሽከርክር'}
                    </button>
                    <button
                      type="button"
                      disabled={!tabFirstPrize || tabDrawRolling}
                      onClick={handlePublish}
                      className="py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black rounded-xl text-xs transition active:scale-95 shadow"
                    >
                      ይፋ አድርግ (Publish)
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Drawn Winners List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>ያለፉ የወጡ ዕጣዎች</span>
              </h3>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                {lotteries.filter(l => l.status === 'completed' || !!l.winningNumbers).length} ዕጣዎች
              </span>
            </div>

            {lotteries.filter(l => l.status === 'completed' || !!l.winningNumbers).length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/60 rounded-xl border border-slate-800/80">
                ምንም የወጣ ዕጣ የለም
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {lotteries
                  .filter(l => l.status === 'completed' || !!l.winningNumbers)
                  .map((d) => {
                    const winnerTicket = tickets.find(t => t.ticketNumber === d.winningNumbers?.firstPrize);
                    const winner = d.winnerDetails?.firstPrizeWinner || (winnerTicket ? {
                      name: winnerTicket.userName,
                      phone: winnerTicket.userPhone,
                      ticketNumber: winnerTicket.ticketNumber,
                    } : null);

                    return (
                      <div
                        key={d.id}
                        className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-xs">{d.titleAm}</span>
                            <span className="text-[10px] text-amber-300 font-mono">ዙር {d.round || 1}</span>
                          </div>
                          <div className="font-mono font-black text-yellow-400 text-sm mt-0.5">
                            #{d.winningNumbers?.firstPrize}
                          </div>
                          <div className="text-[10px] text-teal-400 font-mono mt-0.5">
                            {winner?.ticketNumber ? `አሸናፊ ትኬት: #${winner.ticketNumber}` : 'አልተሸጠም'}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-emerald-400 text-xs font-mono">
                            {d.id === 'lot_tv_32' || d.isItemPrize ? '32 Inch TV' : formatETB(d.jackpotAmount)}
                          </div>
                          <span className="text-[9px] text-slate-500 font-sans block mt-0.5">
                            {formatEthiopianDate(d.drawDate)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. TAB 5: Inventories */}
      {activeTab === 'inventories' && (
        <div className="space-y-3.5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-white">የትኬት ክምችት (Inventory)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddLotteryOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>አዲስ ጨምር</span>
              </button>
            </div>

            <div className="space-y-3">
              {activeLotteryList.map((lot) => {
                const sold = lot.ticketsSold || 0;
                const totalCap = lot.totalInventory || (lot.jackpotAmount === 50000 ? 300 : 150);
                const pct = Math.round((sold / totalCap) * 100);
                const isXO = lot.id === 'xo_game';
                return (
                  <div
                    key={lot.id}
                    className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-xs">{lot.titleAm}</span>
                        <span className="text-[10px] text-amber-300 font-mono">ዙር {lot.round || 1}</span>
                        {lockedLotteryIds?.includes(lot.id) && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/25 text-rose-300 border border-rose-500/50 text-[9px] font-black flex items-center gap-0.5 shadow-sm">
                            <Lock className="w-2.5 h-2.5" />
                            <span>የተቆለፈ</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setLockTargetLottery(lot);
                            triggerHaptic('medium');
                            playNotificationSound('click');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition active:scale-95 shadow-sm cursor-pointer ${
                            lockedLotteryIds?.includes(lot.id)
                              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50'
                              : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 hover:border-amber-500/40'
                          }`}
                          title={lockedLotteryIds?.includes(lot.id) ? "Unlock" : "Lock"}
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>{lockedLotteryIds?.includes(lot.id) ? '🔒 ተቆልፏል' : '🔑 ክፍት'}</span>
                        </button>
                        <span className="text-emerald-400 font-mono font-bold text-xs">
                          {isXO ? '20 - 200 ብር' : (lot.id === 'lot_tv_32' || lot.isItemPrize ? '32 Inch TV' : formatETB(lot.jackpotAmount))}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span>{isXO ? 'የጨዋታ ሁኔታ:' : 'ክምችት (Inventory):'} <strong className="text-white font-mono text-xs">{isXO ? (lockedLotteryIds?.includes(lot.id) ? 'የተቆለፈ (Locked)' : 'ንቁ (Active)') : `${sold} / ${totalCap}`}</strong></span>
                          {!isXO && sold >= totalCap && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-black text-[9px] animate-pulse border border-rose-400 shadow-[0_0_10px_rgba(225,29,72,0.5)]">
                              {totalCap} ሞልቷል ዕጣ አውጣ!
                            </span>
                          )}
                        </div>
                        {!isXO && <span className="font-mono text-emerald-400 font-bold">{pct}%</span>}
                      </div>
                      {!isXO && (
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all"
                            style={{ width: `${Math.max(5, Math.min(100, pct))}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {isXO ? (
                      <div className="w-full py-2 bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-cyan-500/40 text-cyan-300 font-bold rounded-lg text-xs text-center flex items-center justify-center gap-1.5 shadow-sm">
                        <span>🎮 የ XO ጨዋታ (Online Game)</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDrawTabLotteryId(lot.id);
                          setActiveTab('draw');
                          triggerHaptic('light');
                        }}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition"
                      >
                        ዕጣ አውጣ (Draw)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* New Lottery Modal */}
      {isAddLotteryOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl animate-in zoom-in-95 text-xs">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
              <h3 className="font-bold text-white text-sm">አዲስ ሎተሪ ፍጠር</h3>
              <button 
                type="button"
                onClick={() => setIsAddLotteryOpen(false)} 
                className="w-8 h-8 rounded-full bg-rose-500/25 hover:bg-rose-500/40 border border-rose-500/50 text-rose-400 hover:text-rose-200 font-bold flex items-center justify-center transition active:scale-95 shadow-md shadow-rose-950/40 shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
            <form onSubmit={handleCreateLottery} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">የሎተሪው ስም (አማርኛ)</label>
                <input
                  type="text"
                  required
                  value={newTitleAm}
                  onChange={(e) => setNewTitleAm(e.target.value)}
                  placeholder="ባለ 5,000 ብር ደራሽ"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">የትኬት ዋጋ (ብር)</label>
                  <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ሽልማት (ብር)</label>
                  <input
                    type="number"
                    required
                    value={newJackpot}
                    onChange={(e) => setNewJackpot(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-emerald-400 font-bold"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddLotteryOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  ተመለስ
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl"
                >
                  ፍጠር
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Screenshot Preview Modal */}
      {previewScreenshot && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewScreenshot(null)}
        >
          <div className="absolute top-4 right-4 z-[110]">
            <button
              type="button"
              onClick={() => setPreviewScreenshot(null)}
              className="w-10 h-10 rounded-full bg-rose-500/30 hover:bg-rose-500/50 border border-rose-500/60 text-rose-300 font-bold flex items-center justify-center transition active:scale-95 shadow-xl cursor-pointer"
              aria-label="Close"
            >
              <X className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          <div className="w-full max-w-xl max-h-[82vh] flex items-center justify-center relative p-2 my-auto">
            <img 
              src={previewScreenshot} 
              alt="Screenshot Receipt Preview" 
              className="max-w-full max-h-[80vh] object-contain shadow-2xl rounded-2xl border-2 border-emerald-500/40 bg-slate-950"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>

          <div className="mb-4 flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
            <a
              href={previewScreenshot}
              download="receipt_screenshot.png"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 shadow-lg"
            >
              <span>አውርድ (Download)</span>
            </a>
            <button
              type="button"
              onClick={() => setPreviewScreenshot(null)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer"
            >
              <span>ዝጋ (Close)</span>
            </button>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar for Admin */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.7)] pb-[max(env(safe-area-inset-bottom,0px),10px)]">
        <div className="max-w-md mx-auto px-2 py-1.5 grid grid-cols-5 gap-1 text-center">
          <button
            type="button"
            onClick={() => {
              setActiveTab('transactions');
              triggerHaptic('light');
            }}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition min-h-[44px] relative ${
              activeTab === 'transactions' ? 'text-emerald-400 bg-emerald-500/15 font-black' : 'text-slate-400'
            }`}
          >
            <DollarSign className="w-4 h-4 mx-auto" />
            <span className="text-[10px] mt-0.5 leading-none">ክፍያዎች</span>
            {pendingApprovals.length > 0 && (
              <span className="absolute -top-1 right-1 px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black text-[9px] rounded-full shadow">
                {pendingApprovals.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('users');
              triggerHaptic('light');
            }}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition min-h-[44px] relative ${
              activeTab === 'users' ? 'text-emerald-400 bg-emerald-500/15 font-black' : 'text-slate-400'
            }`}
          >
            <Users className="w-4 h-4 mx-auto" />
            <span className="text-[10px] mt-0.5 leading-none">ተጠቃሚዎች</span>
            {registeredUsers.length > 0 && (
              <span className="absolute -top-1 right-1 px-1.5 py-0.2 bg-teal-500 text-slate-950 font-black text-[9px] rounded-full shadow">
                {registeredUsers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('tickets');
              triggerHaptic('light');
            }}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition min-h-[44px] ${
              activeTab === 'tickets' ? 'text-emerald-400 bg-emerald-500/15 font-black' : 'text-slate-400'
            }`}
          >
            <TicketIcon className="w-4 h-4 mx-auto" />
            <span className="text-[10px] mt-0.5 leading-none">ትኬቶች</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('draw');
              triggerHaptic('light');
            }}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition min-h-[44px] relative ${
              activeTab === 'draw' ? 'text-amber-400 bg-amber-500/15 font-black' : 'text-slate-400'
            }`}
          >
            <Trophy className="w-4 h-4 mx-auto" />
            <span className="text-[10px] mt-0.5 leading-none">ዕጣ ማውጣት</span>
            {filledLotteries.length > 0 && (
              <span className="absolute -top-1.5 right-0.5 px-1 py-0.2 bg-red-600 text-white font-black text-[8px] rounded-full shadow-lg border border-red-400 animate-pulse">
                ሞልቷል!
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('inventories');
              triggerHaptic('light');
            }}
            className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition min-h-[44px] ${
              activeTab === 'inventories' ? 'text-emerald-400 bg-emerald-500/15 font-black' : 'text-slate-400'
            }`}
          >
            <Package className="w-4 h-4 mx-auto" />
            <span className="text-[10px] mt-0.5 leading-none">ክምችት</span>
          </button>
        </div>
      </nav>

      {/* 🔐 Lock / Unlock Confirmation Modal Requested by Owner */}
      {lockTargetLottery && (() => {
        const isCurrentlyLocked = (lockedLotteryIds || []).includes(lockTargetLottery.id);
        return (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-amber-500/50 rounded-3xl w-full max-w-sm p-6 space-y-4 text-center shadow-2xl animate-in zoom-in-95">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border shadow-lg ${
                isCurrentlyLocked
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-950/40'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-amber-950/40'
              }`}>
                {isCurrentlyLocked ? (
                  <Unlock className="w-8 h-8 text-emerald-400" />
                ) : (
                  <Lock className="w-8 h-8 text-amber-400" />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-mono font-bold text-amber-400">
                  {'የዚህን ሎተሪ መቆለፊያ (Individual Lottery Lock)'}
                </div>
                <h3 className="text-lg font-black text-white">
                  {isCurrentlyLocked ? `${lockTargetLottery.titleAm} ክፈት (Unlock)?` : `${lockTargetLottery.titleAm} ቆልፍ (Lock)?`}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed px-2">
                  {isCurrentlyLocked 
                    ? `ይህንን ሎተሪ ሲከፍቱ ተጠቃሚዎች ትኬት መቁረጥ ይችላሉ።`
                    : `ይህንን ሎተሪ ሲቆልፉ ተጠቃሚዎች ትኬት መቁረጥ አይችሉም።`}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onToggleLotteryLock?.(lockTargetLottery.id, !isCurrentlyLocked);
                    setLockTargetLottery(null);
                    triggerHaptic('heavy');
                    playNotificationSound(isCurrentlyLocked ? 'click' : 'alert');
                  }}
                  className={`py-3 text-slate-950 font-black rounded-xl text-sm transition active:scale-95 shadow-lg cursor-pointer ${
                    isCurrentlyLocked
                      ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25'
                      : 'bg-amber-500 hover:bg-amber-400 shadow-amber-500/25'
                  }`}
                >
                  አዎ
                </button>
                <button
                  type="button"
                  onClick={() => setLockTargetLottery(null)}
                  className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition active:scale-95 border border-slate-700 cursor-pointer"
                >
                  ይቅር
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

