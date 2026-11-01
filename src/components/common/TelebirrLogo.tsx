import React from 'react';

interface TelebirrLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const TelebirrLogo: React.FC<TelebirrLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
}) => {
  const sizeMap = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Authentic Telebirr Icon Badge */}
      <div
        className={`${currentSize} rounded-2xl bg-gradient-to-br from-[#00b4d8] via-[#0077b6] to-[#023e8a] p-1.5 shadow-lg shadow-sky-900/40 flex items-center justify-center shrink-0 border border-sky-400/30 relative overflow-hidden`}
      >
        {/* Subtle glossy sheen */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none" />
        
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-md"
        >
          {/* Telebirr stylized geometric wing / 't' glyph */}
          <path
            d="M50 14C30.1 14 14 30.1 14 50C14 69.9 30.1 86 50 86C69.9 86 86 69.9 86 50C86 30.1 69.9 14 50 14Z"
            fill="url(#tlb-bg-inner)"
            opacity="0.15"
          />
          {/* Main Telebirr Bird Wing Emblem */}
          <path
            d="M26 44C34 40 45 36 55 36C65 36 73 40 78 44C76 49 70 54 62 55C54 56 46 53 38 49L26 44Z"
            fill="#FFFFFF"
          />
          <path
            d="M38 48C45 52 52 54 60 54C68 54 75 50 78 45C76 56 68 67 56 71C46 75 36 71 30 63L38 48Z"
            fill="#FFDE59"
          />
          <path
            d="M48 24C49 29 48 37 44 45C41 51 36 56 30 60C28 53 28 44 32 36C35 30 41 26 48 24Z"
            fill="#FFFFFF"
          />
          {/* Central crisp white 't' symbol */}
          <circle cx="50" cy="50" r="12" fill="#FFFFFF" />
          <path
            d="M46 45H54V57H46V45Z"
            fill="#0077b6"
          />
          <path
            d="M44 47H56V49H44V47Z"
            fill="#0077b6"
          />
          <defs>
            <linearGradient id="tlb-bg-inner" x1="14" y1="14" x2="86" y2="86" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" />
              <stop offset="1" stopColor="#000000" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1">
            <span className="font-black text-white tracking-tight text-sm sm:text-base font-sans">
              tele<span className="text-sky-400">birr</span>
            </span>
            <span className="text-[10px] bg-sky-500/20 text-sky-300 font-bold px-1.5 py-0.2 rounded border border-sky-400/30">
              ይፋዊ
            </span>
          </div>
          <span className="text-[10px] text-sky-300 font-medium">
            ቴሌብር ክፍያ (Ethio Telecom)
          </span>
        </div>
      )}
    </div>
  );
};
