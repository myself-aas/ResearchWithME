import React from 'react';
import BrandMark from './BrandMark';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'header';
  /**
   * Render the "reme." wordmark beside the monogram. Off by default: the mark
   * is an "r", so pairing it with a wordmark that also opens with "r" reads as
   * the same letter twice ("r reme."). The mark carries the identity alone.
   */
  showText?: boolean;
  /**
   * Accessible name for the lockup. Leave unset when the logo sits inside a link
   * or heading that already carries the name — the mark then stays decorative,
   * so a screen reader announces one name instead of two.
   */
  label?: string;
  className?: string;
}

export default function BrandLogo({ size = 'md', showText = false, label, className = '' }: BrandLogoProps) {
  const sizes = {
    sm: { mark: 'h-8 w-8', text: 'text-xl' },
    md: { mark: 'h-10 w-10', text: 'text-2xl' },
    lg: { mark: 'h-11 w-11', text: 'text-3xl' },
    xl: { mark: 'h-12 w-12', text: 'text-4xl' },
    header: { mark: 'h-10 w-10 sm:h-11 sm:w-11', text: 'text-2xl sm:text-3xl' },
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 ${className}`}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <BrandMark className={`${sizes[size].mark} shrink-0 text-brand-mark`} />
      {showText && <span className={`${sizes[size].text} font-serif font-semibold leading-none tracking-tight text-ink`}>reme<span className="text-brand">.</span></span>}
    </span>
  );
}
