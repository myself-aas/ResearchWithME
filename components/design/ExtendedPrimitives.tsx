import { CheckCircle, Clock3, ShieldCheck, XCircle } from 'lucide-react';
import type { ReactNode, ComponentProps } from 'react';
import { design } from '@/src/design';

type State = keyof typeof design.color.status;
export function StatusBadge({ state, locale = 'en' }: { state: State; locale?: 'en' | 'bn' }) {
  const status = design.color.status[state];
  const Icon = { verified: CheckCircle, pending: Clock3, unavailable: XCircle, localLive: ShieldCheck }[state];
  return <span className={`r-status r-status-${state}`} data-primitive="statusBadge"><Icon className="r-icon" aria-hidden="true" /><span>{design.locales[locale][status.labelKey]}</span></span>;
}
export function Live({ children, ...props }: Omit<ComponentProps<'output'>, 'aria-live'>) {
  return <output {...props} className="r-live r-meta" data-primitive="live" aria-live="polite">{children}</output>;
}
export function Range({ label, valueText, id, ...props }: Omit<ComponentProps<'input'>, 'type' | 'aria-valuetext'> & { id: string; label: string; valueText: string }) {
  return <label className="r-flow" htmlFor={id}><span className="r-body">{label}</span><input {...props} id={id} type="range" className="r-range" data-primitive="range" aria-valuetext={valueText} /></label>;
}
export function Field({ label, id, error, multiline = false, ...props }: { label: string; id: string; error?: string; multiline?: boolean; name?: string; required?: boolean; placeholder?: string }) {
  const shared = { ...props, id, className: 'r-field r-input', 'data-primitive': 'field', 'aria-invalid': error ? true as const : undefined, 'aria-describedby': error ? `${id}-error` : undefined };
  return <div className="r-flow"><label className="r-body" htmlFor={id}>{label}</label>{multiline ? <textarea {...shared} /> : <input {...shared} />}{error && <p className="r-body r-status-unavailable" id={`${id}-error`}>{error}</p>}</div>;
}
export function Callout({ children, punchline = false }: { children: ReactNode; punchline?: boolean }) {
  return <aside className={punchline ? 'r-callout-punchline r-flow' : 'r-callout r-flow'} data-primitive="callout">{children}</aside>;
}
export function Table({ caption, children }: { caption: string; children: ReactNode }) {
  return <div className="r-table-scroll" role="region" aria-label={caption} tabIndex={0}><table className="r-table" data-primitive="table"><caption>{caption}</caption>{children}</table></div>;
}
/** Native dialog: caller must implement showModal, Escape/backdrop, and focus return. */
export function Drawer(props: ComponentProps<'dialog'>) {
  return <dialog {...props} className="r-drawer" data-primitive="drawer" />;
}
