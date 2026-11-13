// reme v3.1 video token consumer — §44: Remotion/Hyperframes MUST use generated tokens.
// Loads tokens/generated/tokens.video.json (emitted by `npm run tokens:build`)
// and exposes typed access for compositions. Static HTML compositions reference
// the same values as CSS vars from tokens/generated/tokens.video.css.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const video = JSON.parse(readFileSync(join(here, '../../tokens/generated/tokens.video.json'), 'utf8'));

export const videoTokens = video;
export const videoColor = (path) =>
  path.split('.').reduce((node, key) => node?.[key], video.color);
export const videoFont = (script, role) => video.font[script]?.[role];
export const videoMotion = (name) => video.motion?.[name];

export default videoTokens;
