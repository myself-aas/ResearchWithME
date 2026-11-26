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

/**
 * The "reme." wordmark. Colouring is author-specified: "re" and the period sit
 * in the brand accent, "me" carries the ink colour (which is near-black in the
 * light theme and inverts in dark, so the mark never disappears). A horizontal
 * gradient across the letters was considered and rejected — the design system
 * forbids gradient text.
 */
export default function BrandLogo({ size = 'md', label, className = '' }: BrandLogoProps) {
  const sizes = {
    sm: { text: 'text-2xl' },
    md: { text: 'text-[1.75rem]' },
    lg: { text: 'text-4xl' },
    xl: { text: 'text-5xl' },
    header: { text: 'text-[1.75rem] sm:text-[2rem]' },
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 ${className}`}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <span className={`${sizes[size].text} font-serif font-extrabold leading-none tracking-tighter text-ink`}>
        <span className="text-brand">re</span>
        <span>me</span>
        <span className="text-brand">.</span>
      </span>
    </span>
  );
}
