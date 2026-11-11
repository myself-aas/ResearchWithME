import { useLoaderData } from 'react-router-dom';
import EditionsArchive from '@/components/EditionsArchive';

/** The ported editions archive; static content is bundled, the loader carries metadata. */
export default function EditionsRoute() {
  // The loader re-runs on client navigation; its only payload is metadata.
  useLoaderData();
  return <EditionsArchive />;
}
