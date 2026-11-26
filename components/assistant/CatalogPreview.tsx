'use client';

import { useEffect, useState } from 'react';
import { ResearchUI } from './reme-catalog';
import { researchWidgets } from '@/lib/assistant/genui-fixtures';
import { genui } from '@/src/design/genui.manifest';

export function CatalogPreview() {
  const [streaming, setStreaming] = useState(true);
  useEffect(() => {
    // Simulates a complete host-validated node arriving after initial paint.
    const timer = setTimeout(() => setStreaming(false), genui.streaming.updateThrottleMs * 10);
    return () => clearTimeout(timer);
  }, []);
  return <div className="r-flow catalog-preview">
    <section className="r-flow" aria-label="Streaming status fixture"><h2 className="r-h2">Streaming status</h2><ResearchUI streaming={streaming} value={{ component: 'RemeStatusNotice', props: { state: 'pending', detail: 'Research view ready for source verification.' } }} /></section>
    {researchWidgets.map(node => <section key={node.component} className="r-flow catalog-case" data-widget={node.component}><h2 className="r-h2">{node.component}</h2><ResearchUI value={node} /></section>)}
  </div>;
}
