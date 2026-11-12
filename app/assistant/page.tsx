import AssistantPanel from '@/components/AssistantPanel';
import { getCachedFeedArticles } from '@/lib/cms/catalogue';

export default async function AssistantPage() {
  return <AssistantPanel initialArticles={await getCachedFeedArticles()} />;
}
