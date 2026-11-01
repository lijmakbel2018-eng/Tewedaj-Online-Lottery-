// Lottery Utility Functions
// Ethiopian Calendar (የኢትዮጵያ ዘመን አቆጣጠር) Utilities
export const ETHIOPIAN_MONTHS_AM = [
  'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
  'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'
];

export interface EthiopianDateResult {
  year: number;
  month: number;
  day: number;
  monthNameAm: string;
  formattedDate: string;
}

export function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

export function toEthiopianDate(input: Date | string | number): EthiopianDateResult {
  const d = new Date(input);
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const gy = validDate.getFullYear();
  const gm = validDate.getMonth() + 1;
  const gd = validDate.getDate();

  const jdn = gregorianToJDN(gy, gm, gd);
  const r = (jdn - 1723856) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);

  const year = 4 * Math.floor((jdn - 1723856) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460);
  const month = Math.floor(n / 30) + 1;
  const day = (n % 30) + 1;

  const monthNameAm = ETHIOPIAN_MONTHS_AM[month - 1] || 'መስከረም';

  return {
    year,
    month,
    day,
    monthNameAm,
    formattedDate: `${monthNameAm} ${day} ቀን ${year} ዓ.ም`,
  };
}

export function formatEthiopianDate(input: Date | string | number, includeTime: boolean = false): string {
  const eth = toEthiopianDate(input);
  if (!includeTime) {
    return eth.formattedDate;
  }
  const d = new Date(input);
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const hours = validDate.getHours().toString().padStart(2, '0');
  const minutes = validDate.getMinutes().toString().padStart(2, '0');
  return `${eth.formattedDate} ${hours}:${minutes}`;
}

export function formatETB(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' ብር';
}

export function formatETBOnly(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateLuckyNumber(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return num.toString();
}

export function generateSecurityHash(ticketNumber: string, lotteryId: string, timestamp: string): string {
  let hash = 0;
  const str = `${ticketNumber}-${lotteryId}-${timestamp}-ETH-LOTTERY-SECURE-KEY`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0').toUpperCase();
  return `ETH-${hex}-${ticketNumber.slice(0, 3)}`;
}

export function generateReference(prefix: string = 'TLB'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = prefix + '-';
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function playNotificationSound(type: 'win' | 'click' | 'success' | 'alert' = 'click') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'success') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.08); // C#
      osc.frequency.setValueAtTime(659.25, now + 0.16); // E
      osc.frequency.setValueAtTime(880, now + 0.24); // A
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.45);
    } else if (type === 'win') {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + idx * 0.1;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.35);
      });
    } else if (type === 'alert') {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(240, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(now + 0.3);
    }
  } catch {
    // Audio playback blocked by browser autoplay policy until user gesture
  }
}

export function triggerConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = (canvas.width = window.innerWidth);
  const height = (canvas.height = window.innerHeight);

  const particles: {
    x: number;
    y: number;
    size: number;
    color: string;
    speedX: number;
    speedY: number;
    rotation: number;
    rotationSpeed: number;
  }[] = [];

  const colors = ['#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4'];

  for (let i = 0; i < 90; i++) {
    particles.push({
      x: width / 2,
      y: height / 3,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedX: (Math.random() - 0.5) * 16,
      speedY: Math.random() * -12 - 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
    });
  }

  let animationFrameId: number;
  let frameCount = 0;

  function render() {
    frameCount++;
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;
      p.speedY += 0.35; // gravity
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      ctx.restore();
    });

    if (frameCount < 120) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrameId);
      canvas.remove();
    }
  }

  render();
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  let copied = false;
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch {
      copied = false;
    }
  }
  if (!copied && typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.select();
      textArea.setSelectionRange(0, text.length);
      copied = document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (e) {
      console.error('Fallback copy failed', e);
      copied = false;
    }
  }
  return copied;
}

export function normalizeEthiopianPhone(raw?: string): string {
  if (!raw) return '';
  let clean = String(raw).replace(/\D/g, '');
  if (clean.startsWith('251')) {
    clean = '0' + clean.slice(3);
  } else if (!clean.startsWith('0') && (clean.startsWith('9') || clean.startsWith('7'))) {
    clean = '0' + clean;
  }
  return clean;
}
