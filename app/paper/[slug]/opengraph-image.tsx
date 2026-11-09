import { brandOgImage } from '@/lib/og/brand-image';
import { PUBLICATIONS_DATA } from '@/lib/research-data';

export const alt = 'ResearchWithMe paper';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function PaperOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const paper = PUBLICATIONS_DATA.find((p) => p.slug === slug);
  return brandOgImage(paper?.title ?? 'Research paper', 'Peer-reviewed preprint · ResearchWithMe');
}
