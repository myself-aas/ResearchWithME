'use client';

import { useState } from 'react';
import { probeLocalCapabilities } from '@/lib/assistant/local-capabilities';
import { genui } from '@/src/design/genui.manifest';
import { StatusBadge } from '@/components/design/ExtendedPrimitives';

/** Capability testing is not model inference. No speculative downloads. */
export function LocalModelAvailability() {
  const [message, setMessage] = useState('No model weights or inference engine are installed. Archive retrieval remains available.');
  async function check() {
    setMessage('Checking device capabilities…');
    const report = await probeLocalCapabilities();
    setMessage(`${report.supported ? `Device supports ${report.backend}.` : 'This device does not support the required local runtime.'} No model is installed. Use archive retrieval or Search; nothing was downloaded.`);
  }
  return <section className="r-flow assistant-model" aria-label="On-device model availability"><StatusBadge state="unavailable" /><p className="r-body">An optional on-device model is not available in this build.</p><button type="button" className="r-control-secondary" onClick={check}>Check device support</button><button type="button" className="r-control-secondary" disabled={!genui.model.available}>Load local model — unavailable</button><output className="r-meta" aria-live="polite">{message}</output><a className="r-row-link" href="/search">Search the archive instead</a></section>;
}
