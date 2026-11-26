import { color } from './color.manifest';
import { type_ } from './type.manifest';
import { space } from './space.manifest';
import { motion } from './motion.manifest';
import { breakpoint } from './breakpoint.manifest';
import { grid } from './grid.manifest';
import { primitive } from './primitive.manifest';
import { layout, layoutRows, placement } from './layout.manifest';
import { section } from './section.manifest';
import { genui } from './genui.manifest';
import { locales } from './locales';

function freeze<T extends object>(value: T): Readonly<T> {
  Object.values(value).forEach(child => { if (child && typeof child === 'object') freeze(child); });
  return Object.freeze(value);
}
export const design = freeze({
  meta: { version: '4.1', adaptation: 'Next.js / Tailwind 4', locales: ['en', 'bn'], modes: ['light', 'dark', 'more'] },
  color, type: type_, space, motion, breakpoint, grid, primitive, layout, layoutRows, placement, section, genui, locales,
} as const);
export type Design = typeof design;
