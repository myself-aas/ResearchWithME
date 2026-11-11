import { useLoaderData } from 'react-router-dom';
import ContactPage from '@/components/ContactPage';

export default function ContactRoute() {
  useLoaderData();
  return <ContactPage />;
}
