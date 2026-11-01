import React, { useState } from 'react';
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Copy, 
  Check, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Ticket as TicketIcon,
  Sparkles,
  Trash2,
  User,
  Smartphone,
  Building2,
  Trophy,
  X,
} from 'lucide-react';
import { Language, Transaction, UserProfile, Ticket, WinnerNotification } from '../../types/lottery';
import { TelebirrLogo } from '../common/TelebirrLogo';
import { copyTextToClipboard } from '../../utils/lotteryUtils';

interface WalletViewProps {
  user: UserProfile;
  transactions: Transaction[];
  tickets?: Ticket[];
  notifications?: WinnerNotification[];
  onClearNotification?: (notifId: string) => void;
  lang: Language;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onDeleteTransactions?: (txIds: string[]) => void;
  onDeleteTicket?: (ticketId: string) => void;
  triggerHaptic?: (style: 'light' | 'medium' | 'heavy') => void;
  playNotificationSound?: (type: 'click' | 'win' | 'alert') => void;
}

export const WalletView: React.FC<WalletViewProps> = ({
  user,
  transactions,
  tickets = [],
  notifications = [],
  onClearNotification,
  lang,
  onOpenDeposit,
  onOpenWithdraw,
  onDeleteTransactions,
  onDeleteTicket,
  triggerHaptic,
  playNotificationSound,
}) => {
  const [filterType, setFilterType] = useState<'deposit' | 'withdrawal' | 'ticket_purchase' | 'prize_payout'>('deposit');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, keyId: string) => {
    if (!text) return;
    copyTextToClipboard(text);
    setCopiedKey(keyId);
    triggerHaptic?.('light');
    playNotificationSound?.('click');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const effectivePhone = user.phone || 
    (typeof window !== 'undefined' ? (localStorage.getItem('tewedaj_saved_phone') || localStorage.getItem('enat_user_phone') || '') : '');
  const cleanPhone = effectivePhone ? effectivePhone.replace(/\D/g, '') : '';
  const myTransactions = transactions.filter(t => {
    const tPhone = t.userPhone ? t.userPhone.replace(/\D/g, '') : '';
    const matchPhone = cleanPhone && tPhone && (tPhone.endsWith(cleanPhone.slice(-9)) || cleanPhone.endsWith(tPhone.slice(-9)));
    const matchUserId = user.id && (t.userId === user.id || t.userId === `tg_${user.telegramId}` || t.userId === user.telegramId);
    const matchTg = user.telegramId && (t.userId === user.telegramId || t.userId === `tg_${user.telegramId}`);
    return matchPhone || matchUserId || matchTg || (!cleanPhone && !user.telegramId);
  });

  const cleanUserPhone = (user.phone || '').replace(/\D/g, '');
  const myTickets = (tickets || []).filter(t => {
    const tPhone = t.userPhone ? t.userPhone.replace(/\D/g, '') : '';
    const matchPhone = cleanUserPhone && tPhone && (tPhone.endsWith(cleanUserPhone.slice(-9)) || cleanUserPhone.endsWith(tPhone.slice(-9)));
    const matchUserId = user.id && (t.userId === user.id || t.userId === `tg_${user.telegramId}` || t.userId === user.telegramId);
    return matchPhone || matchUserId || (!cleanUserPhone && !user.telegramId);
  });

  const availableBalance = Number(user.walletBalance) || 0;

  const isPendingDepositNotif = (n: WinnerNotification) => {
    return n.lotteryId === 'wallet' || 
           n.messageAm.includes('የገቢ ጥያቄ') || 
           n.lotteryTitleAm?.includes('የገቢ ጥያቄ') ||
           n.messageAm.includes('ይጠብቃል');
  };

  const isApprovedDepositNotif = (n: WinnerNotification) => {
    return !isPendingDepositNotif(n) && (n.messageAm.includes('ገቢ ጥያቄዎ በአድሚን ጸድቆ') || n.lotteryTitleAm === 'ገንዘብ ገቢ ተደርጓል');
  };

  const userWinningNotifs = (notifications || []).filter(n => 
    !n.isRead && 
    !isPendingDepositNotif(n) &&
    !isApprovedDepositNotif(n) &&
    !n.messageAm.includes('ማውጣት') &&
    (n.amountWon > 0 || n.messageAm.includes('አሸንፈዋል') || n.messageAm.includes('የዕጣ አሸናፊ'))
  );

  const pendingDepositNotifs = (notifications || []).filter(n =>
    !n.isRead && isPendingDepositNotif(n)
  );

  const approvedDepositNotifs = (notifications || []).filter(n =>
    !n.isRead && isApprovedDepositNotif(n)
  );

  const filteredTransactions = myTransactions.filter(t => {
    if (filterType === 'prize_payout') {
      if (t.type !== 'prize_payout') return false;
    } else if (filterType === 'deposit') {
      if (t.type !== 'deposit' && t.type !== 'prize_payout') return false;
    } else if (t.type !== filterType) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchRef = t.referenceNumber?.toLowerCase().includes(q);
      const matchAmount = String(t.amount).includes(q);
      const matchTitle = t.lotteryTitleAm?.toLowerCase().includes(q);
      const matchPhone = t.userPhone?.includes(q);
      return matchRef || matchAmount || matchTitle || matchPhone;
    }
    return true;
  });

  const filteredTickets = myTickets.filter(t => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchNum = t.ticketNumber?.includes(q);
      const matchTitle = t.lotteryTitleAm?.toLowerCase().includes(q) || t.lotteryTitleEn?.toLowerCase().includes(q);
      const matchRef = t.paymentReference?.toLowerCase().includes(q);
      return matchNum || matchTitle || matchRef;
    }
    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
      {/* Header Bar (እራስጌ) with Profile Icon & Verified Phone Badge matching screenshot */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800/80 p-3 sm:p-3.5 px-4 sm:px-4.5 rounded-3xl backdrop-blur-md shadow-xl">
        {/* Profile Icon on Left as in user image - Pure vector icon only */}
        <div 
          onClick={() => {
            triggerHaptic?.('light');
            playNotificationSound?.('click');
          }}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-emerald-500/60 bg-emerald-950/30 flex items-center justify-center text-emerald-400 shadow-sm shrink-0 select-none cursor-pointer hover:border-emerald-400 active:scale-95 transition"
          title={lang === 'am' ? 'የተጠቃሚ ፕሮፋይል' : 'User Profile'}
        >
          <User className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-400 stroke-[2.2]" />
        </div>

        {/* Exact Verified Pill from user screenshot placed at top header (እራስጌ) */}
        {user.phone ? (
          <div className="flex items-center gap-2.5 bg-slate-950 border border-emerald-500/70 px-3.5 py-1.5 rounded-full shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500/20">
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0 stroke-[2.2]" />
            <span className="font-mono text-xs sm:text-sm font-black text-white tracking-wider">
              {user.phone}
            </span>
            <span className="bg-emerald-950/50 border border-emerald-500/70 text-emerald-400 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 stroke-[2.5]" />
              <span>VERIFIED</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-full text-slate-400 text-xs font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'am' ? 'ያልተረጋገጠ' : 'Unverified'}</span>
          </div>
        )}
      </div>

      {/* Transaction Notifications Removed */}

      {/* Transaction Notifications Removed */}

      {/* 3. Celebratory Genuine Lottery Winner Alert Banner (የሎተሪ አሸናፊነት ማስታወቂያ ብቻ) */}
      {userWinningNotifs.length > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-950/95 via-yellow-950/90 to-emerald-950/95 border-2 border-amber-400/80 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-amber-500/25 ring-1 ring-amber-400/40 animate-in fade-in slide-in-from-top-3 duration-500">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-400/20 rounded-full blur-2xl pointer-events-none animate-pulse" />
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-400/30 shrink-0 text-2xl font-black">
                🏆
              </div>
              <div className="space-y-1">
                <h4 className="text-sm sm:text-base font-black text-amber-300 flex items-center gap-1.5">
                  <span>{lang === 'am' ? '🎉 እንኳን ደስ አለዎት! አሸናፊ ሆነዋል!' : '🎉 Congratulations! You Won!'}</span>
                </h4>
                <p className="text-xs text-slate-100 font-medium leading-relaxed">
                  {lang === 'am' ? userWinningNotifs[0].messageAm : userWinningNotifs[0].messageEn}
                </p>
                <div className="pt-2 flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-300 bg-emerald-950/70 border border-emerald-500/60 px-3 py-1 rounded-full shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{lang === 'am' ? 'የዕጣ ሽልማት ዋሌትዎ ላይ ገቢ ተደርጓል' : 'Prize Credited to Wallet'}</span>
                  </span>
                  {userWinningNotifs[0].amountWon > 0 && (
                    <span className="text-xs font-mono font-black text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/40">
                      +{userWinningNotifs[0].amountWon.toLocaleString()} ብር
                    </span>
                  )}
                </div>
              </div>
            </div>
            {onClearNotification && (
              <button
                type="button"
                onClick={() => onClearNotification(userWinningNotifs[0].id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-900/60 hover:bg-slate-800 transition shrink-0 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Balance Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-950 border border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-5">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Top row: Balance display */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              {lang === 'am' ? 'ያለዎት ቀሪ ሒሳብ' : 'Available Balance'}
            </span>
            <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-sans tabular-nums mt-1.5 flex items-baseline gap-2">
              <span>{availableBalance.toLocaleString()}</span>
              <span className="text-lg sm:text-xl text-emerald-300 font-sans font-bold">ብር</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: + ሒሳብ ሙላ (Deposit) and ↗ ገንዘብ አውጣ (Withdraw) */}
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <button
            type="button"
            onClick={() => {
              onOpenDeposit();
              triggerHaptic?.('medium');
            }}
            className="py-3 sm:py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{lang === 'am' ? 'ገቢ' : 'Deposit'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenWithdraw();
              triggerHaptic?.('medium');
            }}
            className="py-3 sm:py-3.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition duration-150 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 stroke-[3]" />
            <span>{lang === 'am' ? 'ወጪ' : 'Withdraw'}</span>
          </button>
        </div>
      </div>

      {/* Pending Deposit / Withdrawal Status Banners in the requested area */}
      {myTransactions
        .filter(t => t.status === 'pending' && (t.type === 'deposit' || t.type === 'withdrawal'))
        .map(tx => (
          <div key={tx.id} className="bg-gradient-to-r from-amber-950/95 via-slate-900 to-yellow-950/95 border-2 border-amber-400/70 rounded-3xl p-4 sm:p-5 shadow-xl shadow-amber-500/20 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs sm:text-sm font-black text-amber-300">
                  {tx.type === 'deposit' 
                    ? (lang === 'am' ? `የ ${tx.amount.toLocaleString()} ብር የገቢ ጥያቄዎ በመጠበቅ ላይ ነው` : `Deposit Request of ${tx.amount} ETB Pending`)
                    : (lang === 'am' ? `የ ${tx.amount.toLocaleString()} ብር የማውጣት ጥያቄዎ በመጠበቅ ላይ ነው` : `Withdrawal Request of ${tx.amount} ETB Pending`)}
                </h4>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-400/50 whitespace-nowrap shadow-sm">
              {lang === 'am' ? 'በመጠበቅ ላይ...' : 'Pending...'}
            </span>
          </div>
        ))}
    </div>
  );
};
