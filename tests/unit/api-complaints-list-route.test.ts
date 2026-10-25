import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/v1/complaints/route';
import { db } from '@/server/db';

describe('GET /api/v1/complaints Route Handler', () => {
  const sampleComplaints = [
    {
      id: 'cmp_001',
      complaintNumber: 'CMP-2026-0001',
      originalBureauRef: 'APP/2026/G-881',
      institutionId: 'inst_001',
      bureauId: 'bureau_001',
      assignedOfficerId: 'officer_001',
      subject: 'Discrepancy in student intake',
      description: 'Admitted 180 students instead of approved 120.',
      category: 'UNAPPROVED_PROGRAM',
      priority: 'HIGH',
      status: 'UNDER_INQUIRY',
      incidentDate: null,
      complainantType: 'CITIZEN',
      complainantMaskedId: 'CIT-***-4410',
      resolvedAt: null,
      createdAt: new Date('2026-02-01T10:00:00Z'),
      updatedAt: new Date('2026-02-01T10:00:00Z'),
      institution: {
        id: 'inst_001',
        permanentId: '1-10098765',
        name: 'Matrix Institute',
        state: 'Maharashtra',
        district: 'Pune',
      },
      bureau: { id: 'bureau_001', code: 'APPROVAL_BUREAU', name: 'Approval Bureau' },
      assignedOfficer: {
        id: 'officer_001',
        badgeNumber: 'OFF-001',
        name: 'Officer Alpha',
        email: 'alpha@aicte.gov.in',
        role: 'CASE_OFFICER',
      },
      _count: {
        primaryOverlapCandidates: 1,
        secondaryOverlapCandidates: 0,
      },
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should list complaints with default pagination', async () => {
    vi.spyOn(db.complaint, 'findMany').mockResolvedValue(sampleComplaints as any);
    vi.spyOn(db.complaint, 'count').mockResolvedValue(1);

    const request = new Request('http://localhost:3000/api/v1/complaints');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.complaints)).toBe(true);
    expect(body.data.complaints.length).toBe(1);
    expect(body.data.complaints[0].overlapCount).toBe(1);
    expect(body.data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('should support multi-parameter filtering and search', async () => {
    const findManySpy = vi.spyOn(db.complaint, 'findMany').mockResolvedValue([]);
    const countSpy = vi.spyOn(db.complaint, 'count').mockResolvedValue(0);

    const url =
      'http://localhost:3000/api/v1/complaints?page=2&limit=10&bureauId=bur_1&status=UNDER_INQUIRY&priority=HIGH&category=FEE_ANOMALY&search=tuition';
    const request = new Request(url);
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.pagination.page).toBe(2);
    expect(body.data.pagination.limit).toBe(10);
    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bureauId: 'bur_1',
          status: 'UNDER_INQUIRY',
          priority: 'HIGH',
          category: 'FEE_ANOMALY',
          OR: expect.arrayContaining([
            { complaintNumber: { contains: 'tuition', mode: 'insensitive' } },
            { subject: { contains: 'tuition', mode: 'insensitive' } },
            { originalBureauRef: { contains: 'tuition', mode: 'insensitive' } },
          ]),
        }),
        skip: 10,
        take: 10,
      })
    );
    expect(countSpy).toHaveBeenCalled();
  });

  it('should return 400 when invalid query parameters are supplied', async () => {
    const request = new Request(
      'http://localhost:3000/api/v1/complaints?page=invalid&limit=-5&status=NOT_A_REAL_STATUS'
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toBeDefined();
  });

  it('should return safe 500 error when database throws unexpected exception', async () => {
    vi.spyOn(db.complaint, 'findMany').mockRejectedValue(
      new Error('Connection failure: postgresql://admin:secret@db.aicte.internal:5432')
    );

    const request = new Request('http://localhost:3000/api/v1/complaints');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(JSON.stringify(body)).not.toContain('db.aicte.internal');
  });
});
