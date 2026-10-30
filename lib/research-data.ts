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

export const PUBLICATIONS_DATA: Publication[] = [
  {
    id: 'rwm-2026-001',
    slug: 'the-long-view-on-open-infrastructure',
    title: 'The Long View on Open Infrastructure: Sustaining Public Digital Utilities Beyond Launch Grants',
    subtitle: 'An empirical analysis of 420 open-source scientific tools and their longitudinal survival rates',
    authors: [
      {
        name: 'Dr. Elena Rostova',
        affiliation: 'Institute for Digital Public Goods, Zurich',
        orcid: '0000-0002-1825-0097',
        role: 'Lead Author',
      },
      {
        name: 'Kasper Lindqvist',
        affiliation: 'Nordic Open Research Network',
        orcid: '0000-0003-8812-4019',
        role: 'Contributing Researcher',
      },
    ],
    abstract: 'Digital public research infrastructure runs into the same problem everywhere: grants pay for building a tool and rarely for the security audits, dependency upkeep, and archiving that keep it alive. Tracking 420 academic software tools funded between 2018 and 2024, this study identifies structural failure modes and models three viable multi-institution endowment covenants.',
    publishedDate: 'October 14, 2026',
    year: 2026,
    doi: '10.5555/rwm.2026.1042',
    journal: 'Journal of Research With Me Studies',
    volume: 'Vol. 8',
    issue: 'Issue 3',
    pages: '112–138',
    topic: 'Open Infrastructure',
    citationCount: 42,
    readTime: '16 min read',
    keywords: ['Digital Commons', 'Grant Architecture', 'Sustainability', 'Scientific Software', 'Public Goods'],
    license: 'CC BY 4.0 International Open Access',
    pdfFileName: 'rwm-2026-open-infrastructure.pdf',
    dataUrl: 'https://doi.org/10.5555/rwm-data-2026-1042',
    fullContent: {
      background: 'Scientific progress increasingly depends on software pipelines, open-source libraries, and data repositories that are built on single-year research grants. Once the primary grant expires, maintenance responsibilities fall upon graduate researchers or unpaid maintainers, leading to severe bitrot and security vulnerabilities in critical research pipelines.',
      methodology: 'We assembled a retrospective cohort of 420 open-source scientific software packages indexed in Zenodo, GitHub, and institutional archives funded by public agencies. We monitored commit velocity, dependency CVE resolution time, community responsiveness, and institutional host agreements over a six-year observation window.',
      findings: [
        '68% of grant-funded scientific software tools showed zero active commits within 18 months of award closeout.',
        'Tools supported by shared consortium pledges exhibited a 4.2x higher rate of critical patch resolution than single-lab repositories.',
        'Overhead allocation policies in 74% of research universities explicitly prevent direct grant expenditure on continuous cloud hosting and automated test matrices after grant expiry.',
        'Decentralized preservation covenants reduced infrastructure downtime by 81% across distributed high-energy physics pipelines.',
      ],
      discussion: 'Funding agencies should stop treating a tool as finished when the grant closes. We propose a statutory 15% endowment holdback for maintenance after the grant ends.',
      implications: 'University procurement offices and research funders can adopt our open stewardship covenant template to safeguard reproducibility across decades of computational scholarship.',
      references: [
        'Eghbal, N. (2020). Working in Public: The Making and Maintenance of Open Source Software. Stripe Press.',
        'Bietz, M. J., et al. (2022). Synergizing Cyberinfrastructure: Collective Action in Scientific Software Ecosystems. Journal of Computer-Supported Cooperative Work.',
        'Smith, A. M., et al. (2018). Software Citation Principles. PeerJ Computer Science, 2, e86.',
      ],
    },
  },
  {
    id: 'rwm-2026-002',
    slug: 'autonomous-verification-peer-review',
    title: 'Autonomous Verification Protocols in Computational Peer Review: Eliminating Opaque Replication Gaps',
    subtitle: 'Containerized execution environments and automated proof validation in live journal workflows',
    authors: [
      {
        name: 'Prof. Marcus Vance',
        affiliation: 'Center for Algorithmic Reliability, Cambridge',
        orcid: '0000-0001-9234-8812',
        role: 'Lead Author',
      },
      {
        name: 'Dr. Sarah Al-Mansoor',
        affiliation: 'Turing Institute for Verifiable Science',
        orcid: '0000-0002-3901-7722',
        role: 'Co-Author',
      },
    ],
    abstract: 'Traditional peer review evaluates scholarly manuscripts through narrative inspection, rarely executing the underlying code or verifying statistical derivations against raw inputs. We present an autonomous containerized verification engine implemented across 300 test submissions, revealing that automated environment reconstitution uncovers silent computational discrepancies in 34.6% of papers prior to reviewer assignment.',
    publishedDate: 'September 28, 2026',
    year: 2026,
    doi: '10.5555/rwm.2026.0915',
    journal: 'Journal of Research With Me Studies',
    volume: 'Vol. 8',
    issue: 'Issue 3',
    pages: '74–98',
    topic: 'AI & Systems',
    citationCount: 68,
    readTime: '14 min read',
    keywords: ['Peer Review', 'Reproducibility', 'Automated Verification', 'Containerized Science', 'Docker/Wasm'],
    license: 'CC BY 4.0 International Open Access',
    pdfFileName: 'rwm-2026-autonomous-verification.pdf',
    dataUrl: 'https://doi.org/10.5555/rwm-data-2026-0915',
    fullContent: {
      background: 'The replication crisis has revealed that narrative peer review cannot detect unstated random seed biases, operating system floating-point variations, or unpinned dependency mutations in computational biology and machine learning.',
      methodology: 'We created deterministic sandbox runners using isolated WebAssembly and OCI container profiles. Every empirical submission was run through identical hardware profiles to verify whether reported tables, figures, and statistical p-values could be deterministically synthesized from provided scripts.',
      findings: [
        'Out of 300 candidate computational papers, 104 contained at least one unreproducible figure or divergent confidence interval on clean execution.',
        'Automated dependency freezing reduced initial reviewer review latency by an average of 19 days.',
        'Human reviewers who were provided automated reproducibility telemetry gave 40% more detailed methodological critique on theoretical assumptions rather than debugging broken code.',
      ],
      discussion: 'Automated checks do not replace reviewers. They take over the pass-or-fail execution checks so reviewers can spend their time on whether the method makes sense.',
      implications: 'Scientific preprint servers and journals can integrate automated sandbox checks to ensure only fully reproducible research advances to editorial boards.',
      references: [
        'Baker, M. (2016). 1,500 scientists lift the lid on reproducibility. Nature, 533(7604), 452-454.',
        'Peng, R. D. (2011). Reproducible research in computational science. Science, 334(6060), 1226-1227.',
      ],
    },
  },
  {
    id: 'rwm-2026-003',
    slug: 'open-sensor-mesh-climate-telemetry',
    title: 'Decentralized Open Sensor Meshes for Microclimate Telemetry: High-Resolution Data Sovereignty',
    subtitle: 'Deploying low-cost LoRaWAN environmental observatories across under-instrumented river basins',
    authors: [
      {
        name: 'Dr. Ananya Sen',
        affiliation: 'South Asian Climate Research Consortium',
        orcid: '0000-0003-4412-9908',
        role: 'Lead Author',
      },
      {
        name: 'Devraj Mukherjee',
        affiliation: 'Bengal Geospatial Institute',
        orcid: '0000-0001-5099-2314',
        role: 'Field Lead',
      },
      {
        name: 'Maria Torres',
        affiliation: 'Amazonian Watershed Observatory',
        orcid: '0000-0002-8871-3341',
        role: 'Data Architect',
      },
    ],
    abstract: 'Coarse satellite observations frequently miss hyper-local heat island dynamics and micro-watershed drought surges that dictate agricultural resilience. We document a two-year deployment of 1,200 open-hardware LoRaWAN sensing nodes broadcasting unencrypted, cryptographically attested hydrological data directly into public commons networks.',
    publishedDate: 'August 19, 2026',
    year: 2026,
    doi: '10.5555/rwm.2026.0819',
    journal: 'Journal of Research With Me Studies',
    volume: 'Vol. 8',
    issue: 'Issue 2',
    pages: '210–235',
    topic: 'Climate & Policy',
    citationCount: 31,
    readTime: '18 min read',
    keywords: ['Climate Sensing', 'LoRaWAN', 'Open Hardware', 'Hydrology', 'Data Sovereignty'],
    license: 'CC BY 4.0 International Open Access',
    pdfFileName: 'rwm-2026-open-sensor-mesh.pdf',
    dataUrl: 'https://doi.org/10.5555/rwm-data-2026-0819',
    fullContent: {
      background: 'Climate adaptation policy often relies on 25km-resolution gridded climate models that obscure street-level and tributary-level thermal variations. Furthermore, proprietary sensor networks lock municipal data behind closed subscription dashboards.',
      methodology: 'Solar-powered microcontroller nodes equipped with calibrated particulate, soil moisture, and ambient temperature probes were deployed across 40 agrarian communities. Telemetry was relayed over public community gateways without intermediate proprietary SaaS vendors.',
      findings: [
        'Local temperature variations of up to 6.8°C were observed across adjacent farm plots that regional models treated as homogeneous.',
        'Hardware unit cost was reduced from $2,400 for commercial weather stations to $115 per open node with equivalent drift metrics over 24 months.',
        'Immediate community access to raw river height data permitted early flood evacuations 4.5 hours ahead of national centralized warnings.',
      ],
      discussion: 'Open telemetry lets local authorities act on their own measurements and keeps the raw ecological data in public hands.',
      implications: 'Municipalities can deploy cost-effective open hardware mesh grids to fulfill climate adaptation mandates without recurring SaaS license burdens.',
      references: [
        'Oost, K., et al. (2023). Low-cost IoT sensors for environmental monitoring. Hydrological Processes.',
        'Wilkinson, M. D., et al. (2016). The FAIR Guiding Principles for scientific data management. Scientific Data.',
      ],
    },
  },
  {
    id: 'rwm-2026-004',
    slug: 'diamond-open-access-publishing-economics',
    title: 'The Economic Viability of Diamond Open Access: Institutional Consortia vs Article Processing Charges',
    subtitle: 'Cost modeling of 150 community-owned journals operating without author-facing fees',
    authors: [
      {
        name: 'Dr. Thabo Khumalo',
        affiliation: 'African Open Science Platform',
        orcid: '0000-0002-7718-2041',
        role: 'Lead Author',
      },
      {
        name: 'Claire Dupont',
        affiliation: 'Université de Lyon & Coalition S',
        orcid: '0000-0002-6119-8451',
        role: 'Economic Modeler',
      },
    ],
    abstract: 'Article Processing Charges (APCs) have exacerbated global academic inequities by shifting paywalls from readers to authors, systematically marginalizing scholars in the Global South. This paper analyses audit records from 150 Diamond Open Access journals and finds that library consortia can cover publication costs at an average of $210 per article, 88% below commercial APCs.',
    publishedDate: 'July 11, 2026',
    year: 2026,
    doi: '10.5555/rwm.2026.0711',
    journal: 'Journal of Research With Me Studies',
    volume: 'Vol. 8',
    issue: 'Issue 2',
    pages: '145–172',
    topic: 'Scholarly Tech',
    citationCount: 89,
    readTime: '15 min read',
    keywords: ['Diamond OA', 'Publishing Economics', 'APC Crisis', 'Library Consortia', 'Equity'],
    license: 'CC BY 4.0 International Open Access',
    pdfFileName: 'rwm-2026-diamond-open-access.pdf',
    dataUrl: 'https://doi.org/10.5555/rwm-data-2026-0711',
    fullContent: {
      background: 'Commercial publishers charge between $2,500 and $11,000 per article for Open Access status. This commercial model excludes researchers from lower-income countries and independent laboratories while redirecting taxpayer research budgets into commercial shareholder dividends.',
      methodology: 'We audited balance sheets, editorial volunteer hours, typesetting software licenses, server hosting costs, and DOI registration fees across 150 Diamond OA periodicals in humanities, social sciences, and STEM from 2020 through 2025.',
      findings: [
        'Real production costs for digital-first scholarly articles average $210 when using modern headless publishing pipelines like ReMe.',
        '84% of surveyed Diamond journals maintained citation impact factors equal to or exceeding quartile-1 commercial rivals in their disciplinary categories.',
        'Collective funding mechanisms funded by library consortium memberships generated a 100% budget surplus while abolishing all author submission charges.',
      ],
      discussion: 'Universities already hold the money needed to fund diamond publishing. What stands in the way is legacy subscription contracts that absorb their procurement budgets.',
      implications: 'University libraries can safely divert 10% of their subscription allocations to fully endow self-sustaining Diamond Open Access journals.',
      references: [
        'Becerril-García, A., et al. (2021). AmeliCA vs Plan S: Same destination, different paths. Scholarly Commons.',
        'Suber, P. (2012). Open Access. MIT Press.',
      ],
    },
  },
  {
    id: 'rwm-2026-005',
    slug: 'provenance-graphs-in-data-commons',
    title: 'Cryptographic Provenance Graphs in Scientific Data Commons: Preventing Silent Upstream Corruption',
    subtitle: 'Tamper-evident lineage trails for longitudinal genomics and high-throughput physical simulations',
    authors: [
      {
        name: 'Dr. Hiroshi Tanaka',
        affiliation: 'Kyoto Computational Biology Laboratory',
        orcid: '0000-0003-1102-4590',
        role: 'Lead Author',
      },
      {
        name: 'Prof. Marcus Vance',
        affiliation: 'Center for Algorithmic Reliability, Cambridge',
        orcid: '0000-0001-9234-8812',
        role: 'Co-Author',
      },
    ],
    abstract: 'Modern multi-stage research workflows ingest upstream datasets without cryptographically verifying whether source files have been silently modified, corrupted in transit, or overwritten by unversioned pipelines. We introduce a lightweight Merkle-DAG provenance tracking standard that embeds signed transformation graphs directly into raw scientific file headers.',
    publishedDate: 'June 03, 2026',
    year: 2026,
    doi: '10.5555/rwm.2026.0603',
    journal: 'Journal of Research With Me Studies',
    volume: 'Vol. 8',
    issue: 'Issue 1',
    pages: '45–69',
    topic: 'Data Commons',
    citationCount: 54,
    readTime: '13 min read',
    keywords: ['Provenance', 'Data Integrity', 'Merkle Trees', 'Genomics', 'Reproducibility'],
    license: 'CC BY 4.0 International Open Access',
    pdfFileName: 'rwm-2026-data-provenance-graphs.pdf',
    dataUrl: 'https://doi.org/10.5555/rwm-data-2026-0603',
    fullContent: {
      background: 'In genomics and physical climate simulations, intermediate data files are re-processed through multiple third-party clusters over months. File renaming and silent storage corruption often remain undetectable until conclusions are published.',
      methodology: 'We created an open-source provenance specification that generates content-addressed hashes at every transform step, linking input data, container execution digest, and output artifacts into an immutable graph.',
      findings: [
        'In a benchmark of 50 multi-stage bioinformatic pipelines, our provenance validator intercepted 17 instances of silent upstream data changes that would have led to false positive gene associations.',
        'Header serialization overhead was less than 0.04% of total dataset volume.',
        'Replication time for downstream researchers dropped from 3.2 weeks to 40 minutes due to explicit container digest references.',
      ],
      discussion: 'Lineage has to be verifiable from the file itself, not a note in a README, before a computational result can be trusted.',
      implications: 'Repositories like Dryad, Zenodo, and Figshare can automatically parse provenance graphs to generate interactive lineage explorers.',
      references: [
        'Moreau, L., et al. (2011). The Open Provenance Model core specification (v1.1). Future Generation Computer Systems.',
        'Benet, J. (2014). IPFS - Content Addressed, Versioned, P2P File System. arXiv:1407.3561.',
      ],
    },
  },
  {
    id: 'rwm-2026-006',
    slug: 'model-context-protocol-for-academic-literature',
    title: 'Standardizing Academic Literature via Model Context Protocol (MCP): Enabling Grounded Machine Synthesis',
    subtitle: 'Structuring scholarly corpuses for zero-hallucination research agents and peer review assistants',
    authors: [
      {
        name: 'Dr. Elena Rostova',
        affiliation: 'Institute for Digital Public Goods, Zurich',
        orcid: '0000-0002-1825-0097',
        role: 'Co-Author',
      },
      {
        name: 'Prof. Marcus Vance',
        affiliation: 'Center for Algorithmic Reliability, Cambridge',
        orcid: '0000-0001-9234-8812',
        role: 'Lead Author',
      },
    ],
    abstract: 'LLMs deployed for scientific literature reviews suffer from citation hallucinations, stale pretraining cutoffs, and inability to inspect raw tabular findings. This paper introduces the official ResearchWithMe MCP specification, exposing journal articles, methodology schemas, and reviewer reports as structured RPC abilities.',
    publishedDate: 'May 18, 2026',
    year: 2026,
    doi: '10.5555/rwm.2026.0518',
    journal: 'Journal of Research With Me Studies',
    volume: 'Vol. 8',
    issue: 'Issue 1',
    pages: '12–38',
    topic: 'Scholarly Tech',
    citationCount: 76,
    readTime: '17 min read',
    keywords: ['MCP', 'Model Context Protocol', 'Scientific Agents', 'Citation Grounding', 'RWM Protocol'],
    license: 'CC BY 4.0 International Open Access',
    pdfFileName: 'rwm-2026-mcp-academic-literature.pdf',
    dataUrl: 'https://doi.org/10.5555/rwm-data-2026-0518',
    fullContent: {
      background: 'As researchers turn to AI tools for literature synthesis, commercial black-box models invent non-existent papers, confuse experimental correlations with causality, and fail to provide exact paragraph-level citations.',
      methodology: 'We created an MCP server plugin integrated directly into the ResearchWithMe theme (`rwm-mcp-server`), exposing resources (`publications://{doi}`), prompts (`peer_review_check`), and tools (`query_evidence_table`, `verify_citation_existence`).',
      findings: [
        'AI agents operating over the RWM MCP protocol achieved 100% citation grounding with zero phantom author or date hallucinations.',
        'Cross-article synthesis queries achieved 3.8x faster extraction of quantitative results compared to traditional PDF text scraping.',
        'Reviewers utilized MCP-powered verification tools to validate mathematical derivations against referenced foundational theorems in real time.',
      ],
      discussion: 'MCP turns a journal from a set of static pages into something a machine can query directly.',
      implications: 'Scholarly archives can deploy MCP servers to allow responsible, authenticated AI research assistants to summarize papers without violating copyright or hallucinating results.',
      references: [
        'Anthropic. (2024). Model Context Protocol Specification. ModelContextProtocol.io.',
        'Vaswani, A., et al. (2017). Attention Is All You Need. NeurIPS 2017.',
      ],
    },
  },
];

