import { describe, expect, it } from 'vitest';
import {
  buildTemplateSource,
  mustache,
  renderScenario,
  toComponentProps,
  validateVariables,
} from '@/lib/email/render';
import { listScenarios, type ScenarioVariables } from '@/lib/email/scenarios';

const scenarios = listScenarios();

/** Values shaped to break out of markup, for the escaping checks. */
const HOSTILE =
  '<script>alert(1)</script><img src=x onerror=alert(1)>"\'&';

function hostileVariables(scenarioKey: string): ScenarioVariables {
  const scenario = scenarios.find((s) => s.key === scenarioKey)!;
  const hostile: ScenarioVariables = {};
  for (const definition of scenario.variables) {
    hostile[definition.key] =
      definition.type === 'number' ? 1337 : `${HOSTILE} ${definition.key}`;
  }
  return hostile;
}

describe('component rendering', () => {
  it.each(scenarios.map((s) => [s.key, s] as const))(
    '%s renders with no props at all',
    async (_key, scenario) => {
      // The React Email CLI renders the default export with no props, and
      // Resend renders a template whose variable an editor removed. A component
      // that throws on a missing field takes the send down with it.
      const { html, text } = await renderScenario(scenario, {});

      expect(html).toContain('<!DOCTYPE');
      expect(html).toContain('ResearchWithMe');
      expect(typeof text).toBe('string');
    },
  );

  it.each(scenarios.map((s) => [s.key, s] as const))(
    '%s renders with full sample values',
    async (_key, scenario) => {
      const { html, text } = await renderScenario(scenario, scenario.sample);

      expect(html).toContain('<!DOCTYPE');
      // Every non-empty sample string must reach the HTML, or the template is
      // silently dropping a field a caller supplied.
      for (const [key, value] of Object.entries(scenario.sample)) {
        if (typeof value === 'string' && value.trim() !== '') {
          expect(html, `${key} missing from html`).toContain(value);
        }
      }
      expect(text.length).toBeGreaterThan(50);
    },
  );

  it.each(scenarios.map((s) => [s.key, s] as const))(
    '%s produces a plain-text part without HTML entities',
    async (_key, scenario) => {
      const { text } = await renderScenario(scenario, scenario.sample);

      expect(text).not.toContain('<p>');
      expect(text).not.toContain('&amp;');
      expect(text).not.toContain('&lt;');
      expect(text).not.toContain('&#x27;');
    },
  );

  it.each(scenarios.map((s) => [s.key, s] as const))(
    '%s does not uppercase the heading in the plain-text part',
    async (_key, scenario) => {
      // html-to-text uppercases h1 by default. Left alone, a name renders in
      // caps and an uploaded {{{TOKEN}}} stops matching its variable.
      const { text } = await renderScenario(scenario, scenario.sample);
      expect(text).not.toMatch(/^[A-Z][A-Z ,.'-]{20,}$/m);
    },
  );

  it('hides a field row when its value is empty', async () => {
    const scenario = scenarios.find((s) => s.key === 'submission-receipt')!;
    const { html } = await renderScenario(scenario, {
      ...scenario.sample,
      DATA_URL: '',
      ARTIFACT: '   ',
    });

    expect(html).not.toContain('Code / data');
    expect(html).not.toContain('Reviewed artifact');
    expect(html).toContain('Reference');
  });

  it('coerces a numeric variable arriving as a string', async () => {
    const scenario = scenarios.find((s) => s.key === 'deadline-reminder')!;
    const props = toComponentProps(scenario, {
      ...scenario.sample,
      DAYS_REMAINING: '7',
    });

    expect(props.daysRemaining).toBe(7);
  });

  it('coerces an unparseable number to zero rather than NaN', async () => {
    const scenario = scenarios.find((s) => s.key === 'deadline-reminder')!;
    const props = toComponentProps(scenario, {
      ...scenario.sample,
      DAYS_REMAINING: 'not a number',
    });

    expect(props.daysRemaining).toBe(0);
    expect(Number.isNaN(props.daysRemaining)).toBe(false);
  });
});

describe('escaping untrusted input', () => {
  it.each(scenarios.map((s) => [s.key, s] as const))(
    '%s escapes markup in every interpolated field',
    async (_key, scenario) => {
      // Every field here can come from a stranger: a submitter's title, a
      // support agent's reply, a display name. React escapes interpolated
      // children, and this pins that behaviour -- if a field is ever switched to
      // dangerouslySetInnerHTML, the receipt becomes stored XSS in an inbox.
      const { html } = await renderScenario(
        scenario,
        hostileVariables(scenario.key),
      );

      expect(html, `${scenario.key} has a raw script tag`).not.toContain('<script>');
      expect(html, `${scenario.key} has a raw img tag`).not.toContain('<img');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&amp;');
    },
  );

  it('leaves the plain-text part unescaped so it reads as text', async () => {
    const scenario = scenarios.find((s) => s.key === 'submission-receipt')!;
    const { text } = await renderScenario(scenario, hostileVariables(scenario.key));

    expect(text).toContain('<script>alert(1)</script>');
    expect(text).not.toContain('&lt;script&gt;');
  });
});

describe('variable validation', () => {
  it('accepts the sample values of every scenario', () => {
    for (const scenario of scenarios) {
      expect(
        validateVariables(scenario, scenario.sample),
        `${scenario.key} sample is invalid`,
      ).toEqual([]);
    }
  });

  it('rejects a missing required variable', () => {
    const scenario = scenarios.find((s) => s.key === 'submission-receipt')!;
    const problems = validateVariables(scenario, { ...scenario.sample, REFERENCE: '' });

    expect(problems.length).toBeGreaterThan(0);
    expect(problems.join(' ')).toContain('REFERENCE');
  });

  it('rejects an undeclared variable', () => {
    const scenario = scenarios.find((s) => s.key === 'welcome')!;
    const problems = validateVariables(scenario, {
      ...scenario.sample,
      NOT_A_VARIABLE: 'x',
    });

    expect(problems.join(' ')).toContain('NOT_A_VARIABLE');
  });

  it('rejects a nested or null value', () => {
    const scenario = scenarios.find((s) => s.key === 'welcome')!;
    const problems = validateVariables(scenario, {
      ...scenario.sample,
      NEXT_STEP: { nested: true } as unknown as string,
    });

    expect(problems.join(' ')).toMatch(/must be a string or number/);
  });

  it('rejects a value over the length limit', () => {
    const scenario = scenarios.find((s) => s.key === 'submission-receipt')!;
    const problems = validateVariables(scenario, {
      ...scenario.sample,
      ABSTRACT: 'x'.repeat(2001),
    });

    expect(problems.join(' ')).toContain('2000');
  });

  it('allows an optional variable to be absent', () => {
    const scenario = scenarios.find((s) => s.key === 'submission-receipt')!;
    const { DATA_URL: _url, ARTIFACT: _artifact, ...rest } = scenario.sample;

    expect(validateVariables(scenario, rest)).toEqual([]);
  });
});

describe('template source', () => {
  it.each(scenarios.map((s) => [s.key, s] as const))(
    '%s emits a triple-brace token for every variable in both bodies',
    async (_key, scenario) => {
      // Compared against literal token strings, not mustache(): comparing both
      // sides of a check to the same helper is how a malformed token passes a
      // test and then silently never substitutes in production.
      const source = await buildTemplateSource(scenario);

      for (const definition of scenario.variables) {
        const token = '{{{' + definition.key + '}}}';
        expect(source.html, `html missing ${token}`).toContain(token);
        expect(source.text, `text missing ${token}`).toContain(token);
      }
    },
  );

  it.each(scenarios.map((s) => [s.key, s] as const))(
    '%s leaks no sample value into the uploaded template',
    async (_key, scenario) => {
      const source = await buildTemplateSource(scenario);

      for (const value of Object.values(scenario.sample)) {
        if (typeof value === 'string' && value.trim().length > 3) {
          expect(source.html).not.toContain(value);
        }
      }
    },
  );

  it.each(scenarios.map((s) => [s.key, s] as const))(
    '%s carries from, alias, subject and a text body',
    async (_key, scenario) => {
      const source = await buildTemplateSource(scenario);

      expect(source.from).toBe(scenario.from);
      expect(source.alias).toBe(scenario.templateAlias);
      expect(source.subject.trim().length).toBeGreaterThan(0);
      // A template send cannot carry `text` in its payload, but a Template holds
      // one of its own, so the multipart alternative survives the template path.
      expect(source.text.length).toBeGreaterThan(50);
    },
  );

  it('builds tokens with three braces on each side', () => {
    expect(mustache('REFERENCE')).toBe('{{{REFERENCE}}}');
    expect(mustache('REFERENCE').length).toBe('REFERENCE'.length + 6);
  });
});
