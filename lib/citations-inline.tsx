import { createElement, Fragment, type ReactNode } from 'react';
import type { BlogPost } from '@/lib/blog-data';
import type { CitationSource } from '@/lib/citations';
import InlineCitationPopover from '@/components/reader/InlineCitationPopover';

const CITATION_TOKEN_PATTERN =
  /(\[\d+\]|10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+|arXiv:\d{4}\.\d{4,5})/g;

function extractYear(publishedAt: string): string {
  const match = publishedAt.match(/\b(19|20)\d{2}\b/);
  return match ? match[0] : '2026';
}

export function buildArticleCitationMap(
  article: Pick<
    BlogPost,
    'id' | 'slug' | 'title' | 'author' | 'publishedAt' | 'reviewedArtifact'
  >,
): Record<string, CitationSource> {
  const year = extractYear(article.publishedAt);
  const canonicalDoi = `10.5555/rwm.${article.id}`;
  const selfSource: CitationSource = {
    title: article.title,
    author: article.author.name,
    year,
    journal: 'ResearchWithMe',
    doi: canonicalDoi,
    url: `https://researchwith.me/post/${article.slug}`,
  };

  const map: Record<string, CitationSource> = {
    rwm: selfSource,
    [canonicalDoi]: selfSource,
    [canonicalDoi.toLowerCase()]: selfSource,
  };

  if (article.reviewedArtifact) {
    const artifact = article.reviewedArtifact;
    const artifactSource: CitationSource = {
      title: artifact.title,
      author: article.author.name,
      year,
      journal: artifact.meta || 'Primary Artifact',
      doi: artifact.identifier,
      url: artifact.url,
    };
    map['1'] = artifactSource;
    map[artifact.identifier] = artifactSource;
    map[artifact.identifier.toLowerCase()] = artifactSource;
  } else {
    map['1'] = selfSource;
  }

  return map;
}

function lookupCitation(
  core: string,
  citations: Record<string, CitationSource>,
): CitationSource | undefined {
  if (/^\[\d+\]$/.test(core)) {
    const num = core.slice(1, -1);
    return citations[num] ?? citations[core];
  }
  return citations[core] ?? citations[core.toLowerCase()];
}

export function renderWithInlineCitations(
  text: string,
  citations: Record<string, CitationSource>,
  citeHref?: string,
): ReactNode {
  if (!text || Object.keys(citations).length === 0) return text;

  const parts = text.split(CITATION_TOKEN_PATTERN);
  if (parts.length === 1) return text;

  const nodes: ReactNode[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (!part) continue;

    // Odd indices are regex capture groups.
    if (index % 2 === 1) {
      const trailingMatch = part.match(/[.,;)]+$/);
      const trailing = trailingMatch ? trailingMatch[0] : '';
      const core = trailing ? part.slice(0, -trailing.length) : part;
      const source = lookupCitation(core, citations);

      if (source) {
        nodes.push(
          createElement(
            Fragment,
            { key: `cite-${index}-${core}` },
            createElement(InlineCitationPopover, {
              label: core,
              source,
              citeHref,
            }),
            trailing,
          ),
        );
        continue;
      }
    }

    nodes.push(part);
  }

  return nodes;
}
