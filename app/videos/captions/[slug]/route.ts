import { getArticleCatalogue } from '@/lib/cms/catalogue';

function sanitizeCueText(input: string): string {
  return input.replace(/-->/g, '->').replace(/\r?\n+/g, ' ').trim();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.replace(/\.vtt$/i, '');
  const catalogue = await getArticleCatalogue();
  const article = catalogue.find((item) => item.slug === slug || item.id === slug);

  const lines = ['WEBVTT', ''];
  if (article) {
    lines.push('1');
    lines.push('00:00:00.000 --> 00:00:06.000');
    lines.push(sanitizeCueText(`${article.title} — by ${article.author.name}.`));
    lines.push('');

    article.keyTakeaways.slice(0, 3).forEach((takeaway, index) => {
      const start = String((index + 1) * 6).padStart(2, '0');
      const end = String((index + 2) * 6).padStart(2, '0');
      lines.push(String(index + 2));
      lines.push(`00:00:${start}.000 --> 00:00:${end}.000`);
      lines.push(sanitizeCueText(takeaway));
      lines.push('');
    });
  } else {
    lines.push('1');
    lines.push('00:00:00.000 --> 00:00:08.000');
    lines.push('ResearchWithMe visual explainer summary.');
    lines.push('');
  }

  return new Response(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/vtt; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
