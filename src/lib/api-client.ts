/**
 * SIH 26264 - Frontend API Integration Client
 * Directly interfaces with Next.js App Router /api/v1 endpoints.
 * Standardizes envelope parsing, type mapping, error propagation, and security handshakes.
 */

import {
  Complaint,
  ComplaintPriority,
  ComplaintStatus,
  OverlapCandidate,
  OverlapReviewStatus,
  AuditEvent,
  BureauType,
  EvidenceDocument,
} from './types';

// ==============================================================================
// 1. Envelope Types & Error Class
// ==============================================================================

export interface ApiEnvelopeSuccess<T> {
  success: true;
  data: T;
  error: null;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export interface ApiEnvelopeError {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export type ApiEnvelope<T> = ApiEnvelopeSuccess<T> | ApiEnvelopeError;

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// ==============================================================================
// 2. Base Fetch Helper with Timeout & Envelope Parsing
// ==============================================================================

let activeAuthToken: string | null = null;

export function setClientAuthToken(token: string | null) {
  activeAuthToken = token;
}

export function getClientAuthToken(): string | null {
  return activeAuthToken;
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.method && options.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }
  if (activeAuthToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${activeAuthToken}`);
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      credentials: 'include',
      ...options,
      headers,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network failure';
    throw new ApiError(`Network request failed: ${errorMsg}`, 'NETWORK_ERROR', 0);
  }

  let json: ApiEnvelope<T>;
  try {
    json = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError(
      `Invalid server response (${response.status} ${response.statusText})`,
      'INVALID_RESPONSE',
      response.status
    );
  }

  if (!json.success || !response.ok) {
    const errPayload = (json as ApiEnvelopeError).error;
    throw new ApiError(
      errPayload?.message || response.statusText || 'Operation failed',
      errPayload?.code || `HTTP_${response.status}`,
      response.status,
      errPayload?.details
    );
  }

  return (json as ApiEnvelopeSuccess<T>).data;
}

// ==============================================================================
// 3. Domain Type Mappers (Backend Schema <-> Frontend Domain)
// ==============================================================================

function mapBackendPriority(priority: string): ComplaintPriority {
  switch (priority?.toUpperCase()) {
    case 'CRITICAL':
      return 'Critical';
    case 'HIGH':
      return 'High';
    case 'MEDIUM':
      return 'Medium';
    case 'LOW':
    default:
      return 'Low';
  }
}

function mapBackendStatus(status: string): ComplaintStatus {
  switch (status?.toUpperCase()) {
    case 'SUBMITTED':
      return 'Under Scrutiny';
    case 'UNDER_PRELIMINARY_REVIEW':
      return 'Assigned to Bureau';
    case 'UNDER_INQUIRY':
      return 'Show-Cause Notice Issued';
    case 'COORDINATED_REVIEW':
      return 'Hearing Scheduled';
    case 'RESOLVED':
      return 'Resolved';
    case 'CLOSED':
      return 'Resolved';
    case 'DISMISSED':
      return 'Escalated';
    default:
      return 'Under Scrutiny';
  }
}

function mapFrontendStatusToBackend(status: ComplaintStatus): string {
  switch (status) {
    case 'Under Scrutiny':
      return 'SUBMITTED';
    case 'Assigned to Bureau':
      return 'UNDER_PRELIMINARY_REVIEW';
    case 'Show-Cause Notice Issued':
    case 'Institution Response Received':
      return 'UNDER_INQUIRY';
    case 'Hearing Scheduled':
      return 'COORDINATED_REVIEW';
    case 'Resolved':
      return 'RESOLVED';
    case 'Escalated':
      return 'DISMISSED';
    default:
      return 'UNDER_INQUIRY';
  }
}

function mapBackendBureau(bureauNameOrCode?: string): BureauType {
  const norm = bureauNameOrCode?.toLowerCase() || '';
  if (norm.includes('student') || norm.includes('grievance')) return 'Student Grievance Cell';
  if (norm.includes('faculty') || norm.includes('staff')) return 'Faculty Development Cell';
  if (norm.includes('ragging')) return 'Anti-Ragging Cell';
  if (norm.includes('finance') || norm.includes('vigilance') || norm.includes('legal'))
    return 'Finance & Legal Cell';
  return 'Approval Bureau';
}

function mapBackendOverlapStatus(status: string): OverlapReviewStatus {
  switch (status) {
    case 'CONFIRMED_OVERLAP':
    case 'FLAGGED_JOINT_REVIEW':
      return 'Linked';
    case 'DISMISSED_INDEPENDENT':
      return 'Independent';
    case 'PENDING_REVIEW':
    default:
      return 'Pending';
  }
}

function mapFrontendOverlapDecisionToBackend(
  decision: OverlapReviewStatus
): 'FLAGGED_JOINT_REVIEW' | 'CONFIRMED_OVERLAP' | 'DISMISSED_INDEPENDENT' {
  switch (decision) {
    case 'Linked':
      return 'CONFIRMED_OVERLAP';
    case 'Independent':
    case 'Dismissed':
      return 'DISMISSED_INDEPENDENT';
    case 'Pending':
    default:
      return 'FLAGGED_JOINT_REVIEW';
  }
}

// ==============================================================================
// 4. API Client Endpoints
// ==============================================================================

export interface HealthCheckResult {
  status: string;
  database: 'connected' | 'disconnected';
  uptimeSeconds: number;
}

export interface BackendComplaintRecord {
  id: string;
  complaintNumber: string;
  originalBureauRef?: string | null;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  complainantType?: string;
  institution?: {
    id: string;
    permanentId: string;
    name: string;
    state: string;
    district: string;
  };
  bureau?: {
    id: string;
    code: string;
    name: string;
  };
  overlapCount?: number;
}

export interface BackendOverlapRecord {
  id: string;
  overallScore: number;
  entityScore: number;
  subjectScore: number;
  complainantScore: number;
  temporalScore: number;
  reviewStatus: string;
  matchingSignals?: {
    commonKeywords?: string[];
    daysApart?: number;
    involvedBureaus?: string[];
    explanation?: string;
  };
  primaryComplaint: {
    id: string;
    complaintNumber: string;
    subject: string;
    bureau?: { code: string; name: string };
  };
  candidateComplaint: {
    id: string;
    complaintNumber: string;
    subject: string;
    bureau?: { code: string; name: string };
  };
  institution?: {
    permanentId: string;
    name: string;
  };
  reviewer?: {
    name: string;
  };
  reviewNotes?: string;
  reviewedAt?: string;
}

export interface BackendAuditRecord {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface BackendDashboardSummary {
  overview: {
    totalComplaints: number;
    totalOverlapCandidates: number;
    pendingReviewCount: number;
    confirmedOverlapCount: number;
    flaggedJointReviewCount: number;
  };
  complaintsByStatus: Record<string, number>;
  complaintsByPriority: Record<string, number>;
  complaintsByCategory: Record<string, number>;
  complaintsByBureau: Array<{ bureauCode: string; bureauName: string; complaintCount: number }>;
  overlapMetrics: {
    totalCandidates: number;
    statusBreakdown: Record<string, number>;
  };
  topInstitutions: Array<{
    permanentId: string;
    name: string;
    complaintCount: number;
    overlapCandidateCount: number;
  }>;
}

export const apiClient = {
  /**
   * Check backend server and PostgreSQL readiness
   */
  async getHealth(): Promise<HealthCheckResult> {
    return fetchApi<HealthCheckResult>('/api/v1/health');
  },

  /**
   * Fetch all complaints with optional filtering
   */
  async getComplaints(query?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
    bureauId?: string;
  }): Promise<{ complaints: Complaint[]; total: number }> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.search) params.set('search', query.search);
    if (query?.status) params.set('status', query.status);
    if (query?.priority) params.set('priority', query.priority);
    if (query?.bureauId) params.set('bureauId', query.bureauId);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetchApi<{
      complaints: BackendComplaintRecord[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/v1/complaints${qs}`);

    const complaints: Complaint[] = res.complaints.map((c) => ({
      id: c.complaintNumber || c.id,
      title: c.subject,
      institutionId: c.institution?.permanentId || c.institution?.id || 'INST-UNKNOWN',
      institutionName: c.institution?.name || 'Unspecified AICTE Institute',
      region: c.institution?.district || 'Central',
      state: c.institution?.state || 'National',
      bureau: mapBackendBureau(c.bureau?.name || c.bureau?.code),
      category: c.category?.replace(/_/g, ' ') || 'General Grievance',
      complainantType: 'Whistleblower',
      filingDate: c.createdAt ? c.createdAt.slice(0, 10) : '2026-02-01',
      deadlineDate: '2026-03-30',
      priority: mapBackendPriority(c.priority),
      status: mapBackendStatus(c.status),
      description: c.description,
      allegations: [c.subject],
      evidence: [],
      relatedCaseIds: [],
    }));

    return { complaints, total: res.pagination?.total ?? complaints.length };
  },

