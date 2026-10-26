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
  const iconSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  }[size];

  const textColor = variant === 'light' ? 'text-white' : 'text-stone-900';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`${iconSizes} shrink-0 font-serif font-semibold leading-none text-amber-900`}
        aria-hidden="true"
      >
        π
      </span>

      {showText && (
        <span
          className={`font-serif text-2xl font-semibold leading-[0.9] tracking-[-0.035em] sm:text-[1.7rem] ${textColor}`}
        >
          reme
        </span>
      )}
    </div>
  );
}
