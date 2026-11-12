import { cx as cn } from './cx';

export type BadgeVariant = 'default' | 'verified' | 'emerging' | 'uncertain' | 'contested' | 'destructive' | 'outline';
export type BadgeSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-surface text-text-primary border-line',
  verified: 'bg-trust-verified/10 text-trust-verified border-trust-verified/20',
  emerging: 'bg-trust-emerging/10 text-trust-emerging border-trust-emerging/20',
  uncertain: 'bg-trust-uncertain/10 text-trust-uncertain border-trust-uncertain/20',
  contested: 'bg-trust-contested/10 text-trust-contested border-trust-contested/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
  outline: 'bg-transparent text-text-secondary border-line',
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-[0.8125rem]',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

export function Badge({ 
  variant = 'default', 
  size = 'md', 
  dot = false, 
  className, 
  children, 
  ...props 
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm font-sans font-medium uppercase tracking-[0.04em] border',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span 
          aria-hidden="true" 
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            variant === 'verified' && 'bg-trust-verified',
            variant === 'emerging' && 'bg-trust-emerging',
            variant === 'uncertain' && 'bg-trust-uncertain',
            variant === 'contested' && 'bg-trust-contested',
            variant === 'destructive' && 'bg-destructive',
            variant === 'default' && 'bg-text-tertiary',
            variant === 'outline' && 'bg-text-tertiary',
          )} 
        />
      )}
      {children}
    </span>
  );
}