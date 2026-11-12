import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import HomeFeed from '@/components/HomeFeed';
import { getCachedFeedArticles } from '@/lib/cms/catalogue';
import { CATEGORIES, categoryToSlug, slugToCategory } from '@/lib/blog-data';
import { CATEGORY_META } from '@/components/ArticleFeed';
import { pageMetadata } from '@/lib/seo';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ search?: string }>;
}

export async function generateStaticParams() {
  return CATEGORIES.map((category) => ({
    slug: categoryToSlug(category),
  }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = slugToCategory(slug);
  if (!category) {
    return { title: 'Field Not Found' };
  }

  const meta = CATEGORY_META[category];
  return pageMetadata({
    title: `${category} Reviews & Teardowns`,
    description: meta?.description || `Open-access scholarly paper reviews and repository teardowns in ${category}.`,
    path: `/category/${categoryToSlug(category)}`,
  });
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const category = slugToCategory(slug);

  if (!category) {
    notFound();
  }

  const search = searchParams ? (await searchParams).search ?? '' : '';

  const posts = await getCachedFeedArticles();

  return <HomeFeed initialCategory={category} initialSearch={search} initialPosts={posts} />;
}

