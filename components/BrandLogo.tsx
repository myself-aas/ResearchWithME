import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'header';
  showText?: boolean;
  className?: string;
}

export default function BrandLogo({ size = 'md', showText = true, className = '' }: BrandLogoProps) {
  const sizes = {
    sm: { mark: 'h-8 w-8', text: 'text-xl' },
    md: { mark: 'h-10 w-10', text: 'text-2xl' },
    lg: { mark: 'h-11 w-11', text: 'text-3xl' },
    xl: { mark: 'h-12 w-12', text: 'text-4xl' },
    header: { mark: 'h-10 w-10 sm:h-11 sm:w-11', text: 'text-2xl sm:text-3xl' },
  };

  return (
    <span className={`inline-flex shrink-0 items-center gap-2 ${className}`} role="img" aria-label="ResearchWithMe">
      <span aria-hidden="true" className={`${sizes[size].mark} block shrink-0 bg-brand`} style={{ maskImage: 'url(/brand/mark.svg)', maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskImage: 'url(/brand/mark.svg)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center' }} />
      {showText && <span aria-hidden="true" className={`${sizes[size].text} font-serif font-semibold leading-none tracking-tight text-ink`}>reme<span className="text-brand">.</span></span>}
    </span>
  );
}
