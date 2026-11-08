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
  institution: string;
  orcid: string;
  focus: string;
  avatarInitials: string;
}

export const RESEARCH_TOPICS = [
  'All Fields',
  'Open Infrastructure',
  'AI & Systems',
  'Climate & Policy',
  'Data Commons',
  'Scholarly Tech',
] as const;

export const EDITORIAL_BOARD: EditorialMember[] = [
  {
    name: 'Dr. Elena Rostova',
    role: 'Editor-in-Chief',
    institution: 'Institute for Digital Public Goods, Zurich',
    orcid: '0000-0002-1825-0097',
    focus: 'Open protocols, peer review integrity, knowledge governance',
    avatarInitials: 'ER',
  },
  {
    name: 'Prof. Marcus Vance',
    role: 'Senior Editor, Systems & Verification',
    institution: 'Center for Algorithmic Reliability, Cambridge',
    orcid: '0000-0001-9234-8812',
    focus: 'Machine learning reproducibility, formal proofs, automated peer auditing',
    avatarInitials: 'MV',
  },
  {
    name: 'Dr. Ananya Sen',
    role: 'Editor, Environmental Commons',
    institution: 'South Asian Climate Research Consortium',
    orcid: '0000-0003-4412-9908',
    focus: 'Empirical telemetry, open sensor networks, geospatial data equity',
    avatarInitials: 'AS',
  },
  {
    name: 'Dr. Thabo Khumalo',
    role: 'Review Editor, Scholarly Communications',
    institution: 'African Open Science Platform',
    orcid: '0000-0002-7718-2041',
    focus: 'Diamond open access, decentralized publication registries, citation tracking',
    avatarInitials: 'TK',
  },
];

export const PUBLICATIONS_DATA: Publication[] = [];

export const PDF_EDITIONS_DATA: PdfEdition[] = [];

export const OVERVIEW_STATS = {
  totalPublications: 142,
  peerReviewedCitations: 4890,
  openDatasets: 38,
  archivedEditions: 12,
  diamondAccessPercent: 100,
  averageReviewDays: 24,
};
