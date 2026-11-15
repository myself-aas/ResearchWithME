import { useLoaderData } from 'react-router-dom';
import EditorPage from '@/components/EditorPage';

/** The editor page; static content is bundled, the loader carries metadata. */
export default function EditorialBoardRoute() {
  useLoaderData();
  return <EditorPage />;
}
