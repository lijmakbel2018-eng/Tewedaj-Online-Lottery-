import React, { useState, useEffect, useMemo, useRef } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Ticket as TicketIcon, 
  Sparkles, 
  CheckCircle2, 
  Trophy, 
  ShieldCheck, 
  Wallet, 
  Check, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownLeft,
  ArrowDownRight,
  RefreshCw,
  X, 
  Camera, 
  Plus,
  Loader2,
  Lock,
  Copy,
  Phone,
  Clock,
  Smartphone,
  Building2,
  Gamepad2,
  Home,
} from 'lucide-react';
import { Language, LotteryDraw, PaymentMethod, Ticket, Transaction, UserProfile, WinnerNotification } from '../../types/lottery';
import { 
  formatETB, 
  generateLuckyNumber, 
  playNotificationSound, 
  formatEthiopianDate,
  triggerConfetti,
  copyTextToClipboard,
  normalizeEthiopianPhone,
} from '../../utils/lotteryUtils';
import { triggerHaptic } from '../../utils/telegram';
import { 
  lottery1000BannerImage, 
  lottery5000BannerImage, 
  lottery10000BannerImage, 
  lottery20000BannerImage,
  lotteryTv32BannerImage,
  getBanknoteForLottery 
} from '../../assets/banknotes';
import { WinnersHistoryView } from './WinnersHistoryView';
import { WalletView } from './WalletView';
// Removed XO Game

import { subscribeToKeriEtsa } from '../../lib/firebase';

const CANONICAL_LOTTERIES_CONFIG: Array<{
  id: string;
  titleAm: string;
  titleEn: string;
  code: string;
  category: 'instant' | 'digital' | 'national';
  bannerUrl: string;
  ticketPrice: number;
  jackpotAmount: number;
  isItemPrize?: boolean;
  prizeItemName?: string;
  prizeItemNameAm?: string;
  totalInventory?: number;
}> = [
  {
    id: 'lot_tv_32',
    titleAm: '32 Inch TV ዕጣ',
    titleEn: '32 Inch TV Draw',
    code: 'TV-32',
    category: 'national',
    bannerUrl: lotteryTv32BannerImage,
    ticketPrice: 200,
    jackpotAmount: 0,
    isItemPrize: true,
    prizeItemName: '32 Inch TV',
    prizeItemNameAm: '32 Inch TV',
    totalInventory: 150,
  },
  {
    id: 'lot_derash_1000',
    titleAm: 'ባለ 1,000 ብር ደራሽ',
    titleEn: 'Bale 1,000 ETB Derash',
    code: 'DERASH-1K',
    category: 'instant',
    bannerUrl: lottery1000BannerImage,
    ticketPrice: 10,
    jackpotAmount: 1000,
    totalInventory: 150,
  },
  {
    id: 'lot_derash_5000',
    titleAm: 'ባለ 5,000 ብር ደራሽ',
    titleEn: 'Bale 5,000 ETB Derash',
    code: 'DERASH-5K',
    category: 'digital',
    bannerUrl: lottery5000BannerImage,
    ticketPrice: 50,
    jackpotAmount: 5000,
    totalInventory: 150,
  },
  {
    id: 'lot_derash_10000',
    titleAm: 'ባለ 10,000 ብር ደራሽ',
    titleEn: 'Bale 10,000 ETB Derash',
    code: 'DERASH-10K',
    category: 'national',
    bannerUrl: lottery10000BannerImage,
    ticketPrice: 100,
    jackpotAmount: 10000,
    totalInventory: 150,
  },
  {
    id: 'lot_derash_50000',
    titleAm: 'ባለ 50,000 ብር ደራሽ',
    titleEn: 'Bale 50,000 ETB Derash',
    code: 'DERASH-50K',
    category: 'national',
    bannerUrl: lottery20000BannerImage,
    ticketPrice: 200,
    jackpotAmount: 50000,
    totalInventory: 300,
  },
];

interface LotteryHomeProps {
  lang: Language;
  lotteries: LotteryDraw[];
  tickets: Ticket[];
  transactions?: Transaction[];
  user: UserProfile;
  pendingApprovalsCount?: number;
  notifications?: WinnerNotification[];
  onClearNotification?: (id: string) => void;
  onBuyTickets: (lottery: LotteryDraw, ticketNumbers: string[], method: PaymentMethod, reference: string, phone: string, fullName?: string) => void;
  onDepositRequest?: (amount: number, method: PaymentMethod, reference: string, phone: string, fullName?: string, screenshotUrl?: string) => void;
  onWithdrawRequest?: (amount: number, phone: string, fullName?: string) => void;
  onDeleteTransactions?: (txIds: string[]) => void;
  onDeleteTicket?: (ticketId: string) => void;
  onUpdateProfile?: (updated: Partial<UserProfile>) => void;
  onAuthSuccess?: (user: UserProfile, tickets?: Ticket[], transactions?: Transaction[]) => void;
  onLogout?: () => void;
  onRefreshWallet?: () => void;
  lockedLotteryIds?: string[];
  onNavigateToAdmin: () => void;
}

