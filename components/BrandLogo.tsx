import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export default function BrandLogo({ size = 'md', showText = true, className = '' }: BrandLogoProps) {
  const sizes = {
    sm: showText ? 'h-8 w-[54px]' : 'h-8 w-8',
    md: showText ? 'h-10 w-[67px]' : 'h-10 w-10',
    lg: showText ? 'h-11 w-[74px]' : 'h-11 w-11',
    xl: showText ? 'h-12 w-[81px]' : 'h-12 w-12',
  };

  return (
    <span className={`inline-flex shrink-0 items-center ${className}`} role="img" aria-label="ResearchWithMe">
      {/* The supplied mark is dark; invert it in the dark theme for legibility. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={showText ? '/brand/wordmark.svg' : '/brand/mark.svg'} alt="" className={`${sizes[size]} dark:brightness-0 dark:invert`} />
    </span>
  );
}
