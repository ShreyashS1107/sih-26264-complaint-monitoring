import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_COOKIE_NAME,
  extractTokenFromRequest,
  getAuthSecret,
  resolveAuthenticatedOfficer,
  signOfficerToken,
  verifyOfficerToken,
} from '@/lib/auth';
import { db } from '@/server/db';

describe('Authentication Module (src/lib/auth.ts)', () => {
  const mockOfficer = {
    id: 'test-officer-uuid-001',
    badgeNumber: 'OFF-AICTE-001',
    name: 'Case Officer Alpha',
    email: 'officer.alpha@demo.aicte.internal',
    bureauId: 'bureau-uuid-001',
    role: 'CASE_OFFICER' as const,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should resolve development secret when non-production and secret is unset', () => {
    const secret = getAuthSecret();
    expect(typeof secret).toBe('string');
    expect(secret.length).toBeGreaterThanOrEqual(16);
  });

  it('should sign and successfully verify a valid HMAC-SHA256 officer token', () => {
    const token = signOfficerToken(mockOfficer, 3600);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);

    const payload = verifyOfficerToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe(mockOfficer.id);
    expect(payload?.badgeNumber).toBe(mockOfficer.badgeNumber);
    expect(payload?.role).toBe(mockOfficer.role);
    expect(payload?.bureauId).toBe(mockOfficer.bureauId);
    expect(payload?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('should reject a token with tampered signature', () => {
    const token = signOfficerToken(mockOfficer, 3600);
    const parts = token.split('.');
    const tamperedToken = `${parts[0]}.${parts[1]}.invalidsignature123`;

    const payload = verifyOfficerToken(tamperedToken);
    expect(payload).toBeNull();
  });

  it('should reject an expired token', () => {
    // Negative duration creates an already-expired token
    const token = signOfficerToken(mockOfficer, -10);
    const payload = verifyOfficerToken(token);
    expect(payload).toBeNull();
  });

  it('should reject malformed token strings', () => {
    expect(verifyOfficerToken('')).toBeNull();
    expect(verifyOfficerToken('not.a.valid.jwt.token')).toBeNull();
    expect(verifyOfficerToken('random-garbage')).toBeNull();
  });

  it('should extract token from Authorization: Bearer header', () => {
    const token = 'sample.bearer.token';
    const req = new Request('http://localhost:3000/api/v1/complaints', {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(extractTokenFromRequest(req)).toBe(token);
  });

  it('should extract token from Cookie header', () => {
    const token = 'sample.cookie.token';
    const req = new Request('http://localhost:3000/api/v1/complaints', {
      headers: {
        cookie: `other_cookie=value; ${AUTH_COOKIE_NAME}=${token}; yet_another=123`,
      },
    });

    expect(extractTokenFromRequest(req)).toBe(token);
  });

  it('should return null when neither Authorization nor Cookie is provided', () => {
    const req = new Request('http://localhost:3000/api/v1/complaints');
    expect(extractTokenFromRequest(req)).toBeNull();
  });

  it('should resolve authenticated officer from database with valid token', async () => {
    const token = signOfficerToken(mockOfficer, 3600);
    const req = new Request('http://localhost:3000/api/v1/complaints', {
      headers: { authorization: `Bearer ${token}` },
    });

    vi.spyOn(db.officer, 'findUnique').mockResolvedValue({
      id: mockOfficer.id,
      badgeNumber: mockOfficer.badgeNumber,
      name: mockOfficer.name,
      email: mockOfficer.email,
      bureauId: mockOfficer.bureauId,
      role: mockOfficer.role,
      isActive: true,
    } as any);

    const officer = await resolveAuthenticatedOfficer(req);
    expect(officer).not.toBeNull();
    expect(officer?.id).toBe(mockOfficer.id);
    expect(officer?.badgeNumber).toBe(mockOfficer.badgeNumber);
    expect(officer?.role).toBe('CASE_OFFICER');
  });

  it('should fail closed (return null) if officer is inactive in database', async () => {
    const token = signOfficerToken(mockOfficer, 3600);
    const req = new Request('http://localhost:3000/api/v1/complaints', {
      headers: { authorization: `Bearer ${token}` },
    });

    vi.spyOn(db.officer, 'findUnique').mockResolvedValue({
      id: mockOfficer.id,
      isActive: false, // Inactive officer account
    } as any);

    const officer = await resolveAuthenticatedOfficer(req);
    expect(officer).toBeNull();
  });

  it('should fail closed (return null) if officer is not found in database', async () => {
    const token = signOfficerToken(mockOfficer, 3600);
    const req = new Request('http://localhost:3000/api/v1/complaints', {
      headers: { authorization: `Bearer ${token}` },
    });

    vi.spyOn(db.officer, 'findUnique').mockResolvedValue(null);

    const officer = await resolveAuthenticatedOfficer(req);
    expect(officer).toBeNull();
  });
});
