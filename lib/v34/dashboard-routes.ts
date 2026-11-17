/**
 * ResearchWithME v3.4 — Part I §26.2 Canonical Dashboard Deep-Link Registry.
 * Ensures every documented `/dashboard/<section>` URL resolves to its canonical
 * information boundary without 404 regressions during MVP tab consolidation.
 */
export const DASHBOARD_SECTION_TARGETS: Record<
  string,
  { destination: string; label: string; description: string }
> = {
  library: {
    destination: '/library',
    label: 'Research Library',
    description: 'Saved sources, tools, datasets, citation collections, and saved searches.',
  },
  projects: {
    destination: '/projects',
    label: 'Research Projects',
    description: 'Active, paused, completed, and archived workspace-governed research projects.',
  },
  contributions: {
    destination: '/feed',
    label: 'Contributions',
    description: 'Draft, under-review, published, and archived scholarly contributions.',
  },
  reviews: {
    destination: '/reviews',
    label: 'Formal Peer Reviews',
    description: 'Requested, assigned, and completed formal peer reviews and rebuttals.',
  },
  sources: {
    destination: '/sources',
    label: 'Canonical Sources',
    description: 'Recent, saved, cited, corrected, and retracted canonical scholarly sources.',
  },
  evidence: {
    destination: '/evidence',
    label: 'Evidence Registry',
    description: 'Source-version-bound evidence units and integrity propagation impacts.',
  },
  claims: {
    destination: '/claims',
    label: 'Structured Claims',
    description: 'Supported, contested, qualifying, and review-required scholarly claims.',
  },
  workspace: {
    destination: '/editor',
    label: 'Scholarly MDX Workspace',
    description: 'Multi-pane scholarly MDX editor sharing canonical ResearchDocument drafts.',
  },
  assistant: {
    destination: '/assistant',
    label: 'Research Assistant',
    description: 'Full-screen research assistant workspace for multi-source synthesis and verification.',
  },
  network: {
    destination: '/topics',
    label: 'Research Network & Topics',
    description: 'Followed topics, research communities, collaborators, and reviewers.',
  },
  reputation: {
    destination: '/research-os#recognition',
    label: 'Event-Derived Recognition',
    description: 'Explainable, non-vanity recognition dimensions derived from verified scholarly events.',
  },
  insights: {
    destination: '/research-os#goals',
    label: 'Research Goals & Insights',
    description: 'Private substantive research goals and honest progress tracking.',
  },
  archive: {
    destination: '/library',
    label: 'Archive & Portable Exports',
    description: 'Archived records, checksummed exports, and recoverable version snapshots.',
  },
  profile: {
    destination: '/profile/myself-aas',
    label: 'Contributor Profile',
    description: 'Scholarly identity, ORCID, institutional affiliations, expertise, and public record.',
  },
  settings: {
    destination: '/settings',
    label: 'Account & Workspace Settings',
    description: 'Preferences, landing destination, devices, portable export, and privacy controls.',
  },
};

export function resolveDashboardSection(section: string): string | null {
  const key = section.trim().toLowerCase();
  return DASHBOARD_SECTION_TARGETS[key]?.destination ?? null;
}
