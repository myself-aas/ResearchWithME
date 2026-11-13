import PasswordReset from '@/emails/password-reset';
import SecurityAlert from '@/emails/security-alert';
import SupportReply from '@/emails/support-reply';
import VerifyEmail from '@/emails/verify-email';
import Welcome from '@/emails/welcome';

/**
 * Scenario key to React Email component.
 *
 * Kept in its own module so scenarios.ts stays free of JSX imports and the
 * components are referenced in exactly one place. A scenario added to the
 * registry without a component here fails the registry test, which is the
 * point: the registry and the emails/ directory cannot silently disagree.
 */
export const SCENARIO_COMPONENTS = {
  welcome: Welcome,
  'verify-email': VerifyEmail,
  'password-reset': PasswordReset,
  'security-alert': SecurityAlert,
  'support-reply': SupportReply,
} as const;

export type ComponentKey = keyof typeof SCENARIO_COMPONENTS;
