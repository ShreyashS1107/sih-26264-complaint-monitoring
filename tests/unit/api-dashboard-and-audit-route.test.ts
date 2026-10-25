import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getDashboardSummary } from '@/app/api/v1/dashboard/summary/route';
import { GET as getAuditLogs } from '@/app/api/v1/audit/route';
import { GET as getComplaintAudit } from '@/app/api/v1/complaints/[id]/audit/route';
import { db } from '@/server/db';
import * as auditModule from '@/modules/audit/service';

describe('Dashboard and Audit API Routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/dashboard/summary', () => {
    it('should aggregate caseload and overlap metrics across bureaus', async () => {
      vi.spyOn(db.complaint, 'count').mockResolvedValue(5);
      vi.spyOn(db.complaint, 'groupBy')
        .mockResolvedValueOnce([{ status: 'UNDER_INQUIRY', _count: { id: 3 } }] as any)
        .mockResolvedValueOnce([{ priority: 'HIGH', _count: { id: 2 } }] as any)
        .mockResolvedValueOnce([{ category: 'FEE_ANOMALY', _count: { id: 4 } }] as any);

      vi.spyOn(db.bureau, 'findMany').mockResolvedValue([
        {
          id: 'bur_01',
          code: 'APPROVAL_BUREAU',
          name: 'Approval Bureau',
          _count: { complaints: 3 },
        },
      ] as any);

      vi.spyOn(db.overlapCandidate, 'count').mockResolvedValue(2);
      vi.spyOn(db.overlapCandidate, 'groupBy').mockResolvedValue([
        { reviewStatus: 'PENDING_REVIEW', _count: { id: 2 } },
      ] as any);

      vi.spyOn(db.institution, 'findMany').mockResolvedValue([
        {
          id: 'inst_01',
          permanentId: '1-10098765',
          name: 'Matrix Institute',
          state: 'Maharashtra',
          district: 'Pune',
          _count: { complaints: 3, overlapCandidates: 2 },
        },
      ] as any);

      const response = await getDashboardSummary();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.overview.totalComplaints).toBe(5);
      expect(body.data.overview.totalOverlapCandidates).toBe(2);
      expect(body.data.complaintsByStatus.UNDER_INQUIRY).toBe(3);
      expect(body.data.complaintsByPriority.HIGH).toBe(2);
      expect(body.data.complaintsByBureau[0].bureauCode).toBe('APPROVAL_BUREAU');
      expect(body.data.topInstitutions[0].name).toBe('Matrix Institute');
    });

    it('should return safe 500 when database error occurs during aggregation', async () => {
      vi.spyOn(db.complaint, 'count').mockRejectedValue(new Error('DB Timeout'));

      const response = await getDashboardSummary();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('GET /api/v1/audit', () => {
    it('should list operational audit logs with pagination and filters', async () => {
      const sampleLogs = [
        {
          id: 'aud_01',
          entityType: 'COMPLAINT',
          entityId: 'cmp_01',
          action: 'INGEST_COMPLAINT',
          actorId: 'off_01',
          actorRole: 'CASE_OFFICER',
          bureauId: 'bur_01',
          details: { complaintNumber: 'CMP-2026-0001' },
          ipAddress: '127.0.0.1',
          timestamp: new Date(),
          actor: { id: 'off_01', badgeNumber: 'OFF-01', name: 'Officer Alpha', role: 'CASE_OFFICER' },
        },
      ];

      vi.spyOn(db.auditLog, 'findMany').mockResolvedValue(sampleLogs as any);
      vi.spyOn(db.auditLog, 'count').mockResolvedValue(1);

      const request = new Request(
        'http://localhost:3000/api/v1/audit?entityType=COMPLAINT&page=1&limit=10'
      );
      const response = await getAuditLogs(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.auditLogs.length).toBe(1);
      expect(body.data.pagination.total).toBe(1);
    });

    it('should return 400 on invalid audit query parameters', async () => {
      const request = new Request('http://localhost:3000/api/v1/audit?limit=-1');
      const response = await getAuditLogs(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/complaints/[id]/audit', () => {
    it('should return 400 on empty complaint ID', async () => {
      const request = new Request('http://localhost:3000/api/v1/complaints//audit');
      const response = await getComplaintAudit(request, {
        params: Promise.resolve({ id: '   ' }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('INVALID_COMPLAINT_ID');
    });

    it('should return 404 when target complaint is not found', async () => {
      vi.spyOn(db.complaint, 'findFirst').mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/v1/complaints/missing_id/audit');
      const response = await getComplaintAudit(request, {
        params: Promise.resolve({ id: 'missing_id' }),
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.error.code).toBe('COMPLAINT_NOT_FOUND');
    });

    it('should return 200 with chronological audit entries for existing complaint', async () => {
      vi.spyOn(db.complaint, 'findFirst').mockResolvedValue({
        id: 'cmp_01',
        complaintNumber: 'CMP-2026-0001',
      } as any);

      vi.spyOn(auditModule, 'getAuditLogsForEntity').mockResolvedValue([
        {
          id: 'aud_01',
          entityType: 'COMPLAINT',
          entityId: 'cmp_01',
          action: 'INGEST_COMPLAINT',
          timestamp: new Date(),
        } as any,
      ]);

      const request = new Request('http://localhost:3000/api/v1/complaints/cmp_01/audit');
      const response = await getComplaintAudit(request, {
        params: Promise.resolve({ id: 'cmp_01' }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.complaintId).toBe('cmp_01');
      expect(body.data.auditLogs.length).toBe(1);
    });
  });
});
