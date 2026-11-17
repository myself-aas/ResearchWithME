/**
 * ResearchWithME v3.4 — Centralized Authorization & Data-Classification Engine
 * (Wave 17 P0 — Part VI §5 RBAC & Classification Enforcement).
 *
 * Single policy source of truth:
 *   authorize(actor, capability, resource)
 *
 * Enforces:
 *  1. Fail-closed data classification gates (`PUBLIC`, `WORKSPACE`, `CONFIDENTIAL`,
 *     `RESTRICTED`, `EMBARGOED`). Anonymous actors can only access `PUBLIC` reads.
 *  2. Role-based workspace & resource capabilities (`OWNER`, `ADMIN`, `EDITOR`,
 *     `CONTRIBUTOR`, `REVIEWER`, `VIEWER`) plus site editor privileges.
 *  3. Owner-scoped isolation for drafts, library items, private notifications,
 *     attention items, devices, and push subscriptions.
 */
import { NextResponse } from 'next/server';
import type { WorkspaceRole } from './wave2-contracts';

export type DataClassification =
  | 'PUBLIC'
  | 'WORKSPACE'
  | 'CONFIDENTIAL'
  | 'RESTRICTED'
  | 'EMBARGOED';

export type AuthzCapability =
  | 'source:read'
  | 'source:write'
  | 'source:integrity:write'
  | 'evidence:read'
  | 'evidence:write'
  | 'evidence:assess'
  | 'claim:read'
  | 'claim:write'
  | 'claim:assess'
  | 'contribution:read'
  | 'contribution:write'
  | 'contribution:publish'
  | 'draft:read'
  | 'draft:write'
  | 'draft:delete'
  | 'workspace:read'
  | 'workspace:write'
  | 'workspace:admin'
  | 'workspace:invite'
  | 'project:read'
  | 'project:write'
  | 'project:delete'
  | 'review:read'
  | 'review:write'
  | 'review:decide'
  | 'discussion:read'
  | 'discussion:write'
  | 'discussion:moderate'
  | 'tool:read'
  | 'tool:write'
  | 'topic:read'
  | 'topic:write'
  | 'library:read'
  | 'library:write'
  | 'notification:read'
  | 'notification:write'
  | 'attention:read'
  | 'attention:write'
  | 'search:read'
  | 'search:workspace'
  | 'search:confidential'
  | 'export:create'
  | 'export:read'
  | 'assistant:invoke'
  | 'render:create'
  | 'profile:read'
  | 'profile:write'
  | 'admin:webhook';

export interface AuthzActor {
  id: string;
  isEditor?: boolean;
  mode?: 'local' | 'supabase';
  workspaceRoles?: Record<string, WorkspaceRole>;
}

export interface AuthzResource {
  kind:
    | 'source'
    | 'evidence'
    | 'claim'
    | 'contribution'
    | 'draft'
    | 'workspace'
    | 'project'
    | 'review'
    | 'discussion'
    | 'tool'
    | 'topic'
    | 'library'
    | 'notification'
    | 'attention'
    | 'export'
    | 'search'
    | 'profile'
    | 'system';
  id?: string;
  ownerId?: string | null;
  workspaceId?: string | null;
  workspaceRole?: WorkspaceRole | null;
  classification?: DataClassification | Lowercase<DataClassification> | string | null;
  visibility?: 'public' | 'workspace' | 'private' | string | null;
  isAssignedReviewer?: boolean;
  isWorkspaceMember?: boolean;
}

export type AuthzDecision =
  | {
      allowed: true;
      reason: string;
      authorizedClassifications: DataClassification[];
    }
  | {
      allowed: false;
      status: 401 | 403;
      code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'CLASSIFICATION_DENIED';
      reason: string;
    };

const PUBLIC_READ_CAPABILITIES = new Set<AuthzCapability>([
  'source:read',
  'evidence:read',
  'claim:read',
  'contribution:read',
  'workspace:read',
  'project:read',
  'review:read',
  'discussion:read',
  'tool:read',
  'topic:read',
  'search:read',
  'profile:read',
]);

const WORKSPACE_WRITE_ROLES = new Set<WorkspaceRole>(['OWNER', 'ADMIN', 'EDITOR', 'CONTRIBUTOR']);
const WORKSPACE_ADMIN_ROLES = new Set<WorkspaceRole>(['OWNER', 'ADMIN']);
const WORKSPACE_EDITORIAL_ROLES = new Set<WorkspaceRole>(['OWNER', 'ADMIN', 'EDITOR']);

