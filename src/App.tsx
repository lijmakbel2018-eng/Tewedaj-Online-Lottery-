/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { LotteryHome } from './components/lottery/LotteryHome';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { 
  INITIAL_LOTTERIES, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_TICKETS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_USER 
} from './data/mockData';
import { 
  Language, 
  LotteryDraw, 
  PaymentMethod, 
  Ticket, 
  Transaction, 
  UserProfile, 
  WinnerNotification 
} from './types/lottery';
import { 
  generateSecurityHash, 
  playNotificationSound, 
  triggerConfetti,
  normalizeEthiopianPhone
} from './utils/lotteryUtils';
import { 
  initTelegramWebApp, 
  getTelegramUser, 
  setupTelegramBackButton,
  triggerHaptic 
} from './utils/telegram';
import { collection, doc, getDoc, setDoc, deleteDoc, onSnapshot, query, limit, where, or, orderBy } from 'firebase/firestore';
import { db, auth, safeFirestoreSetDoc, subscribeToKeriEtsa, subscribeToLotteryLocks, setFirestoreLotteryLock, handleFirestoreError, OperationType } from './lib/firebase';
import { 
  lotteryTv32BannerImage, 
  lottery1000BannerImage, 
  lottery5000BannerImage, 
  lottery10000BannerImage, 
  lottery20000BannerImage 
} from './assets/banknotes';

