import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'header';
  /**
   * Accessible name for the lockup. Leave unset when the logo sits inside a link
   * or heading that already carries the name — the mark then stays decorative,
   * so a screen reader announces one name instead of two.
   */
  label?: string;
  className?: string;
}

export default function BrandLogo({ size = 'md', label, className = '' }: BrandLogoProps) {
  const sizes = {
    sm: { text: 'text-xl' },
    md: { text: 'text-2xl' },
    lg: { text: 'text-3xl' },
    xl: { text: 'text-4xl' },
    header: { text: 'text-2xl sm:text-3xl' },
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 ${className}`}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <span className={`${sizes[size].text} font-serif font-semibold leading-none tracking-tight text-ink`}>reme<span className="text-brand">.</span></span>
    </span>
  );
}
