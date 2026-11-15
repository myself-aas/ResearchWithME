import { Children, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CitationSource } from '@/lib/citations';
import { renderWithInlineCitations } from '@/lib/citations-inline';
import { Link as TextLink } from '@/components/primitives';

function isExternal(href: string | undefined) {
  return Boolean(href && /^https?:\/\//i.test(href));
}

export interface MarkdownBodyProps {
  markdown: string;
  citations?: Record<string, CitationSource>;
  citeHref?: string;
}

/**
 * Renders CMS article Markdown with the platform's archival 68ch reading typography.
 *
 * Raw HTML is intentionally not enabled: authors write Markdown, and allowing
 * arbitrary HTML would turn every editor account into a stored-XSS vector.
 */
export default function MarkdownBody({ markdown, citations, citeHref }: MarkdownBodyProps) {
  function transformProseChildren(children: ReactNode): ReactNode {
    if (!citations || Object.keys(citations).length === 0) return children;
    return Children.map(children, (child) => {
      if (typeof child === 'string') {
        return renderWithInlineCitations(child, citations, citeHref);
      }
      return child;
    });
  }

  return (
    <div className="reading-prose drop-cap reading-column">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="mt-10 scroll-mt-24 font-serif text-2xl font-bold leading-snug text-ink first:mt-0">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h2 className="mt-10 scroll-mt-24 font-serif text-2xl font-bold leading-snug text-ink first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 scroll-mt-24 font-serif text-xl font-semibold leading-snug text-ink">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-6 scroll-mt-24 font-serif text-lg font-semibold leading-snug text-ink">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mt-5 reading-column break-words font-serif text-lg leading-relaxed text-ink">
              {transformProseChildren(children)}
            </p>
          ),
          a: ({ href, children }) => (
            <TextLink
              href={href}
              {...(isExternal(href) ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
            >
              {children}
            </TextLink>
          ),
          ul: ({ children }) => (
            <ul className="mt-5 list-disc space-y-2 pl-6 font-serif text-lg leading-relaxed text-ink">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-5 list-decimal space-y-2 pl-6 font-serif text-lg leading-relaxed text-ink">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{transformProseChildren(children)}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mt-6 border-l-4 border-brand pl-5 font-serif text-xl leading-relaxed text-ink">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-line" />,
          strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children, className }) => {
            const isBlock = typeof className === 'string' && className.startsWith('language-');
            if (isBlock) {
              return <code className="font-mono text-sm text-ink">{children}</code>;
            }
            return (
              <code className="rounded-xs border border-line bg-surface px-1.5 py-0.5 font-mono text-sm text-ink">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mt-6 overflow-x-auto rounded-sm border border-line bg-surface p-4 leading-relaxed">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="mt-6 overflow-x-auto rounded-sm border border-line">
              <table className="w-full border-collapse text-left font-sans text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface text-ink">{children}</thead>,
          th: ({ children }) => (
            <th scope="col" className="border-b border-line px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-line px-3 py-2 align-top text-ink last:border-b-0">
              {children}
            </td>
          ),
          img: ({ src, alt }) => {
            if (typeof src !== 'string') return null;
            // Derive a fallback alt from the filename so decorative/publisher-
            // supplied screenshots never ship with empty alt (which screen
            // readers treat as "skip this" — fine for purely decorative art
            // but wrong for explanatory figures). Explicit `alt=""` still wins.
            const fallbackAlt = alt?.trim()
              ? alt
              : (() => {
                  try {
                    const pathname = new URL(src, 'http://local').pathname;
                    const base = pathname.split('/').pop() ?? '';
                    const stem = base.replace(/\.[a-z0-9]+$/i, '');
                    const words = stem.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
                    return words || 'Article figure';
                  } catch {
                    return 'Article figure';
                  }
                })();
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={fallbackAlt}
                loading="lazy"
                decoding="async"
                className="mt-6 h-auto w-full rounded-sm border border-line"
              />
            );
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
