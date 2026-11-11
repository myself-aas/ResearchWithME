import { useLoaderData } from 'react-router-dom';
import PapersArchive from '@/components/PapersArchive';
import type { PapersLoaderData } from './data';

/** The ported paper archive: same interactive body as the Next app, fed from the loader. */
export default function PapersRoute() {
  const data = useLoaderData() as PapersLoaderData;
  return <PapersArchive initialPapers={data.papers} />;
}
