import { cx as cn } from './cx';

export type StackDirection = 'vertical' | 'horizontal';
export type StackGap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type StackAlign = 'start' | 'center' | 'end' | 'baseline' | 'stretch';
export type StackJustify = 'start' | 'center' | 'end' | 'between' | 'around';

// Static maps: Tailwind only generates classes it can see written out in full,
// so `items-${align}` would silently produce no CSS.
const GAP_CLASSES: Record<StackGap, string> = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

const ALIGN_CLASSES: Record<StackAlign, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
  stretch: 'items-stretch',
};

const JUSTIFY_CLASSES: Record<StackJustify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
};

export interface StackProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'div' | 'ul' | 'ol' | 'nav' | 'section' | 'header' | 'footer';
  direction?: StackDirection;
  gap?: StackGap;
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
}

export function Stack({
  as: Component = 'div',
  direction = 'vertical',
  gap = 'md',
  align,
  justify,
  wrap = false,
  className,
  children,
  ...props
}: StackProps) {
  return (
    <Component
      className={cn(
        'flex',
        direction === 'vertical' && 'flex-col',
        GAP_CLASSES[gap],
        align && ALIGN_CLASSES[align],
        justify && JUSTIFY_CLASSES[justify],
        wrap && 'flex-wrap',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