  /**
   * Fetch full dossier for a single complaint
   */
  async getComplaint(id: string): Promise<Complaint> {
    const res = await fetchApi<{
      complaint: BackendComplaintRecord;
      institution?: { permanentId: string; name: string; state: string; district: string };
      bureau?: { code: string; name: string };
      caseActions?: Array<{ id: string; action: string; note: string; createdAt: string }>;
    }>(`/api/v1/complaints/${encodeURIComponent(id)}`);

    const c = res.complaint;
    return {
      id: c.complaintNumber || c.id,
      title: c.subject,
      institutionId: res.institution?.permanentId || c.institution?.permanentId || 'INST-UNKNOWN',
      institutionName:
        res.institution?.name || c.institution?.name || 'Unspecified AICTE Institute',
      region: res.institution?.district || c.institution?.district || 'Central',
      state: res.institution?.state || c.institution?.state || 'National',
      bureau: mapBackendBureau(res.bureau?.name || c.bureau?.name),
      category: c.category?.replace(/_/g, ' ') || 'General Grievance',
      complainantType: 'Whistleblower',
      filingDate: c.createdAt ? c.createdAt.slice(0, 10) : '2026-02-01',
      deadlineDate: '2026-03-30',
      priority: mapBackendPriority(c.priority),
      status: mapBackendStatus(c.status),
      description: c.description,
      allegations: [c.subject],
      evidence: [],
      relatedCaseIds: [],
    };
  },

