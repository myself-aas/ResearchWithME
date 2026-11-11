import { useLoaderData } from 'react-router-dom';
import AboutPage from '@/components/AboutPage';

export default function AboutRoute() {
  useLoaderData();
  return <AboutPage />;
}
