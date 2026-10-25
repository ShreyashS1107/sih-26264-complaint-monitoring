import { describe, expect, it } from 'vitest';
import {
  evaluateComplaintPair,
  evaluateSubjectSimilarity,
  evaluateComplainantLinkage,
  scanForOverlapCandidates,
  SCORING_WEIGHTS,
  OVERLAP_THRESHOLDS,
  type ComplaintInput,
} from '@/modules/overlap-detection/engine';
import {
  normalizeText,
  extractTokens,
  calculateJaccardSimilarity,
  calculateCosineSimilarity,
  extractSharedKeywords,
} from '@/modules/overlap-detection/tokenizer';
import {
  matchInstitutionIdentity,
  extractDistinctiveNameTokens,
  calculateNormalizedStringSimilarity,
} from '@/modules/overlap-detection/institution-matcher';
import {
  calculateDaysApart,
  evaluateTemporalProximity,
  NEUTRAL_TEMPORAL_SCORE,
} from '@/modules/overlap-detection/temporal';

describe('Text Normalization and Lexical Tokenizer', () => {
  it('should normalize case, trim whitespace, and strip special punctuation', () => {
    const raw = '  Regarding URGENT Complaint: Unapproved Fee Hike @ College!! (#123)  ';
    const normalized = normalizeText(raw);
    expect(normalized).toBe('regarding urgent complaint unapproved fee hike college 123');
  });

  it('should remove common administrative stopwords and generic boilerplate', () => {
    const text = 'Respectfully submitted regarding alleged grievance in the college council';
    const { unigrams } = extractTokens(text);
    // 'respectfully', 'submitted', 'regarding', 'alleged', 'grievance', 'in', 'the', 'college', 'council' are stopwords
    expect(unigrams).toEqual([]);
  });

  it('should extract meaningful unigrams and bigrams for grievance terms', () => {
    const text = 'Coerced payment of unapproved development fee under threat of exam hall ticket';
    const { unigrams, bigrams } = extractTokens(text);

    expect(unigrams).toContain('coerced');
    expect(unigrams).toContain('payment');
    expect(unigrams).toContain('unapproved');
    expect(unigrams).toContain('development');
    expect(unigrams).toContain('fee');
    expect(bigrams).toContain('unapproved development');
    expect(bigrams).toContain('development fee');
  });

  it('should compute exact Jaccard similarity across identical and disjoint token sets', () => {
    const setA = ['fee', 'unapproved', 'refund'];
    const setB = ['fee', 'unapproved', 'refund'];
    const setC = ['ragging', 'hostel', 'curfew'];

    expect(calculateJaccardSimilarity(setA, setB)).toBe(1.0);
    expect(calculateJaccardSimilarity(setA, setC)).toBe(0.0);
    expect(calculateJaccardSimilarity([], [])).toBe(1.0);
    expect(calculateJaccardSimilarity(setA, [])).toBe(0.0);
  });

  it('should compute cosine similarity correctly for term vectors', () => {
    const tokensA = ['unapproved', 'fee', 'fee', 'refund'];
    const tokensB = ['unapproved', 'fee', 'caution'];

    const sim = calculateCosineSimilarity(tokensA, tokensB);
    expect(sim).toBeGreaterThan(0.5);
    expect(sim).toBeLessThan(1.0);

    expect(calculateCosineSimilarity([], ['fee'])).toBe(0.0);
  });

  it('should extract shared keywords prioritizing distinctive bigrams', () => {
    const textA = 'Unapproved fee collection and delay in refund of caution deposit';
    const textB = 'Demand for unapproved fee during admission and non refund of caution deposit';

    const shared = extractSharedKeywords(textA, textB);
    expect(shared).toContain('unapproved fee');
    expect(shared).toContain('caution deposit');
  });

  it('should not award phantom similarity bonuses when complaint descriptions are empty or short', () => {
    const compA: ComplaintInput = {
      id: 'cmp_short_a',
      complaintNumber: 'CMP-2026-SHORT-A',
      originalBureauRef: 'REF-01',
      bureauId: 'bur-1',
      institutionId: 'inst-1',
      institution: { permanentId: '1-10098765', name: 'Matrix Inst' },
      subject: 'Lab issue',
      description: '',
      category: 'INFRASTRUCTURE',
      createdAt: '2026-03-01',
    };
    const compB: ComplaintInput = {
      id: 'cmp_short_b',
      complaintNumber: 'CMP-2026-SHORT-B',
      originalBureauRef: 'REF-02',
      bureauId: 'bur-2',
      institutionId: 'inst-1',
      institution: { permanentId: '1-10098765', name: 'Matrix Inst' },
      subject: 'Library problem',
      description: '',
      category: 'FACULTY_NON_COMPLIANCE',
      createdAt: '2026-03-01',
    };

    const { score } = evaluateSubjectSimilarity(compA, compB);
    // Since 'lab issue' vs 'library problem' share zero unigrams and zero bigrams,
    // score must be 0.0 with no bigram phantom bonus (+0.15)
    expect(score).toBe(0.0);
  });

  it('should evaluate completely empty texts to zero similarity', () => {
    const compEmptyA: ComplaintInput = {
      id: 'cmp_emp_a',
      complaintNumber: 'CMP-EMPTY-A',
      originalBureauRef: 'REF-E1',
      bureauId: 'bur-1',
      institutionId: 'inst-1',
      institution: { permanentId: '1-10098765', name: 'Matrix Inst' },
      subject: '',
      description: '',
      createdAt: '2026-03-01',
    };
    const compEmptyB: ComplaintInput = {
      id: 'cmp_emp_b',
      complaintNumber: 'CMP-EMPTY-B',
      originalBureauRef: 'REF-E2',
      bureauId: 'bur-2',
      institutionId: 'inst-1',
      institution: { permanentId: '1-10098765', name: 'Matrix Inst' },
      subject: '',
      description: '',
      createdAt: '2026-03-01',
    };

    const { score } = evaluateSubjectSimilarity(compEmptyA, compEmptyB);
    expect(score).toBe(0.0);
  });
});

