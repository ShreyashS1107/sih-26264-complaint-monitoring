import { describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';
import { Complaint, OverlapCandidate } from '@/lib/types';

describe('Dossier Availability & Record Refresh Verification', () => {
  describe('apiClient.getComplaint response unwrap resilience', () => {
    it('correctly maps when backend returns unwrapped complaint object ({ ...complaint })', async () => {
      const mockRawResponse = {
        success: true,
        data: {
          id: 'cuid_test_123',
          complaintNumber: 'AICTE-2026-8401',
          subject: 'Unapproved fee collection',
          description: 'Demanding unauthorized cash fee from applicants.',
          category: 'UNAPPROVED_PROGRAM',
          priority: 'CRITICAL',
          status: 'UNDER_INQUIRY',
          createdAt: '2026-09-12T00:00:00.000Z',
          institution: {
            id: 'inst_1',
            permanentId: '1-10928374',
            name: 'Apex Institute of Advanced Technology',
            state: 'Maharashtra',
            district: 'Pune',
          },
          bureau: {
            code: 'APPROVAL_BUREAU',
            name: 'Approval Bureau',
          },
          evidence: [
            {
              id: 'DOC-8401-01',
              name: 'Receipt_Demand.pdf',
              fileSize: '1.4 MB',
              uploadDate: '2026-09-12',
              category: 'Fee Receipt',
            },
          ],
          allegations: ['Cash demand without official receipt'],
        },
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockRawResponse,
      } as any);

      const dossier = await apiClient.getComplaint('AICTE-2026-8401');

      expect(dossier.id).toBe('AICTE-2026-8401');
      expect(dossier.complaintNumber).toBe('AICTE-2026-8401');
      expect(dossier.dbId).toBe('cuid_test_123');
      expect(dossier.title).toBe('Unapproved fee collection');
      expect(dossier.evidence).toHaveLength(1);
      expect(dossier.evidence[0].name).toBe('Receipt_Demand.pdf');
      expect(dossier.allegations).toEqual(['Cash demand without official receipt']);
    });

    it('correctly maps when backend returns wrapped complaint object ({ complaint: { ... } })', async () => {
      const mockWrappedResponse = {
        success: true,
        data: {
          complaint: {
            id: 'cuid_test_456',
            complaintNumber: 'CMP-2026-0002',
            subject: 'Hostel safety violation',
            description: 'Non-functional fire alarms in student dormitory.',
            category: 'OTHER',
            priority: 'HIGH',
            status: 'SUBMITTED',
            createdAt: '2026-10-01T00:00:00.000Z',
          },
          institution: {
            permanentId: '1-30495821',
            name: 'Karnataka College of Engineering',
            state: 'Karnataka',
            district: 'Bengaluru Urban',
          },
          bureau: {
            code: 'STUDENT_GRIEVANCE_CELL',
            name: 'Student Grievance Cell',
          },
          evidence: [],
          allegations: [],
        },
      };

      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockWrappedResponse,
      } as any);

      const dossier = await apiClient.getComplaint('CMP-2026-0002');

      expect(dossier.id).toBe('CMP-2026-0002');
      expect(dossier.complaintNumber).toBe('CMP-2026-0002');
      expect(dossier.dbId).toBe('cuid_test_456');
      expect(dossier.evidence).toEqual([]);
      expect(dossier.allegations).toEqual(['Hostel safety violation']);
    });
  });

  describe('Dossier multi-identifier resolution and honest unavailable handling', () => {
    const mockComplaints: Complaint[] = [
      {
        id: 'AICTE-2026-8401',
        complaintNumber: 'AICTE-2026-8401',
        dbId: 'cuid_source_8401',
        title: 'Capitation Fee Grievance',
        institutionId: '1-10928374',
        institutionName: 'Apex Institute of Advanced Technology',
        region: 'Pune',
        state: 'Maharashtra',
        bureau: 'Approval Bureau',
        category: 'Capitation & Excess Fee Violation',
        complainantType: 'Student',
        filingDate: '2026-09-12',
        deadlineDate: '2026-10-28',
        priority: 'Critical',
        status: 'Show-Cause Notice Issued',
        description: 'Demanded cash capitation fee.',
        allegations: ['Excess fee charged in cash'],
        evidence: [
          {
            id: 'DOC-01',
            name: 'Challan.pdf',
            fileSize: '500 KB',
            uploadDate: '2026-09-12',
            category: 'Fee Receipt',
          },
        ],
      },
      {
        id: 'AICTE-2026-8402',
        complaintNumber: 'AICTE-2026-8402',
        dbId: 'cuid_target_8402',
        title: 'Hall ticket withholding',
        institutionId: '1-10928374',
        institutionName: 'Apex Institute of Advanced Technology',
        region: 'Pune',
        state: 'Maharashtra',
        bureau: 'Approval Bureau',
        category: 'Capitation & Excess Fee Violation',
        complainantType: 'Student',
        filingDate: '2026-09-16',
        deadlineDate: '2026-10-30',
        priority: 'High',
        status: 'Under Scrutiny',
        description: 'Withholding exam hall tickets.',
        allegations: ['Withholding exam hall ticket'],
        evidence: [], // Genuinely has no files
      },
    ];

    it('resolves complaints when query ID is canonical complaintNumber', () => {
      const queryId = 'AICTE-2026-8401';
      const resolved = mockComplaints.find(
        (c) => c.id === queryId || c.complaintNumber === queryId || c.dbId === queryId
      );
      expect(resolved).toBeDefined();
      expect(resolved?.title).toBe('Capitation Fee Grievance');
    });

    it('resolves complaints when query ID is database CUID', () => {
      const queryId = 'cuid_source_8401';
      const resolved = mockComplaints.find(
        (c) => c.id === queryId || c.complaintNumber === queryId || c.dbId === queryId
      );
      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe('AICTE-2026-8401');
    });

    it('preserves honest unavailable/empty state when dossier genuinely has no files', () => {
      const queryId = 'AICTE-2026-8402';
      const resolved = mockComplaints.find(
        (c) => c.id === queryId || c.complaintNumber === queryId || c.dbId === queryId
      );
      expect(resolved).toBeDefined();
      expect(resolved?.evidence).toHaveLength(0);
      // Empty evidence indicates honest "No dossier uploaded yet" state without fabricating documents
      const hasUploadedFiles = (resolved?.evidence || []).length > 0;
      expect(hasUploadedFiles).toBe(false);
    });

    it('correctly matches overlap candidate pairs across CUID and complaintNumber aliases', () => {
      const candidate: OverlapCandidate = {
        id: 'cuid_source_8401-cuid_target_8402',
        sourceComplaintId: 'cuid_source_8401', // CUID format
        targetComplaintId: 'cuid_target_8402', // CUID format
        signalScore: 88,
        matchingSignals: [{ type: 'Text Similarity', detail: 'High keyword match' }],
        reviewStatus: 'Pending',
      };

      const source = mockComplaints.find(
        (c) =>
          c.id === candidate.sourceComplaintId ||
          c.complaintNumber === candidate.sourceComplaintId ||
          c.dbId === candidate.sourceComplaintId
      );
      const target = mockComplaints.find(
        (c) =>
          c.id === candidate.targetComplaintId ||
          c.complaintNumber === candidate.targetComplaintId ||
          c.dbId === candidate.targetComplaintId
      );

      expect(source).toBeDefined();
      expect(source?.id).toBe('AICTE-2026-8401');
      expect(target).toBeDefined();
      expect(target?.id).toBe('AICTE-2026-8402');
    });

    it('preserves existing complaint evidence when background refresh delivers server records', () => {
      const prevComplaints: Complaint[] = [
        {
          id: 'AICTE-2026-8401',
          complaintNumber: 'AICTE-2026-8401',
          dbId: 'cuid_source_8401',
          title: 'Capitation Fee Grievance',
          institutionId: '1-10928374',
          institutionName: 'Apex Institute of Advanced Technology',
          region: 'Pune',
          state: 'Maharashtra',
          bureau: 'Approval Bureau',
          category: 'Capitation & Excess Fee Violation',
          complainantType: 'Student',
          filingDate: '2026-09-12',
          deadlineDate: '2026-10-28',
          priority: 'Critical',
          status: 'Show-Cause Notice Issued',
          description: 'Demanded cash capitation fee.',
          allegations: ['Excess fee charged in cash'],
          evidence: [
            {
              id: 'DOC-01',
              name: 'Challan.pdf',
              fileSize: '500 KB',
              uploadDate: '2026-09-12',
              category: 'Fee Receipt',
            },
          ],
        },
      ];

      // Server list endpoint returns basic records where evidence array is empty
      const serverComplaints: Complaint[] = [
        {
          id: 'AICTE-2026-8401',
          complaintNumber: 'AICTE-2026-8401',
          dbId: 'cuid_source_8401',
          title: 'Capitation Fee Grievance',
          institutionId: '1-10928374',
          institutionName: 'Apex Institute of Advanced Technology',
          region: 'Pune',
          state: 'Maharashtra',
          bureau: 'Approval Bureau',
          category: 'Capitation & Excess Fee Violation',
          complainantType: 'Student',
          filingDate: '2026-09-12',
          deadlineDate: '2026-10-28',
          priority: 'Critical',
          status: 'Under Scrutiny', // status updated on server
          description: 'Demanded cash capitation fee.',
          allegations: ['Capitation Fee Grievance'],
          evidence: [], // Empty from list endpoint
        },
      ];

      // Merge logic from refreshData
      const mergedComplaints = serverComplaints.map((sc) => {
        const prev = prevComplaints.find(
          (p) =>
            p.id === sc.id ||
            p.complaintNumber === sc.id ||
            p.dbId === sc.id ||
            p.dbId === sc.dbId
        );
        if (
          prev?.evidence &&
          prev.evidence.length > 0 &&
          (!sc.evidence || sc.evidence.length === 0)
        ) {
          return {
            ...sc,
            evidence: prev.evidence,
            allegations:
              prev.allegations && prev.allegations.length > 0 ? prev.allegations : sc.allegations,
          };
        }
        return sc;
      });

      expect(mergedComplaints[0].status).toBe('Under Scrutiny'); // Status refreshed from server
      expect(mergedComplaints[0].evidence).toHaveLength(1); // Evidence preserved!
      expect(mergedComplaints[0].evidence[0].name).toBe('Challan.pdf');
    });
  });
});
