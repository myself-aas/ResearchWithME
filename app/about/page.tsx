import AboutPage from '@/components/AboutPage';
import { pageMetadata } from '@/lib/seo';
import { aboutPageJsonLd, jsonLdScript } from '@/lib/seo/jsonld';

export const metadata = pageMetadata({
  title: 'About ResearchWithMe',
  description:
    'ResearchWithMe publishes open-access article reviews, benchmark replications, and repository teardowns written by contributors with verifiable ORCID or GitHub identities.',
  path: '/about',
  type: 'website',
});

export default function AboutRoute() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(aboutPageJsonLd()) }} />
      <AboutPage />
    </>
  );
}
