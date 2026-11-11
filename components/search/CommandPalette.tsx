'use client';

import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import * as m from 'motion/react-m';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, BookOpen, CheckCircle2, Compass, FileText, Search, X } from 'lucide-react';
import type { Author, BlogPost } from '@/lib/blog-data';
import type { Publication } from '@/lib/research-data';
import { t } from '@/lib/i18n';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { useDelayedLoading } from '@/lib/motion/hooks';
import { EASING, SPRING } from '@/lib/motion/tokens';
import Pressable from '@/components/motion/Pressable';
import { SkeletonShard } from '@/components/motion/LoadingState';
import {
  buildCatalogIndex,
  searchCatalog,
  type CatalogEntityKind,
  type CatalogSearchItem,
} from '@/lib/search/catalog-index';

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialArticles?: BlogPost[];
  initialQuery?: string;
}

interface LoadedCorpus {
  articles: BlogPost[];
  papers: Publication[];
  authors: Author[];
}

let cachedCorpus: LoadedCorpus | null = null;

export default function CommandPalette({
  open,
  onOpenChange,
  initialArticles = [],
  initialQuery = '',
}: CommandPaletteProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const [query, setQuery] = useState(initialQuery);
  const [corpus, setCorpus] = useState<LoadedCorpus | null>(cachedCorpus);
  // Loading contract: no skeleton for the first 200ms (cached corpus is
  // usually instant), then keep it on screen for at least half a second.
  const showSkeleton = useDelayedLoading(open && corpus === null, { delay: 200, minDuration: 500 });

  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (!open || cachedCorpus) return;
    let active = true;

    Promise.allSettled([
      fetch('/api/articles').then((res) => (res.ok ? res.json() : null)),
      fetch('/api/papers').then((res) => (res.ok ? res.json() : null)),
      fetch('/api/authors').then((res) => (res.ok ? res.json() : null)),
    ]).then(([articlesRes, papersRes, authorsRes]) => {
      if (!active) return;
      const articles: BlogPost[] =
        articlesRes.status === 'fulfilled' && Array.isArray(articlesRes.value?.articles)
          ? articlesRes.value.articles
          : initialArticles;
      const papers: Publication[] =
        papersRes.status === 'fulfilled' && Array.isArray(papersRes.value?.papers)
          ? papersRes.value.papers
          : [];
      const authors: Author[] =
        authorsRes.status === 'fulfilled' && Array.isArray(authorsRes.value?.authors)
          ? authorsRes.value.authors
          : articles.map((post) => post.author);

      const anySucceeded =
        (articlesRes.status === 'fulfilled' && articlesRes.value !== null) ||
        (papersRes.status === 'fulfilled' && papersRes.value !== null) ||
        (authorsRes.status === 'fulfilled' && authorsRes.value !== null);

      const loaded: LoadedCorpus = { articles, papers, authors };
      if (anySucceeded) {
        cachedCorpus = loaded;
      }
      setCorpus(loaded);
    });

    return () => {
      active = false;
    };
  }, [open, initialArticles]);

  const index = useMemo(() => {
    const articles = corpus?.articles.length ? corpus.articles : initialArticles;
    const papers = corpus?.papers ?? [];
    const authors = corpus?.authors.length
      ? corpus.authors
      : articles.map((post) => post.author);
    return buildCatalogIndex({ articles, papers, authors });
  }, [corpus, initialArticles]);

  const results = useMemo(() => searchCatalog(query, index, 24), [query, index]);

  const grouped = useMemo(() => {
    const buckets: Record<CatalogEntityKind, CatalogSearchItem[]> = {
      article: [],
      paper: [],
      specialist: [],
      route: [],
    };
    for (const item of results) {
      buckets[item.kind].push(item);
    }
    return buckets;
  }, [results]);

  function handleSelect(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  function renderIcon(kind: CatalogEntityKind) {
    switch (kind) {
      case 'article':
        return <FileText className="h-4 w-4 shrink-0 text-ink-secondary" aria-hidden="true" />;
      case 'paper':
        return <BookOpen className="h-4 w-4 shrink-0 text-ink-secondary" aria-hidden="true" />;
      case 'specialist':
        return <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />;
      case 'route':
        return <Compass className="h-4 w-4 shrink-0 text-ink-secondary" aria-hidden="true" />;
    }
  }

  const sections: Array<{ kind: CatalogEntityKind; heading: string }> = [
    { kind: 'article', heading: t(locale, 'cmdk.group.articles') },
    { kind: 'paper', heading: t(locale, 'cmdk.group.papers') },
    { kind: 'specialist', heading: t(locale, 'cmdk.group.specialists') },
    { kind: 'route', heading: t(locale, 'cmdk.group.routes') },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <m.div
            className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[1px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.14, ease: [...EASING.standard] }}
          />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <m.div
            className="fixed left-1/2 top-[10vh] z-50 w-[min(92vw,42rem)] overflow-hidden rounded-sm border border-line bg-canvas text-ink focus:outline-none"
            initial={{ opacity: 0, y: -10, scale: 0.98, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            transition={SPRING.panel}
          >
          <Dialog.Title className="sr-only">{t(locale, 'cmdk.trigger')}</Dialog.Title>
          <Dialog.Description className="sr-only">
            {t(locale, 'cmdk.placeholder')}
          </Dialog.Description>

          <Command label={t(locale, 'cmdk.trigger')} shouldFilter={false} loop className="flex flex-col">
            <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-ink-secondary" aria-hidden="true" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder={t(locale, 'cmdk.placeholder')}
                className="w-full bg-transparent font-sans text-sm text-ink placeholder:text-ink-secondary focus:outline-none"
              />
              {query && (
                <Pressable
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search query"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-line text-ink-secondary hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </Pressable>
              )}
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close command palette"
                  className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-xs text-ink-secondary hover:text-ink"
                >
                  ESC
                </button>
              </Dialog.Close>
            </div>

            <Command.List className="max-h-[62vh] overflow-y-auto divide-y divide-line p-2">
              {showSkeleton ? (
                <div role="status" aria-live="polite" aria-busy="true" className="px-2.5 py-3">
                  <span className="sr-only">Loading the catalogue index</span>
                  <div aria-hidden="true" className="space-y-3">
                    {[0, 1, 2].map((row) => (
                      <div key={row} className="flex items-center gap-3">
                        <SkeletonShard height={16} width={16} />
                        <div className="flex-1">
                          <SkeletonShard height={12} width="45%" />
                          <div className="h-1.5" />
                          <SkeletonShard height={10} width="70%" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {!showSkeleton && results.length === 0 && (
                <Command.Empty className="px-4 py-10 text-center font-sans text-sm text-ink-secondary">
                  {t(locale, 'cmdk.empty')}
                </Command.Empty>
              )}

              {!showSkeleton && sections.map(({ kind, heading }) => {
                const groupItems = grouped[kind];
                if (groupItems.length === 0) return null;
                return (
                  <Command.Group
                    key={kind}
                    heading={heading}
                    className="py-2 first:pt-1 last:pb-1 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-secondary"
                  >
                    {groupItems.map((item) => {
                      const badge = item.identifiers[0];
                      return (
                        <Command.Item
                          key={item.id}
                          value={item.id}
                          onSelect={() => handleSelect(item.href)}
                          className="group flex cursor-pointer items-start justify-between gap-3 rounded-sm border border-transparent px-2.5 py-2.5 transition-colors data-[selected=true]:border-brand data-[selected=true]:bg-surface-subtle"
                        >
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span className="mt-0.5">{renderIcon(item.kind)}</span>
                            <div className="min-w-0">
                              <div className="truncate font-serif text-sm font-medium text-ink">
                                {item.title}
                              </div>
                              <div className="mt-0.5 truncate font-sans text-xs text-ink-secondary">
                                {item.subtitle}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {badge && (
                              <span className="hidden rounded-sm border border-line bg-surface px-1.5 py-0.5 font-mono text-xs text-ink-secondary sm:inline-block">
                                {badge}
                              </span>
                            )}
                            <ArrowUpRight
                              className="h-3.5 w-3.5 text-ink-secondary opacity-0 transition-opacity group-data-[selected=true]:text-brand group-data-[selected=true]:opacity-100"
                              aria-hidden="true"
                            />
                          </div>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                );
              })}
            </Command.List>

            <div className="flex items-center justify-between border-t border-line bg-surface px-4 py-2 font-mono text-xs text-ink-secondary">
              <span>↑↓ Navigate · ↵ Open · ESC Close</span>
              <span>DOI · GitHub · ORCID</span>
            </div>
          </Command>
          </m.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
