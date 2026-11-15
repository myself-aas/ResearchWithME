import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'header';
  showText?: boolean;
  className?: string;
}

export default function BrandLogo({ size = 'md', showText = true, className = '' }: BrandLogoProps) {
  const sizes = {
    sm: showText ? 'h-8 w-[54px]' : 'h-8 w-8',
    md: showText ? 'h-10 w-[67px]' : 'h-10 w-10',
    lg: showText ? 'h-11 w-[74px]' : 'h-11 w-11',
    xl: showText ? 'h-12 w-[81px]' : 'h-12 w-12',
    header: showText ? 'h-[52px] w-[88px]' : 'h-[52px] w-[52px]',
  };

  return (
    <span className={`inline-flex shrink-0 items-center ${className}`} role="img" aria-label="ResearchWithMe">
      <span aria-hidden="true" className={`${sizes[size]} block bg-primary`} style={{ maskImage: `url(${showText ? '/brand/wordmark.svg' : '/brand/mark.svg'})`, maskSize: 'contain', maskRepeat: 'no-repeat', maskPosition: 'center', WebkitMaskImage: `url(${showText ? '/brand/wordmark.svg' : '/brand/mark.svg'})`, WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center' }} />
    </span>
  );
}
