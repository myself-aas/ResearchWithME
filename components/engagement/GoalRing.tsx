/**
 * GoalRing — SVG arc for a reading goal. Zero fabrication: it renders exactly
 * `completed/target`, and renders nothing at all when there is no honest goal
 * to show (`target <= 0`).
 *
 * Screen readers get role="progressbar" with explicit min/max/now plus a
 * centered text anchor, so the number is audible, not just drawn. No motion.
 */
export interface GoalRingProps {
  completed: number;
  target: number;
  /** Accessible name for the progressbar (what the ring measures). */
  label?: string;
  size?: number;
  className?: string;
}

export default function GoalRing({ completed, target, label = 'Reading goal', size = 64, className }: GoalRingProps) {
  if (!Number.isFinite(target) || target <= 0) return null;
  const safeCompleted = Number.isFinite(completed) ? completed : 0;
  const clamped = Math.max(0, Math.min(Math.round(safeCompleted), Math.floor(target)));
  const wholeTarget = Math.floor(target);
  const fraction = clamped / wholeTarget;

  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - fraction);

  return (
    <svg
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={wholeTarget}
      aria-valuenow={clamped}
      aria-label={label}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        className="stroke-surface-subtle"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        className="stroke-action-primary"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-text-primary font-sans text-xs font-semibold"
      >
        {clamped}/{wholeTarget}
      </text>
    </svg>
  );
}
