import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-brand text-on-primary hover:opacity-90',
        destructive: 'bg-destructive text-on-primary hover:bg-destructive/90',
        outline: 'border border-line bg-surface text-ink hover:bg-surface-subtle',
        secondary: 'bg-surface-subtle text-ink hover:bg-surface',
        ghost: 'text-ink-secondary hover:bg-surface-subtle hover:text-ink',
        link: 'text-brand underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-11 px-6 py-2',
        sm: 'min-h-11 px-3',
        lg: 'min-h-12 px-8',
        icon: 'min-h-11 min-w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
