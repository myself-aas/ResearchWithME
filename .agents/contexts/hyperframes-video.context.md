# ResearchWithMe HyperFrames Video Context

## Overview
All seven HyperFrames skills installed globally. **Read `/hyperframes` FIRST before any video work.**

## Skill Hierarchy
```
/hyperframes          → Core render contract, work loop, composition basics
/hyperframes-cli      → Scaffold, check, preview, render, publish
/hyperframes-registry → 450+ pre-built blocks (transitions, charts, 3D, etc.)
/media-use            → Music, SFX, voiceover, images, icons, footage
/figma                → Figma design → motion
/remotion-to-hyperframes → Port Remotion/Lottie/After Effects
/slideshow            → Presentation decks for /editions
```

## Render Contract (Non-Negotiable)

### Output Specifications
- **Resolution**: 1920×1080 (Full HD)
- **Frame Rate**: 30 fps
- **Format**: MP4 (H.264) or WebM
- **Duration**: Per composition metadata

### Determinism Requirements
- **NO** `Date.now()` at render time
- **NO** `Math.random()` without fixed seed
- **NO** Network fetches during render
- **ALL** animations must be reproducible

### GSAP Timeline
- Exactly **one** paused root timeline on `window.__timelines`
- Register via: `window.__timelines = [gsap.timeline({ paused: true })]`
- All animations added to this timeline

### Clip Requirements
- Every visual element: `class="clip"`
- Enables frame-accurate editing
- Required for registry blocks

### Validation Commands
```bash
# After EVERY composition edit
npx hyperframes lint
npx hyperframes check

# Before render
npx hyperframes render --dry-run

# Full render
npx hyperframes render
```

## Video Types & Conventions

### 1. Paper Explainer Videos (60-90 seconds)
**Structure**:
1. **Title Card** (3s) - Paper title, authors, venue
2. **Abstract Summary** (10s) - Key problem & solution
3. **Key Findings** (20s) - 3-4 main results with visuals
4. **Methodology** (15s) - Approach overview (not deep dive)
5. **Implications** (10s) - Why it matters
6. **Takeaways** (5s) - 3 bullet points
7. **End Card** (3s) - ResearchWithMe branding, paper link

**Registry Blocks to Use**:
- `title-card/academic` - Title sequences
- `kinetic-type/bullet-reveal` - Findings list
- `charts/bar-race` - Comparison charts
- `overlays/lower-third` - Author/venue labels
- `transitions/crossfade` - Section transitions

### 2. Edition Trailer Videos (30-45 seconds)
**Structure**:
1. **Hook** (3s) - Compelling question/statement
2. **Edition Theme** (5s) - Compendium focus
3. **Featured Papers** (15s) - 3-4 paper highlights
4. **Call to Action** (5s) - "Read the edition"
5. **Brand End** (3s) - Logo, URL

### 3. Author Impact Radar Chart (15-20 seconds)
**Structure**:
1. **Author Name/Photo** (3s)
2. **Radar Animation** (10s) - Axes: Publications, Citations, H-index, Collaboration, Impact, Recency
3. **Key Metric Callout** (3s) - Top achievement
4. **Profile Link** (2s)

**Registry Blocks**:
- `charts/radar` - Animated radar chart
- `kinetic-type/counter` - Animated numbers

### 4. Slideshow Presentations (`/editions`)
**Tool**: `/slideshow` skill
**Output**: `hyperframes present`-compatible deck
**Features**: Fragment reveals, speaker notes, hotspots

## Registry Blocks (Use Before Building)

### Categories (450+ blocks)
```
transitions/          - crossfade, slide, wipe, morph, glitch
overlays/             - lower-third, watermark, caption, badge
titles/               - kinetic-type, academic, minimal, bold
charts/               - bar, line, radar, scatter, network, sankey
3d/                   - camera-moves, object-rotation, particle-systems
captions/             - auto-caption, karaoke, highlight
shaders/              - crt-scanlines, film-grain, glitch, bloom
camera/               - ken-burns, orbit, dolly, crane
```

### Finding Blocks
```bash
# List all blocks
npx hyperframes catalog

# Search by keyword
npx hyperframes catalog --search "radar"

# View block source
npx hyperframes catalog --show charts/radar
```