export const PDF_EDITIONS_DATA: PdfEdition[] = [
  {
    id: 'vol-8-issue-3',
    title: 'Special Edition: Sustaining Digital Research Infrastructure',
    period: 'Quarter 3, 2026',
    volume: 'Volume 8',
    issue: 'Issue 3',
    publicationDate: 'October 2026',
    articleCount: 18,
    pages: 248,
    editor: 'Dr. Elena Rostova',
    theme: 'Longitudinal governance, open source sustainability covenants, and automated reproducibility.',
    description: 'This special curated issue brings together six months of empirical investigation into the long-term survival of academic open-source tools, automated containerized peer review protocols, and decentralized institutional agreements.',
    coverImage: '/images/folio-hero.jpeg',
    featuredArticleIds: ['rwm-2026-001', 'rwm-2026-002'],
  },
  {
    id: 'vol-8-issue-2',
    title: 'Decentralized Sensing & Diamond Publishing Economics',
    period: 'Quarter 2, 2026',
    volume: 'Volume 8',
    issue: 'Issue 2',
    publicationDate: 'July 2026',
    articleCount: 22,
    pages: 312,
    editor: 'Dr. Thabo Khumalo & Dr. Ananya Sen',
    theme: 'Grassroots environmental telemetry networks and non-commercial institutional journal economics.',
    description: 'Featuring the landmark financial audit of 150 Diamond Open Access periodicals alongside real-world deployments of low-cost open hardware river basin monitoring grids across South Asia and the Amazon.',
    coverImage: '/images/folio-dashboard.jpeg',
    featuredArticleIds: ['rwm-2026-003', 'rwm-2026-004'],
  },
  {
    id: 'vol-8-issue-1',
    title: 'Verifiable Data Commons & Machine Intelligence Protocols',
    period: 'Quarter 1, 2026',
    volume: 'Volume 8',
    issue: 'Issue 1',
    publicationDate: 'April 2026',
    articleCount: 16,
    pages: 216,
    editor: 'Prof. Marcus Vance',
    theme: 'Tamper-evident data lineage, cryptographic hashes, and the Model Context Protocol (MCP) in scholarship.',
    description: 'Exploring the intersection of verifiable data science pipelines and structured AI assistant interactions, setting the architectural blueprint for next-generation open knowledge commons.',
    coverImage: '/images/folio-code.jpeg',
    featuredArticleIds: ['rwm-2026-005', 'rwm-2026-006'],
  },
  {
    id: 'compendium-2025',
    title: 'ResearchWithMe Annual Compendium: The Open Knowledge Ledger',
    period: 'Annual 2025',
    volume: 'Volume 7',
    issue: 'Special Compendium',
    publicationDate: 'December 2025',
    articleCount: 48,
    pages: 680,
    editor: 'Editorial Collective',
    theme: 'A complete retrospective of foundational research in independent publishing and public data.',
    description: 'The definitive 2025 volume compiling peer-reviewed papers, investigative research monographs, and field methodology standards released under Creative Commons CC BY 4.0.',
    coverImage: '/images/folio-design.jpeg',
    featuredArticleIds: ['rwm-2026-001', 'rwm-2026-004', 'rwm-2026-005'],
  },
];

export const OVERVIEW_STATS = {
  totalPublications: 142,
  peerReviewedCitations: 4890,
  openDatasets: 38,
  archivedEditions: 12,
  diamondAccessPercent: 100,
  averageReviewDays: 24,
};
