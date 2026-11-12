import { cn } from '@/lib/utils';
import { badgeBaseClass } from './styles';

export default function StatusBadge({ status }: { status: 'draft' | 'published' }) {
  const published = status === 'published';
  return (
    <span
      className={cn(
        badgeBaseClass,
        published
          ? 'border-success/30 bg-success/5 text-success'
          : 'border-brand/25 bg-brand/5 text-brand',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('h-1.5 w-1.5 rounded-full', published ? 'bg-success' : 'bg-trust-uncertain')}
      />
      {published ? 'Published' : 'Draft'}
    </span>
  );
}
