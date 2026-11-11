import { useLoaderData } from 'react-router-dom';
import ApiDocsReference from '@/components/ApiDocsReference';

/** The ported API reference; the loader carries document metadata only. */
export default function ApiDocsRoute() {
  // The loader re-runs on client navigation; its only payload is metadata.
  useLoaderData();
  return <ApiDocsReference />;
}
