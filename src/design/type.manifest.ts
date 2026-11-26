// Heading measure exception to I4 approved by the author: 24/32/34ch.
export const type_ = {
  remBase: 16,
  families: {
    serif: "'Newsreader', 'Inter', Georgia, serif",
    sans: "'Inter', system-ui, sans-serif",
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    bn: "'Noto Sans Bengali', 'Kalpurush', system-ui, sans-serif",
  },
  roles: {
    h1: { slot: 'hero.text', font: 'serif', weight: 600, lh: 1.10, measureCh: 24, min: 32, max: 52, targets: { xs: 32, md: 44, lg: 41, xl: 52, '2xl': 52 } },
    h2: { slot: 'section.head', font: 'serif', weight: 600, lh: 1.20, measureCh: 32, min: 24, max: 32, targets: { xs: 24, md: 30, lg: 30, xl: 32, '2xl': 32 } },
    h3: { slot: 'card', font: 'serif', weight: 600, lh: 1.25, measureCh: 34, min: 20, max: 24, targets: { xs: 20, md: 22, lg: 22, xl: 24, '2xl': 24 } },
    body: { slot: 'prose', font: 'sans', weight: 400, lh: 1.65, measureCh: 68, fixed: 16 },
    meta: { slot: 'prose', font: 'mono', weight: 400, lh: 1.45, measureCh: 60, fixed: 13 },
    input: { slot: 'field', font: 'sans', weight: 400, lh: 1.40, measureCh: 60, fixed: 16 },
  },
  fonts: { ranges: [[32, 126], [160, 255], [8211, 8212], [8216, 8221], [8226, 8226], [8230, 8230], [8592, 8595], [215, 215], [43, 43], [8722, 8722]], files: { serif: '/fonts/newsreader-variable.woff2', sans: '/fonts/inter-variable.woff2', serifItalic: '/fonts/newsreader-italic-variable.woff2' }, maxBytes: 80000, italicWeight: 400, weightMin: 400, weightMax: 600, opticalSize: 16, glyphs: '→ × + − · ≤ ≥ ≈ ≠ °' },
  bangla: { bodyLh: 1.7, headingLh: 1.35 },
} as const;
