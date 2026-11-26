import Link from 'next/link';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import HomeHero from '@/components/post/HomeHero';
import { Control, Cover, DesignSlot, Status, WritingRow } from '@/components/design/Primitives';
import { getAllPostMeta, getAllTags, getFeaturedPost, getSearchIndex } from '@/lib/content/posts';
import { suggestPrompts } from '@/lib/assistant/retrieval';
import { FIGURES } from '@/lib/figures/registry';
import { jsonLdScript, websiteJsonLd } from '@/lib/seo/jsonld';
import { AUTHOR, CONTACT, SITE } from '@/lib/site';
import { design } from '@/src/design';

const faq = [
  ['What is ResearchWithMe?', 'A personal research notebook by Ashif Ahmed Shuvo: close readings of research papers and open-source code, with sources, caveats, and interactive explanations.'],
  ['Does the assistant send my questions to a model provider?', 'No. The current assistant retrieves and quotes published essays in your browser. It does not use a generative model or a cloud model service.'],
  ['Can I reuse the writing?', 'Essays are licensed under CC BY 4.0. Credit the author, link the original article, and indicate changes. Check linked code and datasets for their own licenses.'],
  ['How do I follow corrections?', 'Articles carry an updated date when revised. The source repository keeps their public history, and the RSS feed provides a way to follow the archive without an account.'],
];

