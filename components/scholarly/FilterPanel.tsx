/**
 * FilterPanel — πeme v3.1 §28 (stage 4, beta).
 *
 * Checkboxes allow many, radios one (§7 Forms). Every control has a visible
 * label; the panel is a <fieldset> with a <legend>. Token mapping: semantic
 * tokens; 44px targets on coarse pointers (globals.css).
 */
export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterPanelProps {
  title: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  /** 'checkbox' = many, 'radio' = one (spec §7) */
  multiple?: boolean;
}

export default function FilterPanel({ title, options, selected, onChange, multiple = true }: FilterPanelProps) {
  const toggle = (value: string) => {
    if (multiple) {
      onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
    } else {
      onChange(selected.includes(value) ? [] : [value]);
    }
  };
  return (
    <fieldset className="rounded-md border border-line bg-surface p-4">
      <legend className="px-1 font-sans text-sm font-semibold text-text-primary">{title}</legend>
      <ul className="mt-2 space-y-2">
        {options.map((o) => (
          <li key={o.value}>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 font-sans text-sm text-text-primary">
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={title}
                className="h-4 w-4 accent-[var(--pieme-action-primary)]"
                checked={selected.includes(o.value)}
                onChange={() => toggle(o.value)}
              />
              <span>{o.label}</span>
              {o.count !== undefined ? <span className="ml-auto font-mono text-xs text-text-tertiary">{o.count}</span> : null}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
