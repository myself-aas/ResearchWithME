import type { Metadata } from 'next';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import { CatalogPreview } from '@/components/assistant/CatalogPreview';
import { jsonLdScript, webPageJsonLd } from '@/lib/seo/jsonld';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...pageMetadata({ title: 'Research UI catalog', description: 'Illustrative fixtures for the nine allowlisted research response components. Not research results.', path: '/lab/genui' }),
  robots: { index: false, follow: true },
};
export default function ResearchCatalogPage() {
  return <div className="reme-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(webPageJsonLd({ name: 'Research UI catalog', description: 'Illustrative layout fixtures, not research results.', path: '/lab/genui' })) }} /><SiteHeader /><main id="main-content" tabIndex={-1} className="r-grid r-section"><header className="r-slot r-slot-section-head r-flow"><h1 className="r-h1">Research UI catalog</h1><p className="r-body">Nine host-validated components for the archive assistant. These are illustrative layout fixtures, not research findings. The model cannot supply HTML, CSS, event handlers, or new components.</p><a href="/lab" className="r-row-link">Back to the figure lab</a></header><div className="r-slot r-slot-workspace-thread"><CatalogPreview /></div></main><SiteFooter /></div>;
}
