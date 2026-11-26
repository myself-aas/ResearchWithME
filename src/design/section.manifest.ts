// Intrinsic heights are intentionally not asserted: they require DOM measurement.
// Do not enable content-visibility until per-tier measurements exist.
export const section = [
  { id: 'S1', key: 'hero', slots: [{ key: 'hero.text', primitive: 'prose' }, { key: 'hero.visual', primitive: 'frame' }] },
  { id: 'S2', key: 'writing', emptyKey: 'writing.empty', slots: [{ key: 'writing.lead', primitive: 'card' }, { key: 'writing.list', primitive: 'row' }] },
  { id: 'S3', key: 'topics', emptyKey: 'topics.empty', slots: [{ key: 'topics.first', primitive: 'card' }, { key: 'topics.second', primitive: 'card' }, { key: 'topics.third', primitive: 'card' }] },
  { id: 'S4', key: 'figure', slots: [{ key: 'figure.frame', primitive: 'frame' }, { key: 'figure.notes', primitive: 'prose' }] },
  { id: 'S5', key: 'datasets', emptyKey: 'datasets.empty', slots: [{ key: 'datasets.first', primitive: 'card' }, { key: 'datasets.second', primitive: 'card' }, { key: 'datasets.third', primitive: 'card' }] },
  { id: 'S6', key: 'assistant', emptyKey: 'assistant.empty', slots: [{ key: 'assistant.prompt', primitive: 'prose' }, { key: 'assistant.links', primitive: 'row' }] },
  { id: 'S7', key: 'author', slots: [{ key: 'author.bio', primitive: 'prose' }, { key: 'author.meta', primitive: 'row' }] },
  { id: 'S8', key: 'faq', slots: [{ key: 'faq.body', primitive: 'disclosure' }] },
  { id: 'S9', key: 'dispatch', slots: [{ key: 'dispatch.body', primitive: 'prose' }] },
] as const;
