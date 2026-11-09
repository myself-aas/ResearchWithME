import { cn } from '@/lib/utils';
import { badgeBaseClass } from './styles';

export default function StatusBadge({ status }: { status: 'draft' | 'published' }) {
  const published = status === 'published';
  return (
    <span
      className={cn(
        badgeBaseClass,
        published
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-indigo-200 bg-indigo-50 text-brand',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('h-1.5 w-1.5 rounded-full', published ? 'bg-emerald-700' : 'bg-amber-700')}
      />
      {published ? 'Published' : 'Draft'}
    </span>
  );
}
