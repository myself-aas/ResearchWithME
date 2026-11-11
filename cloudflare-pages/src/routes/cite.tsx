import { useLoaderData } from 'react-router-dom';
import CitationTool from '@/components/CitationTool';

/** The ported citation tool; the loader carries document metadata only. */
export default function CiteRoute() {
  // The loader re-runs on client navigation; its only payload is metadata.
  useLoaderData();
  return <CitationTool />;
}