describe('Institution Identity Resolution Engine', () => {
  it('should return score 1.0 when both institutions match on AICTE Permanent ID', () => {
    const instA = {
      permanentId: '1-10098765',
      name: 'Matrix Institute of Technology',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
    };
    const instB = {
      permanentId: '1-10098765',
      name: 'Matrix Inst of Tech (Campus A)',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
    };

    const result = matchInstitutionIdentity(instA, instB);
    expect(result.score).toBe(1.0);
    expect(result.matchType).toBe('EXACT_PERMANENT_ID');
    expect(result.reason).toContain('1-10098765');
  });

  it('should return score 0.0 when both have verified but different AICTE Permanent IDs', () => {
    const instA = {
      permanentId: '1-10098765',
      name: 'Matrix Institute of Technology',
      state: 'Karnataka',
    };
    const instB = {
      permanentId: '1-20045612',
      name: 'Matrix Institute of Technology', // Same name, different verified ID
      state: 'Karnataka',
    };

    const result = matchInstitutionIdentity(instA, instB);
    expect(result.score).toBe(0.0);
    expect(result.matchType).toBe('DIFFERENT_INSTITUTION');
    expect(result.reason).toContain('Distinct institutions');
  });

  it('should fall back to name and location matching when Permanent IDs are missing', () => {
    const instA = {
      name: 'National Poly-Engineering Academy',
      state: 'Maharashtra',
      district: 'Pune',
    };
    const instB = {
      name: 'National Polytechnic and Engineering Academy',
      state: 'Maharashtra',
      district: 'Pune',
    };

    const result = matchInstitutionIdentity(instA, instB);
    expect(result.score).toBeGreaterThanOrEqual(0.75);
    expect(result.matchType).toBe('FALLBACK_NAME_LOCATION');
    expect(result.reason).toContain('Fallback match');
  });

  it('should reject institution match when states are different even with similar names', () => {
    const instA = {
      name: 'Apex Academy of Sciences',
      state: 'Uttarakhand',
      district: 'Dehradun',
    };
    const instB = {
      name: 'Apex Academy of Sciences',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
    };

    const result = matchInstitutionIdentity(instA, instB);
    expect(result.score).toBeLessThanOrEqual(0.1);
    expect(result.matchType).toBe('DIFFERENT_INSTITUTION');
    expect(result.reason).toContain('Geographic mismatch');
  });

  it('should extract distinctive name tokens by filtering generic educational terms', () => {
    const tokens = extractDistinctiveNameTokens('Matrix College of Engineering and Technology');
    expect(tokens).toEqual(['matrix']);
  });

  it('should compute normalized Levenshtein string similarity accurately', () => {
    expect(calculateNormalizedStringSimilarity('Matrix Institute', 'Matrix Institute')).toBe(1.0);
    expect(calculateNormalizedStringSimilarity('Matrix', 'Matriz')).toBeCloseTo(0.833, 2);
    expect(calculateNormalizedStringSimilarity('', 'Matrix')).toBe(0.0);
  });
});

