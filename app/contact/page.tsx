import ContactPage from '@/components/ContactPage';
import { pageMetadata } from '@/lib/seo';
import { contactPageJsonLd, jsonLdScript } from '@/lib/seo/jsonld';

export const metadata = pageMetadata({
  title: 'Contact',
  description:
    'Contact ResearchWithMe about article pitches, corrections, contributor verification, and RFC 9116 security disclosure.',
  path: '/contact',
  type: 'website',
});

export default function ContactRoute() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(contactPageJsonLd()) }} />
      <ContactPage />
    </>
  );
}
