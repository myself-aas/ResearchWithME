import { cx } from './cx';

/**
 * Field — reme v3.1 form field composite (spec §27 contract).
 *
 * Purpose: one accessible label + hint + error wiring around any control.
 * The wrapped control is wired by the caller via explicit props — Input,
 * Select and Textarea all accept `id`, `aria-invalid` and `aria-describedby`;
 * children are never cloned. `label`, `hint` and `error` accept ReactNode so
 * composed hints (character counters) and labels can carry inline asides.
 *
 * Anatomy: <label htmlFor> -> control -> hint (`<id>-hint`) -> error (`<id>-error`, role="alert").
 * Both hint and error render when both are present so `aria-describedby`
 * can reference either or both. The required marker is textual — never color-only.
 *
 * Token mapping: text/line/destructive tokens only; spacing on the 4px grid.
 */
export interface FieldProps {
  /** Control id — must match the wrapped control's `id`. */
  id: string;
  label: React.ReactNode;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  /** Renders a visible "(required)" marker next to the label text. */
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Field({ id, label, error, hint, required, className, children }: FieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={cx('w-full', className)}>
      <label
        htmlFor={id}
        className="mb-1.5 block font-sans text-sm font-medium text-text-primary"
      >
        {label}
        {required ? (
          <span className="ms-1.5 font-sans text-xs font-normal text-text-secondary">(required)</span>
        ) : null}
      </label>
      {children}
      {hint ? (
        <p id={hintId} className="mt-1.5 font-sans text-xs text-text-tertiary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 font-sans text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
