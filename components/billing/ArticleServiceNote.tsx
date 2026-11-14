import Link from 'next/link';
import { BILLING_PRODUCTS } from '@/lib/billing/catalogue';

/**
 * One sentence at the foot of a repository teardown, after the reader has
 * finished: the method behind what they just read is for sale.
 *
 * Other formats get nothing. An offer that does not match what was read is
 * noise, and PRODUCT.md's first principle (the article is sacred) is the
 * reason this is one sentence after the byline and never an overlay.
 */

export default function ArticleServiceNote({ format }: { format: string }) {
  if (format !== 'Repo Teardown') return null;
  const product = BILLING_PRODUCTS.find((item) => item.key === 'teardown');
  if (!product) return null;

  return (
    <aside
      aria-label="From ResearchWithMe"
      className="border-l-2 border-line pl-4 font-sans text-sm leading-relaxed text-ink-secondary"
    >
      <p>
        This article is free to read and reuse. This teardown follows a written method. If you review code
        yourself, the method is for sale:{' '}
        <Link
          href={`/pricing#product-${product.key}`}
          className="font-semibold text-ink underline underline-offset-4 hover:text-brand"
        >
          {product.name}, {product.priceLabel}
        </Link>
        .
      </p>
    </aside>
  );
}
