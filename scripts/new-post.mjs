#!/usr/bin/env node
/**
 * Scaffold a new MDX post.
 *
 *   npm run new -- "The title of the essay"
 *   npm run new -- "The title" --publish
 *
 * Creates `content/posts/<slug>.mdx` as a draft (drafts render in development
 * only) unless `--publish` is passed. Refuses to overwrite an existing file.
 */
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const publish = args.includes('--publish');
const words = args.filter((arg) => !arg.startsWith('--'));
const title = words.join(' ').trim();

if (!title) {
  console.error('Usage: npm run new -- "Post title" [--publish]');
  process.exit(1);
}

const slug = title
  .toLowerCase()
  .normalize('NFKD')
  .replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

if (!slug) {
  console.error('Could not derive a slug from that title. Use letters or numbers.');
  process.exit(1);
}

const file = path.join(process.cwd(), 'content', 'posts', `${slug}.mdx`);
if (existsSync(file)) {
  console.error(`Refusing to overwrite ${path.relative(process.cwd(), file)}.`);
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const body = `---
title: ${JSON.stringify(title)}
description: "TODO: one or two sentences for cards, search, and the feed."
date: "${date}"
tags: []
${publish ? '' : 'draft: true\n'}---

Opening paragraph. The first paragraph after the frontmatter gets the drop cap.

## First section

Write the essay here. Custom components are available without imports — see
\`content/README.md\` for \`<Callout>\`, \`<Figure>\`, \`<Video>\`, and \`<KeyTakeaways>\`.
`;

writeFileSync(file, body, 'utf8');
console.log(`Created ${path.relative(process.cwd(), file)}${publish ? '' : ' (draft)'}`);
console.log('Edit the title, description, tags, and body, then commit it.');
