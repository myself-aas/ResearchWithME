'use client';

import { useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * Fenced code block with a copy control.
 *
 * The `<pre>` is the MDX-generated element (including `rehype-highlight`'s
 * token spans), so copy reads textContent instead of re-serialising the tree.
 */
export default function CodeBlock({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLPreElement>) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    const text = preRef.current?.textContent ?? '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
      window.setTimeout(() => setFailed(false), 2000);
    }
  }

  return (
    <div className="group relative my-7">
      <pre ref={preRef} className={className} {...props}>
        {children}
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 inline-flex min-h-8 items-center gap-1.5 rounded-md border border-line bg-surface/90 px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-wider text-ink-secondary opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus group-hover:opacity-100 max-sm:opacity-100"
        aria-label={copied ? 'Code copied' : failed ? 'Copy failed' : 'Copy code'}
      >
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
        <span aria-live="polite">{copied ? 'Copied' : failed ? 'Retry' : 'Copy'}</span>
      </button>
    </div>
  );
}
