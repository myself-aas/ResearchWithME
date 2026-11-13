import { describe, expect, it } from 'vitest';
import {
  LIMITS,
  RESERVED_VARIABLE_KEYS,
  SENDING_DOMAIN,
  getScenario,
  idempotencyKeyFor,
  isOnSendingDomain,
  isReservedVariableKey,
  SUPABASE_AUTH_SENDER,
  listScenarios,
  parseSender,
} from '@/lib/email/scenarios';
import { SCENARIO_COMPONENTS } from '@/lib/email/components';
import { templateVariableDeclarations } from '@/lib/email/render';

const scenarios = listScenarios();
const keys = scenarios.map((scenario) => scenario.key);

describe('scenario registry', () => {
  it('declares every proposed scenario', () => {
    expect(keys.sort()).toEqual(
      [
        'password-reset',
        'security-alert',
        'support-reply',
        'verify-email',
        'welcome',
      ].sort(),
    );
  });

  it('has unique keys, aliases and template env vars', () => {
    const unique = (values: string[]) => new Set(values).size === values.length;
    expect(unique(keys)).toBe(true);
    expect(unique(scenarios.map((s) => s.templateAlias))).toBe(true);
    expect(unique(scenarios.map((s) => s.templateEnv))).toBe(true);
  });

  it('binds a component to every scenario', () => {
    // The registry and emails/ must not be able to disagree: a scenario with no
    // component would fail at send time, in production, after the caller succeeded.
    for (const scenario of scenarios) {
      expect(
        SCENARIO_COMPONENTS[scenario.key as keyof typeof SCENARIO_COMPONENTS],
        `${scenario.key} has no component`,
      ).toBeTypeOf('function');
      expect(typeof scenario.component).toBe('function');
    }
  });

  it('has no component without a scenario', () => {
    for (const componentKey of Object.keys(SCENARIO_COMPONENTS)) {
      expect(getScenario(componentKey), `${componentKey} has no scenario`).toBeDefined();
    }
  });
});

describe('sender identity', () => {
  it('uses the "Name <address>" format on every from', () => {
    for (const scenario of scenarios) {
      const parsed = parseSender(scenario.from);
      expect(parsed, `${scenario.key} from is malformed: ${scenario.from}`).not.toBeNull();
      expect(parsed!.name.length, `${scenario.key} has an empty sender name`).toBeGreaterThan(0);
    }
  });

  it('sends every scenario from the verified domain', () => {
    // A substring check would pass "evil@researchwith.me.attacker.tld", so the
    // address is parsed and the host compared exactly.
    for (const scenario of scenarios) {
      const parsed = parseSender(scenario.from)!;
      expect(
        isOnSendingDomain(parsed.address),
        `${scenario.key} sends from ${parsed.address}`,
      ).toBe(true);
      expect(parsed.address.endsWith(`@${SENDING_DOMAIN}`)).toBe(true);
      expect(parsed.address).toBe(parsed.address.toLowerCase());
    }
  });

  it('replies to the verified domain too', () => {
    for (const scenario of scenarios) {
      expect(
        isOnSendingDomain(scenario.replyTo),
        `${scenario.key} replies to ${scenario.replyTo}`,
      ).toBe(true);
    }
  });

  it('names the sender so a reader can tell it is genuinely from us', () => {
    // Every friendly name carries the brand, so nothing arrives as a bare
    // address or as something a reader cannot attribute.
    for (const scenario of scenarios) {
      expect(
        parseSender(scenario.from)!.name,
        `${scenario.key} sender name lacks the brand`,
      ).toContain('Research With Me');
    }
  });

  it('never uses the Resend onboarding sandbox address', () => {
    for (const scenario of scenarios) {
      expect(scenario.from).not.toContain('resend.dev');
      expect(scenario.replyTo).not.toContain('resend.dev');
    }
  });

  it('rejects lookalike domains rather than matching on substring', () => {
    expect(isOnSendingDomain('x@researchwith.me')).toBe(true);
    expect(isOnSendingDomain('x@researchwith.me.attacker.tld')).toBe(false);
    expect(isOnSendingDomain('x@notresearchwith.me')).toBe(false);
    expect(isOnSendingDomain('researchwith.me')).toBe(false);
    expect(isOnSendingDomain('x@')).toBe(false);
  });
});

