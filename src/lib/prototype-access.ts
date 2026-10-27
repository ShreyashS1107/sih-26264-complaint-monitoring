/**
 * SIH 26264 - Prototype Access Management & Security Configuration
 *
 * This module controls application access boundaries for demonstration and evaluation.
 * In prototype access mode (the default), the officer login requirement is lifted,
 * allowing evaluators to directly access the operational dashboard, submit complaints,
 * update case statuses, and review cross-bureau overlap candidates without credentials.
 *
 * Security Model & Safeguards:
 * 1. Mode Configuration:
 *    - 'open' (default): Full prototype access for demonstration and testing.
 *      Mutations are permitted without officer credentials and are attributed to
 *      'PROTOTYPE_REVIEWER' with actorId: null (preserving tamper-evident audit logs
 *      without fabricating synthetic database identities).
 *    - 'read-only': Public demonstration mode where mutations (POST/PATCH) are safely
 *      blocked with HTTP 403, preventing unauthorized data modification on public URLs.
 *    - 'authenticated': Production-locked mode where mutations require a verified HMAC session.
 *
 * 2. Audit Trail Integrity:
 *    - All mutations performed in prototype mode explicitly set `actorId: null`,
 *      `actorRole: 'PROTOTYPE_REVIEWER'`, and `prototypeAccess: true` in audit logs
 *      and CaseAction timelines.
 *    - No synthetic or arbitrary officer credentials, fake tokens, or simulated
 *      database records are invented.
 */

import { AuthenticatedOfficer } from './auth';

export type PrototypeAccessMode = 'open' | 'read-only' | 'authenticated';

export const PROTOTYPE_ACTOR_ROLE = 'PROTOTYPE_REVIEWER';
export const PROTOTYPE_ACTOR_NAME = 'Apex Scrutiny Reviewer (Prototype)';

/**
 * Resolves the active access mode from environment variables.
 * Defaults to 'open' for seamless prototype demonstration.
 */
export function getPrototypeAccessMode(): PrototypeAccessMode {
  const mode = process.env.PROTOTYPE_ACCESS_MODE?.toLowerCase()?.trim();
  if (mode === 'read-only' || mode === 'readonly') {
    return 'read-only';
  }
  if (
    mode === 'authenticated' ||
    process.env.PROTOTYPE_MODE === 'false' ||
    process.env.REQUIRE_OFFICER_AUTH === 'true'
  ) {
    return 'authenticated';
  }
  return 'open';
}

export interface PrototypeAccessCheckResult {
  allowed: boolean;
  officer: AuthenticatedOfficer | null;
  isPrototype: boolean;
  error?: string;
  status?: number;
  message?: string;
}

/**
 * Evaluates whether a write/mutation operation is authorized in the current access mode.
 *
 * - If a valid AuthenticatedOfficer is present, the request is always authorized as that officer.
 * - If no officer is present and mode is 'open', the mutation is authorized under prototype mode.
 * - If no officer is present and mode is 'read-only', the mutation is rejected with 403.
 * - If no officer is present and mode is 'authenticated', the mutation is rejected with 401.
 */
export function checkPrototypeMutationAccess(
  _request: Request,
  officer: AuthenticatedOfficer | null
): PrototypeAccessCheckResult {
  if (officer) {
    return {
      allowed: true,
      officer,
      isPrototype: false,
    };
  }

  const mode = getPrototypeAccessMode();

  if (mode === 'read-only') {
    return {
      allowed: false,
      officer: null,
      isPrototype: true,
      error: 'PROTOTYPE_READ_ONLY',
      status: 403,
      message:
        'The application is running in read-only prototype mode. Complaint creation and modifications are disabled in this environment.',
    };
  }

  if (mode === 'authenticated') {
    return {
      allowed: false,
      officer: null,
      isPrototype: false,
      error: 'UNAUTHORIZED',
      status: 401,
      message: 'Authentication required. This deployment requires verified officer credentials.',
    };
  }

  // Default 'open' prototype mode
  return {
    allowed: true,
    officer: null,
    isPrototype: true,
  };
}
