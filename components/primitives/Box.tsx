import { cx as cn } from './cx';

export interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article' | 'aside' | 'main' | 'header' | 'footer';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  margin?: 'none' | 'auto';
  width?: 'full' | 'fit' | 'prose' | 'workspace' | 'graph';
  maxWidth?: 'prose' | 'workspace' | 'graph' | 'none';
}

const PADDING = { 
  none: '', 
  xs: 'p-2', 
  sm: 'p-3', 
  md: 'p-4', 
  lg: 'p-6', 
  xl: 'p-8' 
};

const WIDTH = { 
  full: 'w-full', 
  fit: 'w-fit', 
  prose: 'max-w-[68ch]', 
  workspace: 'max-w-[90rem]', 
  graph: 'max-w-[108rem]' 
};

const MAX_WIDTH = { 
  prose: 'max-w-[68ch]', 
  workspace: 'max-w-[90rem]', 
  graph: 'max-w-[108rem]', 
  none: 'max-w-none' 
};

export function Box({ 
  as: Component = 'div', 
  padding = 'none', 
  margin = 'none', 
  width, 
  maxWidth, 
  className, 
  children, 
  ...props 
}: BoxProps) {
  return (
    <Component
      className={cn(
        PADDING[padding],
        margin === 'auto' && 'mx-auto',
        width && WIDTH[width],
        maxWidth && MAX_WIDTH[maxWidth],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}