export const LotteryHome: React.FC<LotteryHomeProps> = ({
  lang,
  lotteries,
  tickets,
  transactions = [],
  user,
  notifications = [],
  onClearNotification,
  onBuyTickets,
  onDepositRequest,
  onWithdrawRequest,
  onDeleteTransactions,
  onDeleteTicket,
  onUpdateProfile,
  onRefreshWallet,
  lockedLotteryIds = [],
  onNavigateToAdmin,
}) => {
  const [activeMainTab, setActiveMainTab] = useState<'active' | 'drawn' | 'verify' | 'wallet'>('active');
  const [systemMaintenanceModal, setSystemMaintenanceModal] = useState<{ isOpen: boolean; lotteryTitle?: string } | null>(null);
  const [selectedLottery, setSelectedLottery] = useState<LotteryDraw | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [customNumbers, setCustomNumbers] = useState<string[]>([generateLuckyNumber()]);

  const cleanUserPhone = (user.phone || '').replace(/\D/g, '');
  const myTickets = (tickets || []).filter(t => {
    const tPhone = t.userPhone ? t.userPhone.replace(/\D/g, '') : '';
    const matchPhone = cleanUserPhone && tPhone && (tPhone.endsWith(cleanUserPhone.slice(-9)) || cleanUserPhone.endsWith(tPhone.slice(-9)));
    const matchUserId = user.id && (t.userId === user.id || t.userId === `tg_${user.telegramId}` || t.userId === user.telegramId);
    return matchPhone || matchUserId || (!cleanUserPhone && !user.telegramId);
  });

  // Calculate live effective wallet balance unified with approved transactions
  const userEffectiveBalance = Number(user.walletBalance) || 0;

  useEffect(() => {
    if (notifications.length > 0 && !notifications[0].isRead) {
      const timer = setTimeout(() => {
        onClearNotification?.(notifications[0].id);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications, onClearNotification]);

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);

  const [depositAmount, setDepositAmount] = useState<number | string>('');
  const [depositMethod, setDepositMethod] = useState<'telebirr' | 'cbe_birr'>('telebirr');
  const [depositRef, setDepositRef] = useState('');
  const [depositScreenshot, setDepositScreenshot] = useState<string | null>(null);
  const [depositScreenshotName, setDepositScreenshotName] = useState('');
  const [depositScreenshotError, setDepositScreenshotError] = useState<string | null>(null);
  const [depositPhone, setDepositPhone] = useState(user.phone || '');
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);
  const [copiedDepositKey, setCopiedDepositKey] = useState<string | null>(null);

  const [isCheckTicketModalOpen, setIsCheckTicketModalOpen] = useState(false);
  const [checkTicketNumber, setCheckTicketNumber] = useState('');
  const [checkTicketResult, setCheckTicketResult] = useState<{
    status: 'won' | 'lost' | 'active' | 'not_found';
    ticket?: Ticket;
  } | null>(null);

  const handleCheckTicket = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!checkTicketNumber.trim()) return;

    const num = checkTicketNumber.trim().replace('#', '');
    const found = tickets.find(t => t.ticketNumber === num || t.ticketNumber === `#${num}`);

    if (!found) {
      setCheckTicketResult({ status: 'not_found' });
    } else {
      setCheckTicketResult({
        status: found.status as any,
        ticket: found
      });
    }
    triggerHaptic('medium');
    playNotificationSound('click');
  };

  const handleCopyDepositAccount = (text: string, keyId: string) => {
    if (!text) return;
    copyTextToClipboard(text);
    setCopiedDepositKey(keyId);
    triggerHaptic('light');
    playNotificationSound('click');
    setTimeout(() => setCopiedDepositKey(null), 2000);
  };

  useEffect(() => {
    if (user.phone) {
      setDepositPhone(user.phone);
      setWithdrawAccountNumber(user.phone);
    }
    if (user.fullName) {
      setWithdrawFullName(user.fullName);
    }
  }, [user.phone, user.fullName]);

  const [withdrawAmount, setWithdrawAmount] = useState(50);
  const [withdrawAccountType, setWithdrawAccountType] = useState<'telebirr' | 'cbe'>('telebirr');
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState(user.phone || '');
  const [withdrawFullName, setWithdrawFullName] = useState(user.fullName || '');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState<string | null>(null);

  const [, setHeaderClicks] = useState(0);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [lockedLotteryModalOpen, setLockedLotteryModalOpen] = useState(false);
  const [purchasedSuccess, setPurchasedSuccess] = useState<{
    lotteryTitle: string;
    ticketNumbers: string[];
    reference: string;
    totalAmount: number;
    phone: string;
  } | null>(null);

  const [canConfirmPurchase, setCanConfirmPurchase] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const purchaseSafetyTimerRef = useRef<any>(null);

  // Global Real-Time Ticket Counts for ALL Users across the entire platform (Firebase Firestore Synced)
  const [globalLiveCounts, setGlobalLiveCounts] = useState<Record<string, number>>(() => {
    try {
      const cached = localStorage.getItem('tewedaj_keri_etsa');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return {};
  });

  useEffect(() => {
    let active = true;
    const unsubKeri = subscribeToKeriEtsa((summary) => {
      if (active && summary && typeof summary === 'object') {
        const counts: Record<string, number> = {};
        for (const [k, v] of Object.entries(summary)) {
          if (v && typeof (v as any).ticketsSold === 'number') {
            counts[k] = (v as any).ticketsSold;
            if ((v as any).lotteryId) {
              counts[(v as any).lotteryId] = (v as any).ticketsSold;
            }
          }
        }
        setGlobalLiveCounts(prev => {
          const updated = { ...prev, ...counts };
          try {
            localStorage.setItem('tewedaj_keri_etsa', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    });

    return () => {
      active = false;
      if (typeof unsubKeri === 'function') unsubKeri();
    };
  }, []);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          const maxDim = 800;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.65));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleScreenshotFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDepositScreenshotError(null);
    setDepositScreenshotName(file.name);
    try {
      const compressed = await compressImage(file);
      setDepositScreenshot(compressed);
    } catch {
      const reader = new FileReader();
      reader.onload = () => setDepositScreenshot(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePerformDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPhone = (user.phone || '').trim() || '0900000000';
    const numAmt = Number(depositAmount);
    if (!depositAmount || isNaN(numAmt) || numAmt < 10) {
      setDepositScreenshotError(lang === 'am' ? 'እባክዎ ከ 10 ብር ጀምሮ መጠን ያስገቡ!' : 'Please enter an amount starting from 10 ETB!');
      triggerHaptic('error');
      playNotificationSound('alert');
      return;
    }

    if (!depositScreenshot) {
      setDepositScreenshotError(lang === 'am' ? 'እባክዎ የተከፈለበትን የደረሰኝ ፎቶ (ስክሪን ሾት) ያያይዙ!' : 'Please upload the payment receipt screenshot!');
      triggerHaptic('error');
      playNotificationSound('alert');
      return;
    }

    setDepositSubmitting(true);
    const prefix = depositMethod === 'telebirr' ? 'DEP-TLB' : 'DEP-CBE';
    const finalRef = `${prefix}-${Math.floor(10000000 + Math.random() * 90000000)}`;

    if (onDepositRequest) {
      onDepositRequest(
        numAmt,
        depositMethod,
        finalRef,
        finalPhone,
        user.fullName || (user.phone ? `ደንበኛ (${user.phone})` : 'ደንበኛ'),
        depositScreenshot
      );
    }

    triggerHaptic('medium');
    playNotificationSound('win');
    triggerConfetti();

    setDepositSubmitting(false);

    setTimeout(() => {
      setIsDepositModalOpen(false);
      setDepositAmount('');
      setDepositRef('');
      setDepositScreenshot(null);
      setDepositScreenshotName('');
    }, 2000);
  };

  const handlePerformWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAccountNumber = withdrawAccountNumber.trim();
    const finalFullName = withdrawFullName.trim();
    
    if (withdrawAmount < 50 || withdrawAmount > user.walletBalance || !finalAccountNumber || !finalFullName) return;

    setWithdrawSubmitting(true);
    if (onWithdrawRequest) {
      // Pass the account type as part of the phone string or handle it differently in App.tsx
      // For now, following existing pattern but fixing the variable name and adding fullName
      onWithdrawRequest(
        withdrawAmount, 
        `${withdrawAccountType.toUpperCase()}: ${finalAccountNumber}`,
        finalFullName
      );
    }

    triggerHaptic('medium');
    playNotificationSound('click');
    setWithdrawSuccessMsg(
      lang === 'am' 
        ? `የ ${withdrawAmount.toLocaleString()} ብር የማውጣት ጥያቄ ለአድሚን ተልኳል! (${withdrawAccountType === 'telebirr' ? 'ቴሌብር' : 'ንግድ ባንክ (CBE)'}: ${finalAccountNumber})`
        : `Withdrawal request sent to admin! Funds will be transferred to your account (${withdrawAccountType.toUpperCase()}: ${finalAccountNumber}).`
    );
    setWithdrawSubmitting(false);

    setTimeout(() => {
      setWithdrawSuccessMsg(null);
      setIsWithdrawModalOpen(false);
    }, 2200);
  };

  const rawActiveLotteries: LotteryDraw[] = CANONICAL_LOTTERIES_CONFIG.map((config) => {
    const foundActive = lotteries.find(
      l => (l.status === 'active' || l.status === 'upcoming') && (
        l.id === config.id ||
        (config.id === 'lot_tv_32' && (l.id.includes('tv') || l.titleAm?.includes('ቲቪ'))) ||
        (config.id === 'lot_derash_50000' && (l.id.includes('50000') || (l.ticketPrice === 200 && !l.id.includes('tv') && !l.titleAm?.includes('ቲቪ')))) ||
        (config.id === 'lot_derash_1000' && (l.id.includes('1000') || l.ticketPrice === 10)) ||
        (config.id === 'lot_derash_5000' && (l.id.includes('5000') || l.ticketPrice === 50)) ||
        (config.id === 'lot_derash_10000' && (l.id.includes('10000') || l.ticketPrice === 100))
      )
    );
    const matchingTicketsCount = tickets.filter(t => {
      if (t.status === 'refunded') return false;
      if (t.lotteryId === config.id) return true;
      if (config.id === 'lot_tv_32' && (t.lotteryId === 'lot_tv_32' || t.lotteryId?.includes('tv') || t.lotteryTitleAm?.includes('ቲቪ'))) return true;
      if (config.id === 'lot_derash_1000' && (t.lotteryId === 'lot_derash_1000' || t.lotteryTitleAm?.includes('1,000') || (t.pricePaid === 10 && !t.lotteryId))) return true;
      if (config.id === 'lot_derash_5000' && (t.lotteryId === 'lot_derash_5000' || t.lotteryTitleAm?.includes('5,000') || (t.pricePaid === 50 && !t.lotteryId))) return true;
      if (config.id === 'lot_derash_10000' && (t.lotteryId === 'lot_derash_10000' || t.lotteryTitleAm?.includes('10,000') || (t.pricePaid === 100 && !t.lotteryId))) return true;
      if (config.id === 'lot_derash_50000' && (t.lotteryId === 'lot_derash_50000' || (!t.lotteryId?.includes('tv') && !t.lotteryTitleAm?.includes('ቲቪ') && (t.lotteryTitleAm?.includes('50,000') || (t.pricePaid === 200 && !t.lotteryId))))) return true;
      return false;
    }).length;

    const serverSold = Math.max(
      matchingTicketsCount,
      globalLiveCounts[config.id] ?? 0,
      foundActive?.ticketsSold || 0
    );
    const soldCount = Math.max(0, serverSold);
    const defaultInventory = config.totalInventory || (config.jackpotAmount === 50000 ? 300 : 150);

    if (foundActive) {
      return {
        ...foundActive,
        id: config.id, // Ensure canonical ID is used
        bannerUrl: config.bannerUrl || foundActive.bannerUrl || getBanknoteForLottery(config.ticketPrice, undefined, config.id),
        totalInventory: config.totalInventory || foundActive.totalInventory || defaultInventory,
        ticketsSold: soldCount,
        round: foundActive.round || 1,
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
      category: config.category,
      bannerUrl: config.bannerUrl || getBanknoteForLottery(config.ticketPrice, undefined, config.id),
      ticketPrice: config.ticketPrice,
      totalInventory: defaultInventory,
      ticketsSold: soldCount,
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

  const activeLotteriesMap = new Map<string, LotteryDraw>();
  rawActiveLotteries.forEach(draw => {
    if (draw && draw.id) {
      activeLotteriesMap.set(draw.id, draw);
    }
  });
  const activeLotteries: LotteryDraw[] = Array.from(activeLotteriesMap.values());

  const drawnLotteries = lotteries.filter(l => l.status === 'completed' || !!l.winningNumbers);

  const handleOpenPurchase = (lottery: LotteryDraw) => {
    if (lockedLotteryIds?.includes(lottery.id)) {
      setSystemMaintenanceModal({ isOpen: true, lotteryTitle: lottery.titleAm });
      triggerHaptic('error');
      playNotificationSound('alert');
      return;
    }
    // Block immediate confirmation clicks to prevent mobile touch bleed-through
    setCanConfirmPurchase(false);
    setIsPurchasing(false);
    if (purchaseSafetyTimerRef.current) {
      clearTimeout(purchaseSafetyTimerRef.current);
    }
    purchaseSafetyTimerRef.current = setTimeout(() => {
      setCanConfirmPurchase(true);
    }, 450);

    onRefreshWallet?.();
    setSelectedLottery(lottery);
    setPurchaseQuantity(1);
    setCustomNumbers([generateLuckyNumber()]);
    playNotificationSound('click');
  };

  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1 || newQty > 20) return;
    setPurchaseQuantity(newQty);
    
    setCustomNumbers(prev => {
      if (newQty > prev.length) {
        const added: string[] = [];
        for (let i = prev.length; i < newQty; i++) {
          added.push(generateLuckyNumber());
        }
        return [...prev, ...added];
      } else {
        return prev.slice(0, newQty);
      }
    });
  };

  const handleCutTicketWithWallet = () => {
    if (!selectedLottery || !canConfirmPurchase || isPurchasing) return;
    if (lockedLotteryIds?.includes(selectedLottery.id)) {
      setSystemMaintenanceModal({ isOpen: true, lotteryTitle: selectedLottery.titleAm });
      setSelectedLottery(null);
      triggerHaptic('heavy');
      playNotificationSound('alert');
      return;
    }
    const totalCost = selectedLottery.ticketPrice * customNumbers.length;
    if (userEffectiveBalance < totalCost) {
      triggerHaptic('heavy');
      playNotificationSound('alert');
      return;
    }

    setIsPurchasing(true);
    const reference = 'TKT-' + customNumbers.join('-');
    onBuyTickets(selectedLottery, customNumbers, 'wallet', reference, user.phone, user.fullName);

    setPurchasedSuccess({
      lotteryTitle: lang === 'am' ? selectedLottery.titleAm : selectedLottery.titleEn,
      ticketNumbers: [...customNumbers],
      reference,
      totalAmount: totalCost,
      phone: user.phone,
    });

    setSelectedLottery(null);
    setIsPurchasing(false);
    setCanConfirmPurchase(false);
    triggerConfetti();
    playNotificationSound('success');
    triggerHaptic('medium');
  };

  const handleVerifyAdminPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (enteredPin.trim() === '68927') {
      setIsAdminPinModalOpen(false);
      setEnteredPin('');
      setPinError(null);
      triggerHaptic('medium');
      playNotificationSound('success');
      onNavigateToAdmin();
    } else {
      setPinError(lang === 'am' ? 'የተሳሳተ ሚስጥር ቁጥር! እባክዎ እንደገና ይሞክሩ።' : 'Incorrect PIN! Please try again.');
      setEnteredPin('');
      triggerHaptic('error');
      playNotificationSound('alert');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header with secret 5-clicks Admin trigger & User Auth Status */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 pt-[env(safe-area-inset-top,0px)]">
        <div className="w-full px-4 py-2.5 flex items-center justify-between">
          <div className="w-10" />
          <div 
            onClick={() => {
              const isAdminUser = (user.phone && user.phone.includes('0910961881')) || 
                                  (user.telegramUsername && user.telegramUsername.toLowerCase().includes('lij_makbel'));
              if (!isAdminUser) return; // Do nothing for normal users

              setHeaderClicks(prev => {
                const next = prev + 1;
                if (next >= 5) {
                  setEnteredPin('');
                  setPinError(null);
                  setIsAdminPinModalOpen(true);
                  return 0;
                }
                return next;
              });
            }}
            className="flex flex-col items-center justify-center text-center cursor-pointer select-none"
          >
            <h1 className="text-2xl sm:text-3xl font-black tracking-wider text-yellow-400 drop-shadow-[0_2px_14px_rgba(250,204,21,0.65)] uppercase select-none leading-none">
              TEWEDAJ
            </h1>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-300 tracking-wide mt-0.5">
              (Tewedaj Online Lottery)
            </span>
            {/* Removed Monthly Users badge as requested */}
          </div>
          {user.telegramId === '5588110290' ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                playNotificationSound('click');
                onNavigateToAdmin();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md shadow-amber-500/25 active:scale-95 transition shrink-0 cursor-pointer"
              title="Open Admin Dashboard"
            >
              <span>👑 Admin</span>
            </button>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </header>

      {/* Push Notification Bar - Simplified to only show winning alerts */}
      {notifications.length > 0 && !notifications[0].isRead && (() => {
        const notif = notifications[0];
        const isWinner = !notif.lotteryId?.includes('wallet') && (notif.amountWon > 0 || notif.messageAm.includes('አሸንፈዋል') || notif.messageAm.includes('የዕጣ አሸናፊ'));

        if (!isWinner) return null;

        return (
          <div className="mx-3 mt-2 rounded-2xl p-3 shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 border bg-gradient-to-r from-amber-950/95 via-yellow-950/90 to-emerald-950/95 border-amber-400/80 shadow-amber-500/25 ring-1 ring-amber-400/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-base border bg-amber-500/25 border-amber-500/50 text-amber-300">
                🏆
              </span>
              <div className="min-w-0">
                <h5 className="text-xs font-black text-amber-300">
                  {lang === 'am' ? '🎉 እንኳን ደስ አለዎት! አሸናፊ ሆነዋል!' : '🎉 Congratulations! You Won!'}
                </h5>
                <p className="text-[11px] text-slate-200 truncate">
                  {lang === 'am' ? notif.messageAm : notif.messageEn}
                </p>
              </div>
            </div>
            {onClearNotification && (
              <button
                onClick={() => onClearNotification(notif.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0 transition"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })()}

      {/* Main Content Area */}
      <main className="flex-1 w-full px-3 py-3.5 pb-24 sm:pb-28 space-y-4">
        {activeMainTab === 'active' && (
          <div className="space-y-4">
            <div className="flex flex-col space-y-4">
              {activeLotteries
                .filter(draw => draw.id !== 'lot_derash_20000' && draw.jackpotAmount !== 20000)
                .sort((a, b) => {
                  const aLocked = lockedLotteryIds?.includes(a.id) ? 1 : 0;
                  const bLocked = lockedLotteryIds?.includes(b.id) ? 1 : 0;
                  return aLocked - bLocked;
                })
                .map((draw) => {
                  const isLocked = lockedLotteryIds?.includes(draw.id);
                  const is50kComingSoon = false;
                  const activeTicketsForDraw = tickets.filter(t => {
                    if (t.status === 'refunded') return false;
                    if (t.lotteryId === draw.id) return true;
                    if (draw.id === 'lot_tv_32' && (t.lotteryId === 'lot_tv_32' || t.lotteryId?.includes('tv') || t.lotteryTitleAm?.includes('ቲቪ'))) return true;
                    if (draw.id === 'lot_derash_1000' && (t.lotteryId === 'lot_derash_1000' || t.lotteryTitleAm?.includes('1,000') || (t.pricePaid === 10 && !t.lotteryId))) return true;
                    if (draw.id === 'lot_derash_5000' && (t.lotteryId === 'lot_derash_5000' || t.lotteryTitleAm?.includes('5,000') || (t.pricePaid === 50 && !t.lotteryId))) return true;
                    if (draw.id === 'lot_derash_10000' && (t.lotteryId === 'lot_derash_10000' || t.lotteryTitleAm?.includes('10,000') || (t.pricePaid === 100 && !t.lotteryId))) return true;
                    if (draw.id === 'lot_derash_50000' && (t.lotteryId === 'lot_derash_50000' || (!t.lotteryId?.includes('tv') && !t.lotteryTitleAm?.includes('ቲቪ') && (t.lotteryTitleAm?.includes('50,000') || (t.pricePaid === 200 && !t.lotteryId))))) return true;
                    return false;
                  }).length;
                  const liveCount = Math.max(
                    activeTicketsForDraw,
                    globalLiveCounts[draw.id] ?? 0,
                    draw.ticketsSold || 0
                  );
                  const soldCount = Math.max(0, liveCount);

                  return (
                    <div 
                      key={draw.id}
                      onClick={() => {
                        if (isLocked) {
                          setSystemMaintenanceModal({ isOpen: true, lotteryTitle: lang === 'am' ? draw.titleAm : draw.titleEn });
                          triggerHaptic('error');
                          playNotificationSound('alert');
                          return;
                        }
                        if (is50kComingSoon) {
                          setLockedLotteryModalOpen(true);
                          triggerHaptic('error');
                          playNotificationSound('alert');
                          return;
                        }
                        if ((soldCount || 0) >= (draw.totalInventory || 150)) return;
                        handleOpenPurchase(draw);
                      }}
                      className={`bg-slate-900 border rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col group cursor-pointer active:scale-[0.99] ${
                        isLocked
                          ? 'border-rose-500/30 opacity-75'
                          : is50kComingSoon 
                          ? 'border-amber-500/40 hover:border-amber-500/60' 
                          : (soldCount || 0) >= (draw.totalInventory || 150)
                          ? 'border-slate-800 opacity-90'
                          : 'border-slate-800 hover:border-emerald-500/40'
                      }`}
                    >
                    <div className="relative h-40 sm:h-48 overflow-hidden bg-slate-950">
                      <img 
                        src={draw.bannerUrl || getBanknoteForLottery(draw.ticketPrice, undefined, draw.id)} 
                        alt={lang === 'am' ? draw.titleAm : draw.titleEn} 
                        referrerPolicy="no-referrer"
                        loading="eager"
                        // @ts-ignore
                        fetchPriority="high"
                        decoding="sync"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.dataset.failed) {
                            target.dataset.failed = 'true';
                            target.src = getBanknoteForLottery(draw.ticketPrice, undefined, draw.id);
                          }
                        }}
                        className={`w-full h-full object-cover transition-transform duration-500 opacity-98 ${
                          is50kComingSoon ? 'blur-[1.5px] scale-100' : 'group-hover:scale-105'
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                      
                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <div className="bg-slate-950/90 backdrop-blur-md text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-lg text-[11px] font-black shadow-md flex items-center space-x-1">
                          <span>{lang === 'am' ? `ዙር ${draw.round || 1}` : `Round ${draw.round || 1}`}</span>
                        </div>
                        {lockedLotteryIds?.includes(draw.id) && (
                          <div className="bg-rose-600/90 backdrop-blur-md text-white border border-rose-400 px-2 py-0.5 rounded-lg text-[10px] font-black shadow-md flex items-center gap-1 animate-pulse">
                            <Lock className="w-2.5 h-2.5" />
                            <span>ማስተካከያ ላይ</span>
                          </div>
                        )}
                      </div>

                      <div className="absolute bottom-2.5 left-3 right-3 z-10">
                        <h4 className="text-lg font-black text-white drop-shadow-md">
                          {lang === 'am' ? draw.titleAm : draw.titleEn}
                        </h4>
                      </div>
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                      {/* Unified Grand Prize & Remaining Chances Section */}
                      <div className={`rounded-xl p-2.5 sm:p-3 border backdrop-blur-md transition-all ${
                        is50kComingSoon
                          ? 'bg-gradient-to-br from-amber-950/40 via-slate-950 to-slate-900 border-amber-500/30'
                          : (draw.id === 'lot_tv_32' || draw.isItemPrize)
                          ? 'bg-gradient-to-br from-sky-950/40 via-slate-950 to-slate-900 border-sky-500/40 shadow-[0_0_15px_rgba(56,189,248,0.12)]'
                          : 'bg-gradient-to-br from-emerald-950/30 via-slate-950 to-slate-900 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                      }`}>
                        {/* Top Row: Prize & Remaining Chances Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <span>{lang === 'am' ? 'ሽልማት' : 'Grand Prize'}</span>
                            </span>
                            <div className={`text-xl sm:text-2xl font-black font-sans tracking-wide truncate mt-0.5 ${
                              is50kComingSoon 
                                ? 'text-amber-400 drop-shadow-[0_2px_10px_rgba(245,158,11,0.35)]' 
                                : (draw.id === 'lot_tv_32' || draw.isItemPrize) 
                                ? 'text-sky-300 drop-shadow-[0_2px_10px_rgba(56,189,248,0.35)]' 
                                : 'text-emerald-400 drop-shadow-[0_2px_10px_rgba(16,185,129,0.35)]'
                            }`}>
                              {draw.id === 'lot_tv_32' || draw.isItemPrize
                                ? (lang === 'am' ? (draw.prizeItemNameAm || '32 Inch TV') : (draw.prizeItemName || '32 Inch TV'))
                                : formatETB(draw.jackpotAmount)}
                            </div>
                          </div>

                          {/* Remaining Chances Pill Badge */}
                          <div className="shrink-0 self-center">
                            <div className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] sm:text-xs font-black flex items-center shadow-sm">
                              <span>
                                {is50kComingSoon 
                                  ? '300 ዕጣ' 
                                  : `${Math.max(0, (draw.totalInventory || 150) - (soldCount || 0))} ዕጣ ይቀራል`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Meter Bar */}
                        <div className="mt-2.5 space-y-1.5 pt-2 border-t border-slate-800/80">
                          {is50kComingSoon ? (
                            <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold">
                              <div className="flex items-center gap-1">
                                <Lock className="w-3 h-3 text-amber-400" />
                                <span>በቅርቡ ይጀመራል</span>
                              </div>
                              <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                ተቆልፏል
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5 font-bold text-slate-300">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                  <span className="text-slate-400 text-[10px]">{lang === 'am' ? 'የተቆረጠ:' : 'Sold:'}</span>
                                  <span className="text-emerald-400 font-mono font-black text-xs">{soldCount || 0}</span>
                                  <span className="text-slate-600 font-mono">/</span>
                                  <span className="text-white font-mono font-black text-xs">{draw.totalInventory || 150}</span>
                                </div>
                                <span className="font-mono text-[10px] font-black text-emerald-300 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                  {Math.min(100, Math.round(((soldCount || 0) / (draw.totalInventory || 150)) * 100))}%
                                </span>
                              </div>

                              <div className="w-full bg-slate-900/90 h-2 rounded-full overflow-hidden p-[1px] border border-slate-800 shadow-inner">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.7)] transition-all duration-700 ease-out"
                                  style={{ 
                                    width: `${Math.min(100, Math.max(0, (((soldCount || 0) / (draw.totalInventory || 150)) * 100)))}%`,
                                    minWidth: (soldCount || 0) > 0 ? '6px' : '0px'
                                  }}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Section - Button without front icon */}
                      <div className="pt-1">
                        {is50kComingSoon ? (
                          <div className="w-full h-11 bg-slate-800/80 text-amber-300 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 border border-amber-500/20">
                            <Lock className="w-4 h-4 text-amber-400" />
                            <span>{lang === 'am' ? 'በቅርቡ ይጀመራል...' : 'Coming Soon...'}</span>
                          </div>
                        ) : (soldCount || 0) >= (draw.totalInventory || 150) ? (
                          <div className="w-full h-11 bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(245,158,11,0.15)] relative overflow-hidden">
                            <Trophy className="w-4 h-4 text-amber-400 animate-bounce relative z-10" />
                            <span className="relative z-10">
                              {lang === 'am' 
                                ? `${draw.totalInventory || 150} ሞልቷል - ዕጣው በቅርቡ ይወጣል` 
                                : `${draw.totalInventory || 150} Filled - Drawing Soon`}
                            </span>
                            <div className="absolute inset-0 bg-amber-400/5 animate-pulse" />
                          </div>
                        ) : lockedLotteryIds?.includes(draw.id) ? (
                          <div className="w-full h-11 bg-rose-950/20 border border-rose-500/30 text-rose-300 font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-sm">
                            <Lock className="w-4 h-4 text-rose-400" />
                            <span>{lang === 'am' ? 'በጊዜያዊነት ተቆልፏል' : 'Temporarily Locked'}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenPurchase(draw);
                            }}
                            className="w-full h-13 sm:h-14 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 active:scale-[0.97] text-slate-950 font-black rounded-2xl text-base sm:text-lg flex items-center justify-center space-x-2.5 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.35)] hover:shadow-[0_6px_25px_rgba(16,185,129,0.45)] ring-1 ring-emerald-400/50 cursor-pointer group/btn animate-in fade-in zoom-in duration-300 relative overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                            <span className="tracking-tight relative z-10 text-base sm:text-lg font-black text-slate-950 drop-shadow-sm">
                              {lang === 'am' 
                                ? `በ ${draw.ticketPrice} ብር ይቁረጡ` 
                                : `Cut for ${draw.ticketPrice} ETB`}
                            </span>
                            {/* Animated Glow / Pulse Ring */}
                            <div className="absolute inset-0 rounded-2xl ring-2 ring-emerald-400/30 animate-pulse pointer-events-none" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}



        {activeMainTab === 'drawn' && (
          <WinnersHistoryView
            drawnLotteries={drawnLotteries}
            tickets={tickets}
            lang={lang}
            triggerHaptic={triggerHaptic}
            playNotificationSound={playNotificationSound}
          />
        )}

        {activeMainTab === 'verify' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-950 border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden">
              <form onSubmit={handleCheckTicket} className="space-y-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 font-mono font-bold text-base">#</span>
                  <input
                    type="text"
                    required
                    value={checkTicketNumber}
                    onChange={(e) => setCheckTicketNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="000000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-9 pr-4 py-3.5 text-white font-mono text-lg tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-slate-700"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!checkTicketNumber.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-2xl text-sm shadow-lg shadow-amber-950/20 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{lang === 'am' ? 'አረጋግጥ (Verify)' : 'Verify Now'}</span>
                </button>
              </form>

              {checkTicketResult && (
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                  <div className="text-center space-y-2">
                    {checkTicketResult.status === 'won' ? (
                      <div className="space-y-1">
                        <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border border-amber-500/40 text-amber-400">
                          <Trophy className="w-6 h-6 animate-bounce" />
                        </div>
                        <h4 className="text-base font-black text-amber-400">
                          {lang === 'am' ? 'እንኳን ደስ አለዎት! አሸንፈዋል!' : 'Congratulations! You Won!'}
                        </h4>
                        <p className="text-xs font-bold text-slate-200">
                          {lang === 'am' 
                            ? `በ ${checkTicketResult.ticket?.lotteryTitleAm} ${checkTicketResult.ticket?.prizeWon?.toLocaleString()} ብር አሸንፈዋል!` 
                            : `Won ${checkTicketResult.ticket?.prizeWon?.toLocaleString()} ETB`}
                        </p>
                      </div>
                    ) : checkTicketResult.status === 'lost' ? (
                      <div className="space-y-1">
                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto border border-slate-700 text-slate-400">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-black text-white">
                          {lang === 'am' ? 'ይቅርታ! በዚህ ዙር አልደረሰዎትም' : 'Better luck next time'}
                        </h4>
                      </div>
                    ) : checkTicketResult.status === 'active' ? (
                      <div className="space-y-1">
                        <div className="w-12 h-12 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30 text-emerald-400">
                          <Clock className="w-6 h-6 animate-pulse" />
                        </div>
                        <h4 className="text-sm font-black text-white">
                          {lang === 'am' ? 'ቲኬቱ ገና ንቁ (Active) ነው' : 'Ticket is active'}
                        </h4>
                        <p className="text-xs text-slate-400">
                          {lang === 'am' ? 'ዕጣው እስኪወጣ ይጠብቁ' : 'Waiting for draw'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="w-12 h-12 bg-rose-500/15 rounded-full flex items-center justify-center mx-auto border border-rose-500/30 text-rose-400">
                          <X className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-black text-white">
                          {lang === 'am' ? 'አልተገኘም (Not Found)' : 'Not Found'}
                        </h4>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setCheckTicketResult(null);
                      setCheckTicketNumber('');
                    }}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs transition"
                  >
                    {lang === 'am' ? 'አጽዳ / ፈልግ' : 'Clear / Reset'}
                  </button>
                </div>
              )}
            </div>

            {/* User's Purchased Tickets List (clickable to auto-fill & verify) */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>{lang === 'am' ? 'የእኔ ትኬቶች' : 'Your Purchased Tickets'}</span>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400">
                    {myTickets.length}
                  </span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  {lang === 'am' ? 'ለማረጋገጥ ላይ ይጫኑ' : 'Click to check'}
                </span>
              </div>

              {myTickets.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                  <TicketIcon className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-300">
                    {lang === 'am' ? 'ምንም የተቆረጠ ትኬት የለም' : 'No purchased tickets'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {myTickets.map((tkt) => (
                    <div
                      key={tkt.id}
                      onClick={() => {
                        const cleanNum = tkt.ticketNumber.replace('#', '');
                        setCheckTicketNumber(cleanNum);
                        const found = tickets.find(t => t.ticketNumber === cleanNum || t.ticketNumber === `#${cleanNum}`);
                        if (found) {
                          setCheckTicketResult({
                            status: found.status as any,
                            ticket: found
                          });
                        } else {
                          setCheckTicketResult({ status: 'not_found' });
                        }
                        triggerHaptic('medium');
                        playNotificationSound('click');
                      }}
                      className="p-3 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-2xl transition cursor-pointer flex items-center justify-between gap-3 group active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
                          <TicketIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-mono font-black text-amber-400 text-sm tracking-wide">
                            #{tkt.ticketNumber}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {tkt.lotteryTitleAm}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          tkt.status === 'won' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          tkt.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {tkt.status === 'won' ? (lang === 'am' ? 'አሸናፊ' : 'Won') :
                           tkt.status === 'active' ? (lang === 'am' ? 'ንቁ' : 'Active') : tkt.status}
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeMainTab === 'wallet' && (
          <WalletView
            user={user}
            transactions={transactions}
            tickets={tickets}
            notifications={notifications}
            onClearNotification={onClearNotification}
            lang={lang}
            onOpenDeposit={() => {
              setIsDepositModalOpen(true);
              triggerHaptic('medium');
              playNotificationSound('click');
            }}
            onOpenWithdraw={() => {
              setIsWithdrawModalOpen(true);
              triggerHaptic('medium');
              playNotificationSound('click');
            }}
            onDeleteTransactions={user.isAdmin ? onDeleteTransactions : undefined}
            onDeleteTicket={user.isAdmin ? onDeleteTicket : undefined}
            triggerHaptic={triggerHaptic}
            playNotificationSound={playNotificationSound}
          />
        )}


      </main>

      {/* Selected Lottery Purchase Modal */}
      {selectedLottery && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-4 p-5 sm:p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
                  <TicketIcon className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-black text-white text-base">
                    {lang === 'am' ? selectedLottery.titleAm : selectedLottery.titleEn}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'am' ? `ዋጋ: ${selectedLottery.ticketPrice} ብር | ዙር ${selectedLottery.round || 1}` : `Price: ${selectedLottery.ticketPrice} ETB | Round ${selectedLottery.round || 1}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLottery(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Ticket Quantity & Numbers Selector */}
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <label className="text-xs font-bold text-slate-300">
                  {lang === 'am' ? 'የትኬት ብዛት:' : 'Quantity:'}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(purchaseQuantity - 1)}
                    disabled={purchaseQuantity <= 1}
                    className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-black flex items-center justify-center transition cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono text-base font-black text-emerald-400 w-6 text-center">
                    {purchaseQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(purchaseQuantity + 1)}
                    disabled={purchaseQuantity >= 20}
                    className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-black flex items-center justify-center transition cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Generated Ticket Numbers List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400">
                    {lang === 'am' ? 'የተመረጡ የዕጣ ቁጥሮች:' : 'Generated Ticket Numbers:'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomNumbers(Array.from({ length: purchaseQuantity }, () => generateLuckyNumber()));
                      triggerHaptic('light');
                      playNotificationSound('click');
                    }}
                    className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{lang === 'am' ? 'ቁጥሮችን ቀይር' : 'Shuffle'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2.5 bg-slate-950 rounded-2xl border border-slate-800">
                  {customNumbers.map((num, i) => (
                    <span key={i} className="px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-black text-xs rounded-xl shadow-sm">
                      #{num}
                    </span>
                  ))}
                </div>
              </div>

              {/* Price Calculation */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-bold">
                  {lang === 'am' ? 'ጠቅላላ ክፍያ:' : 'Total Cost:'}
                </span>
                <span className="font-mono font-black text-lg text-emerald-400">
                  {(selectedLottery.ticketPrice * customNumbers.length).toLocaleString()} ብር
                </span>
              </div>

              {/* Wallet Balance Info */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-400">
                  {lang === 'am' ? 'ያለዎት ዋሌት ሒሳብ:' : 'Your Balance:'}
                </span>
                <span className={`font-mono font-bold ${userEffectiveBalance >= (selectedLottery.ticketPrice * customNumbers.length) ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {userEffectiveBalance.toLocaleString()} ብር
                </span>
              </div>

              {/* Confirm Cut Ticket Button */}
              {userEffectiveBalance >= (selectedLottery.ticketPrice * customNumbers.length) ? (
                <button
                  type="button"
                  disabled={!canConfirmPurchase || isPurchasing}
                  onClick={handleCutTicketWithWallet}
                  className={`w-full py-4 text-slate-950 font-black rounded-2xl text-base sm:text-lg transition shadow-lg flex items-center justify-center gap-2 ${
                    !canConfirmPurchase || isPurchasing
                      ? 'bg-emerald-600/60 opacity-80 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 shadow-emerald-500/20 active:scale-95 cursor-pointer'
                  }`}
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span className="font-black text-slate-950">
                    {isPurchasing
                      ? (lang === 'am' ? 'ትኬት በመቁረጥ ላይ...' : 'Cutting ticket...')
                      : !canConfirmPurchase
                      ? (lang === 'am' ? 'እባክዎ ይጠብቁ...' : 'Please wait...')
                      : (lang === 'am' 
                        ? `ትኬቱን አረጋግጥና ቁረጥ (${(selectedLottery.ticketPrice * customNumbers.length).toLocaleString()} ብር)` 
                        : `Confirm & Cut Ticket (${(selectedLottery.ticketPrice * customNumbers.length).toLocaleString()} ETB)`)}
                  </span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center">
                    <p className="text-xs font-bold text-rose-300">
                      {lang === 'am' ? 'በቂ የዋሌት ሒሳብ የለዎትም! እባክዎ መጀመሪያ ሒሳብ ይሙሉ' : 'Insufficient balance! Please deposit funds.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-4 p-5 sm:p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-end pb-1">
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePerformDeposit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  {lang === 'am' ? 'የገንዘብ መጠን (ETB):' : 'Amount (ETB):'}
                </label>
                <input
                  type="number"
                  min="10"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="e.g. 500"
                  required
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-white outline-none transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  {lang === 'am' ? 'የክፍያ መንገድ ይምረጡ:' : 'Select Payment Method:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDepositMethod('telebirr')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      depositMethod === 'telebirr'
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Telebirr</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepositMethod('cbe_birr')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      depositMethod === 'cbe_birr'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    <span>CBE Bank</span>
                  </button>
                </div>
              </div>

              {depositMethod === 'telebirr' && (
                <div className="bg-gradient-to-br from-cyan-950/90 via-slate-950 to-blue-950/90 border-2 border-cyan-500/40 rounded-2xl p-4 shadow-xl space-y-3 relative overflow-hidden animate-in fade-in duration-200">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center font-bold">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-wider block">ቴሌብር አካውንት</span>
                        <span className="text-xs font-black text-white">Makbel Maregu</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-sm">
                      Telebirr
                    </span>
                  </div>

                  <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-base font-black text-cyan-300 tracking-wider">0910961881</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyDepositAccount('0910961881', 'dep_tlb')}
                      className={`px-3 py-1.5 text-xs font-black rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md ${
                        copiedDepositKey === 'dep_tlb'
                          ? 'bg-cyan-400 text-slate-950 shadow-cyan-400/40'
                          : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40'
                      }`}
                    >
                      {copiedDepositKey === 'dep_tlb' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                          <span>{lang === 'am' ? 'ተቀድቷል' : 'Copied!'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{lang === 'am' ? 'ኮፒ' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {depositMethod === 'cbe_birr' && (
                <div className="bg-gradient-to-br from-purple-950/90 via-slate-950 to-amber-950/90 border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-3 relative overflow-hidden animate-in fade-in duration-200">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center font-bold">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">የንግድ ባንክ አካውንት</span>
                        <span className="text-xs font-black text-white">Makbel Maregu</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-400/30 shadow-sm">
                      CBE Account
                    </span>
                  </div>

                  <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-base font-black text-amber-300 tracking-wider">1000321337124</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyDepositAccount('1000321337124', 'dep_cbe')}
                      className={`px-3 py-1.5 text-xs font-black rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md ${
                        copiedDepositKey === 'dep_cbe'
                          ? 'bg-amber-400 text-slate-950 shadow-amber-400/40'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40'
                      }`}
                    >
                      {copiedDepositKey === 'dep_cbe' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />
                          <span>{lang === 'am' ? 'ተቀድቷል' : 'Copied!'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{lang === 'am' ? 'ኮፒ' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block flex items-center justify-between">
                  <span>{lang === 'am' ? 'የከፈሉበት የደረሰኝ ፎቶ (ስክሪን ሾት) *:' : 'Upload Payment Receipt Screenshot *:'}</span>
                  <span className="text-[10px] text-amber-400 font-bold">{lang === 'am' ? 'አስፈላጊ' : 'Required'}</span>
                </label>
                <label className="flex items-center justify-center gap-2 p-3 bg-slate-950 border border-dashed border-slate-700 hover:border-emerald-500 rounded-xl cursor-pointer transition text-xs text-slate-300">
                  <Camera className="w-5 h-5 text-emerald-400" />
                  {depositScreenshotName && (
                    <span className="truncate font-mono text-[11px] text-emerald-300">{depositScreenshotName}</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotFileChange}
                    className="hidden"
                  />
                </label>
                {depositScreenshotError && (
                  <p className="text-[11px] text-rose-400 font-medium">{depositScreenshotError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={depositSubmitting}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-2xl text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{depositSubmitting ? (lang === 'am' ? 'በመላክ ላይ...' : 'Sending...') : (lang === 'am' ? 'ጥያቄውን ላክ (Submit)' : 'Submit Deposit Request')}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-4 p-5 sm:p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-end pb-1">
              <button
                type="button"
                onClick={() => {
                  setIsWithdrawModalOpen(false);
                  setWithdrawSuccessMsg(null);
                }}
                className="w-8 h-8 rounded-full bg-rose-500/25 hover:bg-rose-500/40 border border-rose-500/50 text-rose-400 hover:text-rose-200 font-bold flex items-center justify-center transition active:scale-95 shadow-md shadow-rose-950/40 shrink-0 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {withdrawSuccessMsg ? (
              <div className="p-5 bg-amber-950/60 border border-amber-500/50 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto text-xl border border-amber-500/40">
                  <Check className="w-6 h-6 text-amber-400" />
                </div>
                <p className="text-xs text-amber-200 font-bold leading-relaxed">
                  {withdrawSuccessMsg}
                </p>
              </div>
            ) : (
              <form onSubmit={handlePerformWithdraw} className="space-y-4">
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {lang === 'am' ? 'ያለዎት ሒሳብ:' : 'Available Balance:'}
                  </span>
                  <span className="font-mono font-black text-base text-emerald-400">
                    {user.walletBalance.toLocaleString()} ብር
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    {lang === 'am' ? 'የሚወጣው መጠን (ቢያንስ 50 ብር):' : 'Withdraw Amount (Min 50 ETB):'}
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {[50, 100, 200, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setWithdrawAmount(amt)}
                        className={`py-2 rounded-xl font-mono text-xs font-bold transition border ${
                          withdrawAmount === amt
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow'
                            : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={50}
                    max={user.walletBalance || 100000}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="መጠን ያስገቡ..."
                  />
                  {user.walletBalance < withdrawAmount && (
                    <p className="text-[11px] text-rose-400 font-medium">
                      በዋሌትዎ ውስጥ በቂ ሒሳብ የለም
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    {lang === 'am' ? 'የመቀበያ አካውንት ዓይነት (CBE ወይም ቴሌብር):' : 'Select Account Type (CBE / Telebirr):'}
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setWithdrawAccountType('telebirr')}
                      className={`py-3 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                        withdrawAccountType === 'telebirr'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-300 shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-400/50 scale-[1.02]'
                          : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-cyan-200 shrink-0" />
                      <span>ቴሌብር (Telebirr)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithdrawAccountType('cbe')}
                      className={`py-3 px-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 border cursor-pointer ${
                        withdrawAccountType === 'cbe'
                          ? 'bg-gradient-to-r from-amber-500 to-purple-600 text-white border-amber-300 shadow-lg shadow-amber-500/25 ring-2 ring-amber-400/50 scale-[1.02]'
                          : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <Building2 className="w-4 h-4 text-amber-200 shrink-0" />
                      <span>ንግድ ባንክ (CBE)</span>
                    </button>
                  </div>
                </div>

                {/* Full Name Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {lang === 'am' ? 'ሙሉ ስም (Full Name):' : 'Full Name:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={withdrawFullName}
                    onChange={(e) => setWithdrawFullName(e.target.value)}
                    placeholder={lang === 'am' ? 'ሙሉ ስምዎን ያስገቡ...' : 'Enter full name...'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-sans text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                {/* Editable Account Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    {lang === 'am' ? (withdrawAccountType === 'telebirr' ? 'የቴሌብር ስልክ ቁጥር:' : 'የንግድ ባንክ አካውንት ቁጥር (CBE Account):') : (withdrawAccountType === 'telebirr' ? 'Telebirr Phone Number:' : 'CBE Account Number:')}
                  </label>
                  <input
                    type="text"
                    required
                    value={withdrawAccountNumber}
                    onChange={(e) => setWithdrawAccountNumber(e.target.value)}
                    placeholder={withdrawAccountType === 'telebirr' ? '09...' : '1000...'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={withdrawSubmitting || withdrawAmount < 50 || withdrawAmount > user.walletBalance}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-2xl text-xs transition shadow-lg flex items-center justify-center gap-2 active:scale-95"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>{withdrawSubmitting ? (lang === 'am' ? 'በማስኬድ ላይ...' : 'Processing...') : (lang === 'am' ? 'የማውጣት ጥያቄ ላክ' : 'Request Withdrawal')}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Check Ticket Modal */}
      {isCheckTicketModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TicketIcon className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-white text-sm">
                  {lang === 'am' ? 'ቲኬት አረጋግጥ' : 'Check Ticket'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsCheckTicketModalOpen(false)}
                className="w-8 h-8 rounded-full bg-rose-500/25 hover:bg-rose-500/40 border border-rose-500/50 text-rose-400 hover:text-rose-200 font-bold flex items-center justify-center transition active:scale-95 shadow-md shadow-rose-950/40 shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {!checkTicketResult ? (
                <form onSubmit={handleCheckTicket} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      {lang === 'am' ? 'የትኬት ቁጥርዎን ያስገቡ' : 'Enter Ticket Number'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500 font-mono font-bold">#</span>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={checkTicketNumber}
                        onChange={(e) => setCheckTicketNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="000000"
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-8 pr-4 py-3 text-white font-mono text-lg tracking-[0.2em] focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-slate-700"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!checkTicketNumber.trim()}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black rounded-2xl text-sm shadow-lg shadow-amber-950/20 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{lang === 'am' ? 'አረጋግጥ' : 'Verify Now'}</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-5 py-2 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="text-center space-y-3">
                    {checkTicketResult.status === 'won' ? (
                      <>
                        <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto border border-amber-500/40">
                          <Trophy className="w-8 h-8 text-amber-400 animate-bounce" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xl font-black text-amber-400">
                            {lang === 'am' ? 'እንኳን ደስ አለዎት!' : 'Congratulations!'}
                          </h4>
                          <p className="text-sm font-bold text-slate-200">
                            {lang === 'am' 
                              ? `በ ${checkTicketResult.ticket?.lotteryTitleAm} ${checkTicketResult.ticket?.prizeWon?.toLocaleString()} ብር አሸንፈዋል!` 
                              : `You won ${checkTicketResult.ticket?.prizeWon?.toLocaleString()} ETB in ${checkTicketResult.ticket?.lotteryTitleEn}!`}
                          </p>
                        </div>
                      </>
                    ) : checkTicketResult.status === 'lost' ? (
                      <>
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto border border-slate-700">
                          <AlertCircle className="w-8 h-8 text-slate-400" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-lg font-black text-white">
                            {lang === 'am' ? 'ይቅርታ!' : 'Better Luck Next Time'}
                          </h4>
                          <p className="text-sm font-bold text-slate-400">
                            {lang === 'am' ? 'በቀጣይ ዕድልዎን ይሞክሩ' : 'Please try your luck in the next round.'}
                          </p>
                        </div>
                      </>
                    ) : checkTicketResult.status === 'active' ? (
                      <>
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                          <Clock className="w-8 h-8 text-emerald-400 animate-pulse" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-lg font-black text-white">
                            {lang === 'am' ? 'ገና አሸናፊው አልታወቀም' : 'Winner Not Known Yet'}
                          </h4>
                          <p className="text-sm font-bold text-slate-400 leading-relaxed px-4">
                            {lang === 'am' 
                              ? 'ገና አሸናፊው አልታወቀም በትዕግስት ይጠብቁ' 
                              : 'Winner not known yet, please wait patiently.'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto border border-rose-500/30">
                          <X className="w-8 h-8 text-rose-400" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-lg font-black text-white">
                            {lang === 'am' ? 'አልተገኘም' : 'Not Found'}
                          </h4>
                          <p className="text-sm font-bold text-slate-400">
                            {lang === 'am' ? 'ይህ የቲኬት ቁጥር አልተገኘም' : 'This ticket number could not be found.'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-bold">{lang === 'am' ? 'የትኬት ቁጥር' : 'Ticket Number'}</span>
                      <span className="text-white font-mono font-black">#{checkTicketNumber}</span>
                    </div>
                    {checkTicketResult.ticket && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-bold">{lang === 'am' ? 'ዕጣ' : 'Lottery'}</span>
                        <span className="text-white font-bold">{checkTicketResult.ticket.lotteryTitleAm}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setCheckTicketResult(null);
                      setCheckTicketNumber('');
                    }}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-xs transition active:scale-95"
                  >
                    {lang === 'am' ? 'ሌላ ቁጥር አረጋግጥ' : 'Check Another Number'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.7)] pb-[max(env(safe-area-inset-bottom,0px),8px)]">
        <div className="max-w-md sm:max-w-lg mx-auto px-1 sm:px-2 py-1 grid grid-cols-4 gap-1 text-center">
          <button
            onClick={() => {
              setActiveMainTab('active');
              triggerHaptic('light');
              playNotificationSound('click');
            }}
            aria-label="Draws"
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition min-h-[48px] active:scale-95 cursor-pointer ${
              activeMainTab === 'active'
                ? 'text-emerald-400 bg-emerald-500/15 font-black ring-1 ring-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <div className="relative">
              <TicketIcon className="w-5 h-5 mx-auto" />
              <span className="absolute -top-1 -right-2 px-1 min-w-[12px] h-3 bg-emerald-500 text-slate-950 text-[8px] font-black rounded-full flex items-center justify-center shadow">
                {activeLotteries.length}
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] mt-0.5 font-bold leading-none tracking-tight">
              Draws
            </span>
          </button>

          <button
            onClick={() => {
              setActiveMainTab('drawn');
              triggerHaptic('light');
              playNotificationSound('click');
            }}
            aria-label="Winners"
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition min-h-[48px] active:scale-95 cursor-pointer ${
              activeMainTab === 'drawn'
                ? 'text-amber-400 bg-amber-500/15 font-black ring-1 ring-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <div className="relative">
              <Trophy className="w-5 h-5 mx-auto" />
              {drawnLotteries.length > 0 && (
                <span className="absolute -top-1 -right-2 px-1 min-w-[12px] h-3 bg-amber-500 text-slate-950 text-[8px] font-black rounded-full flex items-center justify-center shadow">
                  {drawnLotteries.length}
                </span>
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] mt-0.5 font-bold leading-none tracking-tight">
              Winners
            </span>
          </button>

          <button
            onClick={() => {
              setActiveMainTab('verify');
              triggerHaptic('light');
              playNotificationSound('click');
            }}
            aria-label="Verify"
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition min-h-[48px] active:scale-95 cursor-pointer ${
              activeMainTab === 'verify'
                ? 'text-amber-400 bg-amber-500/15 font-black ring-1 ring-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <div className="relative">
              <CheckCircle2 className="w-5 h-5 mx-auto" />
            </div>
            <span className="text-[10px] sm:text-[11px] mt-0.5 font-bold leading-none tracking-tight">
              Verify
            </span>
          </button>

          <button
            onClick={() => {
              setActiveMainTab('wallet');
              triggerHaptic('light');
              playNotificationSound('click');
            }}
            aria-label="Wallet"
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-2xl transition min-h-[48px] active:scale-95 cursor-pointer ${
              activeMainTab === 'wallet'
                ? 'text-emerald-400 bg-emerald-500/15 font-black ring-1 ring-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
            }`}
          >
            <div className="relative">
              <Wallet className="w-5 h-5 mx-auto" />
            </div>
            <span className="text-[10px] sm:text-[11px] mt-0.5 font-bold leading-none tracking-tight">
              Wallet
            </span>
          </button>
        </div>
      </nav>

      {/* Locked System Maintenance Modal */}
      {systemMaintenanceModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl w-full max-w-sm p-6 space-y-4 text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-950/40">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">
                {systemMaintenanceModal.lotteryTitle || 'ተቆልፏል'}
              </h3>
              <p className="text-xs text-amber-300 font-bold leading-relaxed bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/30">
                ይህ ዕጣ በጊዜያዊነት ተቆልፏል፤ እባክዎን በትዕግስት ይጠብቁ::
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSystemMaintenanceModal(null)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition active:scale-95 shadow-lg shadow-amber-500/25 cursor-pointer"
            >
              ተረድቻለሁ (እሺ)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
