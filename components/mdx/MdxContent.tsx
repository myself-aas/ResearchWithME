import { compileMDX } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import { mdxComponents } from './mdx-components';

/**
 * Compiles one MDX body with the site's plugins and component map.
 *
 * Pages that render this are statically generated (`generateStaticParams`), so
 * compilation happens at build time; the compiled output is what ships.
 */
export default async function MdxContent({ source }: { source: string }) {
  const { content } = await compileMDX({
    source,
    components: mdxComponents,
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeAutolinkHeadings,
            {
              behavior: 'append',
              properties: {
                className: ['heading-anchor'],
                ariaLabel: 'Link to this section',
              },
            },
          ],
          [rehypeHighlight, { detect: false, ignoreMissing: true }],
        ],
      },
    },
  });

  return <div className="mdx-body reading-prose drop-cap">{content}</div>;
}
