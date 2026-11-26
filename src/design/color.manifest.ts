/** Reme v4 palette — urban neon tomato.
 *  Color literals for the system belong only here. The palette is the
 *  five-family urban neon tomato set:
 *    #FF3B30 tomato · #FF9F0A orange · #FFD60A yellow · #1C1C1E ink · #F2F2F7 paper
 *  Every role maps onto one of these families in each mode; nothing else in
 *  the codebase carries a hex literal (enforced by scripts/design/lint.ts I5). */
export const color = {
  roles: {
    'bg-canvas': { light: '#F2F2F7', dark: '#1C1C1E' },
    'bg-surface': { light: '#F2F2F7', dark: '#1C1C1E' },
    // Primary action: the mode's max-contrast fill. Light gets the ink fill
    // (paper label, 15.3:1) so hover/active states stay ≥3:1 against paper;
    // dark gets the yellow fill (ink label, 12.1:1). Tomato red cannot host
    // 7:1 label text in any mode, so it is reserved for accent roles.
    'bg-brand': { light: '#1C1C1E', dark: '#FFD60A' },
    'text-ink': { light: '#1C1C1E', dark: '#F2F2F7' },
    'text-ink-secondary': { light: '#1C1C1E', dark: '#F2F2F7' },
    'text-disabled': { light: '#1C1C1E', dark: '#FF3B30' },
    // Highlight mark: orange hosts ink at 8.3:1 in light; in dark the mark
    // is the ink surface itself (paper ink on it is 15.3:1) — no neon fill
    // can clear the 7:1 ink-on-mark gate against the ink canvas.
    'bg-mark': { light: '#FF9F0A', dark: '#1C1C1E' },
    'text-on-primary': { light: '#F2F2F7', dark: '#1C1C1E' },
    'border-line': { light: '#1C1C1E', dark: '#F2F2F7' },
    'border-strong': { light: '#1C1C1E', dark: '#F2F2F7' },
    // Focus ring: ink in light (clears every state fill); tomato in dark —
    // the only family that clears 3:1 on both the ink canvas and the yellow
    // primary hover/active mixes.
    'focus-ring': { light: '#1C1C1E', dark: '#FF3B30' },
    // Status roles are icon accents on the chrome; the label text itself
    // stays on text-ink/text-on-primary (≥7:1). In light every accent that
    // clears even the 3:1 UI threshold on paper is ink or tomato, so the
    // status set is ink; dark carries the neon families.
    'status-ok': { light: '#1C1C1E', dark: '#FFD60A' },
    'status-warn': { light: '#1C1C1E', dark: '#FF9F0A' },
    'status-error': { light: '#1C1C1E', dark: '#FF3B30' },
    'status-info': { light: '#1C1C1E', dark: '#F2F2F7' },
    // Chart series: light can only field tomato (3.2:1 on paper); dark
    // fields the full neon set.
    'series-1': { light: '#FF3B30', dark: '#FF3B30' },
    'series-2': { light: '#FF3B30', dark: '#FF9F0A' },
    'series-3': { light: '#FF3B30', dark: '#FFD60A' },
    'series-4': { light: '#FF3B30', dark: '#F2F2F7' },
  },
  states: { surfaceHover: 0.05, surfaceActive: 0.10, primaryHover: 0.14, primaryActive: 0.22, selected: 0.08 },
  pairs: [
    ...['text-ink', 'text-ink-secondary'].map(fg => ({ fg, bg: ['bg-canvas', 'bg-surface'], min: 7, kind: 'text' as const })),
    { fg: 'text-on-primary', bg: ['bg-brand'], min: 7, kind: 'text' as const },
    // Status colors are accent fills/icons, not body text — the 3:1 UI
    // threshold applies to the accent itself; label text rides on ink.
    ...['status-ok', 'status-warn', 'status-error', 'status-info'].map(fg => ({ fg, bg: ['bg-canvas', 'bg-surface'], min: 3, kind: 'ui' as const })),
    ...['border-strong', 'focus-ring', 'series-1', 'series-2', 'series-3', 'series-4'].map(fg => ({ fg, bg: ['bg-canvas', 'bg-surface'], min: 3, kind: 'ui' as const })),
  ],
  status: {
    verified: { token: 'status-ok', icon: 'check', labelKey: 'status.verified' },
    pending: { token: 'status-warn', icon: 'clock', labelKey: 'status.pending' },
    localLive: { token: 'status-info', icon: 'shield-check', labelKey: 'status.localLive' },
    unavailable: { token: 'status-error', icon: 'minus', labelKey: 'status.unavailable' },
  },
} as const;
