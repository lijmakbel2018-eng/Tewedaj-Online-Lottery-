import { LotteryDraw, Ticket, Transaction, UserProfile, WinnerNotification } from '../types/lottery';
import { 
  lottery1000BannerImage, 
  lottery5000BannerImage, 
  lottery10000BannerImage,
  lottery20000BannerImage,
  lotteryTv32BannerImage
} from '../assets/banknotes';

export const INITIAL_USER: UserProfile = {
  id: 'usr_eth_' + Math.floor(1000 + Math.random() * 9000),
  telegramId: '',
  telegramUsername: '',
  fullName: 'ተጠቃሚ',
  phone: '',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  walletBalance: 0,
  ticketsCount: 0,
  totalWon: 0,
  isRegistered: true,
};

// 32 Inch TV Lottery first + 4 canonical Derash lotteries (1k, 5k, 10k, 50k)
export const INITIAL_LOTTERIES: LotteryDraw[] = [
  {
    id: 'lot_tv_32',
    titleAm: '32 Inch TV ዕጣ',
    titleEn: '32 Inch TV Draw',
    code: 'TV-32',
    category: 'national',
    bannerUrl: lotteryTv32BannerImage,
    ticketPrice: 200,
    totalInventory: 150,
    ticketsSold: 0,
    round: 1,
    jackpotAmount: 0,
    isItemPrize: true,
    prizeItemName: '32 Inch TV',
    prizeItemNameAm: '32 Inch TV',
    drawDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    status: 'active',
    prizes: [
      { rank: 1, titleAm: '32 Inch TV', titleEn: '32 Inch TV', amount: 0, winnersCount: 1 },
    ],
    provablyFairSeed: '0x99a0182ceba81290384729012',
  },
  {
    id: 'lot_derash_1000',
    titleAm: 'ባለ 1,000 ብር ደራሽ',
    titleEn: 'Bale 1,000 ETB Derash',
    code: 'DERASH-1K',
    category: 'instant',
    bannerUrl: lottery1000BannerImage,
    ticketPrice: 10,
    totalInventory: 150,
    ticketsSold: 0,
    round: 1,
    jackpotAmount: 1000,
    drawDate: new Date(Date.now() + 3600000 * 24).toISOString(),
    status: 'active',
    prizes: [
      { rank: 1, titleAm: '1ኛ ዕጣ ሽልማት', titleEn: '1st Prize', amount: 1000, winnersCount: 1 },
    ],
    provablyFairSeed: '0x8f2a99e19d3e84a2110cbe9087d',
  },
  {
    id: 'lot_derash_5000',
    titleAm: 'ባለ 5,000 ብር ደራሽ',
    titleEn: 'Bale 5,000 ETB Derash',
    code: 'DERASH-5K',
    category: 'digital',
    bannerUrl: lottery5000BannerImage,
    ticketPrice: 50,
    totalInventory: 150,
    ticketsSold: 0,
    round: 1,
    jackpotAmount: 5000,
    drawDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    status: 'active',
    prizes: [
      { rank: 1, titleAm: '1ኛ ዕጣ ሽልማት', titleEn: '1st Prize', amount: 5000, winnersCount: 1 },
    ],
    provablyFairSeed: '0x33b1e77f0987ad18900cde99a41',
  },
  {
    id: 'lot_derash_10000',
    titleAm: 'ባለ 10,000 ብር ደራሽ',
    titleEn: 'Bale 10,000 ETB Derash',
    code: 'DERASH-10K',
    category: 'national',
    bannerUrl: lottery10000BannerImage,
    ticketPrice: 100,
    totalInventory: 150,
    ticketsSold: 0,
    round: 1,
    jackpotAmount: 10000,
    drawDate: new Date(Date.now() + 86400000 * 4).toISOString(),
    status: 'active',
    prizes: [
      { rank: 1, titleAm: '1ኛ ዕጣ ሽልማት', titleEn: '1st Prize', amount: 10000, winnersCount: 1 },
    ],
    provablyFairSeed: '0x17c9920a4beff349a110029b3c',
  },
  {
    id: 'lot_derash_50000',
    titleAm: 'ባለ 50,000 ብር ደራሽ',
    titleEn: 'Bale 50,000 ETB Derash',
    code: 'DERASH-50K',
    category: 'national',
    bannerUrl: lottery20000BannerImage,
    ticketPrice: 200,
    totalInventory: 300,
    ticketsSold: 0,
    round: 1,
    jackpotAmount: 50000,
    drawDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    status: 'active',
    prizes: [
      { rank: 1, titleAm: '1ኛ ዕጣ ሽልማት', titleEn: '1st Prize', amount: 50000, winnersCount: 1 },
    ],
    provablyFairSeed: '0x49a0182ceba81290384729019',
  },
];

export const INITIAL_TICKETS: Ticket[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_NOTIFICATIONS: WinnerNotification[] = [];
