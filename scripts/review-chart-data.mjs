/** Reproducible chart data and Markdown from retained, pinned Git-tree inventories. */
export const chartStart = '<!-- review-source-map:start -->';
export const chartEnd = '<!-- review-source-map:end -->';

export function validateInventory(inventory) {
  if (!/^[a-f0-9]{40}$/.test(inventory.reviewedCommit)) throw new Error('Inventory needs a pinned commit.');
  const paths = new Set();
  const labels = new Set();
  for (const group of inventory.groups) {
    if (labels.has(group.label)) throw new Error(`Duplicate label: ${group.label}`);
    labels.add(group.label);
    if (group.source.truncated !== false) throw new Error('Truncated trees cannot supply chart counts.');
    if (!group.source.url.includes('/git/trees/')) throw new Error('Expected Git-tree provenance.');
    const include = new RegExp(group.includePattern);
    const exclude = group.excludePattern ? new RegExp(group.excludePattern) : null;
    if (group.count !== group.files.length || !group.count) throw new Error(`Invalid count: ${group.label}`);
    for (const file of group.files) {
      if (!file.path.startsWith(`${group.prefix}/`) || !include.test(file.path) || exclude?.test(file.path)) {
        throw new Error(`Path does not match selector: ${file.path}`);
      }
      if (paths.has(file.path)) throw new Error(`Double-counted path: ${file.path}`);
      if (!/^[a-f0-9]{40}$/.test(file.gitBlobSha)) throw new Error('Invalid blob identifier.');
      paths.add(file.path);
    }
  }
  if (!inventory.groups.length) throw new Error('No chart groups.');
}

export function chartFence(inventory) {
  validateInventory(inventory);
  return [
    '```chart',
    'type: bar',
    'layout: vertical',
    `title: ${inventory.title}`,
    `caption: ${inventory.caption}`,
    'x: Selected root',
    'y: Files',
    'y-scale: linear',
    'series: Matching files',
    'notes: Counts start at zero. No smoothing or animation. File counts are not benchmarks, test coverage, integrations, product quality or a whole-repository share.',
    ...inventory.groups.map((g) => `${g.label}: ${g.count}`),
    '```',
  ].join('\n');
}

export function buildChartSection(inventory) {
  const groups = inventory.groups;
  const sources = [...new Set(groups.map((g) => g.source.url))];
  return [
    chartStart,
    '## Source map: where to inspect next',
    '',
    inventory.interpretation,
    '',
    chartFence(inventory),
    '',
    '**Counting method and text equivalent.** Each value counts tracked Git blob paths under the exact root below, filtered by its include/exclude expression. Matching tests, declarations and generated files remain included unless explicitly excluded. No file contents were executed or benchmarked; submodules are not expanded. This is a deliberately selected reading map, not a complete repository breakdown.',
    '',
    '| Selected root | Matching files | Include / exclude expression |',
    '| --- | ---: | --- |',
    ...groups.map((g) => `| \`${g.prefix}\` | ${g.count} | \`${g.includePattern.replaceAll('|', '\\|')}\`${g.excludePattern ? ` / exclude \`${g.excludePattern.replaceAll('|', '\\|')}\`` : ' / no additional exclusion'} |`),
    '',
    `**Provenance:** commit \`${inventory.reviewedCommit}\`; ${sources.map((url, i) => `[Git tree ${i + 1}](${url})`).join(', ')}. Every counted path, blob identifier and selector is retained in the review's \`chart-inventory.json\` and can be recounted offline. Only complete tree responses are used for these chart groups.`,
    '',
    `**Decision checkpoint.** ${inventory.adoptionCheck}`,
    chartEnd,
  ].join('\n');
}

export function upsertChartSection(draft, inventory) {
  const section = buildChartSection(inventory);
  const start = draft.indexOf(chartStart);
  const end = draft.indexOf(chartEnd);
  if ((start === -1) !== (end === -1)) throw new Error('Incomplete source-map markers.');
  if (start !== -1) return draft.slice(0, start) + section + draft.slice(end + chartEnd.length);
  const anchor = '## What can a reader inspect or reproduce?';
  if (!draft.includes(anchor)) throw new Error('Missing inspection section.');
  // A callback keeps regex end anchors followed by Markdown backticks literal;
  // replacement strings would expand JavaScript's $` substitution token.
  return draft.replace(anchor, () => `${section}\n\n${anchor}`);
}

export function publicChartInventory(inventory) {
  validateInventory(inventory);
  return {
    title: inventory.title,
    reviewedCommit: inventory.reviewedCommit,
    retrievedOn: inventory.retrievedOn,
    unit: inventory.unit,
    method: inventory.method,
    limitation: inventory.limitation,
    groups: inventory.groups.map(({ files: _files, ...group }) => group),
    claim: inventory.claim,
  };
}
