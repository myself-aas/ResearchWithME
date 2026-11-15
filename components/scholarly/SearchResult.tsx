/**
 * SearchResult — reme v3.1 §28 (stage 4, beta).
 *
 * Renders one result with its search mode labeled; AI-expanded results are
 * always visibly marked "AI-expanded" (never passed off as lexical).
 * Anatomy: mode label + title + snippet + identifier. Keyboard: native link.
 */
import type { SearchResultItem, SearchableItem } from '@/lib/scholarly/search';

export interface SearchResultProps<T extends SearchableItem> {
  result: SearchResultItem<T>;
  href?: (item: T) => string;
}

export default function SearchResult<T extends SearchableItem>({ result, href }: SearchResultProps<T>) {
  const { item, mode, aiExpanded } = result;
  const label =
    mode === 'lexical' ? 'Lexical' : mode === 'exact-identifier' ? 'Exact identifier' : mode === 'semantic' ? 'Semantic' : 'AI-expanded';
  return (
    <li className="rounded-md border border-line bg-surface p-4">
      <p className={`font-sans text-[0.8125rem] font-semibold uppercase tracking-[0.04em] ${aiExpanded ? 'text-provenance-ai-assisted' : 'text-text-tertiary'}`}>
        {label}
        {aiExpanded ? ' · generated expansion — verify against sources' : ''}
      </p>
      {href ? (
        <a href={href(item)} className="mt-1 block font-serif text-[1.125rem] font-medium text-link underline-offset-[0.18em] hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
          {item.title}
        </a>
      ) : (
        <p className="mt-1 font-serif text-[1.125rem] font-medium text-text-primary">{item.title}</p>
      )}
      <p className="mt-1 line-clamp-2 font-sans text-sm text-text-secondary">{item.body}</p>
      {item.identifiers?.length ? (
        <p className="mt-1 font-mono text-xs text-text-tertiary">{item.identifiers[0]}</p>
      ) : null}
    </li>
  );
}
