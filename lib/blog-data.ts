export type BlogCategory = 
  | 'Research Reviews'
  | 'GitHub Repo Teardowns'
  | 'STEM & Tech'
  | 'Health & Medicine'
  | 'Sociology & Culture'
  | 'Data & Policy';

export type ArticleFormat = 
  | 'Paper Review'
  | 'Repo Teardown'
  | 'Deep-Dive Essay'
  | 'Field Notes'
  | 'Case Study';

export interface Author {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  role: string;
  domain: string;
  institution?: string;
  orcid?: string;
  github?: string;
  twitter?: string;
  website?: string;
  scholar?: string;
  verifiedVia: 'orcid' | 'github' | 'institution';
  verifiedIdentifier: string;
  verifiedTitle: string;
  joinedDate: string;
  articleCount: number;
  totalReads?: string;
}

export interface ReviewedArtifact {
  type: 'paper' | 'github' | 'dataset';
  title: string;
  url: string;
  identifier: string; // e.g. "vllm-project/vllm" or "arXiv:2501.12948"
  meta: string; // e.g. "44.8k Stars · Apache-2.0" or "Published Jan 2026 · Nature"
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: BlogCategory;
  format: ArticleFormat;
  author: Author;
  publishedAt: string;
  readTime: string;
  coverImage: string;
  featured: boolean;
  reviewedArtifact?: ReviewedArtifact;
  summary: string;
  content: string[]; // Plain-text paragraphs (fallback for legacy articles)
  /** Markdown source for CMS-authored articles; rendered by MarkdownBody. */
  bodyMarkdown?: string;
  /** ISO publication date for <time dateTime> and structured data. */
  dateISO?: string;
  keyTakeaways: string[];
  tags: string[];
  likes: number;
  commentsCount: number;
}

export const CATEGORIES: BlogCategory[] = [
  'Research Reviews',
  'GitHub Repo Teardowns',
  'STEM & Tech',
  'Health & Medicine',
  'Sociology & Culture',
  'Data & Policy',
];

export { categoryToSlug, slugToCategory, CATEGORY_SLUGS, SLUG_TO_CATEGORY } from './categories';