describe('Temporal Proximity Scorer', () => {
  it('should calculate days apart accurately across ISO strings and Date objects', () => {
    const date1 = new Date('2026-03-01T10:00:00Z');
    const date2 = new Date('2026-03-09T15:00:00Z');
    expect(calculateDaysApart(date1, date2)).toBe(8);
  });

  it('should score simultaneous or near filings (<= 14 days) near 1.0', () => {
    const resSameDay = evaluateTemporalProximity('2026-03-01', '2026-03-01');
    expect(resSameDay.score).toBe(1.0);
    expect(resSameDay.daysApart).toBe(0);
    expect(resSameDay.explanation).toContain('High temporal proximity');

    const resOneWeek = evaluateTemporalProximity('2026-03-01', '2026-03-08');
    expect(resOneWeek.score).toBeGreaterThan(0.9);
  });

  it('should score filings 90 days apart (half-life) at approximately 0.50', () => {
    const resHalfLife = evaluateTemporalProximity('2026-01-01', '2026-04-01', 90);
    expect(resHalfLife.score).toBeCloseTo(0.5, 1);
  });

  it('should clamp score at 0.05 for distant filings (> 1 year)', () => {
    const resDistant = evaluateTemporalProximity('2024-01-01', '2026-03-01');
    expect(resDistant.score).toBe(0.05);
    expect(resDistant.explanation).toContain('Low temporal proximity');
  });

  it('should return null daysApart and neutral default score for invalid or missing dates', () => {
    const resInvalidStr = evaluateTemporalProximity('not-a-date', '2026-03-01');
    expect(resInvalidStr.daysApart).toBeNull();
    expect(resInvalidStr.score).toBe(NEUTRAL_TEMPORAL_SCORE);
    expect(resInvalidStr.isDateComparable).toBe(false);
    expect(resInvalidStr.explanation).toContain('unverified or unparseable');

    const resNull = evaluateTemporalProximity(null, '2026-03-01');
    expect(resNull.daysApart).toBeNull();
    expect(resNull.score).toBe(NEUTRAL_TEMPORAL_SCORE);
    expect(resNull.isDateComparable).toBe(false);

    expect(calculateDaysApart('invalid-date', '2026-03-01')).toBeNull();
    expect(calculateDaysApart(undefined, '2026-03-01')).toBeNull();
  });

  it('should calculate days apart accurately across Date objects and timezone boundaries', () => {
    // Exact same timestamp across timezones
    const dateIST = new Date('2026-03-01T23:30:00+05:30');
    const dateUTC = new Date('2026-03-01T18:00:00Z');
    expect(calculateDaysApart(dateIST, dateUTC)).toBe(0);

    // Midnight boundary: 23:59:00 UTC vs 00:05:00 UTC next day (6 minutes elapsed)
    const midnightBefore = new Date('2026-03-01T23:59:00Z');
    const midnightAfter = new Date('2026-03-02T00:05:00Z');
    expect(calculateDaysApart(midnightBefore, midnightAfter)).toBe(0);

    // Full 24-hour interval
    const day1 = new Date('2026-03-01T10:00:00Z');
    const day2 = new Date('2026-03-02T10:00:00Z');
    expect(calculateDaysApart(day1, day2)).toBe(1);
  });
});