export default function App() {
  // Preload all lottery banner images instantly on Mini App mount for lightning fast opening
  useEffect(() => {
    const banners = [
      lotteryTv32BannerImage,
      lottery1000BannerImage,
      lottery5000BannerImage,
      lottery10000BannerImage,
      lottery20000BannerImage,
    ];
    banners.forEach((url) => {
      if (url) {
        const img = new Image();
        img.src = url;
      }
    });
  }, []);
  const [lang] = useState<Language>('am');
  const [currentView, setCurrentView] = useState<'home' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      const params = new URLSearchParams(search);
      if (
        params.get('admin') === 'true' || 
        params.get('view') === 'admin' || 
        search.includes('admin=true') || 
        hash.includes('admin')
      ) {
        return 'admin';
      }
    }
    return 'home';
  });
  const [lotteries, setLotteries] = useState<LotteryDraw[]>(INITIAL_LOTTERIES);
  const [adminTransactions, setAdminTransactions] = useState<Transaction[]>([]);
  const [isSyncingData, setIsSyncingData] = useState(true);

  const [user, setUser] = useState<UserProfile>(() => {
    const savedPhone = typeof window !== 'undefined' ? (localStorage.getItem('tewedaj_saved_phone') || localStorage.getItem('enat_user_phone') || '') : '';
    const isOwnerPhone = savedPhone.includes('0910961881') || savedPhone.includes('910961881');

    try {
      const saved = localStorage.getItem('enat_user_profile') || localStorage.getItem('gol_user_profile') || localStorage.getItem('enat_lottery_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          const isOwner = (parsed.phone && parsed.phone.includes('0910961881')) || parsed.telegramUsername?.toLowerCase().includes('lij_makbel') || parsed.telegramId === '5588110290';
          return {
            ...INITIAL_USER,
            ...parsed,
            phone: isOwner ? '0910961881' : (parsed.phone || savedPhone || ''),
            telegramUsername: isOwner ? '@lij_makbel' : (parsed.telegramUsername || ''),
            fullName: isOwner ? 'Makbel Maregu (Owner)' : (parsed.fullName || 'ተጠቃሚ'),
            isRegistered: true,
          };
        }
      }
    } catch {}
    if (isOwnerPhone) {
      return {
        ...INITIAL_USER,
        phone: '0910961881',
        telegramUsername: '@lij_makbel',
        telegramId: '5588110290',
        fullName: 'Makbel Maregu (Owner)',
        isRegistered: true,
        walletBalance: 50000,
      };
    }
    return {
      ...INITIAL_USER,
      phone: savedPhone,
    };
  });

  // Firebase Auth auto-signin for admin context
  useEffect(() => {
    const isAdminUser = (user.phone && (user.phone.includes('0910961881') || user.phone.includes('910961881'))) || 
                        (user.telegramUsername && user.telegramUsername.toLowerCase().includes('lij_makbel')) ||
                        user.telegramId === '5588110290';
    
    if (isAdminUser && !auth.currentUser) {
      import('firebase/auth').then(({ signInWithPopup, GoogleAuthProvider }) => {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider).catch(err => {
          console.warn('[Firebase Auth Auto-SignIn Failed]', err);
        });
      });
    }
  }, [user.phone, user.telegramUsername, user.telegramId]);

  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Purge all stale offline ticket caches from browser localStorage
  useEffect(() => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.includes('tickets') || key.includes('user_tickets') || key.includes('gol_tickets')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
  }, []);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      localStorage.removeItem('gol_user_transactions');
      const profileStr = localStorage.getItem('enat_user_profile') || localStorage.getItem('gol_user_profile');
      if (profileStr) {
        const u = JSON.parse(profileStr);
        const cleanPhone = u?.phone ? u.phone.replace(/\D/g, '') : '';
        if (cleanPhone) {
          const saved = localStorage.getItem(`enat_user_transactions_${cleanPhone}`);
          if (saved) {
            const list: Transaction[] = JSON.parse(saved);
            return list.filter(t => t.userPhone && t.userPhone.replace(/\D/g, '').endsWith(cleanPhone.slice(-9)));
          }
        }
      }
    } catch {}
    return [];
  });

  const [notifications, setNotifications] = useState<WinnerNotification[]>(INITIAL_NOTIFICATIONS);
  const creditedTxIdsRef = useRef<Set<string>>(new Set());
  const debitedTxIdsRef = useRef<Set<string>>(new Set());
  const rejectedTxIdsRef = useRef<Set<string>>(new Set());

  // Real-time Locked Lotteries State
  const [lockedLotteryIds, setLockedLotteryIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tewedaj_locked_lotteries');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    const checkLocks = () => {
      fetch('/api/lottery/locks')
        .then(r => r.json())
        .then(data => {
          if (data.ok && Array.isArray(data.lockedLotteryIds)) {
            setLockedLotteryIds(data.lockedLotteryIds);
            localStorage.setItem('tewedaj_locked_lotteries', JSON.stringify(data.lockedLotteryIds));
          }
        })
        .catch(() => {});
    };

    // 1. Immediate check
    checkLocks();

    // 2. Poll every 3 seconds for instant global sync across all users
    const interval = setInterval(checkLocks, 3000);

    // 3. Real-time listener from Firestore
    const unsub = subscribeToLotteryLocks((lockedIds) => {
      setLockedLotteryIds(lockedIds);
      localStorage.setItem('tewedaj_locked_lotteries', JSON.stringify(lockedIds));
    });

    return () => {
      clearInterval(interval);
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  const handleToggleLotteryLock = async (lotteryId: string, isLocked: boolean) => {
    let nextLocked = [...lockedLotteryIds];
    if (isLocked) {
      if (!nextLocked.includes(lotteryId)) {
        nextLocked.push(lotteryId);
      }
    } else {
      nextLocked = nextLocked.filter(id => id !== lotteryId);
    }
    
    setLockedLotteryIds(nextLocked);
    localStorage.setItem('tewedaj_locked_lotteries', JSON.stringify(nextLocked));

    fetch('/api/lottery/locks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lockedLotteryIds: nextLocked }),
    }).catch(() => {});

    await setFirestoreLotteryLock(lotteryId, isLocked, nextLocked);
  };

  useEffect(() => {
    transactions.forEach(t => {
      if (t.status === 'completed') {
        if (t.type === 'deposit') creditedTxIdsRef.current.add(t.id);
        if (t.type === 'withdrawal') debitedTxIdsRef.current.add(t.id);
      } else if (t.status === 'failed') {
        rejectedTxIdsRef.current.add(t.id);
      }
    });
  }, []);

  // Real-time Online Status Tracking
  useEffect(() => {
    const cleanPhone = user.phone ? normalizeEthiopianPhone(user.phone) : '';
    if (!cleanPhone && !user.id) return;

    const updateStatus = (status: 'online' | 'offline') => {
      // Use the canonical ID if available, fallback to user.id
      const tgId = user.telegramId || '';
      const canonicalId = (cleanPhone && cleanPhone.length >= 9)
        ? (cleanPhone.length === 10 ? cleanPhone : `0${cleanPhone.slice(-9)}`)
        : (tgId ? `tg_${tgId}` : user.id);

      if (!canonicalId) return;

      const body = JSON.stringify({ userId: canonicalId, phone: cleanPhone, status });
      if (status === 'offline' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/user/status', body);
      } else {
        fetch('/api/user/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        })
        .then(r => r.json())
        .then(data => {
          if (data.ok) {
            // console.log(`[Status Sync] User ${canonicalId} is ${status}`);
          }
        })
        .catch(() => {});
      }
    };

    // 1. Mark online on mount/visibility
    updateStatus('online');

    // 2. Heartbeat every 10 minutes to save daily write quota (RESOURCE_EXHAUSTED prevention)
    const heartbeat = setInterval(() => updateStatus('online'), 600000);

    // 3. Visibility handlers
    const handleVisibility = () => {
      updateStatus(document.visibilityState === 'visible' ? 'online' : 'offline');
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // 4. Cleanup on unmount/unload
    const handleUnload = () => updateStatus('offline');
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      updateStatus('offline');
    };
  }, [user.id, user.phone, user.telegramId]);

  // Authoritative Sync with Server on Mount
  // This ensures deleted items (by admin) are removed from local storage
  useEffect(() => {
    const cleanPhone = user.phone ? normalizeEthiopianPhone(user.phone) : '';
    if (cleanPhone && cleanPhone.length >= 9) {
      fetch(`/api/user/profile?phone=${cleanPhone}`)
        .then(r => r.json())
        .then(data => {
          if (data.ok && data.user) {
            setUser(prev => ({
              ...prev,
              ...data.user,
              walletBalance: data.user.walletBalance ?? prev.walletBalance,
            }));
            if (Array.isArray(data.tickets)) {
              setTickets(data.tickets);
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('enat_user_profile', JSON.stringify(user));
      localStorage.setItem('enat_lottery_user_profile', JSON.stringify(user));
      localStorage.setItem('gol_user_profile', JSON.stringify(user));
    } catch {}
    if (user.notifications) {
      setNotifications(prev => {
        const newNotifs = user.notifications || [];
        return newNotifs.map((n: any) => ({...n, id: n.id || 'notif_' + Math.random()}));
      });
    }
  }, [user]);

  useEffect(() => {
    try {
      const cleanPhone = user.phone ? user.phone.replace(/\D/g, '') : '';
      if (cleanPhone) {
        const myTxs = transactions.filter(t => t.userPhone && t.userPhone.replace(/\D/g, '').endsWith(cleanPhone.slice(-9)));
        localStorage.setItem(`enat_user_transactions_${cleanPhone}`, JSON.stringify(myTxs));
        const myTkts = tickets.filter(t => t.userPhone && t.userPhone.replace(/\D/g, '').endsWith(cleanPhone.slice(-9)));
        localStorage.setItem(`enat_user_tickets_${cleanPhone}`, JSON.stringify(myTkts));
      }
    } catch {}

    // Persist local cache of user transactions and tickets
  }, [transactions, tickets, user.phone]);

  useEffect(() => {
    initTelegramWebApp();
    const tgUser = getTelegramUser();

    // Parse URL query parameters passed from bot
    let urlPhone = '';
    let urlTgId = '';
    let urlUsername = '';
    let urlName = '';
    let urlCid = '';
    let urlAdmin = false;

    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      urlPhone = params.get('phone') || '';
      urlTgId = params.get('tg_id') || params.get('userId') || '';
      urlUsername = params.get('username') || '';
      urlName = params.get('name') || '';
      urlCid = params.get('cid') || '';
      urlAdmin = params.get('admin') === 'true';
    }

    let detectedCleanPhone = '';
    if (urlPhone) {
      let clean = urlPhone.replace(/\D/g, '');
      if (clean.startsWith('251')) clean = '0' + clean.slice(3);
      else if (clean.startsWith('9') || clean.startsWith('7')) clean = '0' + clean;
      detectedCleanPhone = clean;
    }

    const isExplicitAdmin = 
      urlAdmin || 
      (typeof window !== 'undefined' && (
        window.location.search.includes('admin=true') || 
        window.location.hash.includes('admin') ||
        (window as any).Telegram?.WebApp?.initDataUnsafe?.start_param === 'admin'
      ));

    setUser(prev => {
      const isOwner = 
        detectedCleanPhone.includes('0910961881') || 
        urlUsername.toLowerCase().includes('lij_makbel') ||
        (tgUser?.username && tgUser.username.toLowerCase().includes('lij_makbel')) ||
        (tgUser?.id && String(tgUser.id) === '5588110290') ||
        (prev.phone && prev.phone.includes('0910961881'));

      if (isExplicitAdmin && isOwner) {
        setCurrentView('admin');
      }

      const full = isOwner ? 'Makbel Maregu (Owner)' : (urlName || (tgUser ? `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() : '') || tgUser?.username || prev.fullName || 'ተጠቃሚ');
      const tgId = isOwner ? '5588110290' : (urlTgId || tgUser?.id?.toString() || prev.telegramId || '');
      const tgUsername = isOwner ? '@lij_makbel' : (urlUsername || (tgUser?.username ? `@${tgUser.username}` : prev.telegramUsername) || '');
      const phone = isOwner ? '0910961881' : (detectedCleanPhone || prev.phone || '');
      const customerId = isOwner ? 'TEWEDAJ-091881' : (urlCid || prev.customerId || undefined);

      const updated: UserProfile = {
        ...prev,
        phone,
        telegramId: tgId,
        telegramUsername: tgUsername,
        customerId,
        fullName: (prev.fullName && prev.fullName !== 'ተጠቃሚ' && !isOwner) ? prev.fullName : full,
        isRegistered: true,
      };

      if (phone) {
        try {
          const savedTxs = localStorage.getItem(`enat_user_transactions_${phone}`);
          if (savedTxs) {
            setTransactions(JSON.parse(savedTxs));
          }
          const savedTkts = localStorage.getItem(`enat_user_tickets_${phone}`);
          if (savedTkts) {
            setTickets(JSON.parse(savedTkts));
          }
        } catch {}
      }

      // Query database from backend by Telegram ID or phone to load official profile
      if (tgId || phone) {
        fetch(`/api/user/profile?telegramId=${encodeURIComponent(tgId)}&phone=${encodeURIComponent(phone)}`)
          .then(r => r.json())
          .then(data => {
            if (data.ok && data.user) {
              setUser(curr => {
                  const merged: UserProfile = {
                    ...curr,
                    id: data.user.userId || curr.id, // Important: sync the canonical ID
                    phone: data.user.phone || curr.phone,
                    customerId: data.user.customerId || curr.customerId || urlCid,
                    fullName: (data.user.fullName && data.user.fullName !== 'ተጠቃሚ') ? data.user.fullName : curr.fullName,
                    telegramUsername: data.user.username || curr.telegramUsername,
                    walletBalance: typeof data.user.walletBalance === 'number' ? data.user.walletBalance : curr.walletBalance,
                    ticketsCount: typeof data.user.ticketsCount === 'number' ? data.user.ticketsCount : curr.ticketsCount,
                    totalWon: typeof data.user.totalWon === 'number' ? data.user.totalWon : curr.totalWon,
                    isRegistered: true,
                  };
                try {
                  localStorage.setItem('enat_lottery_user_profile', JSON.stringify(merged));
                } catch {}
                return merged;
              });
            } else {
              // Register new profile if not found in database
              fetch('/api/user/wallet/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: tgId || phone,
                  telegramId: tgId,
                  phone,
                  fullName: updated.fullName,
                  username: tgUsername,
                  customerId: updated.customerId,
                }),
              })
                .then(r => r.json())
                .then(resData => {
                  if (resData.ok && resData.wallet) {
                    setUser(curr => ({
                      ...curr,
                      walletBalance: typeof resData.wallet.walletBalance === 'number' ? resData.wallet.walletBalance : curr.walletBalance,
                      customerId: resData.wallet.customerId || curr.customerId,
                      phone: resData.wallet.phone || curr.phone,
                      fullName: resData.wallet.fullName || curr.fullName,
                    }));
                  }
                })
                .catch(() => {});
            }
          })
          .catch(() => {});
      }

      return updated;
    });
  }, []);

  // 1. Single Authoritative Real-time Firestore onSnapshot for User Wallet with REST fallback
  useEffect(() => {
    const cleanPhone = user.phone ? normalizeEthiopianPhone(user.phone) : '';
    const tgId = user.telegramId || '';
    
    const canonicalKey = (cleanPhone && cleanPhone.length >= 9)
      ? (cleanPhone.length === 10 ? cleanPhone : `0${cleanPhone.slice(-9)}`)
      : (tgId ? `tg_${tgId}` : user.id);

    if (!canonicalKey) return;

    let unsub: (() => void) | null = null;
    let pollInterval: any = null;

    const startPollFallback = () => {
      if (pollInterval) return;
      pollInterval = setInterval(() => {
        fetch(`/api/user/profile?phone=${encodeURIComponent(cleanPhone)}&telegramId=${encodeURIComponent(tgId)}`)
          .then(r => r.json())
          .then(data => {
            if (data.ok && data.user) {
              setUser(prev => ({
                ...prev,
                walletBalance: typeof data.user.walletBalance === 'number' ? data.user.walletBalance : prev.walletBalance,
                ticketsCount: typeof data.user.ticketsCount === 'number' ? data.user.ticketsCount : prev.ticketsCount,
                totalWon: typeof data.user.totalWon === 'number' ? data.user.totalWon : prev.totalWon,
              }));
            }
          })
          .catch(() => {});
      }, 10000);
    };

    try {
      const userDocRef = doc(db, 'wallets', canonicalKey);
      unsub = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          if (data) {
            setUser(prev => {
              const nextBal = typeof data.walletBalance === 'number' 
                ? data.walletBalance 
                : (typeof data.balance === 'number' ? data.balance : prev.walletBalance);
              const nextTickets = typeof data.ticketsCount === 'number' ? data.ticketsCount : prev.ticketsCount;
              const nextWon = typeof data.totalWon === 'number' ? data.totalWon : prev.totalWon;
              const nextName = (data.fullName && data.fullName !== 'ተጠቃሚ' && !data.fullName.startsWith('ተጠቃሚ (')) ? data.fullName : prev.fullName;
              const nextPhone = data.phone || prev.phone;
              const nextTgId = data.telegramId || prev.telegramId;

              if (
                prev.walletBalance === nextBal &&
                prev.ticketsCount === nextTickets &&
                prev.totalWon === nextWon &&
                prev.fullName === nextName &&
                prev.phone === nextPhone &&
                prev.telegramId === nextTgId &&
                prev.id === canonicalKey
              ) {
                return prev;
              }

              return {
                ...prev,
                id: canonicalKey,
                walletBalance: nextBal,
                ticketsCount: nextTickets,
                totalWon: nextWon,
                fullName: nextName,
                phone: nextPhone,
                telegramId: nextTgId,
              };
            });
          }
        }
        setIsSyncingData(false);
      }, (err) => {
        try {
          handleFirestoreError(err, OperationType.GET, `wallets/${canonicalKey}`);
        } catch {}
        setIsSyncingData(false);
        if (unsub) { unsub(); unsub = null; }
        startPollFallback();
      });
    } catch (e) {
      startPollFallback();
    }

    return () => {
      if (unsub) unsub();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [user.phone, user.telegramId, user.id]);

  // 2. Real-time Firestore onSnapshot for Transactions with REST fallback
  useEffect(() => {
    const cleanUserPhone = user.phone ? normalizeEthiopianPhone(user.phone) : '';
    const isAdminView = currentView === 'admin' || cleanUserPhone.includes('910961881');
    const tgId = user.telegramId || '';
    
    let unsub: (() => void) | null = null;
    let pollInterval: any = null;

    const startPollFallback = () => {
      if (pollInterval) return;
      pollInterval = setInterval(() => {
        if (isAdminView) {
          fetch('/api/admin/transactions')
            .then(r => r.json())
            .then(data => {
              if (data.ok && Array.isArray(data.transactions)) {
                setTransactions(data.transactions);
                setAdminTransactions(data.transactions);
              }
            })
            .catch(() => {});
        } else if (cleanUserPhone || tgId) {
          fetch(`/api/user/profile?phone=${encodeURIComponent(cleanUserPhone)}&telegramId=${encodeURIComponent(tgId)}`)
            .then(r => r.json())
            .then(data => {
              if (data.ok) {
                if (Array.isArray(data.transactions)) {
                  setTransactions(data.transactions);
                }
              }
            })
            .catch(() => {});
        }
      }, 5000);
    };

    if (isAdminView) {
      fetch('/api/admin/transactions')
        .then(r => r.json())
        .then(data => {
          if (data.ok && Array.isArray(data.transactions)) {
            setAdminTransactions(data.transactions);
          }
        })
        .catch(() => {});
    }

    const q = query(collection(db, 'transactions'), limit(300));

    try {
      unsub = onSnapshot(q, (snapshot) => {
        const allList = snapshot.docs.map(d => d.data() as Transaction);
        const tgId = user.telegramId || '';
        const uid = user.id || '';

        const userTxs = isAdminView 
          ? allList 
          : allList.filter(t => {
              if (cleanUserPhone && t.userPhone) {
                const p = normalizeEthiopianPhone(t.userPhone);
                if (p && (p === cleanUserPhone || p.endsWith(cleanUserPhone.slice(-9)))) return true;
              }
              if (t.userId && (t.userId === uid || (tgId && (t.userId === tgId || t.userId === `tg_${tgId}`)))) return true;
              return false;
            });

        userTxs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        
        setTransactions(userTxs);
        if (isAdminView) {
          setAdminTransactions(userTxs);
        }

        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const t = change.doc.data() as Transaction;
            if (t.status === 'completed' && t.type === 'deposit') {
              playNotificationSound('win');
              triggerConfetti();
              // Note: The user's wallet document listener (doc(db, 'wallets', id)) authoritatively sets walletBalance.
              // Do NOT do manual prev.walletBalance + t.amount here to prevent double crediting.
            }
          }
        });
      }, (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'transactions');
        } catch {}
        if (unsub) { unsub(); unsub = null; }
        startPollFallback();
      });
    } catch (e) {
      startPollFallback();
    }

    return () => {
      if (unsub) unsub();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [user.id, user.phone, user.telegramId, currentView]);

  // 4. Real-time Firestore onSnapshot for Sold Tickets
  useEffect(() => {
    const cleanUserPhone = user.phone ? normalizeEthiopianPhone(user.phone) : '';
    const isAdminView = currentView === 'admin' || cleanUserPhone.includes('910961881');
    
    let unsub: (() => void) | null = null;
    let pollInterval: any = null;

    const startPollFallback = () => {
      if (pollInterval) return;
      pollInterval = setInterval(() => {
        if (cleanUserPhone) {
          fetch(`/api/user/profile?phone=${encodeURIComponent(cleanUserPhone)}`)
            .then(r => r.json())
            .then(data => {
              if (data.ok && Array.isArray(data.tickets)) {
                setTickets(data.tickets);
              }
            })
            .catch(() => {});
        }
      }, 10000);
    };

    const q = query(collection(db, 'tickets'), limit(300));

    try {
      unsub = onSnapshot(q, (snapshot) => {
        const allList = snapshot.docs.map(d => d.data() as Ticket);
        const tgId = user.telegramId || '';
        const uid = user.id || '';

        const userTickets = isAdminView
          ? allList
          : allList.filter(st => {
              if (cleanUserPhone && st.userPhone) {
                const p = normalizeEthiopianPhone(st.userPhone);
                if (p && (p === cleanUserPhone || p.endsWith(cleanUserPhone.slice(-9)))) return true;
              }
              if (st.userId && (st.userId === uid || (tgId && (st.userId === tgId || st.userId === `tg_${tgId}`)))) return true;
              return false;
            });

        userTickets.sort((a, b) => new Date(b.purchasedAt || 0).getTime() - new Date(a.purchasedAt || 0).getTime());
        setTickets(userTickets);
      }, (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'tickets');
        } catch {}
        if (unsub) { unsub(); unsub = null; }
        startPollFallback();
      });
    } catch (e) {
      startPollFallback();
    }

    return () => {
      if (unsub) unsub();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [currentView, user.id, user.phone]);

  // 5. Real-time Firestore onSnapshot for Keri Etsa / Ticket Volume Counts
  useEffect(() => {
    const unsub = subscribeToKeriEtsa((summary) => {
      if (summary && typeof summary === 'object') {
        setLotteries(prev => prev.map(lot => {
          const info = summary[lot.id];
          if (info && typeof info.ticketsSold === 'number') {
            return {
              ...lot,
              ticketsSold: info.ticketsSold,
            };
          }
          return lot;
        }));
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const cleanup = setupTelegramBackButton(() => {
      triggerHaptic('light');
      setCurrentView('home');
    }, currentView === 'admin');
    return cleanup;
  }, [currentView]);

  const computeUserAvailableBalance = (
    currentUser: UserProfile,
    _txList: Transaction[],
    _tktList: Ticket[]
  ): number => {
    // Authoritative source: trust the walletBalance synced from Firestore/Server
    // If it's 0, it might be a sync delay, but we shouldn't block the user if they know they have money.
    // However, the most reliable source for the UI is the synced profile.
    return Number(currentUser.walletBalance) || 0;
  };

  const handleBuyTickets = (
    lottery: LotteryDraw,
    ticketNumbers: string[],
    method: PaymentMethod,
    reference: string,
    phone: string,
    fullName?: string
  ) => {
    const now = new Date().toISOString();
    const capacity = lottery.totalInventory || (lottery.jackpotAmount === 50000 ? 300 : 150);
    const currentRound = lottery.round || 1;
    const currentSold = lottery.ticketsSold || 0;

    if (fullName?.trim()) {
      setUser(prev => ({ ...prev, fullName: fullName.trim() }));
    }
    if (phone?.trim()) {
      setUser(prev => ({ ...prev, phone: phone.trim() }));
    }

    const assignedBuyerPhone = phone?.trim() || user.phone || '';
    if (!assignedBuyerPhone) {
      alert('እባክዎ መጀመሪያ ስልክ ቁጥርዎን ያስመዝግቡ!');
      return;
    }
    const assignedBuyerName = (fullName?.trim() && fullName.trim() !== 'ተጠቃሚ' && fullName.trim() !== 'ደንበኛ')
      ? fullName.trim() 
      : ((user.fullName && user.fullName !== 'ተጠቃሚ' && user.fullName !== 'ደንበኛ') ? user.fullName : (assignedBuyerPhone || 'ደንበኛ'));

    const assignedRound = currentSold >= capacity ? currentRound + 1 : currentRound;

    const newTickets: Ticket[] = ticketNumbers.map((num) => ({
      id: 'tkt_' + Math.random().toString(36).substring(2, 9),
      lotteryId: lottery.id,
      lotteryTitleAm: `${lottery.titleAm} (ዙር ${assignedRound})`,
      lotteryTitleEn: `${lottery.titleEn} (Round ${assignedRound})`,
      ticketNumber: num,
      userId: user.id,
      userName: assignedBuyerName,
      userPhone: assignedBuyerPhone,
      userTelegram: user.telegramUsername ? (user.telegramUsername.startsWith('@') ? user.telegramUsername : `@${user.telegramUsername}`) : undefined,
      userAvatar: user.avatarUrl,
      pricePaid: lottery.ticketPrice,
      purchasedAt: now,
      paymentMethod: method,
      paymentReference: reference,
      round: assignedRound,
      status: 'active',
      securityHash: generateSecurityHash(num, lottery.id, now),
    }));

    const totalCost = lottery.ticketPrice * ticketNumbers.length;
    
    if (isSyncingData) {
      return;
    }

    // Removed local client-side balance check
    const newTx: Transaction = {
      id: 'tx_' + Date.now(),
      ticketId: newTickets[0]?.id,
      lotteryId: lottery.id,
      lotteryTitleAm: `${lottery.titleAm} (ዙር ${assignedRound})`,
      userId: user.id,
      telegramId: user.telegramId,
      customerId: user.customerId,
      userName: assignedBuyerName,
      userPhone: assignedBuyerPhone,
      amount: totalCost,
      type: 'ticket_purchase',
      paymentMethod: method,
      referenceNumber: reference,
      timestamp: now,
      status: 'completed',
      gatewayFee: Number((totalCost * 0.015).toFixed(2)),
    };

    setTickets(prev => [...newTickets, ...prev]);
    setTransactions(prev => [newTx, ...prev]);

    const nextSoldTotal = currentSold + ticketNumbers.length;

    // Save tickets and update keri_etsa directly in Firestore for real-time volume meter across all devices
    newTickets.forEach(tk => {
      safeFirestoreSetDoc(doc(db, 'tickets', tk.id), {
        ...tk,
        statusAm: 'ንቁ (Active)',
        paymentMethodAm: tk.paymentMethod === 'telebirr' ? 'ቴሌብር' : tk.paymentMethod === 'cbe_birr' ? 'የኢትዮጵያ ንግድ ባንክ' : 'ዋሌት',
        descriptionAm: `${tk.userName || 'ደንበኛ'} የ ${tk.lotteryTitleAm} ትኬት #${tk.ticketNumber} ቆርጧል`,
      }).catch(() => {});
    });
    // REMOVED: Direct write to 'keri_etsa' collection doc.
    // System now relies on throttled server sync of 'dashboard/overview' to save daily write quota.
    if (nextSoldTotal >= capacity) {
      fetch('/api/admin/notify-200-filled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lotteryId: lottery.id,
          titleAm: lottery.titleAm,
          round: currentRound,
          ticketsSold: Math.min(capacity, nextSoldTotal),
        }),
      }).catch(() => {});
    }

    setLotteries(prev => prev.map(l => {
      if (l.id === lottery.id) {
        return {
          ...l,
          status: 'active' as const,
          totalInventory: capacity,
          ticketsSold: Math.min(capacity, nextSoldTotal),
        };
      }
      return l;
    }));

    const currentBal = Number(user.walletBalance) || 0;
    const nextBal = method === 'wallet' ? Math.max(0, currentBal - totalCost) : currentBal;
    const nextCount = user.ticketsCount + ticketNumbers.length;

    setUser(prev => {
      const updated = {
        ...prev,
        walletBalance: nextBal,
        ticketsCount: nextCount,
      };
      try {
        localStorage.setItem('enat_user_profile', JSON.stringify(updated));
        localStorage.setItem('enat_lottery_user_profile', JSON.stringify(updated));
        localStorage.setItem('gol_user_profile', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    fetch('/api/user/wallet/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        phone: assignedBuyerPhone,
        telegramId: user.telegramId,
        walletBalance: nextBal,
        ticketsCount: nextCount,
        action: 'ticket_purchase',
      }),
    }).catch(() => {});

    // Sync directly to Firestore wallets document
    const cleanBuyerPhone = assignedBuyerPhone ? normalizeEthiopianPhone(assignedBuyerPhone) : '';
    const buyerDocId = (cleanBuyerPhone && cleanBuyerPhone.length >= 9)
      ? (cleanBuyerPhone.length === 10 ? cleanBuyerPhone : `0${cleanBuyerPhone.slice(-9)}`)
      : (user.telegramId ? `tg_${user.telegramId}` : user.id);
    if (buyerDocId) {
      safeFirestoreSetDoc(doc(db, 'wallets', buyerDocId), {
        walletBalance: nextBal,
        ticketsCount: nextCount,
        lastActive: new Date().toISOString(),
      }, { merge: true }).catch(() => {});
    }

    // Direct write each ticket to Firestore for instant real-time sync with Admin Dashboard
    newTickets.forEach(tk => {
      safeFirestoreSetDoc(doc(db, 'tickets', tk.id), {
        ...tk,
        statusAm: 'ንቁ (Active)',
        paymentMethodAm: 'ዋሌት',
        descriptionAm: `${tk.userName || 'ደንበኛ'} የ ${tk.lotteryTitleAm} ትኬት #${tk.ticketNumber} ቆርጧል`,
      }).catch(() => {});
    });

    fetch('/api/tickets/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newTickets,
        phone: assignedBuyerPhone,
        userId: user.id,
      }),
    })
    .then(r => r.json())
    .then(data => {
      if (data?.lotteryCounts && typeof data.lotteryCounts === 'object') {
        setLotteries(prev => prev.map(lot => {
          const serverSold = data.lotteryCounts[lot.id];
          if (typeof serverSold === 'number') {
            if (serverSold >= 150) {
              fetch('/api/admin/notify-200-filled', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  lotteryId: lot.id,
                  titleAm: lot.titleAm,
                  round: lot.round || 1,
                  ticketsSold: serverSold,
                }),
              }).catch(() => {});
            }
            return { ...lot, ticketsSold: serverSold };
          }
          return lot;
        }));
      }
    })
    .catch(err => console.error('[Save Tickets Error]', err));

    fetch('/api/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newTx,
        status: 'completed',
        userId: user.id,
        telegramId: user.telegramId,
      }),
    }).catch(() => {});
  };

  const handleDepositRequest = (
    amount: number,
    method: PaymentMethod,
    reference: string,
    phone: string,
    fullName?: string,
    screenshotUrl?: string
  ) => {
    const finalPhone = phone?.trim() || user.phone || '';
    if (!finalPhone) {
      return;
    }
    const finalUserName = fullName?.trim() || user.fullName || (finalPhone ? `ደንበኛ (${finalPhone})` : 'ደንበኛ');

    const cleanDigits = finalPhone ? normalizeEthiopianPhone(finalPhone) : '';
    const tgId = user.telegramId || '';
    const canonicalUserId = (cleanDigits && cleanDigits.length >= 9)
      ? (cleanDigits.length === 10 ? cleanDigits : `0${cleanDigits.slice(-9)}`)
      : (tgId ? `tg_${tgId}` : user.id);

    const newTx: Transaction = {
      id: 'tx_dep_' + Date.now(),
      lotteryId: 'wallet',
      lotteryTitleAm: method === 'telebirr' ? 'የዋሌት ገቢ (Telebirr)' : 'የዋሌት ገቢ (CBE)',
      userId: canonicalUserId,
      telegramId: user.telegramId,
      customerId: user.customerId,
      userName: finalUserName,
      userPhone: finalPhone,
      amount,
      type: 'deposit',
      paymentMethod: method,
      referenceNumber: reference,
      screenshotUrl: screenshotUrl || undefined,
      timestamp: new Date().toISOString(),
      status: 'pending',
      gatewayFee: 0,
    };

    setTransactions(prev => [newTx, ...prev]);
    setAdminTransactions(prev => [newTx, ...prev]);

    // Save phone & name immediately so customer is registered, but await Admin approval for balance credit
    setUser(prev => {
      const updatedUser: UserProfile = {
        ...prev,
        phone: finalPhone,
        fullName: finalUserName,
      };

      // Persist user details to backend
      fetch('/api/user/wallet/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: prev.id,
          phone: finalPhone,
          walletBalance: prev.walletBalance,
          fullName: finalUserName,
          ticketsCount: prev.ticketsCount,
        }),
      }).catch(() => {});

      try {
        localStorage.setItem('enat_user_profile', JSON.stringify(updatedUser));
        const cleanDigits = finalPhone.replace(/\D/g, '');
        if (cleanDigits) {
          localStorage.setItem('enat_user_phone', cleanDigits);
        }
      } catch {}

      return updatedUser;
    });

    playNotificationSound('click');
    triggerHaptic('medium');

    // Notify user that deposit request is pending admin approval in the mini app
    setNotifications(prev => [
      {
        id: 'notif_' + Date.now(),
        userId: user.id,
        userName: finalUserName,
        userPhone: finalPhone,
        lotteryId: 'wallet',
        lotteryTitleAm: 'የገቢ ጥያቄ (ይጠብቃል)',
        ticketNumber: reference,
        amountWon: 0,
        timestamp: new Date().toISOString(),
        isRead: false,
        messageAm: `የ ${amount.toLocaleString()} ብር የገቢ ጥያቄዎ ለአድሚን ተልኳል፤ አድሚኑ ሲያረጋግጥ (Approve) ዋሌትዎ ላይ ይገባል:: (ማጣቀሻ: ${reference})`,
        messageEn: `Deposit request of ${amount.toLocaleString()} ETB submitted for admin approval! (Ref: ${reference})`,
      },
      ...prev,
    ]);

    // Direct write to Firebase Firestore so admin instantly receives it in live onSnapshot listener
    safeFirestoreSetDoc(doc(db, 'transactions', newTx.id), {
      ...newTx,
      typeAm: 'የገንዘብ ማስገቢያ (ገቢ)',
      statusAm: 'በመጠባበቅ ላይ',
      paymentMethodAm: method === 'telebirr' ? 'ቴሌብር' : 'የኢትዮጵያ ንግድ ባንክ',
      descriptionAm: `የ ${amount.toLocaleString()} ብር የገቢ ጥያቄ (${finalUserName} - ${finalPhone})`,
    }).catch(() => {});

    fetch('/api/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newTx,
        status: 'pending',
        userId: user.id,
        telegramId: user.telegramId,
      }),
    }).catch(err => console.error('[Notify Admin Error]', err));
  };

  const handleApproveDeposit = async (txId: string) => {
    const targetTx = adminTransactions.find(t => t.id === txId) || transactions.find(t => t.id === txId);
    if (!targetTx || targetTx.status === 'completed') return;

    const exactAmount = Number(targetTx.amount) || 0;

    // 1. Mark transaction completed in local transaction lists immediately for UI responsiveness
    setAdminTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: 'completed' as const, approvedBy: 'Admin (0910961881)' } : t));
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: 'completed' as const, approvedBy: 'Admin (0910961881)' } : t));

    // 2. Direct Firestore update for transaction so all devices see 'completed'
    safeFirestoreSetDoc(doc(db, 'transactions', txId), {
      status: 'completed',
      statusAm: 'የተጠናቀቀ (ጸድቋል)',
      approvedBy: 'Admin (0910961881)',
      approvedAt: new Date().toISOString(),
    }, { merge: true }).catch(() => {});

    // 3. Send single authoritative approval to server endpoint which adds EXACTLY exactAmount once
    try {
      const res = await fetch(`/api/transactions/${txId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', approvedBy: 'Admin (0910961881)' }),
      });
      const data = await res.json();
      if (data.ok && typeof data.walletBalance === 'number') {
        const cleanTargetPhone = targetTx.userPhone ? normalizeEthiopianPhone(targetTx.userPhone) : '';
        const cleanUserPhone = user.phone ? normalizeEthiopianPhone(user.phone) : '';
        const isTargetCurrentUser = Boolean(
          (cleanTargetPhone && cleanUserPhone && cleanTargetPhone.endsWith(cleanUserPhone.slice(-9))) ||
          (targetTx.userId && (targetTx.userId === user.id || targetTx.userId === user.telegramId))
        );
        if (isTargetCurrentUser) {
          setUser(prev => ({ ...prev, walletBalance: data.walletBalance }));
        }
      }
    } catch (err) {
      console.error('[Approve Deposit Network Error]', err);
    }

    playNotificationSound('win');
    triggerConfetti();
  };

  const handleRejectDeposit = async (txId: string) => {
    setAdminTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: 'failed' as const } : t));
    setTransactions(prev => prev.map(t => {
      if (t.id === txId) {
        return { ...t, status: 'failed' as const };
      }
      return t;
    }));

    safeFirestoreSetDoc(doc(db, 'transactions', txId), {
      status: 'failed',
      statusAm: 'ውድቅ የተደረገ',
      approvedBy: 'Admin (0910961881)',
      approvedAt: new Date().toISOString(),
    }, { merge: true }).catch(() => {});

    fetch(`/api/transactions/${txId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'failed', approvedBy: 'Admin (0910961881)' }),
    }).catch(() => {});

    playNotificationSound('click');
  };

  const handleDeleteTransactions = async (txIds: string[]) => {
    if (!txIds || txIds.length === 0) return;
    const idsSet = new Set(txIds);

    const toDelete = [...adminTransactions, ...transactions].filter(t => idsSet.has(t.id));

    // 1. Adjust user balance if user's transactions were deleted
    for (const t of toDelete) {
      const cleanTargetPhone = t.userPhone ? t.userPhone.replace(/\D/g, '') : '';
      const cleanUserPhone = user.phone ? user.phone.replace(/\D/g, '') : '';
      const isCurrentUser = (cleanTargetPhone && cleanUserPhone && cleanTargetPhone.endsWith(cleanUserPhone.slice(-9))) || t.userId === user.id;
      if (isCurrentUser) {
        if (t.type === 'deposit' && t.status === 'completed') {
          setUser(prev => ({
            ...prev,
            walletBalance: Math.max(0, prev.walletBalance - Number(t.amount)),
          }));
        } else if (t.type === 'withdrawal' && (t.status === 'completed' || t.status === 'pending')) {
          setUser(prev => ({
            ...prev,
            walletBalance: prev.walletBalance + Number(t.amount),
          }));
        }
      }
    }

    // 2. Update local state
    setTransactions(prev => {
      const updated = prev.filter(t => !idsSet.has(t.id));
      const cleanPhone = user.phone ? user.phone.replace(/\D/g, '') : '';
      if (cleanPhone) {
        try {
          localStorage.setItem(`enat_user_transactions_${cleanPhone}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    setAdminTransactions(prev => prev.filter(t => !idsSet.has(t.id)));

    // 3. Delete from Firestore
    for (const id of txIds) {
      try {
        await deleteDoc(doc(db, 'transactions', id));
      } catch (err) {
        console.warn(`[Firestore Delete Transaction Error: ${id}]`, err);
      }
    }

    // 4. Notify backend
    fetch('/api/transactions/delete-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionIds: txIds, phone: user.phone, userId: user.id }),
    }).catch(err => console.error('[Delete Transactions Error]', err));
  };

  const handleDeleteTransaction = async (txId: string) => {
    const target = adminTransactions.find(t => t.id === txId) || transactions.find(t => t.id === txId);

    // Adjust user balance if user's transaction was deleted
    if (target) {
      const cleanTargetPhone = target.userPhone ? target.userPhone.replace(/\D/g, '') : '';
      const cleanUserPhone = user.phone ? user.phone.replace(/\D/g, '') : '';
      const isCurrentUser = (cleanTargetPhone && cleanUserPhone && cleanTargetPhone.endsWith(cleanUserPhone.slice(-9))) || target.userId === user.id;
      if (isCurrentUser) {
        if (target.type === 'deposit' && target.status === 'completed') {
          setUser(prev => ({
            ...prev,
            walletBalance: Math.max(0, prev.walletBalance - Number(target.amount)),
          }));
        } else if (target.type === 'withdrawal' && (target.status === 'completed' || target.status === 'pending')) {
          setUser(prev => ({
            ...prev,
            walletBalance: prev.walletBalance + Number(target.amount),
          }));
        }
      }
    }

    setAdminTransactions(prev => prev.filter(t => t.id !== txId));
    setTransactions(prev => prev.filter(t => t.id !== txId));
    
    // Delete from Firestore
    try {
      await deleteDoc(doc(db, 'transactions', txId));
    } catch {}

    try {
      const res = await fetch('/api/admin/transactions/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: txId }),
      });
      const data = await res.json();
      if (data.ok && data.wallet && user.phone) {
        const cleanUserPhone = user.phone.replace(/\D/g, '');
        const cleanWalletPhone = data.wallet.phone ? data.wallet.phone.replace(/\D/g, '') : '';
        if (cleanUserPhone && cleanWalletPhone && cleanWalletPhone.endsWith(cleanUserPhone.slice(-9))) {
          setUser(prev => ({
            ...prev,
            walletBalance: data.wallet.walletBalance ?? prev.walletBalance,
          }));
        }
      }
    } catch {}
  };

  const handleDeleteUser = async (userId: string, phone: string) => {
    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, phone }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    const targetTicket = tickets.find(t => t.id === ticketId);

    // 1. Remove from local tickets state and update localStorage
    setTickets(prev => {
      const updated = prev.filter(t => t.id !== ticketId);
      const cleanPhone = user.phone ? user.phone.replace(/\D/g, '') : '';
      if (cleanPhone) {
        try {
          localStorage.setItem(`enat_user_tickets_${cleanPhone}`, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });

    // 2. Remove associated purchase transaction if any
    setTransactions(prev => prev.filter(t => t.ticketId !== ticketId && t.id !== ticketId));
    setAdminTransactions(prev => prev.filter(t => t.ticketId !== ticketId && t.id !== ticketId));

    // Deduct count locally from lotteries immediately
    if (targetTicket) {
      setLotteries(prev => prev.map(l => {
        if (l.id === targetTicket.lotteryId || (l.ticketPrice === targetTicket.pricePaid)) {
          return { ...l, ticketsSold: Math.max(0, (l.ticketsSold || 1) - 1) };
        }
        return l;
      }));
    }

    // 3. Delete directly from Firestore tickets & transactions collection
    try {
      await deleteDoc(doc(db, 'tickets', String(ticketId)));
      await deleteDoc(doc(db, 'transactions', String(ticketId)));
    } catch {}

    // 4. Send request to backend to deduct from keri_etsa volume meter, user wallet, and Firestore overview
    try {
      const res = await fetch('/api/admin/tickets/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, userPhone: targetTicket?.userPhone || user.phone }),
      });
      const data = await res.json();
      if (data.ok && data.lotteryCounts) {
        setLotteries(prev => prev.map(lot => {
          const count = data.lotteryCounts[lot.id];
          if (typeof count === 'number') {
            return { ...lot, ticketsSold: Math.max(0, count) };
          }
          return lot;
        }));
      }
    } catch {}

    triggerHaptic('medium');
    playNotificationSound('click');
  };

  const handleWithdrawRequest = (amount: number, accountInfo: string, fullName?: string) => {
    if (user.walletBalance < amount) return;

    const finalFullName = fullName || user.fullName;

    setUser(prev => ({
      ...prev,
      walletBalance: Math.max(0, prev.walletBalance - amount),
      fullName: finalFullName,
    }));

    const finalPhone = user.phone || accountInfo;
    const newTx: Transaction = {
      id: 'tx_wth_' + Date.now(),
      lotteryId: 'wallet',
      lotteryTitleAm: 'የዋሌት ወጪ (Withdrawal Request)',
      userId: user.id,
      userName: finalFullName,
      userPhone: finalPhone,
      amount,
      type: 'withdrawal',
      paymentMethod: accountInfo.includes('CBE') ? 'cbe_birr' : 'telebirr',
      referenceNumber: 'WTH-' + Math.floor(100000 + Math.random() * 900000),
      paymentReference: accountInfo,
      timestamp: new Date().toISOString(),
      status: 'pending',
      gatewayFee: 0,
    };

    setTransactions(prev => [newTx, ...prev]);
    setAdminTransactions(prev => [newTx, ...prev]);
    playNotificationSound('click');

    // Direct write to Firebase Firestore so admin instantly receives it in live onSnapshot listener
    safeFirestoreSetDoc(doc(db, 'transactions', newTx.id), {
      ...newTx,
      typeAm: 'የገንዘብ ማውጣት (ወጪ)',
      statusAm: 'በመጠባበቅ ላይ',
      paymentMethodAm: accountInfo.includes('CBE') ? 'የኢትዮጵያ ንግድ ባንክ' : 'ቴሌብር',
      descriptionAm: `የ ${amount.toLocaleString()} ብር የወጪ ጥያቄ (${finalFullName} - ${accountInfo})`,
    }).catch(() => {});

    // Notify backend and Telegram bot asynchronously without blocking user UI
    fetch('/api/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newTx,
        userId: user.id,
        telegramId: user.telegramId,
      }),
    }).catch(err => console.warn('[Notify Admin Error]', err));
  };

  const handleApproveWithdrawal = async (txId: string) => {
    const targetTx = adminTransactions.find(t => t.id === txId) || transactions.find(t => t.id === txId);
    if (!targetTx || targetTx.status === 'completed') return;

    setAdminTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: 'completed' as const } : t));
    setTransactions(prev => prev.map(t => {
      if (t.id === txId) {
        return { ...t, status: 'completed' as const };
      }
      return t;
    }));

    safeFirestoreSetDoc(doc(db, 'transactions', txId), {
      status: 'completed',
      statusAm: 'የተጠናቀቀ (ጸድቋል)',
      approvedBy: 'Admin (0910961881)',
      approvedAt: new Date().toISOString(),
    }, { merge: true }).catch(() => {});

    fetch(`/api/transactions/${txId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed', approvedBy: 'Admin (0910961881)' }),
    }).catch(() => {});

    playNotificationSound('win');
  };

  const handleRejectWithdrawal = async (txId: string) => {
    const targetTx = adminTransactions.find(t => t.id === txId) || transactions.find(t => t.id === txId);
    if (!targetTx || targetTx.status === 'failed') return;

    setAdminTransactions(prev => prev.map(t => t.id === txId ? { ...t, status: 'failed' as const } : t));
    setTransactions(prev => prev.map(t => {
      if (t.id === txId) {
        return { ...t, status: 'failed' as const };
      }
      return t;
    }));

    safeFirestoreSetDoc(doc(db, 'transactions', txId), {
      status: 'failed',
      statusAm: 'ውድቅ የተደረገ',
      approvedBy: 'Admin (0910961881)',
      approvedAt: new Date().toISOString(),
    }, { merge: true }).catch(() => {});

    // Wallet refund is handled by the server status update.

    setUser(prev => {
      const cleanTargetPhone = targetTx.userPhone ? normalizeEthiopianPhone(targetTx.userPhone) : '';
      const cleanUserPhone = prev.phone ? normalizeEthiopianPhone(prev.phone) : '';
      if (cleanTargetPhone && cleanUserPhone && cleanTargetPhone.endsWith(cleanUserPhone.slice(-9))) {
        return {
          ...prev,
          walletBalance: prev.walletBalance + targetTx.amount,
        };
      }
      return prev;
    });

    fetch(`/api/transactions/${txId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'failed', approvedBy: 'Admin (0910961881)' }),
    }).catch(() => {});

    playNotificationSound('alert');
  };

  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        const queryParams = new URLSearchParams({
          userId: user.id,
          phone: user.phone || '',
          tgId: user.telegramId || '',
        });
        const res = await fetch(`/api/transactions/sync?${queryParams.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok) {
          if (data.wallet) {
            setUser(prev => {
              let changed = false;
              const upd = { ...prev };
              if (typeof data.wallet.walletBalance === 'number' && prev.walletBalance !== data.wallet.walletBalance) {
                upd.walletBalance = data.wallet.walletBalance;
                changed = true;
              }
              if (typeof data.wallet.ticketsCount === 'number' && prev.ticketsCount !== data.wallet.ticketsCount) {
                upd.ticketsCount = data.wallet.ticketsCount;
                changed = true;
              }
              if (typeof data.wallet.totalWon === 'number' && prev.totalWon !== data.wallet.totalWon) {
                upd.totalWon = data.wallet.totalWon;
                changed = true;
              }
              if (data.wallet.phone && data.wallet.phone.length >= 9 && (!prev.phone || prev.phone !== data.wallet.phone)) {
                upd.phone = data.wallet.phone;
                changed = true;
              }
              if (data.wallet.username && (!prev.telegramUsername || prev.telegramUsername !== data.wallet.username)) {
                upd.telegramUsername = data.wallet.username;
                changed = true;
              }
              if (data.wallet.fullName && (!prev.fullName || prev.fullName === 'ተጠቃሚ' || prev.fullName !== data.wallet.fullName)) {
                upd.fullName = data.wallet.fullName;
                changed = true;
              }
              if (data.wallet.profileImage && (!prev.avatarUrl || prev.avatarUrl !== data.wallet.profileImage)) {
                upd.avatarUrl = data.wallet.profileImage;
                changed = true;
              }
              return changed ? upd : prev;
            });
          }

          if (Array.isArray(data.transactions)) {
            const cleanPhone = user.phone ? normalizeEthiopianPhone(user.phone) : '';
            const tgId = user.telegramId || '';
            const uid = user.id || '';

            const isMatch = (stx: any) => {
              if (cleanPhone && stx.userPhone) {
                const p = normalizeEthiopianPhone(stx.userPhone);
                if (p && (p === cleanPhone || p.endsWith(cleanPhone.slice(-9)))) return true;
              }
              if (stx.userId && (stx.userId === uid || (tgId && (stx.userId === tgId || stx.userId === `tg_${tgId}`)))) return true;
              if (stx.telegramId && tgId && stx.telegramId === tgId) return true;
              return false;
            };

            const serverTxs: any[] = (cleanPhone || tgId) ? data.transactions.filter(isMatch) : data.transactions;

            serverTxs.forEach(stx => {
              const isMyTx = isMatch(stx);

                if (stx.type === 'prize_payout' && stx.status === 'completed') {
                  if (!creditedTxIdsRef.current.has(stx.id)) {
                    creditedTxIdsRef.current.add(stx.id);
                    if (isMyTx) {
                      fetch(`/api/user/profile?telegramId=${encodeURIComponent(user.telegramId || '')}&phone=${encodeURIComponent(user.phone || '')}`)
                        .then(r => r.json())
                        .then(data => {
                          if (data.ok && data.user) {
                            setUser(curr => ({
                              ...curr,
                              walletBalance: typeof data.user.walletBalance === 'number' ? data.user.walletBalance : curr.walletBalance,
                              totalWon: typeof data.user.totalWon === 'number' ? data.user.totalWon : curr.totalWon,
                            }));
                          }
                        }).catch(() => {});

                      const notif: WinnerNotification = {
                        id: 'notif_win_' + stx.id,
                        userId: user.id,
                        lotteryId: stx.lotteryId || 'derash',
                        lotteryTitleAm: stx.lotteryTitleAm || 'የዕጣ አሸናፊ',
                        ticketNumber: stx.ticketId || stx.referenceNumber || '000000',
                        amountWon: Number(stx.amount),
                        timestamp: stx.timestamp || new Date().toISOString(),
                        isRead: false,
                        messageAm: `🎉 እንኳን ደስ አለዎት! ${Number(stx.amount).toLocaleString()} ብር አሸንፈዋል! ገንዘቡ በቀጥታ ዋሌትዎ ላይ ገቢ ተደርጓል!`,
                        messageEn: `🎉 Congratulations! You won ${Number(stx.amount).toLocaleString()} ETB! The prize has been credited to your wallet!`,
                      };
                      setNotifications(prev => [notif, ...prev.filter(n => n.id !== notif.id)]);
                      playNotificationSound('win');
                      triggerConfetti();
                    }
                  }
                }

                if (stx.type === 'deposit' && stx.status === 'completed') {
                  if (!creditedTxIdsRef.current.has(stx.id)) {
                    creditedTxIdsRef.current.add(stx.id);
                    if (isMyTx) {
                      fetch(`/api/user/profile?telegramId=${encodeURIComponent(user.telegramId || '')}&phone=${encodeURIComponent(user.phone || '')}`)
                        .then(r => r.json())
                        .then(data => {
                          if (data.ok && data.user) {
                            setUser(curr => ({
                              ...curr,
                              walletBalance: typeof data.user.walletBalance === 'number' ? data.user.walletBalance : curr.walletBalance,
                            }));
                          }
                        }).catch(() => {});

                      const notif: WinnerNotification = {
                        id: 'notif_dep_appr_' + Date.now(),
                        userId: user.id,
                        lotteryId: 'wallet',
                        lotteryTitleAm: 'የዋሌት ገቢ ማረጋገጫ',
                        ticketNumber: '000000',
                        amountWon: Number(stx.amount),
                        timestamp: new Date().toISOString(),
                        isRead: false,
                        messageAm: `የገንዘብ ማስገቢያ ጥያቄዎ ጸድቋል! (${Number(stx.amount).toLocaleString()} ብር ገቢ ሆኗል)`,
                        messageEn: `Deposit approved! (${Number(stx.amount).toLocaleString()} ETB credited)`,
                      };
                      setNotifications(prev => [notif, ...prev]);
                      playNotificationSound('win');
                      triggerConfetti();
                    }
                  }
                }

                if (stx.type === 'withdrawal' && stx.status === 'completed') {
                  if (!debitedTxIdsRef.current.has(stx.id)) {
                    debitedTxIdsRef.current.add(stx.id);
                    if (isMyTx) {
                      const notif: WinnerNotification = {
                        id: 'notif_wth_appr_' + Date.now(),
                        userId: user.id,
                        lotteryId: 'wallet',
                        lotteryTitleAm: 'የገንዘብ ማውጣት ማረጋገጫ',
                        ticketNumber: '000000',
                        amountWon: Number(stx.amount),
                        timestamp: new Date().toISOString(),
                        isRead: false,
                        messageAm: `የ ${Number(stx.amount).toLocaleString()} ብር የማውጣት ጥያቄዎ ጸድቋል!`,
                        messageEn: `Withdrawal of ${Number(stx.amount).toLocaleString()} ETB was approved!`,
                      };
                      setNotifications(prev => [notif, ...prev]);
                      playNotificationSound('win');
                    }
                  }
                }

                if (stx.type === 'withdrawal' && stx.status === 'failed') {
                  if (!rejectedTxIdsRef.current.has(stx.id)) {
                    rejectedTxIdsRef.current.add(stx.id);
                    setTransactions(prev => {
                      const target = prev.find(t => t.id === stx.id && t.status === 'pending');
                      if (target) {
                        setUser(u => ({
                          ...u,
                          walletBalance: u.walletBalance + Number(stx.amount),
                        }));
                        const notif: WinnerNotification = {
                          id: 'notif_wth_fail_' + Date.now(),
                          userId: user.id,
                          lotteryId: 'wallet',
                          lotteryTitleAm: 'የገንዘብ ማውጣት ውድቅ ተደርጓል',
                          ticketNumber: '000000',
                          amountWon: 0,
                          timestamp: new Date().toISOString(),
                          isRead: false,
                          messageAm: `የ ${Number(stx.amount).toLocaleString()} ብር የማውጣት ጥያቄዎ ውድቅ ተደርጓል፤ ገንዘቡ ተመልሷል።`,
                          messageEn: `Withdrawal of ${Number(stx.amount).toLocaleString()} ETB was rejected. Funds refunded.`,
                        };
                        setNotifications(n => [notif, ...n]);
                        playNotificationSound('alert');
                      }
                      return prev;
                    });
                  }
                }
              });

              setTransactions(prev => {
                const map = new Map<string, Transaction>();
                serverTxs.forEach(stx => {
                  map.set(stx.id, {
                    id: stx.id,
                    lotteryId: stx.lotteryId || 'wallet',
                    lotteryTitleAm: stx.lotteryTitleAm || (stx.type === 'deposit' ? 'የዋሌት ገቢ' : (stx.type === 'withdrawal' ? 'የዋሌት ወጪ' : (stx.type === 'prize_payout' ? 'የዕጣ ሽልማት' : 'የትኬት ግዢ'))),
                    userId: stx.userId || user.id,
                    userName: stx.userName || user.fullName,
                    userPhone: stx.userPhone || user.phone,
                    amount: Number(stx.amount),
                    type: stx.type,
                    paymentMethod: stx.paymentMethod,
                    referenceNumber: stx.referenceNumber,
                    timestamp: stx.timestamp,
                    status: stx.status,
                    gatewayFee: 0,
                  });
                });
                prev.filter(t => isMatch(t)).forEach(t => {
                  if (!map.has(t.id)) map.set(t.id, t);
                });
                return Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              });
          }

          if (Array.isArray(data.notifications) && data.notifications.length > 0) {
            setNotifications(prev => {
              const map = new Map<string, WinnerNotification>();
              data.notifications.forEach((n: any) => map.set(n.id, n));
              prev.forEach(n => {
                if (!map.has(n.id)) map.set(n.id, n);
              });
              return Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            });
          }

          if (Array.isArray(data.tickets)) {
            const cleanPhone = user.phone ? normalizeEthiopianPhone(user.phone) : '';
            const tgId = user.telegramId || '';
            const uid = user.id || '';

            const isTktMatch = (st: any) => {
              if (cleanPhone && st.userPhone) {
                const p = normalizeEthiopianPhone(st.userPhone);
                if (p && (p === cleanPhone || p.endsWith(cleanPhone.slice(-9)))) return true;
              }
              if (st.userId && (st.userId === uid || (tgId && (st.userId === tgId || st.userId === `tg_${tgId}`)))) return true;
              return false;
            };

            const myServerTickets = (cleanPhone || tgId) ? data.tickets.filter(isTktMatch) : data.tickets;
            setTickets(prev => {
              const map = new Map<string, Ticket>();
              myServerTickets.forEach((st: any) => map.set(st.id, st));
              prev.filter(isTktMatch).forEach(t => {
                if (!map.has(t.id)) map.set(t.id, t);
              });
              return Array.from(map.values()).sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
            });
          }

          if (data.lotteryCounts && typeof data.lotteryCounts === 'object') {
            setLotteries(prev => prev.map(lot => {
              const serverSold = data.lotteryCounts[lot.id];
              if (typeof serverSold === 'number') {
                return { ...lot, ticketsSold: serverSold };
              }
              return lot;
            }));
          }
        }
      } catch {
        // silent sync error
      }
    }, 1500);
    return () => clearInterval(syncInterval);
  }, [user.id, user.phone, user.telegramId]);

  // Auto-sync computed available balance to user.walletBalance if higher
  useEffect(() => {
    if (!user.isRegistered && !user.phone && !user.telegramId) return;
    const computed = computeUserAvailableBalance(user, transactions, tickets);
    if (computed > user.walletBalance) {
      setUser(prev => {
        const next = { ...prev, walletBalance: computed };
        try {
          localStorage.setItem('enat_lottery_user_profile', JSON.stringify(next));
          localStorage.setItem('enat_user_profile', JSON.stringify(next));
        } catch {}
        return next;
      });
    }
  }, [transactions, tickets, user.phone, user.telegramId]);

  const handleRefreshWallet = () => {
    const tgId = user.telegramId || '';
    const phone = user.phone || '';
    const cleanPhone = phone ? normalizeEthiopianPhone(phone) : '';
    const uid = user.id || '';

    fetch(`/api/user/profile?telegramId=${encodeURIComponent(tgId)}&phone=${encodeURIComponent(cleanPhone)}&userId=${encodeURIComponent(uid)}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.user) {
          setUser(curr => {
            const nextBal = typeof data.user.walletBalance === 'number' ? Math.max(curr.walletBalance, data.user.walletBalance) : curr.walletBalance;
            const updated = {
              ...curr,
              walletBalance: nextBal,
              phone: data.user.phone || curr.phone,
              fullName: (data.user.fullName && data.user.fullName !== 'ተጠቃሚ') ? data.user.fullName : curr.fullName,
              ticketsCount: typeof data.user.ticketsCount === 'number' ? data.user.ticketsCount : curr.ticketsCount,
              totalWon: typeof data.user.totalWon === 'number' ? data.user.totalWon : curr.totalWon,
            };
            try {
              localStorage.setItem('enat_lottery_user_profile', JSON.stringify(updated));
              localStorage.setItem('enat_user_profile', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      })
      .catch(() => {});

    const canonicalKey = (cleanPhone && cleanPhone.length >= 9)
      ? (cleanPhone.length === 10 ? cleanPhone : `0${cleanPhone.slice(-9)}`)
      : (tgId ? `tg_${tgId}` : uid);
    if (canonicalKey) {
      getDoc(doc(db, 'wallets', canonicalKey))
        .then(snap => {
          if (snap.exists()) {
            const wData = snap.data() as any;
            if (typeof wData.walletBalance === 'number') {
              setUser(curr => {
                const nextBal = Math.max(curr.walletBalance, wData.walletBalance);
                return { ...curr, walletBalance: nextBal };
              });
            }
          }
        })
        .catch(() => {});
    }
  };

  // Continuous Real-Time Online Status Heartbeat for Active Users
  useEffect(() => {
    if (!user.phone && !user.telegramId) return;

    const sendOnlineStatus = (onlineState: boolean) => {
      const cleanPhone = user.phone ? normalizeEthiopianPhone(user.phone) : '';
      const docKey = (cleanPhone && cleanPhone.length >= 9)
        ? (cleanPhone.length === 10 ? cleanPhone : `0${cleanPhone.slice(-9)}`)
        : (user.telegramId ? `tg_${user.telegramId}` : user.id);

      const nowIso = new Date().toISOString();

      if (docKey) {
        safeFirestoreSetDoc(doc(db, 'wallets', docKey), {
          isOnline: onlineState,
          lastActive: nowIso,
        }, { merge: true }).catch(() => {});
      }

      fetch('/api/user/wallet/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          phone: user.phone,
          telegramId: user.telegramId,
          isOnline: onlineState,
          lastActive: nowIso,
        }),
      }).catch(() => {});
    };

    sendOnlineStatus(true);

    const interval = setInterval(() => {
      sendOnlineStatus(true);
    }, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        sendOnlineStatus(false);
      } else {
        sendOnlineStatus(true);
      }
    };

    const handleOff = () => sendOnlineStatus(false);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleOff);
    window.addEventListener('pagehide', handleOff);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleOff);
      window.removeEventListener('pagehide', handleOff);
      sendOnlineStatus(false);
    };
  }, [user.id, user.phone, user.telegramId]);

  useEffect(() => {
    if (!user.isRegistered || (!user.phone && !user.telegramId)) return;
    fetch('/api/user/wallet/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        phone: user.phone,
        telegramId: user.telegramId,
        ticketsCount: user.ticketsCount,
        totalWon: user.totalWon,
        isOnline: true,
        lastActive: new Date().toISOString(),
        ...(user.walletBalance > 0 ? { walletBalance: user.walletBalance } : {}),
      }),
    }).catch(() => {});
  }, [user.ticketsCount, user.totalWon, user.id, user.phone, user.telegramId, user.isRegistered]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onSnapshot(collection(db, 'transactions'), (snap) => {
        const firestoreList: Transaction[] = [];
        snap.forEach(d => {
          const t = d.data() as Transaction;
          if (t && t.id) firestoreList.push(t);
        });
        if (firestoreList.length > 0) {
          firestoreList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setAdminTransactions(firestoreList);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'transactions');
      });
    } catch (e) {
      console.warn('[Firestore Tx Snapshot error, using fallback]', e);
    }

    let isMounted = true;
    const fetchAdminTxs = () => {
      fetch('/api/admin/transactions')
        .then(r => r.json())
        .then(d => {
          if (isMounted && d.ok && Array.isArray(d.transactions)) {
            setAdminTransactions(prev => {
              const map = new Map<string, Transaction>();
              prev.forEach(t => map.set(t.id, t));
              d.transactions.forEach((t: Transaction) => map.set(t.id, t));
              const merged = Array.from(map.values());
              merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
              return merged;
            });
          }
        })
        .catch(() => {});
    };
    fetchAdminTxs();
    const interval = setInterval(fetchAdminTxs, 3000);
    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Real-time Firestore Notifications Listener for Wallet Push Alerts
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = onSnapshot(collection(db, 'notifications'), (snap) => {
        const notifList: WinnerNotification[] = [];
        const cleanPhone = user.phone ? normalizeEthiopianPhone(user.phone) : '';
        const tgId = user.telegramId || '';
        const uid = user.id || '';

        snap.forEach(d => {
          const n = d.data() as WinnerNotification;
          if (n && n.id) {
            const isMatch = n.userId === 'all' || 
              (uid && n.userId === uid) || 
              (tgId && (n.userId === tgId || n.userId === `tg_${tgId}` || n.userTelegram === tgId)) ||
              (cleanPhone && n.userPhone && normalizeEthiopianPhone(n.userPhone).endsWith(cleanPhone.slice(-9)));
            if (isMatch) notifList.push(n);
          }
        });

        if (notifList.length > 0) {
          notifList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setNotifications(prev => {
            const map = new Map<string, WinnerNotification>();
            notifList.forEach(n => map.set(n.id, n));
            prev.forEach(n => {
              if (!map.has(n.id)) map.set(n.id, n);
            });
            return Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          });
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      });
    } catch (e) {
      console.warn('[Firestore Notifications Snapshot error]', e);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user.phone, user.telegramId, user.id]);

  const handleExecuteDraw = (
    lotteryId: string,
    winningNumbers: { firstPrize: string; secondPrize: string; thirdPrize: string; consolationSuffix: string }
  ) => {
    try {
      const targetLottery = lotteries.find(l => l.id === lotteryId);
      if (!targetLottery) {
        console.error(`[Draw Error] Lottery not found: ${lotteryId}`);
        return;
      }

    const currentRound = targetLottery.round || 1;
    const cleanWinNum = String(winningNumbers.firstPrize).replace(/\D/g, '');
    const winningTicket = tickets.find(
      t => (t.lotteryId === lotteryId || t.ticketNumber === winningNumbers.firstPrize || t.ticketNumber.replace(/\D/g, '') === cleanWinNum) && (!t.round || t.round === currentRound)
    );

    const winnerDetails = {
      firstPrizeWinner: {
        ticketNumber: winningNumbers.firstPrize,
        name: winningTicket?.userName || user.fullName || 'ተጠቃሚ',
        phone: winningTicket?.userPhone || user.phone || '0910961881',
        telegram: winningTicket?.userTelegram || (user.telegramUsername ? (user.telegramUsername.startsWith('@') ? user.telegramUsername : `@${user.telegramUsername}`) : '@lij_makbel'),
        avatar: winningTicket?.userAvatar || user.avatarUrl || 'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=150&q=80',
      }
    };

    const completedRecord: LotteryDraw = {
      ...targetLottery,
      id: `drawn_${lotteryId}_r${currentRound}_${Date.now()}`,
      titleAm: `${targetLottery.titleAm} (ዙር ${currentRound})`,
      titleEn: `${targetLottery.titleEn} (Round ${currentRound})`,
      round: currentRound,
      status: 'completed' as const,
      ticketsSold: targetLottery.ticketsSold || 150,
      totalInventory: 150,
      winningNumbers,
      winnerDetails,
      drawDate: new Date().toISOString(),
    };

    setLotteries(prev => [
      completedRecord,
      ...prev.map(l => {
        if (l.id === lotteryId) {
          return {
            ...l,
            status: 'active' as const,
            round: currentRound + 1,
            totalInventory: 150,
            ticketsSold: 0,
            drawDate: new Date(Date.now() + 86400000 * 2).toISOString(),
            winningNumbers: undefined,
          };
        }
        return l;
      }),
    ]);

    fetch('/api/lottery/draw-executed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lotteryId,
        round: currentRound,
        winningNumbers,
      }),
    }).catch(() => {});

    let userWonAny = false;
    let totalWonInThisDraw = 0;

    setTickets(prevTickets => {
      return prevTickets.map(t => {
        if (t.lotteryId !== lotteryId || t.status !== 'active') return t;
        if (t.round && t.round !== currentRound) return t;

        const cleanTkt = t.ticketNumber.replace(/\D/g, '');
        if (cleanTkt === cleanWinNum || t.ticketNumber === winningNumbers.firstPrize || t.ticketNumber === `#${cleanWinNum}`) {
          userWonAny = true;
          totalWonInThisDraw += targetLottery.jackpotAmount;
          return {
            ...t,
            status: 'won' as const,
            prizeWon: targetLottery.jackpotAmount,
            prizeTitleAm: '1ኛ ዕጣ ሽልማት',
            prizeTitleEn: '1st Grand Prize',
          };
        }
        return {
          ...t,
          status: 'lost' as const,
        };
      });
    });

    if (userWonAny && totalWonInThisDraw > 0) {
      setUser(prev => ({
        ...prev,
        walletBalance: prev.walletBalance + totalWonInThisDraw,
        totalWon: prev.totalWon + totalWonInThisDraw,
      }));

      const payoutTx: Transaction = {
        id: 'tx_win_' + Date.now(),
        lotteryId,
        lotteryTitleAm: targetLottery.titleAm,
        userId: user.id,
        userName: user.fullName,
        userPhone: user.phone,
        amount: totalWonInThisDraw,
        type: 'prize_payout',
        paymentMethod: 'wallet',
        referenceNumber: 'WIN-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        timestamp: new Date().toISOString(),
        status: 'completed',
        gatewayFee: 0,
      };

      setTransactions(prev => [payoutTx, ...prev]);
      safeFirestoreSetDoc(doc(db, 'transactions', payoutTx.id), payoutTx, { merge: true }).catch(() => {});

      const winNotif: WinnerNotification = {
        id: 'notif_win_' + Date.now(),
        userId: user.id,
        lotteryId,
        lotteryTitleAm: targetLottery.titleAm,
        ticketNumber: winningNumbers.firstPrize,
        amountWon: totalWonInThisDraw,
        timestamp: new Date().toISOString(),
        isRead: false,
        messageAm: `🎉 እንኳን ደስ አለዎት! በ${targetLottery.titleAm} ${totalWonInThisDraw.toLocaleString()} ብር አሸንፈዋል! ገንዘቡ በቀጥታ ዋሌትዎ ላይ ገቢ ተደርጓል!`,
        messageEn: `🎉 Congratulations! You won ${totalWonInThisDraw.toLocaleString()} ETB in ${targetLottery.titleEn}! Credited to wallet!`,
      };
      setNotifications(prev => [winNotif, ...prev]);
      safeFirestoreSetDoc(doc(db, 'notifications', winNotif.id), winNotif, { merge: true }).catch(() => {});
      playNotificationSound('win');
      triggerConfetti();
    } else {
      const broadcastNotif: WinnerNotification = {
        id: 'notif_draw_' + Date.now(),
        userId: 'all',
        lotteryId,
        lotteryTitleAm: targetLottery.titleAm,
        ticketNumber: winningNumbers.firstPrize,
        amountWon: 0,
        timestamp: new Date().toISOString(),
        isRead: false,
        messageAm: `የ ${targetLottery.titleAm} ዕጣ ወጥቷል! አሸናፊ ቁጥር: #${winningNumbers.firstPrize}`,
        messageEn: `Draw completed for ${targetLottery.titleEn}! Winning number: #${winningNumbers.firstPrize}.`,
      };
      setNotifications(prev => [broadcastNotif, ...prev]);
      safeFirestoreSetDoc(doc(db, 'notifications', broadcastNotif.id), broadcastNotif, { merge: true }).catch(() => {});
    }
    } catch (err) {
      console.error('[handleExecuteDraw Error]', err);
    }
  };


  const handleBroadcastNotification = (messageAm: string, messageEn: string) => {
    const newNotif: WinnerNotification = {
      id: 'notif_bcast_' + Date.now(),
      userId: user.id,
      lotteryId: 'all',
      lotteryTitleAm: 'አጠቃላይ ማስታወቂያ',
      ticketNumber: '000000',
      amountWon: 0,
      timestamp: new Date().toISOString(),
      isRead: false,
      messageAm,
      messageEn,
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleAddLottery = (newLottery: LotteryDraw) => {
    setLotteries(prev => [newLottery, ...prev]);
  };

  // Real-time Global Ticket Progress Sync for ALL Users
  useEffect(() => {
    let active = true;
    const unsub = subscribeToKeriEtsa((summary) => {
      if (active && summary && typeof summary === 'object') {
        setLotteries(prev => prev.map(lot => {
          const info = summary[lot.id];
          if (info && typeof info.ticketsSold === 'number') {
            return {
              ...lot,
              ticketsSold: info.ticketsSold,
            };
          }
          return lot;
        }));
      }
    });

    return () => {
      active = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (currentView === 'admin') {
      const fetchAdminTxs = () => {
        fetch('/api/admin/transactions')
          .then(r => r.json())
          .then(data => {
            if (data.ok && Array.isArray(data.transactions)) {
              setAdminTransactions(data.transactions);
            }
          })
          .catch(() => {});
      };
      const fetchAdminTickets = () => {
        fetch('/api/admin/all-tickets')
          .then(r => r.json())
          .then(data => {
            if (data.ok && Array.isArray(data.tickets)) {
              setTickets(data.tickets);
            }
          })
          .catch(() => {});
      };
      
      // 1. Initial fetches
      fetchAdminTxs();
      fetchAdminTickets();

      // 2. Fallback Polling (Every 5 seconds instead of 2.5)
      const adminInterval = setInterval(() => {
        fetchAdminTxs();
        fetchAdminTickets();
      }, 5000);

      return () => {
        clearInterval(adminInterval);
      };
    }
  }, [currentView]);

  const hasValidPhone = Boolean(user.phone && user.phone.replace(/\D/g, '').length >= 9);


  const handleFullResetUser = async (phone: string) => {
    try {
      const res = await fetch('/api/admin/users/full-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (res.ok) {
        triggerHaptic('success');
        playNotificationSound('win');
        // If current user is the one being reset, update local state
        const cleanReset = normalizeEthiopianPhone(phone);
        const cleanUser = user.phone ? normalizeEthiopianPhone(user.phone) : '';
        if (cleanUser && cleanReset.endsWith(cleanUser.slice(-9))) {
          setUser(prev => ({
            ...prev,
            walletBalance: 0,
            ticketsCount: 0,
            totalWon: 0,
          }));
          setTickets([]);
        }
      }
      return res.ok;
    } catch {
      return false;
    }
  };

  const isStrictOwnerAdmin = Boolean(
    (user.phone && (user.phone.includes('0910961881') || user.phone.includes('910961881'))) || 
    (user.telegramUsername && user.telegramUsername.toLowerCase().includes('lij_makbel')) || 
    user.telegramId === '5588110290'
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center selection:bg-yellow-400 selection:text-slate-950">
      <div className="w-full max-w-md sm:max-w-lg min-h-screen bg-slate-950 flex flex-col relative sm:border-x sm:border-slate-800/80 shadow-2xl overflow-x-hidden">
        {currentView === 'admin' ? (
          isStrictOwnerAdmin ? (
            <AdminDashboard
              lang={lang}
              lotteries={lotteries}
              tickets={tickets}
              transactions={Array.from(new Map([...adminTransactions, ...transactions].map(t => [t.id, t])).values())}
              lockedLotteryIds={lockedLotteryIds}
              onToggleLotteryLock={handleToggleLotteryLock}
              onAddLottery={handleAddLottery}
              onExecuteDraw={handleExecuteDraw}
              onBroadcastNotification={handleBroadcastNotification}
              onApproveDeposit={handleApproveDeposit}
              onRejectDeposit={handleRejectDeposit}
              onApproveWithdrawal={handleApproveWithdrawal}
              onRejectWithdrawal={handleRejectWithdrawal}
              onDeleteTransaction={handleDeleteTransaction}
              onDeleteUser={handleDeleteUser}
              onDeleteTicket={handleDeleteTicket}
              onFullResetUser={handleFullResetUser}
              onBack={() => setCurrentView('home')}
            />
          ) : (
            <div className="p-8 text-center space-y-6 my-auto animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-full bg-rose-500/20 text-rose-400 border-2 border-rose-500/50 flex items-center justify-center mx-auto shadow-2xl shadow-rose-950/50">
                <span className="text-3xl">🔒</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-black text-rose-400 tracking-wide">
                  የደህንነት ጥበቃ (Access Restricted)
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                  የአድሚን መብት ለዋናው ባለቤት (<span className="text-emerald-400 font-mono">0910961881</span> / <span className="text-cyan-400 font-mono">@lij_makbel</span>) ብቻ በጥብቅ የተፈቀደ ነው።
                </p>
                <p className="text-[11px] text-slate-400">
                  ከባለቤቱ ውጭ ያለ ማንኛውም ተጠቃሚ የአድሚን ገጽን ማየት ወይም መጠቀም አይችልም።
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('home')}
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs transition shadow-lg active:scale-95 cursor-pointer"
              >
                ወደ ዋናው ገጽ ተመለስ (Back to Home)
              </button>
            </div>
          )
        ) : (
          <LotteryHome
            lang={lang}
            lotteries={lotteries}
            tickets={tickets}
            transactions={transactions}
            user={user}
            notifications={notifications}
            lockedLotteryIds={lockedLotteryIds}
            onClearNotification={(notifId) => {
              setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
            }}
            onBuyTickets={handleBuyTickets}
            onDepositRequest={handleDepositRequest}
            onWithdrawRequest={handleWithdrawRequest}
            onDeleteTransactions={handleDeleteTransactions}
            onDeleteTicket={handleDeleteTicket}
            onUpdateProfile={(updated) => setUser(prev => ({ ...prev, ...updated }))}
            onRefreshWallet={handleRefreshWallet}
            onNavigateToAdmin={() => setCurrentView('admin')}
          />
        )}
      </div>
    </div>
  );
}
