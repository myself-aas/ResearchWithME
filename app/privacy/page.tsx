import PrivacyPage from '@/components/PrivacyPage';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Privacy Policy — Reader Data Governance',
  description:
    'Read the ResearchWithMe privacy policy: zero behavioural tracking, local-first reading lists, minimal contributor verification data, and open-access standards.',
  path: '/privacy',
  type: 'website',
});

export default function PrivacyRoute() {
  return <PrivacyPage />;
}
