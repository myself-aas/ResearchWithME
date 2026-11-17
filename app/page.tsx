import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import HomeFeed from '@/components/HomeFeed';
import { getDashboardUser } from '@/lib/cms/auth';
import { getCachedFeedArticles } from '@/lib/cms/catalogue';
import { getCachedPublishedAuthors } from '@/lib/author-directory';
import { categoryToSlug, slugToCategory } from '@/lib/blog-data';
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl, clampSeoDescription, clampSeoTitle } from '@/lib/seo';
import { jsonLdScript, websiteJsonLd } from '@/lib/seo/jsonld';
import { parseConfiguredLanding, resolveHomeLandingRedirect } from '@/lib/v34/landing';
import { getDashboardPreferences } from '@/lib/v34/wave3-store';

interface HomePageProps {
  searchParams: Promise<{ category?: string; search?: string; view?: string }>;
}

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const params = await searchParams;
  const search = typeof params.search === 'string' ? params.search.trim() : '';

  if (search) {
    const title = clampSeoTitle(`${search} — Research Reviews & Teardowns`);
    const description = clampSeoDescription(
      `Explore open-access paper reviews, reproducible benchmarks, and repository teardowns matching "${search}" in the ResearchWithMe catalog.`,
    );
    return {
      title,
      description,
      alternates: {
        canonical: '/',
        types: { 'text/markdown': '/index.md' },
      },
      robots: {
        index: false,
        follow: true,
      },
      openGraph: {
        title: `${title} | ${SITE_NAME}`,
        description,
        url: absoluteUrl('/'),
        siteName: SITE_NAME,
        type: 'website',
        images: [{ url: absoluteUrl('/opengraph-image'), width: 1200, height: 630, alt: `${title} | ${SITE_NAME}` }],
      },
    };
  }

  return {
    alternates: {
      canonical: '/',
      types: { 'text/markdown': '/index.md' },
    },
    description: SITE_DESCRIPTION,
    openGraph: {
      title: `${SITE_NAME} — Open-Access Research Reviews & Teardowns`,
      description: SITE_DESCRIPTION,
      url: absoluteUrl('/'),
      siteName: SITE_NAME,
      type: 'website',
      images: [{ url: absoluteUrl('/opengraph-image'), width: 1200, height: 630, alt: SITE_NAME }],
    },
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const rawCategory = typeof params.category === 'string' ? params.category : undefined;
  const search = typeof params.search === 'string' ? params.search : '';
  const view = typeof params.view === 'string' ? params.view : undefined;

  // Canonicalize legacy category query params (e.g. ?category=Data%20%26%20Policy) to clean URLs (/category/data-policy)
  if (rawCategory && rawCategory !== 'All') {
    const matchedCategory = slugToCategory(rawCategory);
    if (matchedCategory) {
      const searchSuffix = search ? `?${new URLSearchParams({ search }).toString()}` : '';
      redirect(`/category/${categoryToSlug(matchedCategory)}${searchSuffix}`);
    }
  }

  // Part VI §4.1: Route signed-in users visiting bare `/` to their configured landing surface
  // unless they explicitly requested `/?view=public` or applied category/search filters.
  const user = await getDashboardUser();
  if (user) {
    const cookieStore = await cookies();
    const cookieLanding = parseConfiguredLanding(cookieStore.get('rwm_landing')?.value);
    const storedPref = getDashboardPreferences(user.id);
    const storedLandingRaw = storedPref.defaultLanding.toLowerCase();
    const configuredLanding =
      cookieLanding ??
      parseConfiguredLanding(storedLandingRaw === 'dashboard' ? 'research-os' : storedLandingRaw) ??
      'research-os';
    const landingRedirect = resolveHomeLandingRedirect({
      isAuthenticated: true,
      viewParam: view,
      hasFilterParams: Boolean(rawCategory || search.trim()),
      configuredLanding,
    });
    if (landingRedirect) {
      redirect(landingRedirect);
    }
  }

  const [authors, posts] = await Promise.all([getCachedPublishedAuthors(), getCachedFeedArticles()]);

  return (
    <>
      {!search && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd()) }} />
      )}
      <HomeFeed initialCategory="All" initialSearch={search} authors={authors} initialPosts={posts} />
    </>
  );
}
