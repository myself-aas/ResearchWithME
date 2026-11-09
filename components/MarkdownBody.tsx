import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function isExternal(href: string | undefined) {
  return Boolean(href && /^https?:\/\//i.test(href));
}

/**
 * Renders CMS article Markdown with the platform's reading typography.
 *
 * Raw HTML is intentionally not enabled: authors write Markdown, and allowing
 * arbitrary HTML would turn every editor account into a stored-XSS vector.
 */
export default function MarkdownBody({ markdown }: { markdown: string }) {
  return (
    <div className="reading-prose drop-cap max-w-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h2 className="mt-10 scroll-mt-24 font-serif text-2xl font-bold leading-snug text-stone-900 first:mt-0">
              {children}
            </h2>
          ),
          h2: ({ children }) => (
            <h2 className="mt-10 scroll-mt-24 font-serif text-2xl font-bold leading-snug text-stone-900 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 scroll-mt-24 font-serif text-xl font-semibold leading-snug text-stone-900">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-6 scroll-mt-24 font-serif text-lg font-semibold leading-snug text-stone-900">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="mt-5 max-w-prose break-words text-lg leading-relaxed text-stone-800">
              {children}
            </p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              {...(isExternal(href) ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
              className="font-medium text-amber-900 underline underline-offset-4 hover:text-amber-950"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="mt-5 list-disc space-y-2 pl-6 text-lg leading-relaxed text-stone-800">{children}</ul>,
          ol: ({ children }) => <ol className="mt-5 list-decimal space-y-2 pl-6 text-lg leading-relaxed text-stone-800">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mt-6 border-l-4 border-amber-900 pl-5 font-serif text-xl leading-relaxed text-stone-800">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-stone-200" />,
          strong: ({ children }) => <strong className="font-semibold text-stone-900">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ children, className }) => {
            const isBlock = typeof className === 'string' && className.startsWith('language-');
            if (isBlock) {
              return <code className="font-mono text-sm text-stone-100">{children}</code>;
            }
            return (
              <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-sm text-stone-900">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mt-6 overflow-x-auto rounded-lg border border-stone-800 bg-stone-900 p-4 leading-relaxed">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="mt-6 overflow-x-auto rounded-lg border border-stone-200">
              <table className="w-full border-collapse text-left text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-stone-100 text-stone-900">{children}</thead>,
          th: ({ children }) => (
            <th scope="col" className="border-b border-stone-200 px-3 py-2 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-stone-200 px-3 py-2 align-top text-stone-800 last:border-b-0">
              {children}
            </td>
          ),
          img: ({ src, alt }) => {
            if (typeof src !== 'string') return null;
            return (
              // Markdown images can point at any author-supplied https host, so the
              // Next image optimizer is deliberately bypassed here.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt ?? ''}
                loading="lazy"
                decoding="async"
                className="mt-6 h-auto w-full rounded-lg border border-stone-200"
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