### Using Blocks
```javascript
// In composition
import { RadarChart } from '@hyperframes/registry/charts/radar'

export function composition({ $, timeline }) {
  const chart = new RadarChart({
    data: { axes: [...], values: [...] },
    duration: 10,
  })
  timeline.add(chip.timeline)
}
```

## Media Sourcing (`/media-use`)

### Royalty-Free Sources (Preferred)
- **Footage**: Pexels, Pixabay, Videvo (free tier)
- **Images**: Unsplash, Pexels, Wikimedia Commons
- **Music**: YouTube Audio Library, Free Music Archive
- **SFX**: Freesound.org (CC0), ZapSplat
- **Icons**: Lucide, Heroicons, Phosphor (already in project)

### AI Generation (When Needed)
- **Images**: DALL-E 3, Midjourney, Stable Diffusion
- **Video**: Runway Gen-3, Pika, Sora (when available)
- **Music**: Suno, Udio, Mubert
- **Voiceover**: ElevenLabs, HeyGen

### Attribution Requirements
- Track all sources in `videos/[project]/CREDITS.md`
- CC-BY: Include author + license
- CC0: No attribution required but appreciated
- AI: Note "AI-generated" in credits

## Project Structure

```
videos/
  explainer/
    paper-title/
      composition.ts          # Main composition
      storyboard.md           # Shot-by-shot plan
      assets/                 # Local assets
      CREDITS.md              # Media attributions
      package.json            # Dependencies
  edition-trailer/
    edition-name/
      ...
  radar-chart/
    author-name/
      ...
```

## Composition Template

```typescript
// videos/explainer/paper-title/composition.ts
import { defineComposition } from 'hyperframes'
import { TitleCard } from '@hyperframes/registry/titles/academic'
import { BulletReveal } from '@hyperframes/registry/kinetic-type/bullet-reveal'
import { Crossfade } from '@hyperframes/registry/transitions/crossfade'

export default defineComposition({
  metadata: {
    title: 'Paper Title Explainer',
    duration: 75, // seconds
    fps: 30,
    width: 1920,
    height: 1080,
  },
  setup: ({ $, timeline }) => {
    // Register GSAP timeline
    window.__timelines = [timeline]
    
    // Global styles
    $('body').css({
      fontFamily: 'Aptos Serif, Newsreader, serif',
      color: '#1a1a2e',
      background: '#fafafa',
    })
  },
  scenes: [
    {
      name: 'title-card',
      duration: 3,
      render: ({ $, timeline }) => {
        const titleCard = new TitleCard({
          title: 'Paper Title',
          subtitle: 'Authors • Venue • Year',
          duration: 3,
        })
        timeline.add(titleCard.timeline)
        return titleCard.element
      },
    },
    {
      name: 'findings',
      duration: 20,
      render: ({ $, timeline }) => {
        const bullets = new BulletReveal({
          items: [
            'Finding 1: Key result',
            'Finding 2: Another result',
            'Finding 3: Third result',
          ],
          duration: 20,
        })
        timeline.add(bullets.timeline)
        return bullets.element
      },
    },
    // ... more scenes
  ],
})
```

## Storyboard Template

