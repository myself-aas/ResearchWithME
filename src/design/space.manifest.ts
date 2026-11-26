export const space = {
  steps: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 14: 56, 16: 64, 18: 72, 20: 80 },
  radius: { inset: 12, sm: 8, md: 12, lg: 16, xl: 24, pill: 999 },
  border: { hair: 1, strong: 2 },
  target: 44,
  focus: { width: 3, offset: 2 },
  header: 64,
  icon: 18,
  sectionGap: { xs: 48, md: 56, lg: 72, xl: 80, '2xl': 80 },
  layer: { base: 0, sticky: 10, drawer: 40, toast: 50 },
  landscape: { maxHeight: 480, visualMaxDvh: 60 },
} as const;