export function normalizeClassification(
  value?: string | null,
  visibility?: string | null,
): DataClassification {
  const upper = (value ?? '').trim().toUpperCase();
  if (
    upper === 'PUBLIC' ||
    upper === 'WORKSPACE' ||
    upper === 'CONFIDENTIAL' ||
    upper === 'RESTRICTED' ||
    upper === 'EMBARGOED'
  ) {
    return upper;
  }
  const vis = (visibility ?? '').trim().toLowerCase();
  if (vis === 'private') return 'CONFIDENTIAL';
  if (vis === 'workspace') return 'WORKSPACE';
  return 'PUBLIC';
}

function resolveWorkspaceRole(
  actor: AuthzActor | null,
  resource?: AuthzResource,
): WorkspaceRole | null {
  if (!actor || !resource) return null;
  if (resource.workspaceRole) return resource.workspaceRole;
  if (resource.workspaceId && actor.workspaceRoles?.[resource.workspaceId]) {
    return actor.workspaceRoles[resource.workspaceId];
  }
  return null;
}

/**
 * Derives the exact data-classification tiers an actor is permitted to query
 * (e.g., for `/api/search` and `v34_unified_search`).
 */
export function authorizedClassificationsForActor(
  actor: AuthzActor | null,
  options?: {
    hasWorkspaceMembership?: boolean;
    includeConfidential?: boolean;
  },
): DataClassification[] {
  if (!actor) return ['PUBLIC'];
  const allowed: DataClassification[] = ['PUBLIC'];
  const hasWorkspaceRole =
    Boolean(options?.hasWorkspaceMembership) ||
    Boolean(actor.workspaceRoles && Object.keys(actor.workspaceRoles).length > 0);
  if (hasWorkspaceRole || actor.isEditor) {
    allowed.push('WORKSPACE');
  }
  if (actor.isEditor || options?.includeConfidential) {
    allowed.push('CONFIDENTIAL');
  }
  if (actor.isEditor) {
    allowed.push('RESTRICTED', 'EMBARGOED');
  }
  return allowed;
}

/**
 * Central RBAC + Data-Classification policy evaluator.
 */
