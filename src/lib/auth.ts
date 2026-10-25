import crypto from 'node:crypto';
import { db } from '@/server/db';
import type { OfficerRole } from '@prisma/client';

/**
 * Cookie name for storing the officer authentication token.
 */
export const AUTH_COOKIE_NAME = 'aicte_officer_session';

/**
 * Default token validity: 24 hours.
 */
export const DEFAULT_SESSION_EXPIRY_SECONDS = 86400;

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
 * Payload encoded inside the cryptographically signed JWT.
 */
export interface OfficerTokenPayload {
  sub: string;
  badgeNumber: string;
  name: string;
  email: string;
  role: OfficerRole;
  bureauId: string;
  iat: number;
  exp: number;
}

/**
 * Resolves the secret key used for signing session tokens.
 * Enforces production invariants: in production, a secret MUST be configured.
 */
export function getAuthSecret(): string {
  const secret =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET;

  if (secret && secret.trim().length >= 16) {
    return secret.trim();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CRITICAL_AUTH_ERROR: AUTH_SECRET or NEXTAUTH_SECRET must be configured in production (minimum 16 characters).'
    );
  }

  // Deterministic development fallback strictly for non-production environments
  return 'sih26264-insecure-dev-signing-secret-replace-in-production';
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Generates a cryptographically signed HMAC-SHA256 JWT for an authenticated officer.
 */
export function signOfficerToken(
  officer: AuthenticatedOfficer,
  expiresInSeconds: number = DEFAULT_SESSION_EXPIRY_SECONDS
): string {
  const secret = getAuthSecret();
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload: OfficerTokenPayload = {
    sub: officer.id,
    badgeNumber: officer.badgeNumber,
    name: officer.name,
    email: officer.email,
    role: officer.role,
    bureauId: officer.bureauId,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signature}`;
}

/**
 * Cryptographically verifies an HMAC-SHA256 token and checks expiration.
 * Returns decoded payload if valid; returns null if signature is invalid, expired, or tampered.
 */
export function verifyOfficerToken(token: string): OfficerTokenPayload | null {
  try {
    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, sigB64] = parts;
    const data = `${headerB64}.${payloadB64}`;
    const secret = getAuthSecret();

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    // Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(sigB64);
    const expectedBuffer = Buffer.from(expectedSig);
    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return null;
    }

    const payloadJson = base64UrlDecode(payloadB64);
    const payload = JSON.parse(payloadJson) as OfficerTokenPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts raw session token from standard HTTP request sources:
 * 1. Authorization: Bearer <token>
 * 2. Cookie: aicte_officer_session=<token>
 */
export function extractTokenFromRequest(request: Request): string | null {
  // 1. Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  // 2. Check Cookie header
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const [name, ...rest] = cookie.trim().split('=');
      if (name === AUTH_COOKIE_NAME) {
        const value = rest.join('=').trim();
        if (value) return decodeURIComponent(value);
      }
    }
  }

  return null;
}

/**
 * Server-side identity resolver for verifying the authenticated officer.
 *
 * Verifies signed session token (Bearer or HttpOnly cookie), verifies payload
 * authenticity, and validates that the officer exists and remains active in PostgreSQL.
 *
 * Fails closed (returns null) on invalid signature, expired token, or inactive officer.
 */
export async function resolveAuthenticatedOfficer(
  request: Request
): Promise<AuthenticatedOfficer | null> {
  const token = extractTokenFromRequest(request);
  if (!token) {
    return null;
  }

  const payload = verifyOfficerToken(token);
  if (!payload || !payload.sub) {
    return null;
  }

  try {
    const officer = await db.officer.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        badgeNumber: true,
        name: true,
        email: true,
        bureauId: true,
        role: true,
        isActive: true,
      },
    });

    if (!officer || !officer.isActive) {
      return null;
    }

    return {
      id: officer.id,
      badgeNumber: officer.badgeNumber,
      name: officer.name,
      email: officer.email,
      bureauId: officer.bureauId,
      role: officer.role,
    };
  } catch {
    return null;
  }
}
