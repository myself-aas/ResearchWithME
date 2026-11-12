import type { LucideIcon, LucideProps } from 'lucide-react';
import { cx as cn } from './cx';

/**
 * Icon — sizing and accessibility wrapper over `lucide-react`.
 *
 * Decorative by default (`aria-hidden`). Pass `label` when the icon is the
 * only content of a control; it then gets `role="img"` and an accessible
 * name. Sizes are the four the product uses.
 *
 *   <Icon icon={PenSquare} />            // h-4 w-4, decorative
 *   <Icon icon={Search} size="lg" label="Search" />
 */

const SIZE_CLASSES = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
} as const;

export type IconSize = keyof typeof SIZE_CLASSES;

export interface IconProps extends Omit<LucideProps, 'size' | 'ref'> {
  icon: LucideIcon;
  size?: IconSize;
  /** Accessible name; omit for decorative icons. */
  label?: string;
}

export function Icon({ icon: Glyph, size = 'md', label, className, ...props }: IconProps) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };
  return <Glyph className={cn(SIZE_CLASSES[size], className)} {...a11y} {...props} />;
}
