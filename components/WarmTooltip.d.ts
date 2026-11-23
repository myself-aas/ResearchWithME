import type { ReactElement, ReactNode, RefAttributes } from 'react';

/** Types for the JS/CSS React Bits registry component in WarmTooltip.jsx. */
export interface WarmTooltipProps {
  content: ReactNode;
  children: ReactElement;
  shortcut?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  warmWindow?: number;
  surfaceColor?: string;
  inkColor?: string;
  size?: 'sm' | 'md' | 'lg';
  radius?: number;
  gap?: number;
  arrow?: boolean;
  popDuration?: number;
  popScale?: number;
  popBlur?: number;
  showFuse?: boolean;
  longPress?: number;
  disabled?: boolean;
  className?: string;
}

export interface WarmTooltipGroupProps {
  children: ReactNode;
  delay?: number;
  warmWindow?: number;
  travel?: number;
  lean?: number;
  onWarmChange?: (warm: boolean) => void;
}

export const WarmTooltipGroup: (props: WarmTooltipGroupProps & RefAttributes<{ reset: () => void }>) => ReactElement;
export default function WarmTooltip(props: WarmTooltipProps): ReactElement;
