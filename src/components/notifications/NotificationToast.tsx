import React, { useEffect } from 'react';
import { Trophy, X } from 'lucide-react';
import { formatETB } from '../../utils/lotteryUtils';

interface NotificationToastProps {
  notification: {
    messageAm: string;
    amountWon?: number;
    ticketNumber?: string;
  } | null;
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        onClose();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm w-full bg-slate-900 border-2 border-emerald-500 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-top-4 duration-300">
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0 animate-bounce">
          <Trophy className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
              የድል ማሳወቂያ (Push Notification)
            </span>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-white mt-1 leading-snug font-medium">
            {notification.messageAm}
          </p>
          {notification.amountWon !== undefined && notification.amountWon > 0 && (
            <div className="mt-2 text-xs font-mono font-bold text-emerald-400">
              ያሸነፉት ገንዘብ: +{formatETB(notification.amountWon)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
