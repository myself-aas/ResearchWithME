import PageState from '@/components/PageState';

export default function Loading() {
  return (
    <div className="min-h-screen bg-stone-50">
      <PageState
        role="status"
        code="Loading"
        title="Opening the archive"
        description="We are retrieving the publication catalog and preparing a distraction-free reading surface."
        primaryAction={{ href: '/', label: 'Stay on the homepage' }}
      >
        <div aria-hidden="true" className="mt-10 max-w-xl space-y-3">
          <div className="h-3 w-5/6 rounded bg-stone-200" />
          <div className="h-3 w-2/3 rounded bg-stone-200" />
          <div className="h-3 w-3/4 rounded bg-stone-200" />
        </div>
      </PageState>
    </div>
  );
}
