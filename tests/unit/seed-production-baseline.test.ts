import { describe, it, expect } from 'vitest';
import {
  CANONICAL_BUREAUS,
  CANONICAL_OFFICERS,
  CANONICAL_INSTITUTIONS,
  BASELINE_COMPLAINTS,
  BASELINE_OVERLAPS,
} from '../../scripts/seed-production-baseline';
import {
  ComplaintCategory,
  ComplaintStatus,
} from '@prisma/client';
import { DEMO_COMPLAINTS } from '../../src/lib/mock-data/complaints';

describe('Seed Production Baseline Data Suite', () => {
  it('should contain exactly 12 baseline complaints', () => {
    expect(BASELINE_COMPLAINTS).toHaveLength(12);
  });

  it('should have sequential, unique complaint numbers from AICTE-2026-8401 to AICTE-2026-8412', () => {
    const expectedNumbers = [
      'AICTE-2026-8401',
      'AICTE-2026-8402',
      'AICTE-2026-8403',
      'AICTE-2026-8404',
      'AICTE-2026-8405',
      'AICTE-2026-8406',
      'AICTE-2026-8407',
      'AICTE-2026-8408',
      'AICTE-2026-8409',
      'AICTE-2026-8410',
      'AICTE-2026-8411',
      'AICTE-2026-8412',
    ];

    const actualNumbers = BASELINE_COMPLAINTS.map((c) => c.complaintNumber);
    expect(actualNumbers).toEqual(expectedNumbers);

    // Strict uniqueness check
    const uniqueSet = new Set(actualNumbers);
    expect(uniqueSet.size).toBe(12);
  });

  it('should match the exact categories and scenarios for the 6 new synthetic demo complaints', () => {
    const newComplaints = BASELINE_COMPLAINTS.slice(6);
    expect(newComplaints).toHaveLength(6);

    const c8407 = BASELINE_COMPLAINTS.find((c) => c.complaintNumber === 'AICTE-2026-8407')!;
    expect(c8407.category).toBe(ComplaintCategory.OTHER);
    expect(c8407.subject.toLowerCase()).toContain('faculty strength');
    expect(c8407.description).toContain('Synthetic demonstration record');

    const c8408 = BASELINE_COMPLAINTS.find((c) => c.complaintNumber === 'AICTE-2026-8408')!;
    expect(c8408.category).toBe(ComplaintCategory.UNAPPROVED_PROGRAM);
    expect(c8408.subject.toLowerCase()).toContain('course intake');
    expect(c8408.description).toContain('Synthetic demonstration record');

    const c8409 = BASELINE_COMPLAINTS.find((c) => c.complaintNumber === 'AICTE-2026-8409')!;
    expect(c8409.category).toBe(ComplaintCategory.FEE_ANOMALY);
    expect(c8409.subject.toLowerCase()).toContain('examination or laboratory fees');
    expect(c8409.description).toContain('Synthetic demonstration record');

    const c8410 = BASELINE_COMPLAINTS.find((c) => c.complaintNumber === 'AICTE-2026-8410')!;
    expect(c8410.category).toBe(ComplaintCategory.OTHER);
    expect(c8410.subject.toLowerCase()).toContain('student grievance redressal');
    expect(c8410.description).toContain('Synthetic demonstration record');

    const c8411 = BASELINE_COMPLAINTS.find((c) => c.complaintNumber === 'AICTE-2026-8411')!;
    expect(c8411.category).toBe(ComplaintCategory.HARASSMENT_RAGGING);
    expect(c8411.subject.toLowerCase()).toContain('hostel anti-ragging');
    expect(c8411.description).toContain('Synthetic demonstration record');

    const c8412 = BASELINE_COMPLAINTS.find((c) => c.complaintNumber === 'AICTE-2026-8412')!;
    expect(c8412.category).toBe(ComplaintCategory.UNAPPROVED_PROGRAM);
    expect(c8412.subject.toLowerCase()).toContain('advertised and approved programme');
    expect(c8412.description).toContain('Synthetic demonstration record');
  });

  it('should resolve all institution permanent IDs against CANONICAL_INSTITUTIONS', () => {
    const validInstIds = new Set(CANONICAL_INSTITUTIONS.map((i) => i.permanentId));
    expect(validInstIds.size).toBe(5);

    for (const c of BASELINE_COMPLAINTS) {
      expect(validInstIds.has(c.institutionPermanentId)).toBe(true);
    }
  });

  it('should resolve all bureau codes against CANONICAL_BUREAUS', () => {
    const validBureaus = new Set(CANONICAL_BUREAUS.map((b) => b.code));
    expect(validBureaus.size).toBe(5);

    for (const c of BASELINE_COMPLAINTS) {
      expect(validBureaus.has(c.bureauCode)).toBe(true);
    }
  });

  it('should resolve all assigned officer badges against CANONICAL_OFFICERS', () => {
    const validBadges = new Set(CANONICAL_OFFICERS.map((o) => o.badgeNumber));
    expect(validBadges.size).toBe(4);

    for (const c of BASELINE_COMPLAINTS) {
      expect(validBadges.has(c.officerBadgeNumber)).toBe(true);
    }
  });

  it('should contain exactly 5 realistic cross-bureau overlap candidate pairs', () => {
    expect(BASELINE_OVERLAPS).toHaveLength(5);

    const complaintMap = new Map(BASELINE_COMPLAINTS.map((c) => [c.complaintNumber, c]));

    // Track pairs to verify uniqueness and no reversed duplicates
    const pairKeys = new Set<string>();

    for (const ovl of BASELINE_OVERLAPS) {
      const primary = complaintMap.get(ovl.primaryComplaintNumber);
      const candidate = complaintMap.get(ovl.candidateComplaintNumber);

      expect(primary).toBeDefined();
      expect(candidate).toBeDefined();

      // Ensure both complaints target the same institution
      expect(primary!.institutionPermanentId).toBe(candidate!.institutionPermanentId);

      // Ensure overall score is between 0.0 and 1.0
      expect(ovl.overallScore).toBeGreaterThan(0);
      expect(ovl.overallScore).toBeLessThanOrEqual(1.0);

      // Verify pair uniqueness
      const forwardKey = `${ovl.primaryComplaintNumber}:${ovl.candidateComplaintNumber}`;
      const reverseKey = `${ovl.candidateComplaintNumber}:${ovl.primaryComplaintNumber}`;
      expect(pairKeys.has(forwardKey)).toBe(false);
      expect(pairKeys.has(reverseKey)).toBe(false);
      pairKeys.add(forwardKey);
    }
  });

  it('should maintain idempotency in simulated upsert operations', () => {
    const dbSim = new Map<string, { complaintNumber: string; status: ComplaintStatus; updateCount: number }>();

    // First seed run
    for (const c of BASELINE_COMPLAINTS) {
      dbSim.set(c.complaintNumber, {
        complaintNumber: c.complaintNumber,
        status: c.status,
        updateCount: 0,
      });
    }
    expect(dbSim.size).toBe(12);

    // Simulate an officer updating status of AICTE-2026-8407 in production
    const existing = dbSim.get('AICTE-2026-8407')!;
    existing.status = ComplaintStatus.UNDER_INQUIRY;
    existing.updateCount = 1;

    // Second seed run with update: {} (idempotent upsert behavior)
    for (const c of BASELINE_COMPLAINTS) {
      if (!dbSim.has(c.complaintNumber)) {
        dbSim.set(c.complaintNumber, {
          complaintNumber: c.complaintNumber,
          status: c.status,
          updateCount: 0,
        });
      }
      // With update: {}, existing records are untouched
    }

    // Must still have exactly 12 records, and officer update must be preserved
    expect(dbSim.size).toBe(12);
    expect(dbSim.get('AICTE-2026-8407')!.status).toBe(ComplaintStatus.UNDER_INQUIRY);
    expect(dbSim.get('AICTE-2026-8407')!.updateCount).toBe(1);
  });

  it('should ensure synthetic demo complaints 8407 through 8412 have empty evidence in mock data for honest unavailable states', () => {
    const demoComplaints8407to8412 = DEMO_COMPLAINTS.filter((c) =>
      ['AICTE-2026-8407', 'AICTE-2026-8408', 'AICTE-2026-8409', 'AICTE-2026-8410', 'AICTE-2026-8411', 'AICTE-2026-8412'].includes(
        c.id
      )
    );

    expect(demoComplaints8407to8412).toHaveLength(6);
    for (const c of demoComplaints8407to8412) {
      expect(c.evidence).toEqual([]);
    }
  });
});
