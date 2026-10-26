import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'dark' | 'light' | 'amber';
  className?: string;
}

export default function BrandLogo({
  size = 'md',
  showText = true,
  variant = 'dark',
  className = '',
}: BrandLogoProps) {
  const iconDimensions = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-12 w-12',
  }[size];

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  }[size];

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Pi (π) Logo Emblem */}
      <svg
        className={`${iconDimensions} shrink-0`}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="pi-amber-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        {/* Outer Dark Container */}
        <rect width="64" height="64" rx="16" fill="#0f172a" />
        <rect x="0.5" y="0.5" width="63" height="63" rx="15.5" stroke="#334155" strokeOpacity="0.6" fill="none" />

        {/* Mathematical Pi (π) Symbol */}
        <text
          x="32"
          y="45"
          fontFamily="var(--font-playfair), Georgia, serif"
          fontWeight="700"
          fontSize="40"
          fill="url(#pi-amber-grad)"
          textAnchor="middle"
        >
          π
        </text>
      </svg>

      {/* Brand Text: "reme" in all lowercase Playfair Display / Alice font */}
      {showText && (
        <span
          className={`font-[family-name:var(--font-playfair)] font-normal lowercase tracking-tight ${textSizes} ${
            variant === 'light' ? 'text-white' : 'text-stone-900'
          }`}
        >
          reme
        </span>
      )}
    </div>
  );
}
