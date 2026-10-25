import type { OfficerRole } from '@prisma/client';

/**
 * Authenticated officer identity payload resolved from a trusted server-side session.
 */
export interface AuthenticatedOfficer {
  id: string;
  badgeNumber: string;
  name: string;
  email: string;
  bureauId: string;
  role: OfficerRole;
}

/**
 * Server-side identity integration point for resolving the authenticated officer.
 *
 * Currently, no trusted identity provider (such as NextAuth, session store, or signed JWT)
 * is configured in this repository.
 *
 * SECURITY INVARIANT:
 * This integration point MUST NOT accept spoofable client headers (e.g., X-Officer-Badge, X-Officer-ID),
 * unverified client cookies, or client-supplied credentials in the request body.
 *
 * In the absence of a genuine, verified identity provider, this function safely returns `null`
 * so callers can fail closed (HTTP 401 Unauthorized) before executing sensitive mutations.
 *
 * @param _request - Incoming Next.js / Fetch Request
 * @returns AuthenticatedOfficer if verified by a trusted provider, otherwise null
 */
export async function resolveAuthenticatedOfficer(
  _request: Request
): Promise<AuthenticatedOfficer | null> {
  // Fail closed until a genuine, cryptographically verified identity provider is configured.
  return null;
}
