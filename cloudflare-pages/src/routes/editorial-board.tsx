import { useLoaderData } from 'react-router-dom';
import EditorialBoard from '@/components/EditorialBoard';

/** The ported editorial board; static content is bundled, the loader carries metadata. */
export default function EditorialBoardRoute() {
  // The loader re-runs on client navigation; its only payload is metadata.
  useLoaderData();
  return <EditorialBoard />;
}