export const AUTHORS: Record<string, Author> = {
  'marcus-vance': {
    id: 'marcus-vance',
    name: 'Prof. Marcus Vance',
    avatar: 'MV',
    role: 'AI Systems & Verification Fellow',
    domain: 'Computer Science, LLM Reasoning & Distributed ML',
    institution: 'University of Cambridge, Computer Laboratory',
    orcid: '0000-0001-9234-8812',
    github: 'https://github.com/vance-cam',
    twitter: 'https://x.com/vance_ai',
    scholar: 'https://scholar.google.com',
    verifiedVia: 'orcid',
    verifiedIdentifier: '0000-0001-9234-8812',
    verifiedTitle: 'ORCID Verified Researcher',
    joinedDate: 'March 2024',
    totalReads: '48.2k',
    bio: 'Researches autonomous verification protocols, mathematical reasoning models, and neural architecture efficiency. Leads verification benchmarks for open-weights foundational models.',
    articleCount: 14,
  },
  'maya-lin': {
    id: 'maya-lin',
    name: 'Maya Lin',
    avatar: 'ML',
    role: 'Staff Infrastructure Architect',
    domain: 'Cloud Infrastructure, High-Throughput Inference & Linux Internals',
    institution: 'Independent Distributed Systems Lab',
    github: 'https://github.com/mayalin-sys',
    twitter: 'https://x.com/mayalin_hpc',
    website: 'https://mayalin.dev',
    verifiedVia: 'github',
    verifiedIdentifier: '@mayalin-sys (GitHub Public Key Attested)',
    verifiedTitle: 'GitHub Verified Systems Maintainer',
    joinedDate: 'January 2025',
    totalReads: '64.9k',
    bio: 'Writing code for high-throughput distributed systems. Deconstructs open-source database engines, CUDA memory management, and GPU inference kernels.',
    articleCount: 19,
  },
  'sarah-chen': {
    id: 'sarah-chen',
    name: 'Dr. Sarah Chen, MD',
    avatar: 'SC',
    role: 'Clinical Epidemiologist & Physician',
    domain: 'Preventive Medicine, Metabolic Health & Trial Methodology',
    institution: 'Johns Hopkins Bloomberg School of Public Health',
    orcid: '0000-0003-8120-4491',
    twitter: 'https://x.com/dr_sarahchen',
    verifiedVia: 'institution',
    verifiedIdentifier: 'schen@jhu.edu (Institutional Faculty Verified)',
    verifiedTitle: 'Institutional Medical Faculty Verified',
    joinedDate: 'August 2024',
    totalReads: '39.4k',
    bio: 'Translating double-blind randomized clinical trial registries into actionable physiological insights without pharmaceutical industry hype or wellness sensationalism.',
    articleCount: 11,
  },
  'julian-ross': {
    id: 'julian-ross',
    name: 'Julian Ross',
    avatar: 'JR',
    role: 'Sociologist of Technology',
    domain: 'Platform Governance, Digital Labor & Urban Infrastructure',
    institution: 'Berkman Klein Center for Internet & Society',
    orcid: '0000-0002-4019-9812',
    github: 'https://github.com/julianross',
    twitter: 'https://x.com/julian_ross',
    verifiedVia: 'institution',
    verifiedIdentifier: 'jross@cyber.harvard.edu',
    verifiedTitle: 'Institutional Academic Verified',
    joinedDate: 'June 2024',
    totalReads: '52.1k',
    bio: 'Investigates the second-order cultural, psychological, and economic consequences of algorithmic curation, remote work dynamics, and decentralized social protocols.',
    articleCount: 16,
  },
  'elena-rostova': {
    id: 'elena-rostova',
    name: 'Dr. Elena Rostova',
    avatar: 'ER',
    role: 'Open Science Economist',
    domain: 'Knowledge Commons, Public Funding & Research Policy',
    institution: 'Institute for Digital Public Goods, Zurich',
    orcid: '0000-0002-1825-0097',
    github: 'https://github.com/erostova',
    twitter: 'https://x.com/elena_rostova',
    verifiedVia: 'orcid',
    verifiedIdentifier: '0000-0002-1825-0097',
    verifiedTitle: 'ORCID Verified Scholar',
    joinedDate: 'November 2023',
    totalReads: '78.5k',
    bio: 'Studies the structural incentives behind commercial academic publishing, open data longevity, and public utility covenants. Advises national science foundations on diamond open access.',
    articleCount: 22,
  },
  'hiroshi-tanaka': {
    id: 'hiroshi-tanaka',
    name: 'Dr. Hiroshi Tanaka',
    avatar: 'HT',
    role: 'Molecular Geneticist & Bioinformatician',
    domain: 'Synthetic Biology, CRISPR Kinetics & Genomics',
    institution: 'Kyoto University, Department of Synthetic Biology',
    orcid: '0000-0003-1102-4590',
    github: 'https://github.com/htanaka-crispr',
    verifiedVia: 'orcid',
    verifiedIdentifier: '0000-0003-1102-4590',
    verifiedTitle: 'ORCID Verified Genomicist',
    joinedDate: 'April 2025',
    totalReads: '27.8k',
    bio: 'Specializes in computational genomic alignment, compact RNA-guided endonuclease engineering, and in vivo gene therapy delivery vectors.',
    articleCount: 8,
  },
};

