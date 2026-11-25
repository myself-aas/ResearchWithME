'use client';

import { useState } from 'react';
import { CalendarDays, MapPin, Orbit } from 'lucide-react';
import PipelineExplorer from './PipelineExplorer';

type FrameCount = 1 | 3 | 4 | 5;

const frameOptions: FrameCount[] = [1, 3, 4, 5];
const sceneShapes = [
  'M0 45 26 24l19 8 27-20 28 19v39H0Z',
  'M0 23 22 40l18-19 20 9 21-18 19 12v46H0Z',
  'M0 38 24 18l22 20 20-8 34 23v35H0Z',
];
const sceneColors = [
  { land: '#87a883', field: '#d3aa68', water: '#557f83' },
  { land: '#708f71', field: '#d2bd78', water: '#548493' },
  { land: '#79997a', field: '#bd965c', water: '#42777f' },
];

function ObservationTile({ index, label }: { index: number; label: string }) {
  const colors = sceneColors[index % sceneColors.length];

  return (
    <div className="min-w-0">
      <div className="overflow-hidden rounded-lg border border-border/70 bg-slate-900">
        <svg viewBox="0 0 100 80" className="block aspect-[5/4] w-full" aria-hidden="true">
          <rect width="100" height="80" fill={colors.land} />
          <path d={sceneShapes[index % sceneShapes.length]} fill={colors.field} opacity=".88" />
          <path d="M-4 60c20-8 23-27 38-31s17 17 30 15 19-20 40-20" fill="none" stroke={colors.water} strokeWidth="7" opacity=".95" />
          <path d="M9 0v80M42 0v80M74 0v80M0 26h100M0 54h100" stroke="white" strokeOpacity=".22" strokeWidth=".7" />
          <path d="M0 68c20-8 31 3 50-5s30-12 50-4" fill="none" stroke="white" strokeOpacity=".5" strokeWidth=".7" />
        </svg>
      </div>
      <p className="mt-1.5 text-center font-mono text-[0.6875rem] font-semibold tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function PatchTokenArtwork({ frameCount }: { frameCount: FrameCount }) {
  return (
    <div className="relative mx-auto flex h-20 w-full max-w-44 items-center justify-center" aria-hidden="true">
      <div className="absolute left-1/2 top-1/2 h-11 w-14 -translate-x-1/2 -translate-y-1/2 rotate-[-10deg] rounded-lg border border-teal-200/60 bg-teal-500/15" />
      <div className="absolute left-1/2 top-1/2 h-11 w-14 -translate-x-1/2 -translate-y-1/2 rotate-[5deg] rounded-lg border border-amber-200/70 bg-amber-300/20" />
      <div className="relative grid grid-cols-4 gap-1 rounded-lg border border-border bg-background/90 p-2 shadow-xs">
        {Array.from({ length: 12 }, (_, index) => (
          <span
            key={index}
            className={`h-2.5 w-2.5 rounded-[3px] ${index % 5 === 0 ? 'bg-primary' : index % 3 === 0 ? 'bg-emerald-500/70' : 'bg-muted-foreground/35'}`}
          />
        ))}
      </div>
      <span className="absolute bottom-0 right-1 rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[0.625rem] text-muted-foreground">
        T × H × W · {frameCount}
      </span>
    </div>
  );
}

/** Interactive companion figure for the Prithvi-EO-2.0 essay. */
export default function PrithviExplorer() {
  const [frameCount, setFrameCount] = useState<FrameCount>(4);
  const [metadataEnabled, setMetadataEnabled] = useState(true);

  const visibleFrames =
    frameCount === 1
      ? ['T1']
      : frameCount === 3
        ? ['T1', 'T2', 'T3']
        : frameCount === 4
          ? ['T1', 'T2', 'T3', 'T4']
          : ['T1', 'T3', 'T5'];

  const frameSummary = `Showing ${frameCount} ${frameCount === 1 ? 'observation' : 'observations'}${frameCount === 5 ? ', with three representative views shown above' : ''}`;

  return (
    <PipelineExplorer
      ariaLabel="Interactive Prithvi-EO-2.0 architecture explorer"
      description="Switch the time stack and metadata on or off. The diagram updates to show the two inputs that distinguish the temporal-location checkpoint."
      controls={[
        {
          id: 'frames',
          label: 'Observations',
          ariaLabel: 'Number of image observations',
          value: String(frameCount),
          mono: true,
          options: frameOptions.map((c) => ({
            value: String(c),
            label: `${c} ${c === 1 ? 'frame' : 'frames'}`,
          })),
          onChange: (val) => setFrameCount(Number(val) as FrameCount),
        },
        {
          id: 'metadata',
          label: 'Checkpoint input',
          ariaLabel: 'Toggle location and date metadata',
          value: metadataEnabled ? 'tl' : 'plain',
          options: [
            { value: 'tl', label: 'Temporal-location' },
            { value: 'plain', label: 'Pixels only' },
          ],
          onChange: (val) => setMetadataEnabled(val === 'tl'),
        },
      ]}
      stages={[
        {
          step: '01',
          title: 'Image sequence',
          ariaLabel: 'Satellite observations',
          body: (
            <>
              <div className={`grid gap-2 ${visibleFrames.length === 1 ? 'grid-cols-1' : visibleFrames.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {visibleFrames.map((label, index) => (
                  <ObservationTile key={label} index={index} label={label} />
                ))}
              </div>
              {frameCount === 5 && (
                <p className="mt-2 text-center font-mono text-[0.6875rem] text-muted-foreground">
                  3 representative views · 2 more in sequence
                </p>
              )}
            </>
          ),
          footer: (
            <p className="flex items-center gap-2 font-sans text-xs leading-relaxed text-muted-foreground">
              <Orbit className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              HLS reflectance · six bands · 30 m
            </p>
          ),
        },
        {
          step: '02',
          title: 'Add context',
          ariaLabel: 'Space-time patch embeddings and optional metadata',
          body: (
            <>
              <PatchTokenArtwork frameCount={frameCount} />
              <p className="mt-2 text-center font-sans text-sm font-semibold text-foreground">3D patch embeddings</p>
            </>
          ),
          footer: (
            <div aria-live="polite" className="flex min-h-8 flex-wrap justify-center gap-1.5">
              {metadataEnabled ? (
                <>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[0.6875rem] text-primary">
                    <MapPin className="h-3 w-3" aria-hidden="true" />
                    latitude + longitude
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[0.6875rem] text-primary">
                    <CalendarDays className="h-3 w-3" aria-hidden="true" />
                    year + day of year
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-2.5 py-1 font-mono text-[0.6875rem] text-muted-foreground">
                  Metadata not supplied
                </span>
              )}
            </div>
          ),
        },
        {
          step: '03',
          title: 'Encode',
          ariaLabel: 'Vision transformer representation',
          body: (
            <>
              <div className="flex h-24 items-center justify-center rounded-xl border border-border/70 bg-muted/50">
                <div className="grid grid-cols-6 gap-1.5" aria-hidden="true">
                  {Array.from({ length: 24 }, (_, index) => (
                    <span
                      key={index}
                      className={`h-3 w-3 rounded-[3px] ${index % 7 === 0 ? 'bg-primary' : index % 4 === 0 ? 'bg-emerald-500/60' : 'bg-muted-foreground/25'}`}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-center font-sans text-sm font-semibold text-foreground">Vision transformer</p>
            </>
          ),
          footer: (
            <p className="text-center font-mono text-[0.6875rem] text-muted-foreground">
              {metadataEnabled ? 'Temporal-location · -TL' : 'Plain checkpoint'}
            </p>
          ),
        },
      ]}
      summary={
        metadataEnabled
          ? `${frameSummary} with optional location and acquisition-date embeddings. The paper randomly drops metadata during pretraining so the model can still run when those fields are missing.`
          : `${frameSummary} without metadata tokens. Compare this plain path with the temporal-location variant on the same held-out region and year.`
      }
    />
  );
}
