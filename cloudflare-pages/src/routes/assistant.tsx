import { useLoaderData } from 'react-router-dom';
import AssistantPanel from '@/components/AssistantPanel';

/** The ported research assistant tool; the loader carries document metadata only. */
export default function AssistantRoute() {
  // The loader re-runs on client navigation; its only payload is metadata.
  useLoaderData();
  return <AssistantPanel />;
}
