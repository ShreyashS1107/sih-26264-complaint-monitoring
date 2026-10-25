import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as listInstitutions } from '@/app/api/v1/institutions/route';
import { GET as getInstitution } from '@/app/api/v1/institutions/[id]/route';
import { db } from '@/server/db';

describe('Institutions API Routes (/api/v1/institutions)', () => {
  const sampleInstitution = {
    id: 'inst_001',
    permanentId: '1-10098765',
    name: 'Matrix Institute of Technology',
    state: 'Maharashtra',
    district: 'Pune',
    address: 'Sector 8, Knowledge Park',
    pinCode: '411057',
    institutionType: 'POLYTECHNIC',
    approvalStatus: 'APPROVED',
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: {
      complaints: 3,
      overlapCandidates: 2,
    },
    complaints: [
      {
        id: 'cmp_001',
        complaintNumber: 'CMP-2026-0001',
        subject: 'Intake anomaly',
        category: 'UNAPPROVED_PROGRAM',
        priority: 'HIGH',
        status: 'UNDER_INQUIRY',
        createdAt: new Date(),
        bureau: { id: 'bur_001', code: 'APPROVAL_BUREAU', name: 'Approval Bureau' },
      },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/institutions', () => {
    it('should list institutions with counts and pagination', async () => {
      vi.spyOn(db.institution, 'findMany').mockResolvedValue([sampleInstitution as any]);
      vi.spyOn(db.institution, 'count').mockResolvedValue(1);

      const request = new Request(
        'http://localhost:3000/api/v1/institutions?search=Matrix&state=Maharashtra'
      );
      const response = await listInstitutions(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.institutions.length).toBe(1);
      expect(body.data.institutions[0].complaintCount).toBe(3);
      expect(body.data.institutions[0].overlapCandidateCount).toBe(2);
      expect(body.data.pagination.total).toBe(1);
    });

    it('should return 400 on invalid query parameters', async () => {
      const request = new Request(
        'http://localhost:3000/api/v1/institutions?approvalStatus=INVALID_STATUS'
      );
      const response = await listInstitutions(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/institutions/[id]', () => {
    it('should return 400 on empty or whitespace id', async () => {
      const request = new Request('http://localhost:3000/api/v1/institutions/   ');
      const response = await getInstitution(request, {
        params: Promise.resolve({ id: '   ' }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('INVALID_INSTITUTION_ID');
    });

    it('should return 404 when institution is not found', async () => {
      vi.spyOn(db.institution, 'findFirst').mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/v1/institutions/missing_inst');
      const response = await getInstitution(request, {
        params: Promise.resolve({ id: 'missing_inst' }),
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe('INSTITUTION_NOT_FOUND');
    });

    it('should return 200 with institution profile and recent complaints', async () => {
      vi.spyOn(db.institution, 'findFirst').mockResolvedValue(sampleInstitution as any);

      const request = new Request('http://localhost:3000/api/v1/institutions/1-10098765');
      const response = await getInstitution(request, {
        params: Promise.resolve({ id: '1-10098765' }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.permanentId).toBe('1-10098765');
      expect(body.data.complaintCount).toBe(3);
      expect(Array.isArray(body.data.recentComplaints)).toBe(true);
      expect(body.data.recentComplaints.length).toBe(1);
    });
  });
});
