import AboutPage from '@/components/AboutPage';
import { pageMetadata } from '@/lib/seo';
import { aboutPageJsonLd, jsonLdScript } from '@/lib/seo/jsonld';

export const metadata = pageMetadata({
  title: 'About ResearchWithMe — Editorial Charter',
  description:
    'Learn how ResearchWithMe publishes diamond open-access paper reviews, benchmark replications, and repository teardowns by verified domain specialists.',
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
