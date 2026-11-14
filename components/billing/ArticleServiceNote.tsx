import Link from 'next/link';
import { BILLING_PRODUCTS, type BillingProductKey } from '@/lib/billing/catalogue';

/**
 * One sentence at the foot of an article, after the reader has finished.
 *
 * It is matched to what they just read: a repository teardown points at the
 * method behind it, everything else at manuscript editing. It sits after the
 * byline and never inside the reading column's prose, never as an overlay, and
 * it does not move. PRODUCT.md's first principle (the article is sacred) is the
 * reason it is this small.
 */

const LEAD: Record<BillingProductKey, string> = {
  teardown: 'This teardown follows a written method. If you review code yourself, the method is for sale:',
  copilot: 'The working notes behind reviews like this one go to members:',
  editing: 'Writing something of your own? The editor of this archive takes on manuscripts:',
};

export default function ArticleServiceNote({ format }: { format: string }) {
  const key: BillingProductKey = format === 'Repo Teardown' ? 'teardown' : 'editing';
  const product = BILLING_PRODUCTS.find((item) => item.key === key);
  if (!product) return null;

  return (
    <aside
      aria-label="From ResearchWithMe"
      className="border-l-2 border-line pl-4 font-sans text-sm leading-relaxed text-ink-secondary"
    >
      <p>
        This article is free to read and reuse. {LEAD[key]}{' '}
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
