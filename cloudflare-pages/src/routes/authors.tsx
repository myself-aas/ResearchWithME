import { useLoaderData } from 'react-router-dom';
import AuthorsDirectoryPage from '@/components/AuthorsDirectoryPage';
import type { AuthorsLoaderData } from './data';

/** The ported contributors directory; the loader resolves the published profiles. */
export default function AuthorsRoute() {
  const data = useLoaderData() as AuthorsLoaderData;
  return <AuthorsDirectoryPage authors={data.authors} />;
}