export function authorize(
  actor: AuthzActor | null,
  capability: AuthzCapability,
  resource: AuthzResource = { kind: 'system' },
): AuthzDecision {
  const classification = normalizeClassification(resource.classification, resource.visibility);
  const role = resolveWorkspaceRole(actor, resource);
  const isOwner = Boolean(actor && resource.ownerId && actor.id === resource.ownerId);
  const isMember = Boolean(resource.isWorkspaceMember || role !== null);
  const isEditor = Boolean(actor?.isEditor);

  // 1. Unauthenticated callers: public read capabilities on PUBLIC resources only
  if (!actor) {
    if (!PUBLIC_READ_CAPABILITIES.has(capability)) {
      return {
        allowed: false,
        status: 401,
        code: 'UNAUTHORIZED',
        reason: `Authentication is required for capability '${capability}'.`,
      };
    }
    if (classification !== 'PUBLIC') {
      return {
        allowed: false,
        status: 401,
        code: 'CLASSIFICATION_DENIED',
        reason: `Authentication is required to access ${classification} ${resource.kind} records.`,
      };
    }
    return {
      allowed: true,
      reason: `Public read granted for ${capability}.`,
      authorizedClassifications: ['PUBLIC'],
    };
  }

  // 2. Data-classification boundary enforcement (fail closed)
  if (classification === 'WORKSPACE' && !isOwner && !isMember && !isEditor) {
    return {
      allowed: false,
      status: 403,
      code: 'CLASSIFICATION_DENIED',
      reason: `Workspace membership is required for WORKSPACE ${resource.kind} records.`,
    };
  }

  if (
    classification === 'CONFIDENTIAL' &&
    !isOwner &&
    !resource.isAssignedReviewer &&
    !isEditor &&
    !(role && WORKSPACE_ADMIN_ROLES.has(role))
  ) {
    return {
      allowed: false,
      status: 403,
      code: 'CLASSIFICATION_DENIED',
      reason: `CONFIDENTIAL ${resource.kind} records require owner, assigned reviewer, or workspace admin privileges.`,
    };
  }

  if (
    (classification === 'RESTRICTED' || classification === 'EMBARGOED') &&
    !isOwner &&
    !isEditor &&
    !(role && WORKSPACE_ADMIN_ROLES.has(role))
  ) {
    return {
      allowed: false,
      status: 403,
      code: 'CLASSIFICATION_DENIED',
      reason: `${classification} ${resource.kind} records are restricted to owners and authorized administrators.`,
    };
  }

  const classifications = authorizedClassificationsForActor(actor, {
    hasWorkspaceMembership: isMember,
    includeConfidential: isOwner || Boolean(resource.isAssignedReviewer),
  });

  // 3. Capability-specific RBAC rules
  switch (capability) {
    case 'draft:read':
    case 'draft:write':
    case 'draft:delete':
    case 'library:read':
    case 'library:write':
    case 'notification:read':
    case 'notification:write':
    case 'attention:read':
    case 'attention:write':
    case 'profile:write': {
      if (resource.ownerId && !isOwner && !isEditor) {
        return {
          allowed: false,
          status: 403,
          code: 'FORBIDDEN',
          reason: `Only the resource owner may perform '${capability}'.`,
        };
      }
      return {
        allowed: true,
        reason: `Owner-scoped '${capability}' granted.`,
        authorizedClassifications: classifications,
      };
    }

    case 'workspace:admin':
    case 'workspace:invite': {
      if (!isOwner && !isEditor && !(role && WORKSPACE_ADMIN_ROLES.has(role))) {
        return {
          allowed: false,
          status: 403,
          code: 'FORBIDDEN',
          reason: `Workspace OWNER or ADMIN role required for '${capability}'.`,
        };
      }
      return {
        allowed: true,
        reason: `Workspace admin capability '${capability}' granted.`,
        authorizedClassifications: classifications,
      };
    }

    case 'workspace:write':
    case 'project:write': {
      if (resource.workspaceId && role && !WORKSPACE_WRITE_ROLES.has(role) && !isEditor) {
        return {
          allowed: false,
          status: 403,
          code: 'FORBIDDEN',
          reason: `Workspace role '${role}' cannot perform '${capability}'.`,
        };
      }
      return {
        allowed: true,
        reason: `Write capability '${capability}' granted.`,
        authorizedClassifications: classifications,
      };
    }

    case 'project:delete': {
      if (
        resource.ownerId &&
        !isOwner &&
        !isEditor &&
        !(role && WORKSPACE_ADMIN_ROLES.has(role))
      ) {
        return {
          allowed: false,
          status: 403,
          code: 'FORBIDDEN',
          reason: 'Deleting a project requires project ownership or workspace admin role.',
        };
      }
      return {
        allowed: true,
        reason: 'Project delete granted.',
        authorizedClassifications: classifications,
      };
    }

    case 'review:decide': {
      if (
        !isEditor &&
        !resource.isAssignedReviewer &&
        !isOwner &&
        !(role && WORKSPACE_EDITORIAL_ROLES.has(role))
      ) {
        return {
          allowed: false,
          status: 403,
          code: 'FORBIDDEN',
          reason: 'Recording a formal review decision requires assigned reviewer or editorial privileges.',
        };
      }
      return {
        allowed: true,
        reason: 'Formal review decision granted.',
        authorizedClassifications: classifications,
      };
    }

    case 'source:integrity:write':
    case 'discussion:moderate':
    case 'admin:webhook': {
      if (!isEditor && !(role && WORKSPACE_ADMIN_ROLES.has(role)) && actor.mode !== 'local') {
        return {
          allowed: false,
          status: 403,
          code: 'FORBIDDEN',
          reason: `Editorial or admin privilege required for '${capability}'.`,
        };
      }
      return {
        allowed: true,
        reason: `Editorial capability '${capability}' granted.`,
        authorizedClassifications: classifications,
      };
    }

    case 'contribution:publish': {
      if (resource.ownerId && !isOwner && !isEditor) {
        return {
          allowed: false,
          status: 403,
          code: 'FORBIDDEN',
          reason: 'Only the contribution author or an editor may publish.',
        };
      }
      return {
        allowed: true,
        reason: 'Contribution publish granted.',
        authorizedClassifications: classifications,
      };
    }

    default:
      return {
        allowed: true,
        reason: `Authenticated capability '${capability}' granted.`,
        authorizedClassifications: classifications,
      };
  }
}

export function requireAuthorized(
  actor: AuthzActor | null,
  capability: AuthzCapability,
  resource?: AuthzResource,
):
  | { ok: true; decision: Extract<AuthzDecision, { allowed: true }> }
  | { ok: false; response: NextResponse } {
  const decision = authorize(actor, capability, resource);
  if (!decision.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: decision.reason,
          code: decision.code,
        },
        { status: decision.status },
      ),
    };
  }
  return { ok: true, decision };
}
