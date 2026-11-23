import { useState, Children, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChartBlock from '@/components/charts/ChartBlock';
import manifest from '../../docs/articles/repository-review-batch.json';
import './style.css';

const bodies = import.meta.glob('../../docs/articles/*.cms.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const intakes = import.meta.glob('../../docs/articles/*.intake.json', { import: 'default', eager: true }) as Record<string, { cmsFields: { title: string; summary: string; readTime: string } }>;

function Preview() {
  const [slug, setSlug] = useState(manifest.reviews[0].slug);
  const selected = manifest.reviews.find((review) => review.slug === slug)!;
  const fields = intakes[`../../docs/articles/${slug}.intake.json`].cmsFields;
  return <div className="workbench">
    <aside>
      <a className="wordmark" href="#top">reme<span> / review room</span></a>
      <p className="eyebrow">SOURCE-FIRST · 10 DRAFTS</p>
      <h2>Read the architecture.<br />Question the claims.</h2>
      <nav aria-label="Review drafts">{manifest.reviews.map((review, i) =>
        <button key={review.slug} aria-current={slug === review.slug ? 'page' : undefined} onClick={() => { setSlug(review.slug); window.scrollTo(0, 0); }}><span>{String(i + 1).padStart(2, '0')}</span>{review.name}<span aria-hidden="true">↗</span></button>
      )}</nav>
      <p className="sidebar-note">Local editorial preview. Not the production reader, a CMS write, or a published collection.</p>
    </aside>
    <main id="top">
      <header>
        <div className="topline"><span className="draft-pill">UNPUBLISHED DRAFT</span><span>REPO TEARDOWN / REVIEW</span></div>
        <p className="eyebrow">{selected.repository}</p>
        <h1>{fields.title}</h1>
        <p className="dek">{fields.summary}</p>
        <div className="byline"><span className="avatar" aria-hidden="true">AS</span><span><strong>Ashif Ahmed Shuvo</strong><br />Source inspection · 20 Nov 2026 · {fields.readTime}</span></div>
        <div className="scope"><strong>Evidence, not a benchmark.</strong> Charts count matching files in selected source roots. They do not score product quality, security, coverage or speed.<a href="#source-map">Jump to source map ↓</a></div>
      </header>
      <article className="preview-prose" key={slug}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
          h2: ({children}) => <h2 id={String(children).startsWith('Source map:') ? 'source-map' : undefined}>{children}</h2>,
          pre: ({children}) => {
            const code = Children.toArray(children)[0] as ReactElement<{className?: string; children?: string}>;
            if (code?.props?.className === 'language-chart') return <ChartBlock source={String(code.props.children ?? '')} />;
            return <pre tabIndex={0}>{children}</pre>;
          },
          a: ({href, children}) => href?.startsWith('/') ? <span title={`Production link: ${href}`}>{children}</span> : <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
        }}>{bodies[`../../docs/articles/${slug}.cms.txt`]}</ReactMarkdown>
      </article>
      <footer>Human evidence review and publication approval remain pending.</footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<Preview />);
