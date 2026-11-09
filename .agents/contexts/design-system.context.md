# ResearchWithMe Design System Context

## Typography

### Font Families
- **Primary (Headings + Body)**: Aptos Serif (requested by installed name)
- **UI Chrome (Sans)**: Aptos (requested by installed name)
- **Code/Mono**: Aptos Mono (requested by installed name)
- **Fallbacks** (self-hosted in `app/fonts/`):
  - Newsreader (serif fallback)
  - Inter (sans fallback)

### Usage Rules
```css
/* Headings */
font-family: 'Aptos Serif', 'Newsreader', serif;

/* Body text */
font-family: 'Aptos Serif', 'Newsreader', serif;

/* UI elements (buttons, inputs, nav) */
font-family: 'Aptos', 'Inter', sans-serif;

/* Code, technical content */
font-family: 'Aptos Mono', monospace;
```

### Tailwind v4 Integration
```css
/* globals.css - Design tokens */
@theme {
  --font-serif: 'Aptos Serif', 'Newsreader', serif;
  --font-sans: 'Aptos', 'Inter', sans-serif;
  --font-mono: 'Aptos Mono', monospace;
  
  --color-primary: #1a1a2e;
  --color-secondary: #16213e;
  --color-accent: #e94560;
  --color-background: #fafafa;
  --color-surface: #ffffff;
  --color-text: #1a1a2e;
  --color-text-muted: #6b7280;
}
```

## Color System

### Semantic Colors (Tailwind v4 tokens)
- `primary` - Main brand color (#1a1a2e)
- `secondary` - Supporting color (#16213e)
- `accent` - Call-to-action (#e94560)
- `background` - Page background (#fafafa)
- `surface` - Card/panel background (#ffffff)
- `text` - Primary text (#1a1a2e)
- `text-muted` - Secondary text (#6b7280)
- `border` - Dividers (#e5e7eb)
- `error` - Error states (#dc2626)
- `success` - Success states (#16a34a)
- `warning` - Warning states (#d97706)

### Dark Mode
All colors have `dark:` variants defined in `globals.css`

## Spacing & Layout

### Tailwind v4 Spacing Scale
Use standard scale: `0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96`

### Container Widths
- `container` - Max-width with responsive padding
- `prose` - Article reading width (~65ch)
- `wide` - Full-width for hero sections

## Components

### Buttons
```tsx
// Primary
<button className="btn-primary">Primary</button>

// Secondary
<button className="btn-secondary">Secondary</button>

// Ghost
<button className="btn-ghost">Ghost</button>

// Destructive
<button className="btn-destructive">Delete</button>
```

### Form Elements
```tsx
// Input
<input className="input" />

// Textarea
<textarea className="textarea" />

// Select
<select className="select" />

// Label
<label className="label">Label</label>
```

### Cards
```tsx
// Default card
<div className="card">Content</div>

// Interactive card
<div className="card-hover">Content</div>
```

### Typography Classes
```tsx
// Headings
<h1 className="text-display">Display</h1>
<h2 className="text-h1">H1</h2>
<h3 className="text-h2">H2</h3>
<h4 className="text-h3">H3</h4>

// Body
<p className="text-body">Body text</p>
<p className="text-body-sm">Small body</p>
<p className="text-caption">Caption</p>

// Code
<code className="text-code">code</code>
<pre className="text-pre">pre</pre>
```

## Icon System
- **Brand Logo**: `BrandLogo.tsx` (SVG)
- **UI Icons**: Lucide React (tree-shaken)
- **Custom Icons**: SVG components in `components/icons/`

## Responsive Breakpoints
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

## Animation & Transitions
- **Duration**: `150ms` (fast), `200ms` (normal), `300ms` (slow)
- **Easing**: `ease-out` (default), `ease-in-out` (modals)
- **Reduced Motion**: Respect `prefers-reduced-motion`

## Accessibility
- **Contrast**: WCAG AA minimum (4.5:1 text, 3:1 UI)
- **Focus**: Visible focus rings (`focus-visible:ring-2`)
- **ARIA**: Semantic HTML + ARIA where needed
- **Keyboard**: All interactive elements keyboard accessible

## Design Documentation
- **DESIGN.md** - High-level design principles
- **app/applet/DESIGN.md** - Applet-specific design
- **.agents/surfaces/** - Per-route design briefs
- **components/** - Component-level design in code comments

## Impeccable Integration
- Run `npm run impeccable:source` for design compliance
- Surface briefs in `.agents/surfaces/` must match routes
- Design tokens validated against `globals.css`