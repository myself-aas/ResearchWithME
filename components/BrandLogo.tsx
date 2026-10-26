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

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`${iconSizes} shrink-0 font-serif font-semibold leading-none text-amber-900`}
        aria-hidden="true"
      >
        π
      </span>

      {showText && (
        <span
          className={`font-sans text-xl font-semibold leading-none tracking-tight ${
            variant === 'light' ? 'text-white' : 'text-stone-900'
          }`}
        >
          reme
        </span>
      )}
    </div>
  );
}