describe('Pure Explainable Overlap Engine Scenarios', () => {
  const baseInstitution = {
    permanentId: '1-10098765',
    name: 'Matrix Institute of Advanced Technology',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
  };

  const sampleComplaintA: ComplaintInput = {
    id: 'cmp_001_sgrc',
    complaintNumber: 'CMP-2026-0001',
    originalBureauRef: 'SGRC/2026/FEE-114',
    bureauId: 'bureau_sgrc',
    bureauCode: 'STUDENT_GRIEVANCE_CELL',
    institutionId: 'inst_matrix',
    institution: baseInstitution,
    subject:
      'Exorbitant unapproved development fee levied under threat of withholding hall tickets',
    description:
      'Second year engineering students were coerced into paying an unapproved special lab & development levy of Rs 45,000 without receipt.',
    category: 'FEE_ANOMALY',
    priority: 'CRITICAL',
    complainantType: 'STUDENT',
    complainantMaskedId: 'CIT-***-4410',
    createdAt: new Date('2026-03-01T10:00:00Z'),
  };

  it('Scenario 1: Direct Duplicate Multi-Filing by same complainant across two bureaus', () => {
    const sampleComplaintDuplicate: ComplaintInput = {
      id: 'cmp_002_vig',
      complaintNumber: 'CMP-2026-0002',
      originalBureauRef: 'VIG/2026/FIN-092',
      bureauId: 'bureau_vigilance',
      bureauCode: 'VIGILANCE_BUREAU',
      institutionId: 'inst_matrix',
      institution: baseInstitution,
      subject:
        'Unapproved development fee collection and financial irregularity withholding hall tickets',
      description:
        'Second year students coerced into paying unauthorized development fee of Rs 45,000 under threat of examination hall ticket denial.',
      category: 'FEE_ANOMALY',
      priority: 'HIGH',
      complainantType: 'STUDENT',
      complainantMaskedId: 'CIT-***-4410', // Exact matching complainant
      createdAt: new Date('2026-03-04T12:00:00Z'), // 3 days apart
    };

    const evaluation = evaluateComplaintPair(sampleComplaintA, sampleComplaintDuplicate);

    expect(evaluation.overallScore).toBeGreaterThanOrEqual(OVERLAP_THRESHOLDS.HIGH_OVERLAP);
    expect(evaluation.entityScore).toBe(1.0);
    expect(evaluation.subjectScore).toBeGreaterThan(0.7);
    expect(evaluation.temporalScore).toBeGreaterThan(0.95);
    expect(evaluation.complainantScore).toBe(1.0);

    expect(evaluation.matchingSignals.overlapType).toBe('DIRECT_DUPLICATE');
    expect(evaluation.matchingSignals.recommendation).toBe('FLAG_FOR_JOINT_REVIEW');
    expect(evaluation.matchingSignals.severity).toBe('HIGH');
    expect(evaluation.reviewStatus).toBe('FLAGGED_JOINT_REVIEW');
    expect(evaluation.matchingSignals.involvedBureaus).toContain('STUDENT_GRIEVANCE_CELL');
    expect(evaluation.matchingSignals.involvedBureaus).toContain('VIGILANCE_BUREAU');
    expect(evaluation.matchingSignals.daysApart).toBe(3);
    expect(evaluation.matchingSignals.explanation).toContain('Identical complainant multi-filed');
  });

  it('Scenario 2: Coordinated Filing by different complainants on related fee grievances', () => {
    const sampleComplaintCoordinated: ComplaintInput = {
      id: 'cmp_003_parent',
      complaintNumber: 'CMP-2026-0003',
      originalBureauRef: 'VIG/2026/FIN-095',
      bureauId: 'bureau_vigilance',
      bureauCode: 'VIGILANCE_BUREAU',
      institutionId: 'inst_matrix',
      institution: baseInstitution,
      subject:
        'Financial irregularity regarding unauthorized fee levies and caution deposit refund',
      description:
        'Parents association reporting unauthorized fee collection of Rs 45,000 and refusal to refund security deposits.',
      category: 'FEE_ANOMALY',
      priority: 'HIGH',
      complainantType: 'PARENT',
      complainantMaskedId: 'PAR-***-9011', // Different complainant
      createdAt: new Date('2026-03-08T10:00:00Z'), // 7 days apart
    };

    const evaluation = evaluateComplaintPair(sampleComplaintA, sampleComplaintCoordinated);

    expect(evaluation.overallScore).toBeGreaterThanOrEqual(OVERLAP_THRESHOLDS.HIGH_OVERLAP);
    expect(evaluation.matchingSignals.overlapType).toBe('COORDINATED_FILING');
    expect(evaluation.matchingSignals.recommendation).toBe('FLAG_FOR_JOINT_REVIEW');
    expect(evaluation.matchingSignals.severity).toBe('HIGH');
    expect(evaluation.matchingSignals.explanation).toContain('coordinated filing');
  });

  it('Scenario 3: Symptomatic Grievance Cluster with moderate thematic overlap', () => {
    const sampleComplaintCluster: ComplaintInput = {
      id: 'cmp_004_infra',
      complaintNumber: 'CMP-2026-0004',
      originalBureauRef: 'APP/2026/INF-310',
      bureauId: 'bureau_approval',
      bureauCode: 'APPROVAL_BUREAU',
      institutionId: 'inst_matrix',
      institution: baseInstitution,
      subject: 'Inadequate laboratory equipment and deficiency in student computer facilities',
      description:
        'Students report computer engineering labs lack licensed software and working systems contrary to AICTE approval norms.',
      category: 'INFRASTRUCTURE_DEFICIENCY',
      priority: 'MEDIUM',
      complainantType: 'STUDENT',
      complainantMaskedId: 'STU-***-2020',
      createdAt: new Date('2026-03-25T10:00:00Z'), // 24 days apart
    };

    const evaluation = evaluateComplaintPair(sampleComplaintA, sampleComplaintCluster);

    // Subject similarity is low-to-moderate between fee extortion and lab equipment
    expect(evaluation.overallScore).toBeLessThan(OVERLAP_THRESHOLDS.HIGH_OVERLAP);
    expect(evaluation.matchingSignals.recommendation).not.toBe('FLAG_FOR_JOINT_REVIEW');
  });

  it('Scenario 4: Independent Grievances at Same Institution (Hostel ragging vs Faculty salary)', () => {
    const nationalInst = {
      permanentId: '1-20045612',
      name: 'National Poly-Engineering Academy',
      state: 'Maharashtra',
      district: 'Pune',
    };

    const complaintRagging: ComplaintInput = {
      id: 'cmp_ragging_01',
      complaintNumber: 'CMP-2026-0010',
      originalBureauRef: 'ARC/2026/URG-055',
      bureauId: 'bureau_arc',
      bureauCode: 'ANTI_RAGGING_CELL',
      institutionId: 'inst_national',
      institution: nationalInst,
      subject: 'Senior hostel verbal intimidation incident reported during orientation week',
      description:
        'Report of verbal intimidation and forced late-night assembly in polytechnic hostel block B.',
      category: 'HARASSMENT_RAGGING',
      priority: 'CRITICAL',
      complainantType: 'STUDENT',
      createdAt: new Date('2026-02-10T10:00:00Z'),
    };

    const complaintFacultySalary: ComplaintInput = {
      id: 'cmp_salary_02',
      complaintNumber: 'CMP-2026-0011',
      originalBureauRef: 'FSG/2026/SAL-019',
      bureauId: 'bureau_faculty',
      bureauCode: 'FACULTY_GRIEVANCE_CELL',
      institutionId: 'inst_national',
      institution: nationalInst,
      subject: 'Delay in disbursement of salary allowances according to 7th Central Pay Commission',
      description:
        'Polytechnic faculty group submitting representation for 6-month delay in revised grade allowances.',
      category: 'FACULTY_NON_COMPLIANCE',
      priority: 'MEDIUM',
      complainantType: 'FACULTY',
      createdAt: new Date('2026-02-15T10:00:00Z'),
    };

    const evaluation = evaluateComplaintPair(complaintRagging, complaintFacultySalary);

    // Same institution (entityScore = 1.0), but completely different subjects, categories, and complainant types
    expect(evaluation.entityScore).toBe(1.0);
    expect(evaluation.subjectScore).toBeLessThan(0.15);
    expect(evaluation.overallScore).toBeLessThan(OVERLAP_THRESHOLDS.MODERATE_CLUSTER);
    expect(evaluation.matchingSignals.overlapType).toBe('INDEPENDENT');
    expect(evaluation.matchingSignals.recommendation).toBe('INDEPENDENT_CASE');
    expect(evaluation.matchingSignals.severity).toBe('LOW');
  });

  it('Scenario 5: Completely Distinct Institutions (Identical text should NOT overlap)', () => {
    const instA = {
      permanentId: '1-10098765',
      name: 'Matrix Institute of Technology',
      state: 'Karnataka',
    };
    const instB = {
      permanentId: '1-99999999',
      name: 'Sunrise Engineering College',
      state: 'Tamil Nadu',
    };

    const compA: ComplaintInput = {
      ...sampleComplaintA,
      institution: instA,
    };
    const compB: ComplaintInput = {
      ...sampleComplaintA,
      id: 'cmp_other_inst',
      institutionId: 'inst_sunrise',
      institution: instB,
    };

    const evaluation = evaluateComplaintPair(compA, compB);

    // Since institutions are different (entityScore = 0.0), composite score collapses
    expect(evaluation.entityScore).toBe(0.0);
    expect(evaluation.overallScore).toBe(0.0);
    expect(evaluation.matchingSignals.overlapType).toBe('INDEPENDENT');
    expect(evaluation.matchingSignals.recommendation).toBe('INDEPENDENT_CASE');
    expect(evaluation.matchingSignals.severity).toBe('LOW');
  });

  it('Scenario 6: Mathematical Invariant - Commutative evaluation', () => {
    const evalForward = evaluateComplaintPair(sampleComplaintA, {
      ...sampleComplaintA,
      id: 'cmp_test_z',
      complaintNumber: 'CMP-2026-0099',
    });

    const evalReverse = evaluateComplaintPair(
      {
        ...sampleComplaintA,
        id: 'cmp_test_z',
        complaintNumber: 'CMP-2026-0099',
      },
      sampleComplaintA
    );

    expect(evalForward.primaryComplaintId).toBe(evalReverse.primaryComplaintId);
    expect(evalForward.candidateComplaintId).toBe(evalReverse.candidateComplaintId);
    expect(evalForward.overallScore).toBe(evalReverse.overallScore);
    expect(evalForward.matchingSignals.overlapType).toBe(evalReverse.matchingSignals.overlapType);
  });

  it('Scenario 7: Strictly rejects pairing a complaint with itself', () => {
    expect(() => evaluateComplaintPair(sampleComplaintA, sampleComplaintA)).toThrow(
      'Complaint pairs cannot create self-matches'
    );
  });
});