export const INITIAL_BLOG_POSTS: BlogPost[] = [
  {
    id: 'post-1',
    slug: 'inside-vllm-and-paged-attention',
    title: 'Inside vLLM & PagedAttention: Why Memory Fragmentation Was Killing LLM Serving',
    subtitle: 'A deep architectural code teardown of how virtual memory paging concepts solved KV cache bloat in high-concurrency model servers.',
    category: 'GitHub Repo Teardowns',
    format: 'Repo Teardown',
    author: AUTHORS['maya-lin'],
    publishedAt: 'October 22, 2026',
    readTime: '9 min read',
    coverImage: '/images/folio-code.jpeg',
    featured: true,
    reviewedArtifact: {
      type: 'github',
      title: 'vLLM: Easy, fast, and cheap LLM serving with PagedAttention',
      url: 'https://github.com/vllm-project/vllm',
      identifier: 'vllm-project/vllm',
      meta: '44.8k Stars · Python / C++ · Apache-2.0',
    },
    summary: 'Before vLLM, serving transformers at scale suffered from up to 80% wasted GPU VRAM due to sequential pre-allocation of the KV cache. By adopting classic operating system paging algorithms into custom CUDA kernels, vLLM increased server throughput by 2.5x to 4x.',
    content: [
      'In traditional transformer inference servers, when a user prompt arrived, the model server had to pre-allocate a contiguous memory block for the key-value (KV) cache sized to the maximum possible sequence length (say, 4,096 or 8,192 tokens). If the user asked a 50-token question and received a 200-token answer, 95% of that pre-allocated GPU VRAM sat idle, yet unavailable to concurrent requests.',
      'This issue, known in operating system theory as internal and external fragmentation, was the single largest constraint on batch size and concurrency in production LLM deployments.',
      'The genius of the vLLM project (developed originally at UC Berkeley) was realizing that the KV cache doesn\'t need to reside in contiguous physical VRAM. Just as 1960s operating systems introduced virtual memory and page tables to map fragmented physical DRAM pages into a coherent virtual address space, PagedAttention breaks the KV cache into fixed-size "blocks" (typically 16 tokens each).',
      'When you inspect `csrc/attention/attention_kernels.cu` in the repository, you see how custom CUDA threads map logical sequence tokens to non-contiguous physical page slots on the fly with near-zero latency penalty.',
      'In our test clusters running Llama 3 70B across 4x A100 SXM GPUs, swapping standard Hugging Face pipeline serving for vLLM immediately increased throughput from 38 req/s to 124 req/s under bursty Poisson arrival distributions.',
    ],
    keyTakeaways: [
      'Pre-allocating contiguous KV cache blocks wastes up to 60-80% of scarce GPU memory.',
      'PagedAttention maps logical tokens to 16-token non-contiguous physical memory blocks with minimal lookup overhead.',
      'Dynamic memory allocation enables near-optimal batch scheduling, reducing prompt queue latency by up to 73%.',
    ],
    tags: ['CUDA', 'vLLM', 'GPU Inference', 'Systems Engineering', 'Performance'],
    likes: 342,
    commentsCount: 28,
  },
  {
    id: 'post-2',
    slug: 'deconstructing-deepseek-r1-reasoning-without-sft',
    title: 'Deconstructing DeepSeek-R1: How Pure RL Unlocked Emergent Chain-of-Thought',
    subtitle: 'Reviewing the breakthrough paper on incentivizing complex multi-step reasoning directly from rule-based reward signals.',
    category: 'Research Reviews',
    format: 'Paper Review',
    author: AUTHORS['marcus-vance'],
    publishedAt: 'October 19, 2026',
    readTime: '12 min read',
    coverImage: '/images/folio-hero.jpeg',
    featured: true,
    reviewedArtifact: {
      type: 'paper',
      title: 'DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning',
      url: 'https://arxiv.org',
      identifier: 'arXiv:2501.12948',
      meta: 'DeepSeek-AI · 32-page technical report',
    },
    summary: 'DeepSeek-R1 demonstrated that massive reasoning capabilities can emerge spontaneously through large-scale Reinforcement Learning directly on a base model, without relying on human-annotated chain-of-thought demonstrations.',
    content: [
      'For years, the prevailing consensus in frontier AI was that models required thousands of meticulously curated, human-written step-by-step reasoning solutions (Supervised Fine-Tuning) before reinforcement learning could refine them. DeepSeek-R1-Zero overturned this hypothesis.',
      'By applying pure Group Relative Policy Optimization (GRPO) to DeepSeek-V3-Base using strictly rule-based rewards (accuracy of mathematical proofs and formatting compliance in XML tags), the base model learned to "think", backtrack, re-check intermediate calculations, and generate self-corrections autonomously.',
      'Watching the training progression is fascinating: at step 50, the model outputs short, confused guesses. By step 800, without any human training examples, the token output length naturally balloons from 400 to 4,200 tokens as the policy discovers that allocating compute to internal reflection dramatically raises reward scores.',
      'The critical bottleneck for researchers looking to replicate R1 is not the RL algorithm itself, but constructing verifiably deterministic reward environments for domains outside formal mathematics and unit-tested programming.',
    ],
    keyTakeaways: [
      'Base models possess latent reasoning patterns that can be unlocked via pure RL without human SFT examples.',
      'The "Aha moment" of self-correction emerges organically when reward signals penalize premature final answers.',
      'Rule-based verification (math compilers and unit tests) avoids the reward hacking common in neural reward models.',
    ],
    tags: ['AI Research', 'Reinforcement Learning', 'DeepSeek', 'Reasoning', 'Open Weights'],
    likes: 519,
    commentsCount: 46,
  },
  {
    id: 'post-3',
    slug: 'glp-1-receptor-agonists-beyond-diabetes',
    title: 'GLP-1 Receptor Agonists Beyond Diabetes: Neuroinflammation, Cardiovascular Outcomes & 2026 Trial Data',
    subtitle: 'Analyzing the landmark clinical trials shifting semaglutide and tirzepatide from weight-loss drugs to broad systemic therapeutics.',
    category: 'Health & Medicine',
    format: 'Deep-Dive Essay',
    author: AUTHORS['sarah-chen'],
    publishedAt: 'October 15, 2026',
    readTime: '11 min read',
    coverImage: '/images/folio-dashboard.jpeg',
    featured: false,
    reviewedArtifact: {
      type: 'paper',
      title: 'Long-term Cardiovascular and Kidney Outcomes in Semaglutide Trials: A Meta-Analysis',
      url: 'https://nejm.org',
      identifier: 'NEJM DOI: 10.1056/NEJMoa2307563',
      meta: '17,604 participants · Double-blind RCT',
    },
    summary: 'The latest cohort data from the SELECT and FLOW clinical trials confirms that GLP-1 and dual GIP/GLP-1 receptor agonists produce substantial cardiovascular and renal protection independent of total kilograms lost.',
    content: [
      'When semaglutide was initially approved for type 2 diabetes and obesity, mainstream commentary framed it primarily as an appetite suppressant that slows gastric emptying. However, physicians and molecular biologists have long observed GLP-1 receptors distributed across cardiac tissue, renal vasculature, and microglia in the central nervous system.',
      'The recent five-year readout of the SELECT trial demonstrated a 20% reduction in major adverse cardiovascular events (MACE) in non-diabetic overweight patients. Crucially, statistical subgroup analysis showed that cardiovascular risk began plummeting within 8 weeks—well before significant adipose tissue loss had materialized.',
      'This suggests a direct anti-inflammatory and endothelial protective mechanism. GLP-1 signaling appears to downregulate pro-inflammatory cytokine expression (TNF-alpha, IL-6) and attenuate microglial priming in neurodegenerative pathways.',
      'Yet severe challenges remain around long-term lean muscle mass retention, gastrointestinal motility tolerance, and equitable global manufacturing supply chains.',
    ],
    keyTakeaways: [
      'Cardiovascular risk reduction occurs before substantial weight loss, pointing to direct endothelial anti-inflammatory action.',
      'Dual GIP/GLP-1 agonists (tirzepatide) show enhanced glycemic and lipid profiles compared to single-target molecules.',
      'Sarcopenia mitigation requires concurrent progressive resistance training and adequate dietary protein intake.',
    ],
    tags: ['Medicine', 'Clinical Trials', 'Pharmacology', 'Cardiology', 'Longevity'],
    likes: 284,
    commentsCount: 31,
  },
  {
    id: 'post-4',
    slug: 'algorithmic-commons-and-at-protocol',
    title: 'The Algorithmic Commons: Why Feed Personalization Fractured Societal Consensus (And What AT Protocol Gets Right)',
    subtitle: 'Examining the sociology of feed algorithms, epistemic isolation, and the architectural case for user-chosen recommendation algorithms.',
    category: 'Sociology & Culture',
    format: 'Deep-Dive Essay',
    author: AUTHORS['julian-ross'],
    publishedAt: 'October 11, 2026',
    readTime: '14 min read',
    coverImage: '/images/folio-process.jpeg',
    featured: false,
    reviewedArtifact: {
      type: 'github',
      title: 'Authenticated Transfer (AT) Protocol Specification',
      url: 'https://github.com/bluesky-social/atproto',
      identifier: 'bluesky-social/atproto',
      meta: 'Open Specification · Decentralized Identity',
    },
    summary: 'When proprietary platforms optimize solely for per-second engagement, the algorithm inevitably selects for moral outrage and in-group tribal policing. Unbundling identity, hosting, and algorithmic curation offers our best escape hatch.',
    content: [
      'Every major social platform of the last decade operated on a monopolistic bundle: the platform owned your identity, hosted your data, managed the social graph, and dictated the exact ranking algorithm that decided what entered your visual field.',
      'Sociologically, this design created a catastrophic incentive trap. Machine learning models discovered that nuanced consensus generates weak dwell time, while cognitive dissonance, high-arousal moral outrage, and tribal boundary defense generate continuous scroll retention.',
      'The Authenticated Transfer (AT) Protocol and ActivityPub demonstrate that we can disentangle this bundle. Under AT Protocol, your identity is a cryptographically signed DID (Decentralized Identifier), your data is stored in personal data servers, and algorithmic feeds are modular plug-ins.',
      'If you want a chronological feed of peer-reviewed biology papers, you subscribe to an open algorithm designed by scientists. If you want a localized neighborhood feed, you choose a community-governed curator.',
    ],
    keyTakeaways: [
      'Monolithic social platforms inherently maximize emotional arousal to drive ad impression inventory.',
      'Unbundling the curation layer from the hosting layer restores user agency over cognitive diet.',
      'Decentralized identity protocols prevent platform lock-in and allow portable audience relationships.',
    ],
    tags: ['Sociology', 'AT Protocol', 'Platform Design', 'Social Media', 'Decentralization'],
    likes: 412,
    commentsCount: 39,
  },
  {
    id: 'post-5',
    slug: 'why-we-migrated-from-k8s-to-nomad-and-bare-metal',
    title: 'Why We Migrated from Kubernetes to Nomad and Bare Metal: A 2-Year Post-Mortem',
    subtitle: 'Real infrastructure numbers: How stripping out K8s YAML complexity and cloud-managed overhead saved $180,000/year with a two-person ops team.',
    category: 'STEM & Tech',
    format: 'Field Notes',
    author: AUTHORS['maya-lin'],
    publishedAt: 'October 08, 2026',
    readTime: '10 min read',
    coverImage: '/images/folio-design.jpeg',
    featured: false,
    reviewedArtifact: {
      type: 'github',
      title: 'Nomad: A Simple and Flexible Workload Orchestrator',
      url: 'https://github.com/hashicorp/nomad',
      identifier: 'hashicorp/nomad',
      meta: '15.6k Stars · Go · MPL-2.0',
    },
    summary: 'Kubernetes is fantastic when you have 500 microservices and a dedicated 20-person platform engineering team. For a team of six developers, the cognitive tax of Helm charts, ingress controllers, and cloud egress bills was draining velocity.',
    content: [
      'Two years ago, our team was managing two EKS clusters with 24 worker nodes, complex Istio service meshes, and thousands of lines of fragile Helm templates. Our monthly AWS bill hovered around $18,500, with over 35% of that cost going toward managed control plane fees, NAT gateway egress, and oversized node pools.',
      'Worse than the monetary cost was the cognitive overhead. When an incident occurred at 2:00 AM, our engineers spent 40 minutes deciphering CNI plugin crashes or CoreDNS loop errors rather than debugging our application code.',
      'We ran a pilot migrating our batch jobs and core API servers to HashiCorp Nomad running on dedicated Hetzner servers (AX102 instances with AMD Ryzen 9 7950X3D CPUs and NVMe storage). Nomad compiles to a single binary, uses straightforward HCL job specs, and orchestrates Docker containers, raw exec binaries, and microVMs uniformly.',
      'The results: Our total monthly infrastructure bill collapsed from $18,500 to $2,900. API response p99 dropped from 68ms to 14ms thanks to bare-metal CPU pinning, and zero developer hours were spent on Kubernetes control plane upgrades.',
    ],
    keyTakeaways: [
      'Managed cloud Kubernetes introduces substantial invisible costs in NAT gateways, cross-AZ traffic, and over-provisioning.',
      'Nomad\'s single-binary architecture radically lowers operational complexity for small engineering teams.',
      'Modern bare-metal servers deliver 3-5x the raw compute and I/O performance of standard cloud vCPUs at a fraction of the price.',
    ],
    tags: ['DevOps', 'Nomad', 'Kubernetes', 'Cloud Costs', 'Architecture'],
    likes: 673,
    commentsCount: 84,
  },
  {
    id: 'post-6',
    slug: 'the-hidden-tax-on-open-science-commercial-apcs',
    title: 'The Hidden Tax on Open Science: Tracking $2.4B in Public Grant Money Flowing to Publisher APCs',
    subtitle: 'Data journalism investigation into how Article Processing Charges became a multi-billion dollar tollgate on taxpayer-funded discoveries.',
    category: 'Data & Policy',
    format: 'Case Study',
    author: AUTHORS['elena-rostova'],
    publishedAt: 'September 29, 2026',
    readTime: '15 min read',
    coverImage: '/images/folio-hero.jpeg',
    featured: false,
    reviewedArtifact: {
      type: 'dataset',
      title: 'Global University APC Expenditure Dataset (2020-2025)',
      url: 'https://zenodo.org',
      identifier: 'Zenodo DOI: 10.5281/zenodo.1084920',
      meta: 'Open Data · 45,000 journal records',
    },
    summary: 'The transition from subscription paywalls to "Author Pays" Open Access has simply inverted the barrier: instead of paywalling readers, commercial giants now charge researchers $3,000 to $11,000 per paper, extracting billions from public science budgets.',
    content: [
      'When the open access movement gained international momentum twenty years ago, the noble vision was clear: every taxpayer on earth should be able to read the scientific research their tax dollars funded.',
      'What few anticipated was how skillfully the oligopoly of commercial academic publishers would hijack that mandate. By introducing Article Processing Charges (APCs), publishers shifted their profit center from library subscription budgets directly into individual researchers\' lab grants.',
      'Our financial audit of 120 global research universities revealed that between 2020 and 2025, over $2.4 billion in direct public grant funds was paid to commercial publishers merely for the privilege of making digital PDFs publicly viewable.',
      'Meanwhile, Diamond Open Access journals—which are community-run, peer-reviewed, and charge neither author nor reader—operate on annual budgets averaging $210 per published paper. Diverting just 8% of institutional library procurement funds could fully subsidize a global Diamond OA network permanently.',
    ],
    keyTakeaways: [
      'Commercial APCs ($3,000-$11,000) reflect profit margins up to 40%, not the real computational cost of digital distribution.',
      'Researchers from lower-income nations are systematically excluded from publishing in prestigious journals due to currency and fee barriers.',
      'Institutional consortia funding Diamond Open Access offers a provably sustainable, equitable alternative.',
    ],
    tags: ['Open Science', 'Economics', 'Academic Publishing', 'Public Policy', 'Data Journalism'],
    likes: 488,
    commentsCount: 52,
  },
  {
    id: 'post-7',
    slug: 'crispr-cas12f-miniaturization-delivery-bottlenecks',
    title: 'CRISPR-Cas12f Miniaturization: How Compact Endonucleases Solve in vivo Gene Editing Delivery',
    subtitle: 'Reviewing recent protein engineering breakthroughs fitting complete CRISPR-Cas machinery inside single AAV viral capsids.',
    category: 'STEM & Tech',
    format: 'Paper Review',
    author: AUTHORS['hiroshi-tanaka'],
    publishedAt: 'September 24, 2026',
    readTime: '8 min read',
    coverImage: '/images/folio-code.jpeg',
    featured: false,
    reviewedArtifact: {
      type: 'paper',
      title: 'Engineered miniature CRISPR-Cas12f for efficient in vivo genome editing',
      url: 'https://nature.com',
      identifier: 'Nature Biotechnology DOI: 10.1038/s41587-024-02189-y',
      meta: 'Peer-reviewed research · Structural Biology',
    },
    summary: 'Standard SpCas9 proteins are bulky (~1,368 amino acids), making it nearly impossible to package both the Cas nuclease, guide RNA, and repair template inside a single Adeno-Associated Virus (AAV) vector. Compact Cas12f (~400-500 aa) is changing that.',
    content: [
      'The primary limiting factor in clinical gene editing today is not cutting precision; it is delivery. The most clinically validated in vivo delivery vehicle is the Adeno-Associated Virus (AAV), but AAV capsids have a strict packaging capacity limit of approximately 4.7 kilobases.',
      'When you attempt to package standard Streptococcus pyogenes Cas9 (~4.2 kb of coding sequence) along with promoter sequences, guide RNA cassettes, and nuclear localization signals, you exceed the packaging threshold, resulting in truncated vectors and drastically reduced delivery efficiency in liver and retinal tissue.',
      'Recent breakthroughs in engineered Cas12f nucleases—derived from uncultivated archaea—have reduced the enzyme size to under 500 amino acids (less than 1.5 kb of DNA), leaving over 3 kb of payload headroom inside a single AAV vector for multi-guide multiplexing and base editor domains.',
      'Through targeted mutagenesis of the REC lobe and RNA-binding interfaces, research teams achieved on-target cleavage rates matching wild-type SpCas9 with dramatically reduced off-target indels in primary human T cells.',
    ],
    keyTakeaways: [
      'AAV viral vectors have a strict 4.7 kb packaging limit that conventional SpCas9 strains exhaust.',
      'Miniature Cas12f (~400-500 aa) frees up over 3 kb of viral payload for regulatory promoters and multiplexed guides.',
      'Engineered variants maintain high cleavage kinetics while exhibiting lower off-target propensity in therapeutic cell lines.',
    ],
    tags: ['Biotechnology', 'CRISPR', 'Genomics', 'Gene Therapy', 'Molecular Biology'],
    likes: 310,
    commentsCount: 19,
  },
  {
    id: 'post-8',
    slug: 'async-first-is-broken-when-meetings-become-slack-anxiety',
    title: 'Async-First Is Broken When Meetings Are Just Replaced by 24/7 Slack Anxiety',
    subtitle: 'Why remote organizations that banned synchronous meetings ended up with fragmented attention, delayed decisions, and cognitive exhaustion.',
    category: 'Sociology & Culture',
    format: 'Deep-Dive Essay',
    author: AUTHORS['julian-ross'],
    publishedAt: 'September 18, 2026',
    readTime: '9 min read',
    coverImage: '/images/folio-dashboard.jpeg',
    featured: false,
    summary: 'Eliminating calendar meetings without establishing clear asynchronous decision protocols didn\'t give workers deep focus—it created an ambient panic of unread Slack threads and ambiguous task ownership.',
    content: [
      'During the remote work revolution, a popular leadership mantra emerged: "Cancel all recurring meetings, move everything to Slack and Notion, and become an async-first company."',
      'Four years later, post-mortems across hundreds of engineering and product organizations reveal a sobering reality: many teams didn\'t actually achieve deep asynchronous focus. They simply replaced a 30-minute structured synchronous meeting with an ongoing, 6-hour fragmented ping-pong debate across 4 different Slack channels.',
      'True asynchronous work requires high-context, single-owner narrative documents (like Amazon 6-pagers or RFC proposals) where a designated decision-maker synthesizes written feedback and makes a clear call. When organizations use chat apps as the primary asynchronous medium, discussions default to whoever responds fastest and loudest.',
      'The healthiest high-output teams don\'t eliminate meetings; they treat synchronous time as a precious, high-bandwidth tool reserved for ambiguous conflict resolution, creative brainstorming, and human connection, while reserving chat for ephemeral logistical handoffs.',
    ],
    keyTakeaways: [
      'Replacing meetings with continuous instant messaging creates ambient distraction rather than deep focus.',
      'Asynchronous communication only succeeds when paired with structured narrative documents and clear decision owners.',
      'High-bandwidth synchronous conversations remain the fastest mechanism for resolving complex interpersonal alignment.',
    ],
    tags: ['Workplace Culture', 'Remote Work', 'Organizational Design', 'Productivity', 'Sociology'],
    likes: 580,
    commentsCount: 63,
  },
];
