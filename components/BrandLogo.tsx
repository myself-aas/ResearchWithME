import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export default function BrandLogo({
  size = 'md',
  showText = true,
  className = '',
}: BrandLogoProps) {
  const wordmarkSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  }[size];

  // Use theme-aware colors: dark mode uses text-ink (light), light mode uses text-stone-900 (dark)
  // The pi symbol (𝜋 - U+1D70B MATHEMATICAL SANS-SERIF BOLD SMALL PI) is non-italic
  const piSymbol = '𝜋';

  return (
    <div className={`inline-flex items-center ${className}`}>
      <span
        className={`${wordmarkSizes} font-serif font-semibold leading-none tracking-[-0.04em] text-ink`}
        aria-label={showText ? `${piSymbol}eme` : piSymbol}
      >
        {showText ? `${piSymbol}eme` : piSymbol}
      </span>
    </div>
  );
}
