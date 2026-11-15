import type { Metadata } from 'next';
import SettingsPage from '@/components/SettingsPage';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...pageMetadata({ title: 'Settings', description: 'Customize your ResearchWithMe experience.', path: '/settings', type: 'website' }),
  robots: { index: false, follow: false },
};

export default SettingsPage;
