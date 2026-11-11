import { useLoaderData } from 'react-router-dom';
import PrivacyPage from '@/components/PrivacyPage';

export default function PrivacyRoute() {
  useLoaderData();
  return <PrivacyPage />;
}
