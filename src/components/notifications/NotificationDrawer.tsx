import React from 'react';
import { X, Bell, Trophy, CheckCheck, Trash2, Clock, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Language, WinnerNotification } from '../../types/lottery';
import { formatETB, formatEthiopianDate } from '../../utils/lotteryUtils';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: WinnerNotification[];
  lang: Language;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  lang,
  onMarkAllAsRead,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                {lang === 'am' ? 'የማሳወቂያ ማዕከል' : 'Winner Notifications'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {notifications.length} {lang === 'am' ? 'ማሳወቂያዎች' : 'alerts'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={onMarkAllAsRead}
                  className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition"
                  title={lang === 'am' ? 'ሁሉንም አንብብ' : 'Mark all read'}
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
                <button
                  onClick={onClearAll}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                  title={lang === 'am' ? 'ሁሉንም አጥፋ' : 'Clear all'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-xs space-y-2">
              <Bell className="w-10 h-10 mx-auto text-slate-600" />
              <div>{lang === 'am' ? 'ምንም ማሳወቂያ የለም' : 'No notifications yet'}</div>
            </div>
          ) : (
            notifications.map((item) => {
              const isDeposit = item.lotteryId === 'wallet' || item.messageAm.includes('ገቢ');
              const isWithdrawal = item.messageAm.includes('ማውጣት');
              const isPending = isDeposit && (item.messageAm.includes('ይጠብቃል') || item.messageAm.includes('የገቢ ጥያቄ'));
              const isApproved = isDeposit && !isPending;
              const isWin = !isDeposit && !isWithdrawal && (item.amountWon > 0 || item.messageAm.includes('አሸንፈዋል') || item.messageAm.includes('የዕጣ አሸናፊ'));

              const badgeText = isWin
                ? (lang === 'am' ? 'የሎተሪ አሸናፊ!' : 'Lottery Winner!')
                : isPending
                ? (lang === 'am' ? 'የገቢ ጥያቄ (ይጠብቃል)' : 'Deposit Pending')
                : isApproved
                ? (lang === 'am' ? 'ገንዘብ ገቢ ተደርጓል' : 'Deposit Completed')
                : isWithdrawal
                ? (lang === 'am' ? 'የገንዘብ ማውጣት' : 'Withdrawal')
                : (lang === 'am' ? 'ማሳወቂያ' : 'Notification');

              const badgeColor = isWin
                ? 'text-amber-400'
                : isPending
                ? 'text-amber-300'
                : isApproved
                ? 'text-emerald-400'
                : 'text-slate-400';

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    item.isRead
                      ? 'bg-slate-950/40 border-slate-800 text-slate-300'
                      : isWin
                      ? 'bg-amber-950/20 border-amber-500/40 text-white shadow-md'
                      : 'bg-emerald-950/30 border-emerald-500/40 text-white shadow-md'
                  }`}
                >
                  <div className="flex items-start space-x-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isWin 
                        ? 'bg-amber-500/20 text-amber-400' 
                        : isPending 
                        ? 'bg-amber-500/20 text-amber-300' 
                        : isWithdrawal 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {isWin ? <Trophy className="w-4 h-4" /> : isPending ? <Clock className="w-4 h-4" /> : isWithdrawal ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <span className={`text-[10px] font-bold uppercase ${badgeColor}`}>
                          {badgeText}
                        </span>
                        <span className="text-[10px] text-slate-400 font-sans">
                          {formatEthiopianDate(item.timestamp, true)}
                        </span>
                      </div>
                      <p className="text-xs mt-1 leading-relaxed">
                        {lang === 'am' ? item.messageAm : item.messageEn}
                      </p>
                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">
                          {isWin ? 'የዕጣ ቁጥር:' : 'ማጣቀሻ:'}{' '}
                          <strong className="text-white font-mono">{item.ticketNumber || 'N/A'}</strong>
                        </span>
                        {item.amountWon > 0 && (
                          <span className="text-emerald-400 font-bold font-mono">+{formatETB(item.amountWon)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
