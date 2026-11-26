# Reme v4.1 section composition (generated)

## S1 hero

- hero.text → prose · xs: 1 / md: 2 / lg: 5 / xl: 5 / 2xl: 5
- hero.visual → frame · xs: 1 / md: 2 / lg: 7 / xl: 7 / 2xl: 7

## S2 writing

- writing.lead → card · xs: 1 / md: 2 / lg: 7 / xl: 7 / 2xl: 7
- writing.list → row · xs: 1 / md: 2 / lg: 5 / xl: 5 / 2xl: 5
- Empty: `writing.empty`

## S3 topics

- topics.first → card · xs: 1 / md: 1 / lg: 4 / xl: 4 / 2xl: 4
- topics.second → card · xs: 1 / md: 1 / lg: 4 / xl: 4 / 2xl: 4
- topics.third → card · xs: 1 / md: 2 / lg: 4 / xl: 4 / 2xl: 4
- Empty: `topics.empty`

## S4 figure

- figure.frame → frame · xs: 1 / md: 2 / lg: 6 / xl: 6 / 2xl: 6
- figure.notes → prose · xs: 1 / md: 2 / lg: 6 / xl: 6 / 2xl: 6

## S5 datasets

- datasets.first → card · xs: 1 / md: 1 / lg: 4 / xl: 4 / 2xl: 4
- datasets.second → card · xs: 1 / md: 1 / lg: 4 / xl: 4 / 2xl: 4
- datasets.third → card · xs: 1 / md: 2 / lg: 4 / xl: 4 / 2xl: 4
- Empty: `datasets.empty`

## S6 assistant

- assistant.prompt → prose · xs: 1 / md: 2 / lg: 7 / xl: 7 / 2xl: 7
- assistant.links → row · xs: 1 / md: 2 / lg: 5 / xl: 5 / 2xl: 5
- Empty: `assistant.empty`

## S7 author

- author.bio → prose · xs: 1 / md: 2 / lg: 8 / xl: 8 / 2xl: 8
- author.meta → row · xs: 1 / md: 2 / lg: 4 / xl: 4 / 2xl: 4

## S8 faq

- faq.body → disclosure · xs: 1 / md: 2 / lg: 8 / xl: 8 / 2xl: 8

## S9 dispatch

- dispatch.body → prose · xs: 1 / md: 2 / lg: 8 / xl: 8 / 2xl: 8

## Subpage layout contracts

- archive.filters: {"xs":1,"md":2,"lg":3,"xl":3,"2xl":3}
- archive.feed: {"xs":1,"md":2,"lg":9,"xl":9,"2xl":9}
- article.header: {"xs":1,"md":2,"lg":10,"xl":10,"2xl":10}
- article.body: {"xs":1,"md":2,"lg":8,"xl":8,"2xl":8}
- article.toc: {"xs":1,"md":2,"lg":4,"xl":4,"2xl":4}
- labPage.stage: {"xs":1,"md":2,"lg":8,"xl":8,"2xl":8}
- labPage.controls: {"xs":1,"md":2,"lg":4,"xl":4,"2xl":4}
- workspace.threads: {"xs":1,"md":2,"lg":3,"xl":3,"2xl":3}
- workspace.thread: {"xs":1,"md":2,"lg":9,"xl":9,"2xl":9}
- searchPage.bar: {"xs":1,"md":2,"lg":8,"xl":8,"2xl":8}
- searchPage.results: {"xs":1,"md":2,"lg":8,"xl":8,"2xl":8}
- topicsPage.list: {"xs":1,"md":2,"lg":12,"xl":12,"2xl":12}
- topicPage.feed: {"xs":1,"md":2,"lg":12,"xl":12,"2xl":12}
- datasetsPage.list: {"xs":1,"md":2,"lg":12,"xl":12,"2xl":12}
- aboutPage.bio: {"xs":1,"md":2,"lg":8,"xl":8,"2xl":8}
- aboutPage.meta: {"xs":1,"md":2,"lg":4,"xl":4,"2xl":4}
- dispatchThanks.body: {"xs":1,"md":2,"lg":8,"xl":8,"2xl":8}
- notFound.body: {"xs":1,"md":2,"lg":8,"xl":8,"2xl":8}
- footer.brand: {"xs":1,"md":2,"lg":5,"xl":5,"2xl":5}
- footer.nav: {"xs":1,"md":1,"lg":4,"xl":4,"2xl":4}
- footer.feed: {"xs":1,"md":1,"lg":3,"xl":3,"2xl":3}

## GenUI allowlist

RemeStack, RemeSplit, RemeMetricCard, RemeMetricTable, RemeBenchmarkChart, RemeCitationCard, RemeStatusNotice, RemeAuditChecklist, RemeEmptyState

S0 header/S10 footer and figure internals retain existing shared components; see MIGRATION.md.
