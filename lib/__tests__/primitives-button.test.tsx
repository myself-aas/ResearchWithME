import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button } from '@/components/primitives';

describe('primitives/Button', () => {
  it('renders a type="button" by default with the md touch target', () => {
    const html = renderToStaticMarkup(createElement(Button, null, 'Save'));
    expect(html).toContain('type="button"');
    expect(html).toContain('min-h-11');
    expect(html).toContain('Save');
  });

  it('loading sets aria-busy, disables the control, shows a spinner, keeps the label announced', () => {
    const html = renderToStaticMarkup(createElement(Button, { loading: true }, 'Save key'));
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('disabled');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('<svg');
    expect(html).toContain('Save key');
  });

  it('forwards ref to the underlying <button> (React 19 ref-as-prop)', () => {
    const ref = { current: null as HTMLButtonElement | null };
    const html = renderToStaticMarkup(createElement(Button, { ref, variant: 'ghost', size: 'icon', 'aria-label': 'Toggle menu' }));
    expect(html).toContain('<button');
    expect(html).toContain('aria-label="Toggle menu"');
  });

  it('icon size meets the 44px touch target', () => {
    const html = renderToStaticMarkup(createElement(Button, { size: 'icon', 'aria-label': 'Toggle menu' }));
    expect(html).toContain('min-h-11');
    expect(html).toContain('min-w-11');
  });
});
