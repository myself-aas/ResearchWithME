export interface Author {
  name: string;
  affiliation: string;
  orcid: string;
  role: string;
}

export interface Publication {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  authors: Author[];
  abstract: string;
  publishedDate: string;
  year: number;
  doi: string;
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  topic: 'Open Infrastructure' | 'AI & Systems' | 'Climate & Policy' | 'Data Commons' | 'Scholarly Tech';
  citationCount: number;
  readTime: string;
  keywords: string[];
  license: string;
  pdfFileName: string;
  dataUrl?: string;
  fullContent: {
    background: string;
    methodology: string;
    findings: string[];
    discussion: string;
    implications: string;
    references: string[];
  };
}

export interface PdfEdition {
  id: string;
  title: string;
  period: string;
  volume: string;
  issue: string;
  publicationDate: string;
  articleCount: number;
  pages: number;
  editor: string;
  theme: string;
  description: string;
  coverImage: string;
  featuredArticleIds: string[];
}

export interface EditorialMember {
  name: string;
  role: string;
  profileSlug: string;
}

export const RESEARCH_TOPICS = [
  'All Fields',
  'Open Infrastructure',
  'AI & Systems',
  'Climate & Policy',
  'Data Commons',
  'Scholarly Tech',
] as const;

/**
 * The single editor. Editorial decisions are made by the Editor-in-Chief.
 * Links to the live author profile at /author/<profileSlug>.
 */
export const EDITOR_IN_CHIEF = {
  name: 'Ashif Ahmed Shuvo',
  role: 'Editor-in-Chief',
  profileSlug: 'myself-aas',
} as const;

// Placeholder archive data removed; the catalogue is CMS-only.
export const PUBLICATIONS_DATA: Publication[] = [];
export const PDF_EDITIONS_DATA: PdfEdition[] = [];
