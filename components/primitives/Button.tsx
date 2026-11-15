'use client';

import { cx as cn } from './cx';
import Pressable, { type PressableProps } from '@/components/motion/Pressable';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-action-primary text-on-primary hover:bg-action-primary-hover active:bg-action-primary-pressed border-action-primary',
  secondary: 'bg-surface text-text-primary border-line hover:bg-surface-subtle',
  destructive: 'bg-destructive text-on-primary hover:bg-destructive/90 active:bg-destructive/80 border-destructive',
  ghost: 'bg-transparent text-text-primary hover:bg-surface-subtle border-transparent',
  link: 'bg-transparent text-action-primary hover:text-action-primary-hover border-transparent px-0',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-xs',
  md: 'min-h-11 px-6 text-sm',
  lg: 'min-h-12 px-6 text-base',
};

export interface ButtonProps extends Omit<PressableProps, 'feedback'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  feedback?: 'squash' | 'lift' | 'none';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  feedback = 'squash',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  
  return (
    <Pressable
      type="button"
      feedback={feedback}
      disabled={isDisabled}
      aria-busy={loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-sans font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {loading ? (
        <svg className="h-4 w-4 motion-safe:animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : icon && iconPosition === 'left' ? (
        <span aria-hidden="true">{icon}</span>
      ) : null}
      {children}
      {icon && iconPosition === 'right' && !loading && (
        <span aria-hidden="true">{icon}</span>
      )}
    </Pressable>
  );
}