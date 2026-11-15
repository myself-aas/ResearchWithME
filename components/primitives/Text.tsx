import { cx as cn } from './cx';

/**
 * Text — typography primitive.
 *
 * Two families of variants:
 *  - **House patterns** (`eyebrow`, `page-title`, `section-title`,
 *    `card-title`) emit exactly the class strings the product already uses,
 *    so migrating markup to `<Text>` is pixel-identical and each pattern is
 *    defined once.
 *  - **Spec scale** (`display` … `metadata`) — reme v3.1 §2 type styles for
 *    new surfaces.
 *
 * Fonts follow the spec split: serif for reading/titles, sans for chrome,
 * mono for metadata. Colour and weight are separate props so a variant never
 * hard-codes them.
 */

export type TextVariant =
  // house patterns
  | 'eyebrow'
  | 'page-title'
  | 'section-title'
  | 'card-title'
  // reme v3.1 scale
  | 'display'
  | 'title-1'
  | 'title-2'
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'body-reading'
  | 'body'
  | 'body-small'
  | 'label'
  | 'citation'
  | 'metadata';

const VARIANT_CLASSES: Record<TextVariant, string> = {
  eyebrow: 'font-mono text-xs uppercase tracking-wider',
  'page-title': 'font-serif text-2xl font-bold sm:text-3xl',
  'section-title': 'font-serif text-2xl font-semibold',
  'card-title': 'font-serif text-xl font-semibold',
  display: 'font-serif text-[clamp(2.5rem,5vw,4.5rem)] font-[450] leading-[1.05] tracking-[-0.025em] text-balance',
  'title-1': 'font-serif text-[clamp(2rem,3.5vw,3rem)] font-[500] leading-[1.12] tracking-[-0.02em] text-balance',
  'title-2': 'font-serif text-[clamp(1.5rem,2.5vw,2.25rem)] font-[500] leading-[1.2] tracking-[-0.015em] text-balance',
  'heading-1': 'font-sans text-[1.75rem] font-[650] leading-[1.25] text-balance',
  'heading-2': 'font-sans text-[1.375rem] font-[650] leading-[1.3] text-balance',
  'heading-3': 'font-sans text-[1.125rem] font-[650] leading-[1.35] text-balance',
  'body-reading': 'font-serif text-[1.125rem] font-normal leading-[1.7] max-w-[68ch]',
  body: 'font-sans text-base font-normal leading-[1.625]',
  'body-small': 'font-sans text-sm font-normal leading-[1.55]',
  label: 'font-sans text-[0.8125rem] font-[600] leading-[1.4] uppercase tracking-[0.04em]',
  citation: 'font-mono text-[0.8125rem] font-[500] leading-[1.5]',
  metadata: 'font-mono text-xs font-[500] leading-[1.45] tracking-[0.015em]',
};

const COLOR_CLASSES = {
  primary: 'text-ink',
  secondary: 'text-ink-secondary',
  tertiary: 'text-text-tertiary',
  inverse: 'text-text-inverse',
  brand: 'text-brand',
  verified: 'text-trust-verified',
  success: 'text-success',
  destructive: 'text-destructive',
  inherit: '',
} as const;

const WEIGHT_CLASSES = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
} as const;

export type TextElement =
  | 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'dt' | 'dd' | 'li' | 'label' | 'legend' | 'small' | 'strong'
  | 'blockquote' | 'cite' | 'figcaption' | 'time';
export type TextColor = keyof typeof COLOR_CLASSES;
export type TextWeight = keyof typeof WEIGHT_CLASSES;

export interface TextProps extends Omit<React.HTMLAttributes<HTMLElement>, 'color'> {
  as?: TextElement;
  variant?: TextVariant;
  /** Default `primary` (ink); `inherit` adds no colour class. */
  color?: TextColor;
  weight?: TextWeight;
  /** Only meaningful with `as="label"`. */
  htmlFor?: string;
  /** Only meaningful with `as="time"`. */
  dateTime?: string;
}

export function Text({
  as: Component = 'p',
  variant,
  color = 'primary',
  weight,
  className,
  children,
  ...props
}: TextProps) {
  return (
    <Component
      className={cn(variant && VARIANT_CLASSES[variant], COLOR_CLASSES[color], weight && WEIGHT_CLASSES[weight], className)}
      {...props}
    >
      {children}
    </Component>
  );
}
