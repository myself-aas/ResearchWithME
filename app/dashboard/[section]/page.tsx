import { notFound, redirect } from 'next/navigation';
import { resolveDashboardSection } from '@/lib/v34/dashboard-routes';

export const dynamic = 'force-dynamic';

/**
 * Part I §26.2 Canonical `/dashboard/<section>` Deep-Link Resolver.
 * Static sibling routes (`/dashboard/access`, `/dashboard/account`, `/dashboard/reading`,
 * and `(studio)/*`) retain priority in Next.js App Router while every v3.4 personal
 * command-center section resolves deterministically with zero 404s.
 */
export default async function DashboardSectionRedirectPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const target = resolveDashboardSection(section);
  if (!target) {
    notFound();
  }
  redirect(target);
}
