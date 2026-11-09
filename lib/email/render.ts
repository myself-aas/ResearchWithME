import * as React from 'react';
import { render, toPlainText } from '@react-email/render';
import { SCENARIO_COMPONENTS } from './components';
import {
  LIMITS,
  type ScenarioDefinition,
  type ScenarioVariables,
  isReservedVariableKey,
} from './scenarios';

/**
 * Turning a scenario and its variables into bodies, and into the source of the
 * template that gets uploaded to Resend.
 *
 * Both come from the same component. That is what keeps the locally rendered
 * fallback and the uploaded template from drifting apart -- there is one
 * description of what the message looks like, and two ways of delivering it.
 */

/**
 * `toPlainText` takes the rendered HTML, not the element -- passing the element
 * does not fail loudly, it reaches the parser and throws deep inside
 * htmlparser2.
 *
 * The default conversion also mangles two things these templates rely on:
 *
 * - `h1` is uppercased, so a heading reads "THANK YOU, DR. AMARA OKONKWO." and
 *   a `{{{AUTHOR_NAME}}}` token becomes `{{{AUTHOR_NAME}}}` in caps -- which,
 *   for a camelCase key, silently stops matching and renders as literal text.
 * - Adjacent `<td>` cells get no separator, so a label/value table flattens to
 *   "ReferenceRWM-2026-7QXTR3".
 *
 * Both are block-level here, which fixes the text without changing the HTML.
 */
const PLAIN_TEXT_SELECTORS = [
  { selector: 'h1', format: 'block' as const },
  { selector: 'td', format: 'block' as const },
];

/** Component props are camelCase; template variables are UPPER_SNAKE. */
function toPropName(key: string): string {
  const parts = key.split('_');
  return parts[0].toLowerCase() + parts.slice(1).map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join('');
}

/**
 * Maps a template-variable bag onto the component's camelCase props.
 *
 * Values are coerced to strings for string-typed props and to numbers for
 * number-typed ones, because a component prop is typed and a Resend variable is
 * only `string | number`. A number arriving as a string would otherwise reach a
 * `number` prop and render as `NaN` arithmetic if the component did anything
 * with it.
 */
export function toComponentProps(
  scenario: ScenarioDefinition,
  variables: ScenarioVariables,
): Record<string, string | number> {
  const props: Record<string, string | number> = {};
  for (const definition of scenario.variables) {
    const raw = variables[definition.key];
    const propName = toPropName(definition.key);
    if (raw === undefined || raw === null) {
      props[propName] = definition.type === 'number' ? 0 : '';
      continue;
    }
    if (definition.type === 'number') {
      // A `{{{TOKEN}}}` placeholder is a string standing in for a value that is
      // not known yet. Coercing it would give Number('{{{X}}}') === NaN, so the
      // token would be replaced by 0 and the uploaded template would carry no
      // placeholder at all -- every numeric variable would render as a literal
      // zero for every recipient.
      if (typeof raw === 'string' && isMustacheToken(raw)) {
        props[propName] = raw;
        continue;
      }
      const parsed = typeof raw === 'number' ? raw : Number(String(raw).trim());
      props[propName] = Number.isFinite(parsed) ? parsed : 0;
    } else {
      props[propName] = String(raw);
    }
  }
  return props;
}

export interface RenderedBodies {
  html: string;
  text: string;
}

/**
 * Renders a scenario locally. Used for the fallback send mode, which is the
 * only mode that can carry a plain-text part.
 */
export async function renderScenario(
  scenario: ScenarioDefinition,
  variables: ScenarioVariables,
): Promise<RenderedBodies> {
  const Component = SCENARIO_COMPONENTS[
    scenario.key as keyof typeof SCENARIO_COMPONENTS
  ];
  if (!Component) {
    throw new Error(`No component registered for scenario "${scenario.key}".`);
  }

  const element = React.createElement(
    Component as React.ComponentType<Record<string, never>>,
    toComponentProps(scenario, variables) as Record<string, never>,
  );
  const html = await render(element);

  return {
    html,
    text: toPlainText(html, { selectors: PLAIN_TEXT_SELECTORS }),
  };
}

/** `{{{KEY}}}`, the token Resend substitutes in an uploaded template. */
export function mustache(key: string): string {
  return '{{{' + key + '}}}';
}

/** True for a `{{{...}}}` placeholder rather than a real value. */
export function isMustacheToken(value: string): boolean {
  return /^\{\{\{[A-Za-z0-9_]+\}\}\}$/.test(value.trim());
}

