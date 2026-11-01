export type Language = 'am' | 'en';
export type PaymentMethod = 'telebirr' | 'cbe_birr' | 'chapa' | 'telegram_stars' | 'wallet';

export interface LotteryDraw {
  id: string;
  titleAm: string;
  titleEn: string;
  code: string;
  category: 'national' | 'digital' | 'weekly' | 'instant';
  bannerUrl: string;
  ticketPrice: number; // in ETB
  totalInventory: number;
  ticketsSold: number;
  jackpotAmount: number; // in ETB
  drawDate: string; // ISO string
  status: 'active' | 'drawing' | 'completed' | 'upcoming';
  round?: number; // Round sequence: 1, 2, 3...
  prizes: {
    rank: number;
    titleAm: string;
    titleEn: string;
    amount: number;
    winnersCount: number;
  }[];
  winningNumbers?: {
    firstPrize: string;
    secondPrize: string;
    thirdPrize: string;
    consolationSuffix: string;
  };
  winnerDetails?: {
    firstPrizeWinner?: {
      ticketNumber: string;
      name: string;
      phone: string;
      telegram?: string;
      avatar?: string;
    };
  };
  provablyFairSeed?: string;
  isItemPrize?: boolean;
  prizeItemName?: string;
  prizeItemNameAm?: string;
}

export interface Ticket {
  id: string;
  lotteryId: string;
  lotteryTitleAm: string;
  lotteryTitleEn: string;
  ticketNumber: string; // 6 digits, e.g. "849201"
  userId: string;
  userName: string;
  userPhone: string;
  userTelegram?: string;
  userAvatar?: string;
  pricePaid: number;
  purchasedAt: string;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  round?: number;
  status: 'active' | 'won' | 'lost' | 'refunded';
  prizeWon?: number;
  prizeTitleAm?: string;
  prizeTitleEn?: string;
  securityHash: string;
}

export interface Transaction {
  id: string;
  ticketId?: string;
  lotteryId: string;
  lotteryTitleAm: string;
  userId: string;
  userName: string;
  userPhone: string;
  amount: number; // in ETB
  type: 'ticket_purchase' | 'prize_payout' | 'deposit' | 'withdrawal';
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  paymentReference?: string;
  screenshotUrl?: string;
  telegramId?: string;
  customerId?: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  gatewayFee: number;
}

export interface WinnerNotification {
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

export interface UserProfile {
  id: string;
  telegramId: string;
  telegramUsername: string;
  customerId?: string;
  fullName: string;
  phone: string;
  avatarUrl?: string;
  walletBalance: number; // in ETB
  ticketsCount: number;
  totalWon: number;
  isRegistered: boolean;
  password?: string;
  isAdmin?: boolean;
  notifications?: any[];
}
