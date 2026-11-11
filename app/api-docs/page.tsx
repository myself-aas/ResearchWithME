import { pageMetadata } from '@/lib/seo';
import ApiDocsReference from '@/components/ApiDocsReference';

export const metadata = pageMetadata({
  title: 'API reference',
  description: 'Reference for the ResearchWithMe archive, assistant, and editorial HTTP APIs.',
  path: '/api-docs',
});

export default function ApiDocsPage() {
  return <ApiDocsReference />;
}