export default function HomePage() {
  const posts = getAllPostMeta();
  const featured = getFeaturedPost();
  const lead = posts.find(post => post.slug !== featured?.slug) ?? featured;
  const rest = posts.filter(post => post.slug !== lead?.slug).slice(0, 3);
  const topics = getAllTags().slice(0, 3);
  const prompts = suggestPrompts(getSearchIndex()).slice(0, 3);
  const spotlight = FIGURES.find(figure => figure.toolName === 'show_wipe_compare');
  const updated = posts.map(post => post.updated ?? post.date).sort().at(-1);

  function content(key: typeof design.section[number]['key']) {
    switch (key) {
      case 'writing': return <>
        <DesignSlot name="writing.lead">
          {lead ? <article className="r-flow r-flow-wide">
            <Cover post={lead} />
            <h3 className="r-h3"><Link href={lead.href} className="r-row-link">{lead.title}</Link></h3>
            <p className="r-body r-muted">{lead.description}</p>
            <Control href={lead.href} secondary>Read article</Control>
          </article> : <p className="r-body">{design.locales.en['writing.empty']}</p>}
        </DesignSlot>
        <DesignSlot name="writing.list"><div className="r-flow r-flow-wide">
          {rest.map(post => <WritingRow key={post.slug} post={post} />)}
          <Control href="/blog" secondary>All essays</Control>
        </div></DesignSlot>
      </>;
      case 'topics': return <>
        {(['topics.first', 'topics.second', 'topics.third'] as const).map((slot, i) => <DesignSlot key={slot} name={slot}>
          {topics[i] ? <Link href={`/tags/${topics[i].slug}`} className="r-card r-topic">
            <h3 className="r-h3">{topics[i].tag}</h3>
            <p className="r-meta r-muted">{topics[i].count} {topics[i].count === 1 ? 'essay' : 'essays'} in the archive</p>
            <span className="r-body">Explore topic</span>
          </Link> : <p className="r-body r-muted">{design.locales.en['topics.empty']}</p>}
        </DesignSlot>)}
      </>;
      case 'figure': return <>
        <DesignSlot name="figure.frame">{spotlight ? <spotlight.component {...spotlight.defaults} /> : <p className="r-body">No figure available. Read the essays for their text explanations.</p>}</DesignSlot>
        <DesignSlot name="figure.notes"><div className="r-flow r-flow-wide">
          <h3 className="r-h3">Change one thing. See what follows.</h3>
          <p className="r-body r-muted">The essays teach with interactive figures. This comparison comes from the same governed library used in articles and assistant answers: the facts arrive as data, and the interaction pattern stays consistent.</p>
          <p className="r-body r-muted">Use the slider to compare the two views. A written explanation remains available alongside the figure.</p>
          <Control href="/lab" secondary>Open the figure lab</Control>
        </div></DesignSlot>
      </>;
      case 'datasets': return <>
        <DesignSlot name="datasets.first"><div className="r-card r-flow">
          <Status state="unavailable">{design.locales.en['status.unavailable']}</Status>
          <h3 className="r-h3">Standalone datasets</h3>
          <p className="r-body r-muted">{design.locales.en['datasets.empty']} Sources and artifacts are linked from the essays that discuss them.</p>
        </div></DesignSlot>
        <DesignSlot name="datasets.second"><div className="r-card r-flow">
          <h3 className="r-h3">Methods in context</h3>
          <p className="r-body r-muted">Read the original claims alongside the implementation, assumptions, and limitations. A close reading is not a claim of independent reproduction.</p>
          <Link href="/blog" className="r-row-link">Find a research essay</Link>
        </div></DesignSlot>
        <DesignSlot name="datasets.third"><div className="r-card r-flow">
          <h3 className="r-h3">A traceable record</h3>
          <p className="r-body r-muted">Article dates, citations, and public source history keep the writing attributable. Essays are licensed under {SITE.license}.</p>
          <a href="https://github.com/myself-aas/ResearchWithME" className="r-row-link">View the source repository</a>
        </div></DesignSlot>
      </>;
      case 'assistant': return <>
        <DesignSlot name="assistant.prompt"><div className="r-flow r-flow-wide">
          <h3 className="r-h3">Answers that quote, not improvise.</h3>
          <p className="r-body r-muted">Ask about the published essays. Retrieval runs in your browser and answers link back to their source. This is an archive guide, not a generative model.</p>
          <Control href="/assistant">Ask the archive</Control>
          <Link href="/search" className="r-row-link">Prefer a search? Find an essay directly.</Link>
        </div></DesignSlot>
        <DesignSlot name="assistant.links"><div className="r-flow">
          <p className="r-body r-muted">Questions to take to the archive</p>
          {prompts.length ? <ul className="r-list">{prompts.map(prompt => <li key={prompt} className="r-row"><p className="r-body">{prompt}</p></li>)}</ul> : <p className="r-body">{design.locales.en['assistant.empty']}</p>}
        </div></DesignSlot>
      </>;
      case 'author': return <>
        <DesignSlot name="author.bio"><div className="r-flow r-flow-wide">
          <h3 className="r-h3">{AUTHOR.name}</h3><p className="r-body r-muted">{AUTHOR.bio}</p><Control href="/about" secondary>About the author</Control>
        </div></DesignSlot>
        <DesignSlot name="author.meta"><dl className="r-list">
          <div className="r-row"><dt className="r-meta r-muted">Design system</dt><dd className="r-body">reme {design.meta.version} · Next.js adaptation</dd></div>
          {updated && <div className="r-row"><dt className="r-meta r-muted">Archive last updated</dt><dd className="r-body"><time dateTime={updated}>{updated}</time></dd></div>}
          <div className="r-row"><dt className="r-meta r-muted">License</dt><dd className="r-body"><a className="r-row-link" href={SITE.licenseUrl}>{SITE.license}</a></dd></div>
        </dl></DesignSlot>
      </>;
      case 'faq': return <DesignSlot name="faq.body">{faq.map(([question, answer]) => <details key={question} className="r-disclosure"><summary className="r-body">{question}</summary><p className="r-body r-muted">{answer}</p></details>)}</DesignSlot>;
      case 'dispatch': return <DesignSlot name="dispatch.body"><div className="r-flow r-flow-wide">
        <p className="r-body r-muted">Found a mistake, have a source to share, or want to discuss an essay? Open an issue or use the contact page. There is no subscription form or tracking funnel.</p>
        <Control href={CONTACT.issues} secondary>Start a conversation</Control>
        <Link className="r-row-link" href="/contact">Other ways to get in touch</Link>
        <Link className="r-row-link" href={SITE.feedPath}>Follow new writing with RSS</Link>
      </div></DesignSlot>;
      case 'hero': return null;
    }
  }
  const headings = {
    hero: '', writing: 'Recent writing', topics: 'Follow a question', figure: 'Make the explanation tangible',
    datasets: 'Evidence, methods, and the record', assistant: 'Read with a guide', author: 'Written in public',
    faq: 'A few useful answers', dispatch: 'Research is a conversation',
  };
  return <div className="reme-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd()) }} />
    <SiteHeader />
    <main id="main-content" tabIndex={-1}>
      <HomeHero post={featured} />
      {design.section.filter(s => s.key !== 'hero').map(s => <section key={s.id} data-section={s.key} aria-labelledby={`${s.key}-heading`} className="r-section">
        <div className="r-grid r-heading"><div className="r-slot r-slot-section-head"><h2 id={`${s.key}-heading`} className="r-h2">{headings[s.key]}</h2></div></div>
        <div className="r-grid">{content(s.key)}</div>
      </section>)}
    </main>
    <SiteFooter />
  </div>;
}
