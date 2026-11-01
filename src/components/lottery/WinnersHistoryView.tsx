import React, { useState } from 'react';
import { 
  Trophy, 
  Sparkles, 
  Search, 
  Copy, 
  Check, 
  Clock, 
  FileText,
  X 
} from 'lucide-react';
import { Language, LotteryDraw, Ticket } from '../../types/lottery';
import { formatETB, formatEthiopianDate } from '../../utils/lotteryUtils';

interface WinnersHistoryViewProps {
  drawnLotteries: LotteryDraw[];
  tickets: Ticket[];
  lang: Language;
  onVerifyTicket?: (ticketNumber: string) => void;
  triggerHaptic?: (style: 'light' | 'medium' | 'heavy') => void;
  playNotificationSound?: (type: 'click' | 'win' | 'alert') => void;
  compactHeader?: boolean;
}

export const WinnersHistoryView: React.FC<WinnersHistoryViewProps> = ({
  drawnLotteries,
  tickets,
  lang,
  triggerHaptic,
  playNotificationSound,
  compactHeader: _compactHeader = false,
}) => {
  const [historyFilterTier, setHistoryFilterTier] = useState<'all' | 'tv' | '10' | '50' | '100' | '200'>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<LotteryDraw | null>(null);

  const handleCopyNumber = (num: string, keyId: string) => {
    if (!num) return;
    navigator.clipboard?.writeText(num);
    setCopiedKey(keyId);
    triggerHaptic?.('light');
    playNotificationSound?.('click');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredDraws = drawnLotteries.filter((draw) => {
    if (historyFilterTier !== 'all') {
      if (historyFilterTier === 'tv') {
        if (draw.id !== 'lot_tv_32' && !draw.isItemPrize && !draw.titleAm.includes('ቲቪ') && !draw.titleEn.toLowerCase().includes('tv')) return false;
      } else if (historyFilterTier === '200') {
        if (draw.id === 'lot_tv_32' || draw.isItemPrize || draw.titleAm.includes('ቲቪ') || draw.ticketPrice !== 200) return false;
      } else if (String(draw.ticketPrice) !== historyFilterTier) {
        return false;
      }
    }
    if (historySearchQuery.trim()) {
      const q = historySearchQuery.trim().toLowerCase();
      const matchNumber = 
        draw.winningNumbers?.firstPrize?.toLowerCase().includes(q) ||
        draw.winningNumbers?.secondPrize?.toLowerCase().includes(q) ||
        draw.winningNumbers?.thirdPrize?.toLowerCase().includes(q);
      const matchTitle = 
        draw.titleAm.toLowerCase().includes(q) || 
        draw.titleEn.toLowerCase().includes(q);
      const matchRound = String(draw.round || 1).includes(q);
      const matchWinnerName = 
        draw.winnerDetails?.firstPrizeWinner?.name?.toLowerCase().includes(q);
      const matchWinnerPhone = 
        draw.winnerDetails?.firstPrizeWinner?.phone?.includes(q);
      return matchNumber || matchTitle || matchRound || matchWinnerName || matchWinnerPhone;
    }
    return true;
  });

  return (
    <div className="space-y-3.5 w-full">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0">
              <h3 className="text-lg font-black text-white truncate">
                <span>{lang === 'am' ? 'የአሸናፊዎች ዝርዝር' : 'Winners'}</span>
              </h3>
            </div>
          </div>
          <span className="bg-amber-500/10 text-amber-300 border border-amber-500/25 px-2.5 py-1 rounded-xl font-bold font-mono text-xs tabular-nums shrink-0">
            {drawnLotteries.length} {lang === 'am' ? 'ዕጣዎች' : 'Winners'}
          </span>
        </div>

        {/* Tier Filter Pills */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1 text-xs">
          {[
            { id: 'all', label: lang === 'am' ? 'ሁሉም' : 'All' },
            { id: 'tv', label: '32" TV' },
            { id: '10', label: '1,000 ብር' },
            { id: '50', label: '5,000 ብር' },
            { id: '100', label: '10,000 ብር' },
            { id: '200', label: '50,000 ብር' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setHistoryFilterTier(t.id as any);
                triggerHaptic?.('light');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap border ${
                historyFilterTier === t.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow font-black'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search */}
        {drawnLotteries.length > 0 && (
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              placeholder={lang === 'am' ? 'በዕጣ ቁጥር ወይም በአሸናፊ ስም ፈልግ...' : 'Search by ticket # or winner...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {historySearchQuery && (
              <button
                type="button"
                onClick={() => setHistorySearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* Empty State vs List */}
      {filteredDraws.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3 shadow-lg">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto text-2xl">
            🏆
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-black text-white">
              {lang === 'am' ? 'እስካሁን የወጣ ዕጣ የለም' : 'No Winners Yet'}
            </h4>
          </div>
        </div>
      ) : (
        /* Winner Cards */
        <div className="space-y-3">
          {filteredDraws.map((draw) => {
            const drawDateFormatted = formatEthiopianDate(draw.drawDate, true);
            const firstPrizeNum = draw.winningNumbers?.firstPrize || '------';
            const secondPrizeNum = draw.winningNumbers?.secondPrize;
            const thirdPrizeNum = draw.winningNumbers?.thirdPrize;

            const winnerTicket = tickets.find(
              t => t.ticketNumber === draw.winningNumbers?.firstPrize
            );
            const winnerObj = draw.winnerDetails?.firstPrizeWinner || (winnerTicket ? {
              ticketNumber: winnerTicket.ticketNumber,
              name: winnerTicket.userName,
              phone: winnerTicket.userPhone,
              telegram: winnerTicket.userTelegram,
              avatar: winnerTicket.userAvatar,
            } : null);

            return (
              <div 
                key={draw.id}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl overflow-hidden shadow-lg space-y-3 p-3.5 transition"
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 font-sans">
                        ዙር {draw.round || 1}
                      </span>
                      <h4 className="text-sm font-black text-white truncate">
                        {lang === 'am' ? draw.titleAm : draw.titleEn}
                      </h4>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{drawDateFormatted}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block font-semibold">{lang === 'am' ? 'የዕጣው ሽልማት' : 'Prize'}</span>
                    <span className="text-sm font-black text-emerald-400 font-sans tabular-nums">
                      {draw.id === 'lot_tv_32' || draw.isItemPrize ? '32 Inch TV' : formatETB(draw.jackpotAmount)}
                    </span>
                  </div>
                </div>

                {/* 1st Prize Winning Number Drum */}
                <div className="p-3 bg-gradient-to-r from-slate-950 via-amber-950/30 to-slate-950 rounded-xl border border-amber-500/40 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-amber-400 font-bold uppercase block">
                      1ኛ አሸናፊ ዕጣ
                    </span>
                    <div className="font-mono font-black text-2xl text-yellow-400 tracking-wider">
                      #{firstPrizeNum}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyNumber(firstPrizeNum, draw.id)}
                      title="Copy"
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition active:scale-95"
                    >
                      {copiedKey === draw.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Secondary numbers */}
                {(secondPrizeNum || thirdPrizeNum) && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {secondPrizeNum && (
                      <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex justify-between">
                        <span className="text-slate-400 text-[10px]">2ኛ ዕጣ:</span>
                        <span className="font-mono font-bold text-amber-300">#{secondPrizeNum}</span>
                      </div>
                    )}
                    {thirdPrizeNum && (
                      <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex justify-between">
                        <span className="text-slate-400 text-[10px]">3ኛ ዕጣ:</span>
                        <span className="font-mono font-bold text-amber-300">#{thirdPrizeNum}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Winner Customer info */}
                {winnerObj ? (
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-amber-500/30 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-amber-400 bg-slate-800 shrink-0 flex items-center justify-center font-bold text-amber-300 text-xs">
                        🏆
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-amber-300 text-xs truncate">
                          {lang === 'am' ? 'የአሸናፊ ትኬት' : 'Winning Ticket'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCertificate(draw);
                        triggerHaptic?.('light');
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs flex items-center gap-1 transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">{lang === 'am' ? 'የድል ምስክር' : 'Cert'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-slate-400 text-center">
                    <span>{lang === 'am' ? 'ያልተሸጠ ትኬት' : 'Unsold ticket'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Draw Certificate Modal */}
      {selectedCertificate && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl space-y-3.5 p-4 text-xs animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-white text-sm">
                  {lang === 'am' ? 'ይፋዊ የአሸናፊ ምስክር ወረቀት' : 'Official Winner Certificate'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCertificate(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">የሎተሪው ስም:</span>
                <span className="font-bold text-white">{selectedCertificate.titleAm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">የዕጣ ዙር:</span>
                <span className="font-mono text-amber-300 font-bold">ዙር {selectedCertificate.round || 1}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">1ኛ አሸናፊ ቁጥር:</span>
                <span className="font-mono text-yellow-400 font-black text-sm">#{selectedCertificate.winningNumbers?.firstPrize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">የሽልማት ዓይነት/መጠን:</span>
                <span className="font-sans text-emerald-400 font-bold">{selectedCertificate.id === 'lot_tv_32' || selectedCertificate.isItemPrize ? '32 Inch TV (የ 32 ኢንች ኤልኢዲ ቲቪ)' : formatETB(selectedCertificate.jackpotAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">የወጣበት ቀን:</span>
                <span className="text-slate-300">{formatEthiopianDate(selectedCertificate.drawDate, true)}</span>
              </div>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setSelectedCertificate(null)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
              >
                {lang === 'am' ? 'ዝጋ' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