/**
 * Validates a variable bag against the scenario contract before anything is
 * sent or uploaded. Returns the problems rather than throwing, so a caller can
 * report all of them at once.
 */
export function validateVariables(
  scenario: ScenarioDefinition,
  variables: ScenarioVariables,
): string[] {
  const problems: string[] = [];
  const declared = new Set(scenario.variables.map((definition) => definition.key));

  for (const key of Object.keys(variables)) {
    if (!declared.has(key)) {
      problems.push(`"${key}" is not declared by scenario "${scenario.key}".`);
    }
    const value = variables[key];
    const kind = typeof value;
    if (kind !== 'string' && kind !== 'number') {
      problems.push(`"${key}" must be a string or number, got ${kind}.`);
      continue;
    }
    if (kind === 'string' && (value as string).length > LIMITS.maxVariableValueLength) {
      problems.push(
        `"${key}" is ${(value as string).length} characters; the limit is ${LIMITS.maxVariableValueLength}.`,
      );
    }
  }

  for (const definition of scenario.variables) {
    if (definition.required) {
      const value = variables[definition.key];
      if (value === undefined || value === null || String(value).trim() === '') {
        problems.push(
          `"${definition.key}" is required by scenario "${scenario.key}" and is missing.`,
        );
      }
    }
  }

  return problems;
}

/**
 * The declarations Resend wants when a template is created or updated.
 *
 * A discriminated union, matching Resend's own type: a single
 * `type: 'string' | 'number'` with a union `fallbackValue` is not assignable to
 * theirs, because theirs ties the fallback's type to the discriminator.
 */
export type TemplateVariableDeclaration =
  | { key: string; type: 'string'; fallbackValue?: string | null }
  | { key: string; type: 'number'; fallbackValue?: number | null };

/**
 * A scenario's variables as Resend declarations.
 *
 * Required variables deliberately get **no** fallback, so Resend rejects a send
 * that is missing one instead of delivering a message with a hole in it.
 * Optional variables get `''`, so the message still sends and the component
 * hides the row.
 *
 * The tempting alternative -- a realistic fallback for everything -- is worse:
 * it delivers plausible wrong data to a real person, and nothing downstream can
 * tell it was a fallback.
 */
export function templateVariableDeclarations(
  scenario: ScenarioDefinition,
): TemplateVariableDeclaration[] {
  return scenario.variables.map((definition) => {
    if (isReservedVariableKey(definition.key)) {
      throw new Error(
        `"${definition.key}" is a reserved Resend variable name and cannot be used.`,
      );
    }
    if (definition.key.length > LIMITS.maxVariableKeyLength) {
      throw new Error(
        `"${definition.key}" is ${definition.key.length} characters; the limit is ${LIMITS.maxVariableKeyLength}.`,
      );
    }
    if (definition.required) {
      return definition.type === 'number'
        ? { key: definition.key, type: 'number' as const }
        : { key: definition.key, type: 'string' as const };
    }
    return definition.type === 'number'
      ? { key: definition.key, type: 'number' as const, fallbackValue: 0 }
      : { key: definition.key, type: 'string' as const, fallbackValue: '' };
  });
}

export interface TemplateSource {
  name: string;
  alias: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  variables: TemplateVariableDeclaration[];
}

/**
 * The template source to upload for a scenario, rendered from its component
 * with `{{{KEY}}}` tokens standing in for values.
 *
 * React escapes interpolated children, but braces are not HTML metacharacters,
 * so the tokens survive intact -- which is what lets one component produce both
 * a real email and a template.
 *
 * `text` is included even though a `template` send cannot carry `text` in its
 * payload: a Template holds a text body of its own, so the multipart
 * alternative survives the template path as long as the uploaded template has
 * one.
 */
export async function buildTemplateSource(
  scenario: ScenarioDefinition,
): Promise<TemplateSource> {
  const declarations = templateVariableDeclarations(scenario);

  if (declarations.length > LIMITS.maxVariablesPerTemplate) {
    throw new Error(
      `Scenario "${scenario.key}" declares ${declarations.length} variables; ` +
        `Resend allows ${LIMITS.maxVariablesPerTemplate} per template.`,
    );
  }

  const tokens: ScenarioVariables = {};
  for (const definition of declarations) {
    tokens[definition.key] = mustache(definition.key);
  }

  const { html, text } = await renderScenario(scenario, tokens);

  return {
    name: scenario.templateAlias,
    alias: scenario.templateAlias,
    from: scenario.from,
    subject: scenario.subjectBuilder(tokens),
    html,
    text,
    variables: declarations,
  };
}
