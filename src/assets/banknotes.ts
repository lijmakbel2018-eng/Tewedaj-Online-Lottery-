/**
 * Official Tewedaj Online Lottery Card Header Backgrounds
 * Pure, luxury graphical image backgrounds with NO text:
 * - 1,000 ETB Derash: Emerald & Radiant Gold luxury lottery background
 * - 5,000 ETB Derash: Sapphire & Radiant Gold royal jackpot background
 * - 10,000 ETB Derash: Ruby & Imperial Gold grand mega jackpot background
 * - 20,000 ETB Derash: Imperial Amethyst & 24K Pure Gold jackpot background
 * Absolutely ZERO text elements - clean, elegant, high-definition.
 */

// Helper to convert SVG string to safe Base64 Data URI
function toDataUri(svg: string): string {
  const base64 = typeof btoa === 'function' 
    ? btoa(unescape(encodeURIComponent(svg))) 
    : Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// 1. Emerald & Gold Luxury Jackpot Background (NO TEXT)
export const lottery1000BannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="bg1k" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#021c16" />
      <stop offset="25%" stop-color="#064e3b" />
      <stop offset="50%" stop-color="#047857" />
      <stop offset="75%" stop-color="#065f46" />
      <stop offset="100%" stop-color="#022c22" />
    </linearGradient>
    <radialGradient id="centerGlow1k" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#34d399" stop-opacity="0.65" />
      <stop offset="35%" stop-color="#10b981" stop-opacity="0.35" />
      <stop offset="70%" stop-color="#059669" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="goldBeam" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.35" />
      <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#d97706" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="goldBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="25%" stop-color="#fbbf24" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="75%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#fef08a" />
    </linearGradient>
    <pattern id="luxPattern1k" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 0 20 L 20 0 L 40 20 L 20 40 Z" fill="none" stroke="#fbbf24" stroke-width="0.7" opacity="0.12" />
      <circle cx="20" cy="20" r="2" fill="#34d399" opacity="0.18" />
    </pattern>
    <g id="sparkleGold">
      <path d="M 0,-14 Q 0,0 14,0 Q 0,0 0,14 Q 0,0 -14,0 Q 0,0 0,-14 Z" fill="#fef08a" />
      <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
    </g>
  </defs>
  <rect width="800" height="400" fill="url(#bg1k)" />
  <rect width="800" height="400" fill="url(#luxPattern1k)" />
  <circle cx="400" cy="200" r="320" fill="url(#centerGlow1k)" />
  <g opacity="0.25">
    <polygon points="400,200 -50,-50 150,-50" fill="url(#goldBeam)" />
    <polygon points="400,200 250,-50 450,-50" fill="url(#goldBeam)" />
    <polygon points="400,200 550,-50 750,-50" fill="url(#goldBeam)" />
    <polygon points="400,200 850,-50 850,150" fill="url(#goldBeam)" />
    <polygon points="400,200 850,250 850,450" fill="url(#goldBeam)" />
    <polygon points="400,200 650,450 450,450" fill="url(#goldBeam)" />
    <polygon points="400,200 350,450 150,450" fill="url(#goldBeam)" />
    <polygon points="400,200 -50,450 -50,250" fill="url(#goldBeam)" />
    <polygon points="400,200 -50,150 -50,-50" fill="url(#goldBeam)" />
  </g>
  <circle cx="400" cy="200" r="140" fill="none" stroke="url(#goldBorderGrad)" stroke-width="1.8" opacity="0.5" stroke-dasharray="10,6" />
  <circle cx="400" cy="200" r="115" fill="none" stroke="#34d399" stroke-width="1" opacity="0.4" />
  <circle cx="400" cy="200" r="85" fill="none" stroke="url(#goldBorderGrad)" stroke-width="2.2" opacity="0.65" />
  <circle cx="400" cy="200" r="60" fill="none" stroke="#fef08a" stroke-width="0.8" opacity="0.5" stroke-dasharray="4,4" />
  <circle cx="160" cy="90" r="28" fill="#fef08a" opacity="0.1" />
  <circle cx="640" cy="110" r="32" fill="#34d399" opacity="0.12" />
  <circle cx="230" cy="290" r="22" fill="#34d399" opacity="0.15" />
  <circle cx="580" cy="280" r="26" fill="#fef08a" opacity="0.12" />
  <circle cx="340" cy="120" r="14" fill="#ffffff" opacity="0.2" />
  <circle cx="460" cy="270" r="16" fill="#fef08a" opacity="0.22" />
  <use href="#sparkleGold" x="400" y="200" transform="scale(1.4)" opacity="0.85" />
  <use href="#sparkleGold" x="220" y="110" transform="scale(0.85)" opacity="0.75" />
  <use href="#sparkleGold" x="590" y="120" transform="scale(0.9)" opacity="0.75" />
  <use href="#sparkleGold" x="280" y="280" transform="scale(0.75)" opacity="0.7" />
  <use href="#sparkleGold" x="530" y="270" transform="scale(0.8)" opacity="0.7" />
  <use href="#sparkleGold" x="120" y="220" transform="scale(0.6)" opacity="0.6" />
  <use href="#sparkleGold" x="690" y="210" transform="scale(0.65)" opacity="0.6" />
  <rect x="12" y="12" width="776" height="376" rx="16" fill="none" stroke="url(#goldBorderGrad)" stroke-width="3" opacity="0.8" />
  <rect x="20" y="20" width="760" height="360" rx="12" fill="none" stroke="#34d399" stroke-width="1" opacity="0.4" stroke-dasharray="8,6" />
  <g fill="none" stroke="url(#goldBorderGrad)" stroke-width="2.5" opacity="0.85">
    <path d="M 28 55 L 28 28 L 55 28" />
    <circle cx="28" cy="28" r="3" fill="#fef08a" />
    <path d="M 772 55 L 772 28 L 745 28" />
    <circle cx="772" cy="28" r="3" fill="#fef08a" />
    <path d="M 28 345 L 28 372 L 55 372" />
    <circle cx="28" cy="372" r="3" fill="#fef08a" />
    <path d="M 772 345 L 772 372 L 745 372" />
    <circle cx="772" cy="372" r="3" fill="#fef08a" />
  </g>
</svg>`;

// 2. Sapphire & Gold Royal Jackpot Background (NO TEXT)
export const lottery5000BannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="bg5k" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a1128" />
      <stop offset="25%" stop-color="#101f42" />
      <stop offset="50%" stop-color="#1e3a8a" />
      <stop offset="75%" stop-color="#172554" />
      <stop offset="100%" stop-color="#0b132b" />
    </linearGradient>
    <radialGradient id="centerGlow5k" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.65" />
      <stop offset="35%" stop-color="#3b82f6" stop-opacity="0.35" />
      <stop offset="70%" stop-color="#1d4ed8" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="goldBeam5k" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.35" />
      <stop offset="50%" stop-color="#60a5fa" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#1e3a8a" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="goldBorderGrad5k" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="25%" stop-color="#fbbf24" />
      <stop offset="50%" stop-color="#93c5fd" />
      <stop offset="75%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#fef08a" />
    </linearGradient>
    <pattern id="luxPattern5k" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 0 20 L 20 0 L 40 20 L 20 40 Z" fill="none" stroke="#60a5fa" stroke-width="0.7" opacity="0.12" />
      <circle cx="20" cy="20" r="2" fill="#fbbf24" opacity="0.18" />
    </pattern>
    <g id="sparkleBlue">
      <path d="M 0,-14 Q 0,0 14,0 Q 0,0 0,14 Q 0,0 0,-14 Z" fill="#bfdbfe" />
      <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
    </g>
  </defs>
  <rect width="800" height="400" fill="url(#bg5k)" />
  <rect width="800" height="400" fill="url(#luxPattern5k)" />
  <circle cx="400" cy="200" r="320" fill="url(#centerGlow5k)" />
  <g opacity="0.25">
    <polygon points="400,200 -50,-50 150,-50" fill="url(#goldBeam5k)" />
    <polygon points="400,200 250,-50 450,-50" fill="url(#goldBeam5k)" />
    <polygon points="400,200 550,-50 750,-50" fill="url(#goldBeam5k)" />
    <polygon points="400,200 850,-50 850,150" fill="url(#goldBeam5k)" />
    <polygon points="400,200 850,250 850,450" fill="url(#goldBeam5k)" />
    <polygon points="400,200 650,450 450,450" fill="url(#goldBeam5k)" />
    <polygon points="400,200 350,450 150,450" fill="url(#goldBeam5k)" />
    <polygon points="400,200 -50,450 -50,250" fill="url(#goldBeam5k)" />
    <polygon points="400,200 -50,150 -50,-50" fill="url(#goldBeam5k)" />
  </g>
  <circle cx="400" cy="200" r="140" fill="none" stroke="url(#goldBorderGrad5k)" stroke-width="1.8" opacity="0.5" stroke-dasharray="10,6" />
  <circle cx="400" cy="200" r="115" fill="none" stroke="#60a5fa" stroke-width="1" opacity="0.4" />
  <circle cx="400" cy="200" r="85" fill="none" stroke="url(#goldBorderGrad5k)" stroke-width="2.2" opacity="0.65" />
  <circle cx="400" cy="200" r="60" fill="none" stroke="#bfdbfe" stroke-width="0.8" opacity="0.5" stroke-dasharray="4,4" />
  <circle cx="150" cy="100" r="30" fill="#93c5fd" opacity="0.12" />
  <circle cx="650" cy="105" r="28" fill="#fbbf24" opacity="0.12" />
  <circle cx="220" cy="285" r="24" fill="#fbbf24" opacity="0.14" />
  <circle cx="590" cy="275" r="25" fill="#60a5fa" opacity="0.15" />
  <circle cx="330" cy="115" r="14" fill="#ffffff" opacity="0.22" />
  <circle cx="470" cy="275" r="16" fill="#bfdbfe" opacity="0.22" />
  <use href="#sparkleBlue" x="400" y="200" transform="scale(1.4)" opacity="0.9" />
  <use href="#sparkleBlue" x="210" y="115" transform="scale(0.85)" opacity="0.8" />
  <use href="#sparkleBlue" x="600" y="115" transform="scale(0.9)" opacity="0.8" />
  <use href="#sparkleBlue" x="270" y="275" transform="scale(0.75)" opacity="0.75" />
  <use href="#sparkleBlue" x="540" y="265" transform="scale(0.8)" opacity="0.75" />
  <use href="#sparkleBlue" x="115" y="215" transform="scale(0.6)" opacity="0.6" />
  <use href="#sparkleBlue" x="695" y="205" transform="scale(0.65)" opacity="0.6" />
  <rect x="12" y="12" width="776" height="376" rx="16" fill="none" stroke="url(#goldBorderGrad5k)" stroke-width="3" opacity="0.85" />
  <rect x="20" y="20" width="760" height="360" rx="12" fill="none" stroke="#60a5fa" stroke-width="1" opacity="0.4" stroke-dasharray="8,6" />
  <g fill="none" stroke="url(#goldBorderGrad5k)" stroke-width="2.5" opacity="0.85">
    <path d="M 28 55 L 28 28 L 55 28" />
    <circle cx="28" cy="28" r="3" fill="#fef08a" />
    <path d="M 772 55 L 772 28 L 745 28" />
    <circle cx="772" cy="28" r="3" fill="#fef08a" />
    <path d="M 28 345 L 28 372 L 55 372" />
    <circle cx="28" cy="372" r="3" fill="#fef08a" />
    <path d="M 772 345 L 772 372 L 745 372" />
    <circle cx="772" cy="372" r="3" fill="#fef08a" />
  </g>
</svg>`;

// 3. Ruby & Imperial Gold Mega Jackpot Background (NO TEXT)
export const lottery10000BannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="bg10k" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2a040d" />
      <stop offset="25%" stop-color="#4c0519" />
      <stop offset="50%" stop-color="#881337" />
      <stop offset="75%" stop-color="#4c0519" />
      <stop offset="100%" stop-color="#1f0209" />
    </linearGradient>
    <radialGradient id="centerGlow10k" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.65" />
      <stop offset="35%" stop-color="#e11d48" stop-opacity="0.35" />
      <stop offset="70%" stop-color="#be123c" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="goldBeam10k" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.38" />
      <stop offset="50%" stop-color="#fb7185" stop-opacity="0.16" />
      <stop offset="100%" stop-color="#881337" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="goldBorderGrad10k" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="25%" stop-color="#fbbf24" />
      <stop offset="50%" stop-color="#f43f5e" />
      <stop offset="75%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#fef08a" />
    </linearGradient>
    <pattern id="luxPattern10k" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 0 20 L 20 0 L 40 20 L 20 40 Z" fill="none" stroke="#fbbf24" stroke-width="0.7" opacity="0.14" />
      <circle cx="20" cy="20" r="2" fill="#f43f5e" opacity="0.2" />
    </pattern>
    <g id="sparkleRuby">
      <path d="M 0,-14 Q 0,0 14,0 Q 0,0 0,14 Q 0,0 -14,0 Q 0,0 0,-14 Z" fill="#fef08a" />
      <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
    </g>
  </defs>
  <rect width="800" height="400" fill="url(#bg10k)" />
  <rect width="800" height="400" fill="url(#luxPattern10k)" />
  <circle cx="400" cy="200" r="320" fill="url(#centerGlow10k)" />
  <g opacity="0.28">
    <polygon points="400,200 -50,-50 150,-50" fill="url(#goldBeam10k)" />
    <polygon points="400,200 250,-50 450,-50" fill="url(#goldBeam10k)" />
    <polygon points="400,200 550,-50 750,-50" fill="url(#goldBeam10k)" />
    <polygon points="400,200 850,-50 850,150" fill="url(#goldBeam10k)" />
    <polygon points="400,200 850,250 850,450" fill="url(#goldBeam10k)" />
    <polygon points="400,200 650,450 450,450" fill="url(#goldBeam10k)" />
    <polygon points="400,200 350,450 150,450" fill="url(#goldBeam10k)" />
    <polygon points="400,200 -50,450 -50,250" fill="url(#goldBeam10k)" />
    <polygon points="400,200 -50,150 -50,-50" fill="url(#goldBeam10k)" />
  </g>
  <circle cx="400" cy="200" r="140" fill="none" stroke="url(#goldBorderGrad10k)" stroke-width="2" opacity="0.55" stroke-dasharray="10,6" />
  <circle cx="400" cy="200" r="115" fill="none" stroke="#fb7185" stroke-width="1.2" opacity="0.45" />
  <circle cx="400" cy="200" r="85" fill="none" stroke="url(#goldBorderGrad10k)" stroke-width="2.5" opacity="0.7" />
  <circle cx="400" cy="200" r="60" fill="none" stroke="#fef08a" stroke-width="0.8" opacity="0.55" stroke-dasharray="4,4" />
  <circle cx="155" cy="95" r="32" fill="#fef08a" opacity="0.12" />
  <circle cx="645" cy="115" r="28" fill="#fb7185" opacity="0.15" />
  <circle cx="235" cy="280" r="25" fill="#fef08a" opacity="0.14" />
  <circle cx="585" cy="270" r="28" fill="#f43f5e" opacity="0.15" />
  <circle cx="345" cy="125" r="15" fill="#ffffff" opacity="0.24" />
  <circle cx="455" cy="265" r="16" fill="#fef08a" opacity="0.24" />
  <use href="#sparkleRuby" x="400" y="200" transform="scale(1.5)" opacity="0.95" />
  <use href="#sparkleRuby" x="225" y="110" transform="scale(0.85)" opacity="0.8" />
  <use href="#sparkleRuby" x="595" y="125" transform="scale(0.9)" opacity="0.8" />
  <use href="#sparkleRuby" x="275" y="285" transform="scale(0.75)" opacity="0.75" />
  <use href="#sparkleRuby" x="535" y="275" transform="scale(0.8)" opacity="0.75" />
  <use href="#sparkleRuby" x="125" y="215" transform="scale(0.6)" opacity="0.6" />
  <use href="#sparkleRuby" x="685" y="205" transform="scale(0.65)" opacity="0.6" />
  <rect x="12" y="12" width="776" height="376" rx="16" fill="none" stroke="url(#goldBorderGrad10k)" stroke-width="3" opacity="0.9" />
  <rect x="20" y="20" width="760" height="360" rx="12" fill="none" stroke="#fb7185" stroke-width="1.2" opacity="0.45" stroke-dasharray="8,6" />
  <g fill="none" stroke="url(#goldBorderGrad10k)" stroke-width="2.5" opacity="0.9">
    <path d="M 28 55 L 28 28 L 55 28" />
    <circle cx="28" cy="28" r="3" fill="#fef08a" />
    <path d="M 772 55 L 772 28 L 745 28" />
    <circle cx="772" cy="28" r="3" fill="#fef08a" />
    <path d="M 28 345 L 28 372 L 55 372" />
    <circle cx="28" cy="372" r="3" fill="#fef08a" />
    <path d="M 772 345 L 772 372 L 745 372" />
    <circle cx="772" cy="372" r="3" fill="#fef08a" />
  </g>
</svg>`;

// 4. Imperial Amethyst & 24K Pure Gold Grand Royal Jackpot Background (NO TEXT)
export const lottery20000BannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="bg20k" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f051d" />
      <stop offset="25%" stop-color="#2e0854" />
      <stop offset="50%" stop-color="#4c1d95" />
      <stop offset="75%" stop-color="#3b0764" />
      <stop offset="100%" stop-color="#18042b" />
    </linearGradient>
    <radialGradient id="centerGlow20k" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.75" />
      <stop offset="35%" stop-color="#9333ea" stop-opacity="0.45" />
      <stop offset="70%" stop-color="#581c87" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="goldBeam20k" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.45" />
      <stop offset="50%" stop-color="#fbbf24" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#b45309" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="goldBorderGrad20k" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="20%" stop-color="#fbbf24" />
      <stop offset="40%" stop-color="#eab308" />
      <stop offset="60%" stop-color="#ca8a04" />
      <stop offset="80%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#fbbf24" />
    </linearGradient>
    <pattern id="luxPattern20k" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 0 24 L 24 0 L 48 24 L 24 48 Z" fill="none" stroke="#fef08a" stroke-width="0.8" opacity="0.14" />
      <circle cx="24" cy="24" r="2.5" fill="#e9d5ff" opacity="0.22" />
    </pattern>
    <g id="sparklePurple">
      <path d="M 0,-18 Q 0,0 18,0 Q 0,0 0,18 Q 0,0 -18,0 Q 0,0 0,-18 Z" fill="#fef08a" />
      <circle cx="0" cy="0" r="3" fill="#ffffff" />
    </g>
  </defs>
  <rect width="800" height="400" fill="url(#bg20k)" />
  <rect width="800" height="400" fill="url(#luxPattern20k)" />
  <rect width="800" height="400" fill="url(#centerGlow20k)" />
  <g opacity="0.32">
    <polygon points="400,200 50,-50 250,-50" fill="url(#goldBeam20k)" />
    <polygon points="400,200 350,-50 550,-50" fill="url(#goldBeam20k)" />
    <polygon points="400,200 650,-50 850,-50" fill="url(#goldBeam20k)" />
    <polygon points="400,200 850,50 850,250" fill="url(#goldBeam20k)" />
    <polygon points="400,200 850,350 650,450" fill="url(#goldBeam20k)" />
    <polygon points="400,200 550,450 350,450" fill="url(#goldBeam20k)" />
    <polygon points="400,200 250,450 50,450" fill="url(#goldBeam20k)" />
    <polygon points="400,200 -50,350 -50,150" fill="url(#goldBeam20k)" />
  </g>
  <circle cx="400" cy="200" r="145" fill="none" stroke="url(#goldBorderGrad20k)" stroke-width="2.5" opacity="0.65" stroke-dasharray="12,6" />
  <circle cx="400" cy="200" r="120" fill="none" stroke="#e879f9" stroke-width="1.4" opacity="0.5" />
  <circle cx="400" cy="200" r="90" fill="none" stroke="url(#goldBorderGrad20k)" stroke-width="3" opacity="0.75" />
  <circle cx="400" cy="200" r="65" fill="none" stroke="#fef08a" stroke-width="1" opacity="0.6" stroke-dasharray="5,5" />
  <circle cx="140" cy="90" r="34" fill="#fef08a" opacity="0.14" />
  <circle cx="660" cy="110" r="30" fill="#c084fc" opacity="0.18" />
  <circle cx="220" cy="290" r="26" fill="#fef08a" opacity="0.15" />
  <circle cx="600" cy="280" r="30" fill="#d8b4fe" opacity="0.16" />
  <circle cx="340" cy="120" r="16" fill="#ffffff" opacity="0.25" />
  <circle cx="460" cy="270" r="18" fill="#fef08a" opacity="0.25" />
  <use href="#sparklePurple" x="400" y="200" transform="scale(1.6)" opacity="0.98" />
  <use href="#sparklePurple" x="210" y="105" transform="scale(0.9)" opacity="0.85" />
  <use href="#sparklePurple" x="610" y="120" transform="scale(0.95)" opacity="0.85" />
  <use href="#sparklePurple" x="260" y="295" transform="scale(0.8)" opacity="0.8" />
  <use href="#sparklePurple" x="550" y="285" transform="scale(0.85)" opacity="0.8" />
  <use href="#sparklePurple" x="115" y="210" transform="scale(0.65)" opacity="0.65" />
  <use href="#sparklePurple" x="705" y="200" transform="scale(0.7)" opacity="0.65" />
  <rect x="12" y="12" width="776" height="376" rx="16" fill="none" stroke="url(#goldBorderGrad20k)" stroke-width="3.5" opacity="0.95" />
  <rect x="20" y="20" width="760" height="360" rx="12" fill="none" stroke="#e879f9" stroke-width="1.4" opacity="0.5" stroke-dasharray="10,6" />
  <g fill="none" stroke="url(#goldBorderGrad20k)" stroke-width="3" opacity="0.95">
    <path d="M 28 55 L 28 28 L 55 28" />
    <circle cx="28" cy="28" r="3.5" fill="#fef08a" />
    <path d="M 772 55 L 772 28 L 745 28" />
    <circle cx="772" cy="28" r="3.5" fill="#fef08a" />
    <path d="M 28 345 L 28 372 L 55 372" />
    <circle cx="28" cy="372" r="3.5" fill="#fef08a" />
    <path d="M 772 345 L 772 372 L 745 372" />
    <circle cx="772" cy="372" r="3.5" fill="#fef08a" />
  </g>
</svg>`;

// 5. 32-Inch Smart LED TV Luxury Tech Banner (NO TEXT)
export const lotteryTv32BannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="tvBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#030712" />
      <stop offset="25%" stop-color="#0b1329" />
      <stop offset="50%" stop-color="#0f172a" />
      <stop offset="75%" stop-color="#091b3a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <radialGradient id="tvCenterGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.55" />
      <stop offset="30%" stop-color="#0284c7" stop-opacity="0.3" />
      <stop offset="70%" stop-color="#0369a1" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="tvScreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="35%" stop-color="#0f172a" />
      <stop offset="70%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="tvGoldBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="30%" stop-color="#fbbf24" />
      <stop offset="60%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>
    <pattern id="tvGrid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#38bdf8" stroke-width="0.5" opacity="0.1" />
      <circle cx="15" cy="15" r="1.2" fill="#fef08a" opacity="0.15" />
    </pattern>
    <g id="sparkleBlue">
      <path d="M 0,-15 Q 0,0 15,0 Q 0,0 0,15 Q 0,0 -15,0 Q 0,0 0,-15 Z" fill="#38bdf8" />
      <circle cx="0" cy="0" r="2.8" fill="#ffffff" />
    </g>
    <g id="sparkleGoldTv">
      <path d="M 0,-12 Q 0,0 12,0 Q 0,0 0,12 Q 0,0 -12,0 Q 0,0 0,-12 Z" fill="#fef08a" />
      <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
    </g>
  </defs>
  <rect width="800" height="400" fill="url(#tvBg)" />
  <rect width="800" height="400" fill="url(#tvGrid)" />
  <circle cx="400" cy="190" r="280" fill="url(#tvCenterGlow)" />
  
  <!-- Sleek 32 Inch TV Frame Silhouette & Ambient Glow -->
  <g filter="drop-shadow(0 0 25px rgba(56,189,248,0.45))">
    <!-- TV Outer Bezel -->
    <rect x="220" y="70" width="360" height="215" rx="8" fill="#090d16" stroke="url(#tvGoldBorder)" stroke-width="3" />
    <!-- TV Inner Screen (Vibrant Cinematic Scene Glow) -->
    <rect x="228" y="78" width="344" height="199" rx="4" fill="url(#tvScreenGrad)" />
    <!-- Screen Flare / Reflection Diagonal -->
    <path d="M 230 78 L 330 78 L 270 277 L 230 277 Z" fill="#ffffff" opacity="0.08" />
    <!-- Screen Ambient Horizon -->
    <ellipse cx="400" cy="185" rx="140" ry="70" fill="#38bdf8" opacity="0.25" />
    <ellipse cx="400" cy="180" rx="90" ry="40" fill="#fef08a" opacity="0.2" />
    <!-- TV Stand Base -->
    <path d="M 370 285 L 430 285 L 445 315 L 355 315 Z" fill="#1e293b" stroke="#475569" stroke-width="1.5" />
    <rect x="330" y="315" width="140" height="8" rx="4" fill="url(#tvGoldBorder)" />
  </g>

  <!-- High-end TV Tech Badges / Holographic Rings -->
  <circle cx="400" cy="185" r="170" fill="none" stroke="#38bdf8" stroke-width="1.2" opacity="0.3" stroke-dasharray="8,6" />
  <circle cx="400" cy="185" r="195" fill="none" stroke="url(#tvGoldBorder)" stroke-width="1" opacity="0.4" />
  <circle cx="400" cy="185" r="220" fill="none" stroke="#fef08a" stroke-width="0.7" opacity="0.25" stroke-dasharray="4,6" />

  <!-- Sparkles -->
  <use href="#sparkleBlue" x="180" y="100" transform="scale(1.2)" opacity="0.9" />
  <use href="#sparkleGoldTv" x="620" y="90" transform="scale(1.1)" opacity="0.9" />
  <use href="#sparkleBlue" x="200" y="280" transform="scale(0.9)" opacity="0.8" />
  <use href="#sparkleGoldTv" x="600" y="270" transform="scale(1.0)" opacity="0.85" />
  <use href="#sparkleGoldTv" x="400" y="45" transform="scale(1.2)" opacity="0.95" />
  <use href="#sparkleBlue" x="110" y="200" transform="scale(0.8)" opacity="0.7" />
  <use href="#sparkleGoldTv" x="690" y="190" transform="scale(0.85)" opacity="0.75" />

  <!-- Outer Frame Border -->
  <rect x="12" y="12" width="776" height="376" rx="16" fill="none" stroke="url(#tvGoldBorder)" stroke-width="3" opacity="0.9" />
  <rect x="20" y="20" width="760" height="360" rx="12" fill="none" stroke="#38bdf8" stroke-width="1.2" opacity="0.4" stroke-dasharray="8,6" />
</svg>`;

export const lotteryTv32BannerImage = '/assets/aistudio/877905f8-1b5b-4101-a814-a850ca606fc4_b4add570.jpg';
export const lottery1000BannerImage = '/assets/aistudio/images_7dfffcd3.jpg';
export const lottery5000BannerImage = '/assets/aistudio/5.000_3e06f77b.jpg';
export const lottery10000BannerImage = '/assets/aistudio/10000_efc0a7da.jpg';
export const lottery20000BannerImage = '/assets/aistudio/50000_8cc3e9ac.jpg';
export const lottery50000BannerImage = '/assets/aistudio/50000_8cc3e9ac.jpg';

// Export backwards-compatible aliases
export const ethiopian10BirrImage = lottery1000BannerImage;
export const ethiopian50BirrImage = lottery5000BannerImage;
export const ethiopian100BirrImage = lottery10000BannerImage;
export const ethiopian200BirrImage = lottery20000BannerImage;

/**
 * Resolves modern lottery game ticket banner image for lottery draws.
 * Zero text, clean, luxurious abstract lottery backgrounds.
 */
export function getBanknoteForLottery(ticketPrice?: number, _category?: string, lotteryId?: string): string {
  if (lotteryId === 'lot_tv_32') return lotteryTv32BannerImage;
  const price = Number(ticketPrice) || 10;
  if (price <= 10) return lottery1000BannerImage;
  if (price <= 50) return lottery5000BannerImage;
  if (price <= 100) return lottery10000BannerImage;
  return lottery20000BannerImage;
}
