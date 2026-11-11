import PapersArchive from '@/components/PapersArchive';

// The archive is a client component (search/sort/save); the wrapper exists so
// the Pages target renders the same shared body from its own route.
export default function PapersArchivePage() {
  return <PapersArchive />;
}