```markdown
# Storyboard: Paper Title Explainer

## Metadata
- **Duration**: 75s
- **FPS**: 30
- **Resolution**: 1920x1080
- **Paper**: [DOI/arXiv link]

## Scenes

### 1. Title Card (0:00-0:03)
- **Visual**: Paper title, authors, venue, year
- **Animation**: Fade in, subtle scale
- **Audio**: Ambient intro music
- **Registry**: `titles/academic`

### 2. Abstract (0:03-0:13)
- **Visual**: Key problem statement, solution preview
- **Animation**: Typewriter effect for problem, reveal for solution
- **Audio**: Narrator reads abstract
- **Registry**: `kinetic-type/typewriter`

### 3. Finding 1 (0:13-0:20)
- **Visual**: Chart/diagram of result 1
- **Animation**: Data builds up
- **Audio**: "First, they discovered..."
- **Registry**: `charts/bar-race`

### 4. Finding 2 (0:20-0:27)
- **Visual**: Network diagram
- **Animation**: Nodes appear, edges draw
- **Audio**: "Second, the network analysis revealed..."
- **Registry**: `charts/network`

### 5. Finding 3 (0:27-0:34)
- **Visual**: Comparison table
- **Animation**: Rows highlight sequentially
- **Audio**: "Third, compared to baselines..."
- **Registry**: `overlays/comparison-table`

### 6. Methodology (0:34-0:49)
- **Visual**: Simplified pipeline diagram
- **Animation**: Steps connect with arrows
- **Audio**: "Their approach consists of three stages..."
- **Registry**: `transitions/morph`

### 7. Implications (0:49-0:59)
- **Visual**: Impact icons with text
- **Animation**: Staggered reveal
- **Audio**: "This matters because..."
- **Registry**: `kinetic-type/staggered-reveal`

### 8. Takeaways (0:59-1:04)
- **Visual**: 3 bullet points
- **Animation**: Checkmark reveal
- **Audio**: "Key takeaways:"
- **Registry**: `kinetic-type/bullet-reveal`

### 9. End Card (1:04-1:07)
- **Visual**: ResearchWithMe logo, paper link, subscribe
- **Animation**: Logo pulse, link underline
- **Audio**: Music fade out
- **Registry**: `titles/brand-end`

## Assets Needed
- [ ] Paper PDF (for diagrams)
- [ ] Author photos (if available)
- [ ] Venue logo
- [ ] Background music (ambient, CC0)
- [ ] Narrator voiceover (ElevenLabs)

## Credits
- Music: [Source]
- Footage: [Source]
- Icons: Lucide (MIT)
- Fonts: Aptos (system), Newsreader (SIL OFL)
```

## Workflow Checklist

### Pre-Production
- [ ] Read `/hyperframes` skill
- [ ] Check `/hyperframes-registry` for needed blocks
- [ ] Create storyboard.md
- [ ] Source media via `/media-use`
- [ ] Write composition.ts
- [ ] Run `npx hyperframes lint`
- [ ] Run `npx hyperframes check`

### Production
- [ ] Preview: `npx hyperframes preview`
- [ ] Iterate on timing/animation
- [ ] Verify determinism (render twice, compare)
- [ ] Check all clips have `class="clip"`

### Post-Production
- [ ] Render: `npx hyperframes render`
- [ ] Verify output (ffprobe, visual check)
- [ ] Generate captions (VTT)
- [ ] Create thumbnail (1280x720)
- [ ] Update CREDITS.md
- [ ] Upload to storage (R2/CDN)
- [ ] Embed in article: `<VideoEmbed src="..." />`

## Common Patterns

### Academic Color Scheme
```css
:root {
  --primary: #1a1a2e;
  --secondary: #16213e;
  --accent: #e94560;
  --background: #fafafa;
  --surface: #ffffff;
  --text: #1a1a2e;
  --muted: #6b7280;
}
```

### Font Stack
```css
font-family: 'Aptos Serif', 'Newsreader', serif;  /* Headings, body */
font-family: 'Aptos', 'Inter', sans-serif;        /* UI, labels */
font-family: 'Aptos Mono', monospace;             /* Code, DOIs */
```

### Animation Timing
- **Fast**: 0.15s (micro-interactions)
- **Normal**: 0.3s (transitions)
- **Slow**: 0.5s (section changes)
- **Stagger**: 0.1s between items

### Accessibility
- **Captions**: Always include VTT
- **Audio description**: For visual-only content
- **Reduced motion**: Respect `prefers-reduced-motion`
- **Color blind safe**: Test with simulator

## Troubleshooting

### Render Fails
1. Check `npx hyperframes lint` output
2. Verify no `Date.now()`/`Math.random()` in composition
3. Ensure all clips have `class="clip"`
4. Check GSAP timeline registration

### Visual Glitches
1. Verify deterministic animations
2. Check for z-index conflicts
3. Ensure proper cleanup in scene transitions
4. Test in headless Chrome (render environment)

### Performance
1. Limit concurrent animations
2. Use `will-change` sparingly
3. Prefer transform/opacity over layout properties
4. Profile with Chrome DevTools