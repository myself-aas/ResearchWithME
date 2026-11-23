import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Field, Input } from '@/components/primitives';

describe('primitives/Field', () => {
  it('renders a label wired to the control, a hint region and a role="alert" error region', () => {
    const html = renderToStaticMarkup(
      <Field id="email" label="Email" hint="We never share it" error="Enter a valid email" required>
        <Input id="email" aria-invalid="true" aria-describedby="email-hint email-error" />
      </Field>,
    );
    expect(html).toContain('<label');
    expect(html).toContain('for="email"');
    expect(html).toContain('id="email-hint"');
    expect(html).toContain('id="email-error"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-describedby="email-hint email-error"');
    expect(html).toContain('We never share it');
    expect(html).toContain('Enter a valid email');
  });

  it('required marker is textual, not color-only', () => {
    const html = renderToStaticMarkup(
      <Field id="name" label="Name" required>
        <Input id="name" />
      </Field>,
    );
    expect(html).toContain('(required)');
  });

  it('omits the error region when there is no error, and the hint region when no hint', () => {
    const html = renderToStaticMarkup(
      <Field id="q" label="Query">
        <Input id="q" />
      </Field>,
    );
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('q-hint');
    expect(html).not.toContain('q-error');
  });
});
