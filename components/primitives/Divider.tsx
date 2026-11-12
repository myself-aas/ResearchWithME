import { cx as cn } from './cx';

export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerSize = 'hairline' | 'subtle' | 'strong';

const ORIENTATION_CLASSES: Record<DividerOrientation, string> = {
  horizontal: 'w-full',
  vertical: 'h-full',
};

const SIZE_CLASSES: Record<DividerSize, string> = {
  hairline: 'border-border-subtle',
  subtle: 'border-border-subtle',
  strong: 'border-border-strong',
};

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: DividerOrientation;
  size?: DividerSize;
  className?: string;
}

export function Divider({ 
  orientation = 'horizontal', 
  size = 'hairline', 
  className, 
  ...props 
}: DividerProps) {
  return (
    <hr
      aria-orientation={orientation}
      className={cn(
        ORIENTATION_CLASSES[orientation],
        SIZE_CLASSES[size],
        orientation === 'horizontal' ? 'my-4' : 'mx-4',
        className
      )}
      {...props}
    />
  );
}