describe('variable contract', () => {
  it('keeps every variable flat: string or number only', () => {
    for (const scenario of scenarios) {
      for (const value of Object.values(scenario.sample)) {
        const kind = typeof value;
        expect(
          kind === 'string' || kind === 'number',
          `${scenario.key} sample has a ${kind} value`,
        ).toBe(true);
      }
      for (const definition of scenario.variables) {
        expect(['string', 'number']).toContain(definition.type);
      }
    }
  });

  it('stays within the per-template variable limit', () => {
    for (const scenario of scenarios) {
      expect(
        scenario.variables.length,
        `${scenario.key} declares too many variables`,
      ).toBeLessThanOrEqual(LIMITS.maxVariablesPerTemplate);
    }
  });

  it('keeps keys and sample values within length limits', () => {
    for (const scenario of scenarios) {
      for (const definition of scenario.variables) {
        expect(
          definition.key.length,
          `${scenario.key}.${definition.key} key too long`,
        ).toBeLessThanOrEqual(LIMITS.maxVariableKeyLength);
      }
      for (const [key, value] of Object.entries(scenario.sample)) {
        if (typeof value === 'string') {
          expect(
            value.length,
            `${scenario.key}.${key} sample value too long`,
          ).toBeLessThanOrEqual(LIMITS.maxVariableValueLength);
        }
      }
    }
  });

  it('declares a sample value for every variable it declares', () => {
    // A variable with no sample cannot be previewed, and the template source
    // would carry a token nothing ever demonstrates.
    for (const scenario of scenarios) {
      for (const definition of scenario.variables) {
        expect(
          scenario.sample[definition.key],
          `${scenario.key}.${definition.key} has no sample value`,
        ).toBeDefined();
      }
    }
  });

  it('uses no reserved variable names, case-insensitively', () => {
    // The reserved list itself mixes cases (EMAIL upper, contact lower), so the
    // reservation cannot be assumed case-sensitive.
    for (const scenario of scenarios) {
      for (const definition of scenario.variables) {
        expect(
          isReservedVariableKey(definition.key),
          `${scenario.key} uses reserved key ${definition.key}`,
        ).toBe(false);
      }
    }
    for (const reserved of RESERVED_VARIABLE_KEYS) {
      expect(isReservedVariableKey(reserved)).toBe(true);
      expect(isReservedVariableKey(reserved.toLowerCase())).toBe(true);
      expect(isReservedVariableKey(reserved.toUpperCase())).toBe(true);
    }
  });

  it('declares every variable exactly once per scenario', () => {
    for (const scenario of scenarios) {
      const declared = scenario.variables.map((definition) => definition.key);
      expect(new Set(declared).size, `${scenario.key} repeats a key`).toBe(declared.length);
    }
  });

  it('gives required variables no fallback and optional ones an empty one', () => {
    // A required variable must fail the send when absent rather than deliver a
    // message with a hole in it. A realistic-looking fallback would be worse:
    // plausible wrong data reaching a real person, indistinguishable downstream.
    for (const scenario of scenarios) {
      for (const declaration of templateVariableDeclarations(scenario)) {
        const definition = scenario.variables.find((v) => v.key === declaration.key)!;
        if (definition.required) {
          expect(
            'fallbackValue' in declaration,
            `${scenario.key}.${declaration.key} is required but has a fallback`,
          ).toBe(false);
        } else {
          expect(
            declaration.fallbackValue,
            `${scenario.key}.${declaration.key} is optional but has no fallback`,
          ).toBeDefined();
        }
      }
    }
  });

  it('keeps tag categories ASCII and within the length limit', () => {
    for (const scenario of scenarios) {
          expect(scenario.tagCategory).toMatch(/^[\x20-\x7E]+$/);
      expect(scenario.tagCategory.length).toBeLessThanOrEqual(LIMITS.maxTagLength);
    }
  });

  it('documents an idempotency pattern shaped <event-type>/<entity-id>', () => {
    for (const scenario of scenarios) {
      expect(
        scenario.idempotencyPattern,
        `${scenario.key} idempotency pattern`,
      ).toMatch(/^[a-z-]+\/<.+>$/);
      expect(scenario.idempotencyPattern.startsWith(`${scenario.key}/`)).toBe(true);
    }
  });
});

describe('subject builders', () => {
  it('produce a non-empty subject from the sample values', () => {
    for (const scenario of scenarios) {
      const subject = scenario.subjectBuilder(scenario.sample);
      expect(subject.trim().length, `${scenario.key} subject`).toBeGreaterThan(0);
      expect(subject.length).toBeLessThan(200);
    }
  });

  it('still produce a subject when every optional value is absent', () => {
    // A template variable an editor removed arrives as an empty string. The
    // subject must degrade, not read "Re:  ()".
    for (const scenario of scenarios) {
      const empty: Record<string, string | number> = {};
      for (const definition of scenario.variables) {
        empty[definition.key] = definition.type === 'number' ? 0 : '';
      }
      const subject = scenario.subjectBuilder(empty);
      expect(subject.trim().length, `${scenario.key} subject with empty vars`).toBeGreaterThan(0);
      expect(subject).not.toContain('  ');
      expect(subject).not.toMatch(/\(\s*\)/);
    }
  });
});

describe('idempotencyKeyFor', () => {
  it('builds <scenario>/<entity>', () => {
    expect(idempotencyKeyFor('password-reset', 'user_42')).toBe('password-reset/user_42');
  });

  it('caps at the length Resend allows', () => {
    expect(idempotencyKeyFor('welcome', 'x'.repeat(500))).toHaveLength(
      LIMITS.maxIdempotencyKeyLength,
    );
  });
});

describe('the Supabase Auth sender stays reserved', () => {
  // Supabase sends email confirmation and password reset itself, through the
  // Resend-Supabase integration, from team@researchwith.me. That address is on
  // the sending domain, so the domain guard would not catch a scenario claiming
  // it. This does: without it, a future auth scenario would quietly make the
  // same event arrive from two different sender names.
  it('is not used by any scenario, as sender or reply-to', () => {
    for (const scenario of listScenarios()) {
      expect(parseSender(scenario.from)?.address).not.toBe(SUPABASE_AUTH_SENDER);
      expect(scenario.replyTo).not.toBe(SUPABASE_AUTH_SENDER);
    }
  });

  it('is itself on the sending domain, so only this test protects it', () => {
    expect(isOnSendingDomain(SUPABASE_AUTH_SENDER)).toBe(true);
  });
});

describe('Supabase ownership', () => {
  // Supabase Auth sends email confirmation and password reset itself. Listing
  // the owned scenarios explicitly means adding one is a reviewed change rather
  // than a flag set in passing -- and removing one shows up the same way.
  it('marks exactly the auth events Supabase sends', () => {
    const owned = listScenarios()
      .filter((scenario) => scenario.ownedBySupabase)
      .map((scenario) => scenario.key)
      .sort();

    expect(owned).toEqual(['password-reset', 'verify-email']);
  });
});
