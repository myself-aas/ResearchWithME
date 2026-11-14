/**
 * Shared vocabulary for writer applications, used by both the API routes and the
 * dashboard pages.
 */

/** A row of public.author_applications as the API returns it. */
export interface AuthorApplication {
  id: number;
  user_id: string;
  provider: ApplicationProvider;
  handle: string;
  display_name: string;
  statement: string;
  status: ApplicationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string;
  created_at: string;
  updated_at: string;
}

export const APPLICATION_PROVIDERS = ['github', 'orcid'] as const;
export type ApplicationProvider = (typeof APPLICATION_PROVIDERS)[number];

export const APPLICATION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/**
 * Maps the exception codes raised by the `apply_as_author` and
 * `review_author_application` functions onto copy a reader can act on. The
 * database raises short codes, never a message worth showing verbatim.
 */
export function applicationErrorMessage(raw: string): string {
  const code = raw.toLowerCase();
  if (code.includes('already_editor')) {
    return 'This account already has publishing access.';
  }
  if (code.includes('not_editor')) {
    return 'Only an editor can review applications.';
  }
  if (code.includes('not_authenticated')) {
    return 'Sign in before applying to write.';
  }
  if (code.includes('identity_not_linked')) {
    return 'That account is not connected to yours yet. Connect GitHub or ORCID above, then apply.';
  }
  if (code.includes('unsupported_provider')) {
    return 'Connect a GitHub or ORCID identity before applying.';
  }
  if (code.includes('handle_required')) {
    return 'The connected account did not share a username or ORCID iD we can cite. Reconnect it, or contact the editor.';
  }
  if (code.includes('name_required')) {
    return 'Add the name to publish under.';
  }
  if (code.includes('not_found')) {
    return 'That application no longer exists.';
  }
  if (code.includes('duplicate') || code.includes('author_applications_one_pending')) {
    return 'An application is already under review for this account.';
  }
  return 'The application could not be saved. Check the details and try again.';
}
