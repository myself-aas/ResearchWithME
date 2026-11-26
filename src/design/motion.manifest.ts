export const motion = {
  duration: { fast: 120, base: 180, slow: 260 },
  easing: { standard: 'cubic-bezier(.2,0,0,1)', exit: 'cubic-bezier(.4,0,1,1)' },
  allowed: ['opacity', 'transform'],
} as const;
