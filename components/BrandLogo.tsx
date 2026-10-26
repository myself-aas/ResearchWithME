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
  const wordmarkSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  }[size];

  const textColor = variant === 'light' ? 'text-white' : 'text-stone-900';

  return (
    <div className={`inline-flex items-center ${className}`}>
      <span
        className={`${wordmarkSizes} font-serif font-semibold leading-none tracking-[-0.04em] ${textColor}`}
        aria-label={showText ? 'πeme' : 'π'}
      >
        {showText ? 'πeme' : 'π'}
      </span>
    </div>
  );
}