describe('scanForOverlapCandidates Utility', () => {
  const baseInstitution = {
    permanentId: '1-10098765',
    name: 'Matrix Institute of Advanced Technology',
    state: 'Karnataka',
  };

  const targetComplaint: ComplaintInput = {
    id: 'target_01',
    complaintNumber: 'CMP-TARGET-001',
    originalBureauRef: 'REF-001',
    bureauId: 'bureau_sgrc',
    institutionId: 'inst_matrix',
    institution: baseInstitution,
    subject: 'Unapproved fee hike and withholding examination hall tickets',
    description: 'Students forced to pay 45,000 development fee without official receipt.',
    createdAt: new Date('2026-03-01T10:00:00Z'),
  };

  const pool: ComplaintInput[] = [
    // Duplicate match (high score)
    {
      id: 'cand_high_02',
      complaintNumber: 'CMP-CAND-002',
      originalBureauRef: 'REF-002',
      bureauId: 'bureau_vig',
      institutionId: 'inst_matrix',
      institution: baseInstitution,
      subject: 'Unapproved fee hike collection and denial of hall ticket',
      description: 'Second year students forced to pay unauthorized fee of 45000.',
      createdAt: new Date('2026-03-03T10:00:00Z'),
    },
    // Distinct institution (zero score)
    {
      id: 'cand_diff_03',
      complaintNumber: 'CMP-CAND-003',
      originalBureauRef: 'REF-003',
      bureauId: 'bureau_vig',
      institutionId: 'inst_other',
      institution: {
        permanentId: '1-99990000',
        name: 'Other College',
        state: 'Punjab',
      },
      subject: 'Unapproved fee hike and hall ticket denial',
      description: 'Students forced to pay unauthorized fee.',
      createdAt: new Date('2026-03-03T10:00:00Z'),
    },
    // Target itself in pool (must be skipped)
    targetComplaint,
  ];

  it('should scan candidate pool, filter below threshold, and sort descending by score', () => {
    const results = scanForOverlapCandidates(
      targetComplaint,
      pool,
      OVERLAP_THRESHOLDS.MODERATE_CLUSTER
    );

    expect(results.length).toBe(1);
    expect(results[0].candidateComplaintId).toBe(
      'target_01' > 'cand_high_02' ? 'target_01' : 'cand_high_02'
    );
    expect(results[0].overallScore).toBeGreaterThanOrEqual(OVERLAP_THRESHOLDS.MODERATE_CLUSTER);
  });
});
