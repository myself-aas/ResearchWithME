import { cx as cn } from './cx';
import { Text, type TextVariant } from './Text';

/**
 * Card — bordered surface primitive (hairline border, no shadow by default).
 *
 * Defaults reproduce the product's panel pattern
 * `rounded-sm border border-line bg-surface p-4`, so existing panels migrate
 * without pixel change. Use `as="article"` only when the card is a
 * self-contained item (a review in a list); most panels are plain `div`s.
 */

const PADDING = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
  xl: 'p-6',
} as const;

const RADIUS = {
  sm: 'rounded-sm',
  md: 'rounded-md',
} as const;

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'div' | 'article' | 'section' | 'aside' | 'li';
  variant?: 'default' | 'elevated' | 'interactive';
  padding?: keyof typeof PADDING;
  radius?: keyof typeof RADIUS;
}

export function Card({
  as: Component = 'div',
  variant = 'default',
  padding = 'md',
  radius = 'sm',
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        RADIUS[radius],
        'border border-line bg-surface',
        PADDING[padding],
        variant === 'elevated' && 'shadow-floating',
        variant === 'interactive' && 'cursor-pointer transition-colors hover:bg-surface-subtle',
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <header className={cn('mb-4', className)} {...props}>
      {children}
    </header>
  );
}

interface CardTitleProps extends Omit<React.HTMLAttributes<HTMLHeadingElement>, 'color'> {
  as?: 'h2' | 'h3' | 'h4';
  variant?: Extract<TextVariant, 'card-title' | 'section-title' | 'heading-2' | 'heading-3'>;
}
export function CardTitle({ as = 'h3', variant = 'card-title', className, children, ...props }: CardTitleProps) {
  return (
    <Text as={as} variant={variant} className={className} {...props}>
      {children}
    </Text>
  );
}

export function CardDescription({ className, children, ...props }: Omit<React.HTMLAttributes<HTMLParagraphElement>, 'color'>) {
  return (
    <Text as="p" color="secondary" className={cn('mt-1 font-sans text-sm', className)} {...props}>
      {children}
    </Text>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <footer className={cn('mt-4 flex flex-wrap items-center gap-2', className)} {...props}>
      {children}
    </footer>
  );
}