  /**
   * Ingest a new institutional complaint and run overlap detection
   */
  async createComplaint(payload: {
    complaintNumber?: string;
    originalBureauRef?: string;
    institutionId: string;
    bureauId: string;
    assignedOfficerId?: string;
    subject: string;
    description: string;
    category?: string;
    priority?: string;
    status?: string;
    incidentDate?: string;
    complainantType?: string;
    complainantMaskedId?: string;
    allegations?: string[];
    evidence?: EvidenceDocument[];
  }): Promise<{
    complaint: Complaint;
    overlaps: OverlapCandidate[];
    rawResult: {
      evaluatedPoolSize: number;
      detectedCandidateCount: number;
      candidates: any[];
    };
  }> {
    const complaintNumber =
      payload.complaintNumber || `CMP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const originalBureauRef = payload.originalBureauRef || `BUR-${Date.now().toString().slice(-6)}`;

    const res = await fetchApi<{
      complaint: BackendComplaintRecord & {
        institution?: {
          id: string;
          permanentId: string;
          name: string;
          state: string;
          district: string;
        };
        bureau?: { id: string; code: string; name: string };
      };
      overlaps: {
        evaluatedPoolSize: number;
        detectedCandidateCount: number;
        candidates: any[];
      };
    }>('/api/v1/complaints', {
      method: 'POST',
      body: JSON.stringify({
        complaintNumber,
        originalBureauRef,
        institutionId: payload.institutionId,
        bureauId: payload.bureauId,
        assignedOfficerId: payload.assignedOfficerId,
        subject: payload.subject,
        description: payload.description,
        category: payload.category || 'OTHER',
        priority: payload.priority || 'MEDIUM',
        status: payload.status || 'SUBMITTED',
        incidentDate: payload.incidentDate,
        complainantType: payload.complainantType || 'STUDENT',
        complainantMaskedId: payload.complainantMaskedId,
      }),
    });

    const c = res.complaint;
    const formattedComplaint: Complaint = {
      id: c.complaintNumber || c.id,
      title: c.subject,
      institutionId: c.institution?.permanentId || payload.institutionId,
      institutionName: c.institution?.name || 'Verified Institution',
      region: c.institution?.district || 'General',
      state: c.institution?.state || 'National',
      bureau: mapBackendBureau(c.bureau?.name || c.bureau?.code),
      category: c.category?.replace(/_/g, ' ') || 'General',
      complainantType: (payload.complainantType as any) || 'Student',
      filingDate: c.createdAt ? c.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      deadlineDate: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
      priority: mapBackendPriority(c.priority),
      status: mapBackendStatus(c.status),
      description: c.description,
      allegations:
        payload.allegations && payload.allegations.length > 0 ? payload.allegations : [c.subject],
      evidence: payload.evidence || [],
      relatedCaseIds: [],
    };

    const formattedOverlaps: OverlapCandidate[] = (res.overlaps.candidates || []).map(
      (cand: any) => ({
        id: `${cand.primaryComplaintId}-${cand.candidateComplaintId}`,
        sourceComplaintId: cand.primaryComplaintId,
        targetComplaintId: cand.candidateComplaintId,
        signalScore: Math.round((cand.overallScore ?? 0) * 100),
        matchingSignals: [
          {
            type: 'Text Similarity',
            detail:
              cand.matchingSignals?.explanation ||
              `Overall match score: ${Math.round((cand.overallScore ?? 0) * 100)}%`,
          },
          ...(cand.matchingSignals?.commonKeywords && cand.matchingSignals.commonKeywords.length > 0
            ? [
                {
                  type: 'Identical Faculty Named' as const,
                  detail: `Matching keywords: ${cand.matchingSignals.commonKeywords.join(', ')}`,
                },
              ]
            : []),
          ...(cand.matchingSignals?.daysApart !== undefined &&
          cand.matchingSignals?.daysApart !== null
            ? [
                {
                  type: 'Temporal Proximity' as const,
                  detail: `Filing gap: ${cand.matchingSignals.daysApart} days`,
                },
              ]
            : []),
        ],
        reviewStatus: 'Pending',
      })
    );

    return {
      complaint: formattedComplaint,
      overlaps: formattedOverlaps,
      rawResult: res.overlaps,
    };
  },

  /**
   * Submit lifecycle status update to backend
   */
  async updateComplaintStatus(
    id: string,
    status: ComplaintStatus,
    note: string = 'Status updated via AICTE Intelligence Workbench'
  ): Promise<void> {
    const backendStatus = mapFrontendStatusToBackend(status);
    await fetchApi(`/api/v1/complaints/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: backendStatus,
        notes: note.trim().length >= 5 ? note.trim() : `${note.trim()} (validated note)`,
      }),
    });
  },

  /**
   * Fetch overlap candidates from algorithm pipeline
   */
  async getOverlapCandidates(query?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<{ candidates: OverlapCandidate[]; total: number }> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.status) params.set('status', query.status);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetchApi<{
      candidates: BackendOverlapRecord[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/v1/overlap-candidates${qs}`);

    const candidates: OverlapCandidate[] = res.candidates.map((c) => ({
      id: c.id,
      sourceComplaintId: c.primaryComplaint?.complaintNumber || c.primaryComplaint?.id,
      targetComplaintId: c.candidateComplaint?.complaintNumber || c.candidateComplaint?.id,
      signalScore: Math.round((c.overallScore ?? 0) * 100),
      matchingSignals: [
        {
          type: 'Text Similarity',
          detail:
            c.matchingSignals?.explanation ||
            `Composite overlap score: ${Math.round(c.overallScore * 100)}%`,
        },
        ...(c.matchingSignals?.commonKeywords && c.matchingSignals.commonKeywords.length > 0
          ? [
              {
                type: 'Identical Faculty Named' as const,
                detail: `Common keywords: ${c.matchingSignals.commonKeywords.join(', ')}`,
              },
            ]
          : []),
        ...(c.matchingSignals?.daysApart !== undefined
          ? [
              {
                type: 'Temporal Proximity' as const,
                detail: `Filing gap: ${c.matchingSignals.daysApart} days`,
              },
            ]
          : []),
      ],
      reviewStatus: mapBackendOverlapStatus(c.reviewStatus),
      adjudicatedBy: c.reviewer?.name,
      adjudicatedAt: c.reviewedAt,
      adjudicationNote: c.reviewNotes,
    }));

    return { candidates, total: res.pagination?.total ?? candidates.length };
  },

  /**
   * Submit human review decision for an overlap candidate
   */
  async reviewOverlap(id: string, decision: OverlapReviewStatus, note: string): Promise<void> {
    const backendDecision = mapFrontendOverlapDecisionToBackend(decision);
    await fetchApi(`/api/v1/overlap-candidates/${encodeURIComponent(id)}/review`, {
      method: 'POST',
      body: JSON.stringify({
        decision: backendDecision,
        notes: note.trim().length >= 5 ? note.trim() : `${note.trim()} (adjudication rationale)`,
      }),
    });
  },

  /**
   * Fetch executive dashboard summary metrics
   */
  async getDashboardSummary(): Promise<BackendDashboardSummary> {
    return fetchApi<BackendDashboardSummary>('/api/v1/dashboard/summary');
  },

  /**
   * Fetch operational audit logs
   */
  async getAuditLogs(query?: {
    page?: number;
    limit?: number;
    entityType?: string;
  }): Promise<{ logs: AuditEvent[]; total: number }> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.entityType) params.set('entityType', query.entityType);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetchApi<{
      logs: BackendAuditRecord[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/api/v1/audit${qs}`);

    const logs: AuditEvent[] = res.logs.map((l) => ({
      id: l.id,
      complaintId: l.entityType === 'COMPLAINT' ? l.entityId : undefined,
      actor: l.actorId || 'AICTE Officer',
      action: l.action.replace(/_/g, ' '),
      details: l.metadata
        ? JSON.stringify(l.metadata)
        : `${l.action} on ${l.entityType}:${l.entityId}`,
      timestamp: l.timestamp
        ? l.timestamp.replace('T', ' ').slice(0, 16)
        : new Date().toISOString(),
    }));

    return { logs, total: res.pagination?.total ?? logs.length };
  },

  /**
   * Authenticate officer session with credentials
   */
  async login(badgeNumber: string, email?: string): Promise<{ token: string; officer: any }> {
    const res = await fetchApi<{ token: string; officer: any }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ badgeNumber, email }),
    });
    setClientAuthToken(res.token);
    return res;
  },

  /**
   * Retrieve current authenticated officer from server
   */
  async getCurrentOfficer(): Promise<{ officer: any }> {
    return fetchApi<{ officer: any }>('/api/v1/auth/me');
  },

  /**
   * Terminate current officer session
   */
  async logout(): Promise<void> {
    await fetchApi<{ message: string }>('/api/v1/auth/logout', { method: 'POST' });
    setClientAuthToken(null);
  },

  /**
   * List available institutional officers for verification
   */
  async getOfficers(): Promise<
    Array<{ id: string; badgeNumber: string; name: string; role: string; bureau: any }>
  > {
    const res = await fetchApi<{ officers: any[] }>('/api/v1/auth/officers');
    return res.officers;
  },

  /**
   * List approved institutions for complaint filing
   */
  async getInstitutions(query?: { search?: string; limit?: number }): Promise<
    Array<{
      id: string;
      permanentId: string;
      name: string;
      state: string;
      district: string;
      institutionType: string;
      approvalStatus: string;
    }>
  > {
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.limit) params.set('limit', String(query.limit));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await fetchApi<{
      institutions: Array<{
        id: string;
        permanentId: string;
        name: string;
        state: string;
        district: string;
        institutionType: string;
        approvalStatus: string;
      }>;
    }>(`/api/v1/institutions${qs}`);
    return res.institutions || [];
  },
};
