'use client';

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect } from 'react';
import {
  Complaint,
  ComplaintStatus,
  OverlapCandidate,
  OverlapReviewStatus,
  AuditEvent,
  ComplaintSubmissionInput,
  ComplaintSubmissionResult,
} from '../types';
import { DEMO_COMPLAINTS } from '../mock-data/complaints';
import { DEMO_OVERLAPS } from '../mock-data/overlaps';
import { DEMO_AUDIT_LOGS } from '../mock-data/audit';
import { apiClient, ApiError, BackendDashboardSummary } from '../api-client';
import { scanForOverlapCandidates, ComplaintInput } from '../../modules/overlap-detection/engine';

export type BackendConnectionStatus = 'checking' | 'connected' | 'offline' | 'error';
export type DataSourceType = 'backend' | 'local-seed';

export interface ActionErrorState {
  title: string;
  code: string;
  status: number;
  message: string;
  endpoint: string;
  details?: unknown;
}

interface ComplaintContextType {
  complaints: Complaint[];
  overlaps: OverlapCandidate[];
  auditLogs: AuditEvent[];
  dashboardSummary: BackendDashboardSummary | null;
  pendingOverlapCount: number;
  criticalComplaintCount: number;
  isLoading: boolean;
  backendStatus: BackendConnectionStatus;
  dataSource: DataSourceType;
  lastSyncedAt: string | null;
  syncError: string | null;
  actionError: ActionErrorState | null;
  isSubmitting: boolean;
  clearActionError: () => void;
  refreshData: () => Promise<void>;
  updateComplaintStatus: (id: string, status: ComplaintStatus, note?: string) => Promise<boolean>;
  adjudicateOverlap: (
    overlapId: string,
    decision: OverlapReviewStatus,
    note: string,
    officerName?: string
  ) => Promise<boolean>;
  submitComplaint: (input: ComplaintSubmissionInput) => Promise<ComplaintSubmissionResult>;
  currentOfficer: any | null;
  switchOfficer: (badgeNumber: string, email?: string) => Promise<boolean>;
  logoutOfficer: () => Promise<void>;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  getComplaint: (id: string) => Complaint | undefined;
  getOverlap: (id: string) => OverlapCandidate | undefined;
  getOverlapsForComplaint: (complaintId: string) => OverlapCandidate[];
}

const ComplaintContext = createContext<ComplaintContextType | null>(null);

export const ComplaintProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [complaints, setComplaints] = useState<Complaint[]>(DEMO_COMPLAINTS);
  const [overlaps, setOverlaps] = useState<OverlapCandidate[]>(DEMO_OVERLAPS);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(DEMO_AUDIT_LOGS);
  const [dashboardSummary, setDashboardSummary] = useState<BackendDashboardSummary | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [backendStatus, setBackendStatus] = useState<BackendConnectionStatus>('checking');
  const [dataSource, setDataSource] = useState<DataSourceType>('local-seed');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [currentOfficer, setCurrentOfficer] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<ActionErrorState | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  const openLoginModal = useCallback(() => setIsLoginModalOpen(true), []);
  const closeLoginModal = useCallback(() => setIsLoginModalOpen(false), []);

  // Clear modal error
  const clearActionError = useCallback(() => {
    setActionError(null);
  }, []);

  // Compute pending overlaps count for badges
  const pendingOverlapCount = useMemo(() => {
    return overlaps.filter((o) => o.reviewStatus === 'Pending').length;
  }, [overlaps]);

  // Compute critical complaints count
  const criticalComplaintCount = useMemo(() => {
    return complaints.filter((c) => c.priority === 'Critical' && c.status !== 'Resolved').length;
  }, [complaints]);

  // Load backend data if available, or fall back transparently
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setSyncError(null);

    try {
      // 1. Check health
      const health = await apiClient.getHealth();
      if (health.database === 'connected') {
        setBackendStatus('connected');

        // 2. Resolve active officer session if token/cookie is present
        try {
          const me = await apiClient.getCurrentOfficer();
          if (me?.officer) {
            setCurrentOfficer(me.officer);
          }
        } catch {
          // No active officer session. Genuine auth preserved — user can sign in as needed.
          setCurrentOfficer(null);
        }

        // 3. Fetch live data concurrently
        const [complaintsRes, overlapsRes, summaryRes, auditRes] = await Promise.allSettled([
          apiClient.getComplaints({ limit: 50 }),
          apiClient.getOverlapCandidates({ limit: 50 }),
          apiClient.getDashboardSummary(),
          apiClient.getAuditLogs({ limit: 50 }),
        ]);

        let hasLiveComplaints = false;
        if (complaintsRes.status === 'fulfilled' && complaintsRes.value.complaints.length > 0) {
          setComplaints(complaintsRes.value.complaints);
          hasLiveComplaints = true;
        }

        if (overlapsRes.status === 'fulfilled' && overlapsRes.value.candidates.length > 0) {
          setOverlaps(overlapsRes.value.candidates);
        }

        if (summaryRes.status === 'fulfilled') {
          setDashboardSummary(summaryRes.value);
        }

        if (auditRes.status === 'fulfilled' && auditRes.value.logs.length > 0) {
          setAuditLogs(auditRes.value.logs);
        }

        setDataSource(hasLiveComplaints ? 'backend' : 'local-seed');
        setLastSyncedAt(new Date().toLocaleTimeString());
      } else {
        setBackendStatus('offline');
        setDataSource('local-seed');
        setSyncError(
          'PostgreSQL database is currently disconnected. Running on institutional baseline fixtures.'
        );
      }
    } catch (err: unknown) {
      setBackendStatus('offline');
      setDataSource('local-seed');
      const msg = err instanceof Error ? err.message : 'Backend unreachable';
      setSyncError(
        `Backend API connection unavailable (${msg}). Displaying institutional demo fixtures.`
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) {
        void refreshData();
      }
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [refreshData]);

  // Update a complaint status with server-side validation and fail-closed handling
  const updateComplaintStatus = useCallback(
    async (id: string, newStatus: ComplaintStatus, note?: string): Promise<boolean> => {
      setIsSubmitting(true);
      setActionError(null);

      const noteText = note || `Complaint ${id} transition to ${newStatus}`;

      try {
        // Attempt actual backend PATCH request
        await apiClient.updateComplaintStatus(id, newStatus, noteText);

        // If server accepted, update state
        setComplaints((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );

        const newAudit: AuditEvent = {
          id: `AUD-${Date.now()}`,
          complaintId: id,
          actor: 'Authorized Scrutiny Officer',
          action: `Status Updated to ${newStatus}`,
          details: noteText,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        };
        setAuditLogs((prev) => [newAudit, ...prev]);

        return true;
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          // Check for security fail-closed invariant
          if (err.status === 401 || err.code === 'UNAUTHORIZED') {
            setActionError({
              title: 'Authentication Required (Fail-Closed Security)',
              code: err.code,
              status: err.status,
              endpoint: `PATCH /api/v1/complaints/${id}`,
              message:
                'Protected write operation was safely rejected by the server (HTTP 401 Unauthorized). As documented in the security model, no client-side role spoofing is permitted, and write mutations fail-closed until an enterprise identity provider (SSO/NextAuth) is configured in this deployment.',
              details: err.details,
            });
          } else {
            setActionError({
              title: 'Backend API Error',
              code: err.code,
              status: err.status,
              endpoint: `PATCH /api/v1/complaints/${id}`,
              message: err.message,
              details: err.details,
            });
          }
        } else {
          setActionError({
            title: 'Network Connection Failure',
            code: 'NETWORK_ERROR',
            status: 0,
            endpoint: `PATCH /api/v1/complaints/${id}`,
            message: err instanceof Error ? err.message : 'Unable to reach the backend API server.',
          });
        }
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  // Adjudicate an overlap pair with backend review submission
  const adjudicateOverlap = useCallback(
    async (
      overlapId: string,
      decision: OverlapReviewStatus,
      note: string,
      officerName: string = 'Dr. S. K. Rao (Apex Scrutiny Officer)'
    ): Promise<boolean> => {
      setIsSubmitting(true);
      setActionError(null);

      const noteText = note || `Human verdict '${decision}' recorded`;

      try {
        // Attempt actual backend POST review request
        await apiClient.reviewOverlap(overlapId, decision, noteText);

        // Server confirmed: update local state
        let affectedSourceId = '';
        let affectedTargetId = '';

        setOverlaps((prev) =>
          prev.map((item) => {
            if (item.id === overlapId) {
              affectedSourceId = item.sourceComplaintId;
              affectedTargetId = item.targetComplaintId;
              return {
                ...item,
                reviewStatus: decision,
                adjudicatedBy: officerName,
                adjudicatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
                adjudicationNote: noteText,
              };
            }
            return item;
          })
        );

        if (decision === 'Linked' && affectedSourceId && affectedTargetId) {
          setComplaints((prev) =>
            prev.map((c) => {
              if (c.id === affectedSourceId) {
                const current = c.relatedCaseIds || [];
                return {
                  ...c,
                  relatedCaseIds: current.includes(affectedTargetId)
                    ? current
                    : [...current, affectedTargetId],
                };
              }
              if (c.id === affectedTargetId) {
                const current = c.relatedCaseIds || [];
                return {
                  ...c,
                  relatedCaseIds: current.includes(affectedSourceId)
                    ? current
                    : [...current, affectedSourceId],
                };
              }
              return c;
            })
          );
        }

        const newAudit: AuditEvent = {
          id: `AUD-${Date.now()}`,
          complaintId: affectedSourceId || undefined,
          actor: officerName,
          action: `Overlap Adjudicated: ${decision}`,
          details: `Human verdict '${decision}' for candidate pair (${affectedSourceId || 'N/A'} ↔ ${
            affectedTargetId || 'N/A'
          }). Rationale: ${noteText}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        };
        setAuditLogs((prev) => [newAudit, ...prev]);

        return true;
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          if (err.status === 401 || err.code === 'UNAUTHORIZED') {
            setActionError({
              title: 'Authentication Required (Fail-Closed Security)',
              code: err.code,
              status: err.status,
              endpoint: `POST /api/v1/overlap-candidates/${overlapId}/review`,
              message:
                'Overlap review submission was safely rejected by the server (HTTP 401 Unauthorized). As documented in the security model, overlap adjudication requires a cryptographically verified officer session. Write operations fail-closed until an identity provider is active.',
              details: err.details,
            });
          } else {
            setActionError({
              title: 'Backend API Error',
              code: err.code,
              status: err.status,
              endpoint: `POST /api/v1/overlap-candidates/${overlapId}/review`,
              message: err.message,
              details: err.details,
            });
          }
        } else {
          setActionError({
            title: 'Network Connection Failure',
            code: 'NETWORK_ERROR',
            status: 0,
            endpoint: `POST /api/v1/overlap-candidates/${overlapId}/review`,
            message: err instanceof Error ? err.message : 'Unable to reach the backend API server.',
          });
        }
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  const getComplaint = useCallback(
    (id: string) => {
      return complaints.find((c) => c.id === id);
    },
    [complaints]
  );

  const getOverlap = useCallback(
    (id: string) => {
      return overlaps.find((o) => o.id === id);
    },
    [overlaps]
  );

  const getOverlapsForComplaint = useCallback(
    (complaintId: string) => {
      return overlaps.filter(
        (o) => o.sourceComplaintId === complaintId || o.targetComplaintId === complaintId
      );
    },
    [overlaps]
  );

  const switchOfficer = useCallback(
    async (badgeNumber: string, email?: string): Promise<boolean> => {
      try {
        const res = await apiClient.login(badgeNumber, email);
        if (res?.officer) {
          setCurrentOfficer(res.officer);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    []
  );

  const logoutOfficer = useCallback(async () => {
    try {
      await apiClient.logout();
    } finally {
      setCurrentOfficer(null);
    }
  }, []);

  // Submit a new complaint, running either live backend overlap detection or in-memory pure engine fallback
  const submitComplaint = useCallback(
    async (input: ComplaintSubmissionInput): Promise<ComplaintSubmissionResult> => {
      setIsSubmitting(true);
      setActionError(null);

      try {
        if (backendStatus === 'connected') {
          // Live Database mode: requires an authenticated officer session
          if (!currentOfficer) {
            setIsLoginModalOpen(true);
            throw new Error(
              'Authentication Required: Please sign in with an authorized AICTE officer badge number to submit complaints to the live registry.'
            );
          }

          const res = await apiClient.createComplaint({
            institutionId: input.institutionId,
            bureauId: input.bureauId || currentOfficer.bureauId,
            assignedOfficerId: currentOfficer.id,
            subject: input.subject,
            description: input.description,
            category: input.category,
            priority: input.priority,
            complainantType: input.complainantType,
            complainantMaskedId: input.complainantMaskedId,
            allegations: input.allegations,
            evidence: input.evidence,
          });

          // Add to local state
          setComplaints((prev) => [res.complaint, ...prev]);
          if (res.overlaps.length > 0) {
            setOverlaps((prev) => [...res.overlaps, ...prev]);
          }

          const newAudit: AuditEvent = {
            id: `AUD-${Date.now()}`,
            complaintId: res.complaint.id,
            actor: currentOfficer?.name || 'Authorized Scrutiny Officer',
            action: 'Ingested Grievance via Portal',
            details: `Registered ${res.complaint.id} (${res.complaint.bureau}) with ${res.overlaps.length} cross-bureau overlap candidates flagged`,
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          };
          setAuditLogs((prev) => [newAudit, ...prev]);

          return {
            success: true,
            complaint: res.complaint,
            overlaps: res.overlaps,
            mode: 'live-backend',
            evaluatedPoolSize: res.rawResult.evaluatedPoolSize,
            detectedCandidateCount: res.rawResult.detectedCandidateCount,
          };
        } else {
          // Local Demo / Offline Fallback: Run pure deterministic algorithm on local state
          const newId = `AICTE-2026-${Math.floor(8500 + Math.random() * 900)}`;
          const filingDate = new Date().toISOString().slice(0, 10);
          const deadlineDate = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);

          const newComplaint: Complaint = {
            id: newId,
            title: input.subject,
            institutionId: input.permanentId || input.institutionId || 'AICTE-INST-8821',
            institutionName: input.institutionName,
            region: input.district || 'Western',
            state: input.state || 'Maharashtra',
            bureau: input.bureau,
            category: input.category,
            complainantType: input.complainantType,
            filingDate,
            deadlineDate,
            priority: input.priority,
            status: 'Under Scrutiny',
            description: input.description,
            allegations: input.allegations.length > 0 ? input.allegations : [input.subject],
            evidence: input.evidence,
            relatedCaseIds: [],
          };

          // Convert current complaints pool into ComplaintInput format for engine
          const targetInput: ComplaintInput = {
            id: newComplaint.id,
            complaintNumber: newComplaint.id,
            originalBureauRef: `BUR-${Date.now().toString().slice(-6)}`,
            bureauId: newComplaint.bureau,
            institutionId: newComplaint.institutionId,
            institution: {
              permanentId: newComplaint.institutionId,
              name: newComplaint.institutionName,
              state: newComplaint.state,
              district: newComplaint.region,
            },
            subject: newComplaint.title,
            description: newComplaint.description,
            category: newComplaint.category,
            priority: newComplaint.priority,
            complainantType: newComplaint.complainantType,
            complainantMaskedId: input.complainantMaskedId,
            createdAt: newComplaint.filingDate,
          };

          const poolInputs: ComplaintInput[] = complaints.map((c) => ({
            id: c.id,
            complaintNumber: c.id,
            originalBureauRef: c.id,
            bureauId: c.bureau,
            institutionId: c.institutionId,
            institution: {
              permanentId: c.institutionId,
              name: c.institutionName,
              state: c.state,
              district: c.region,
            },
            subject: c.title,
            description: c.description,
            category: c.category,
            priority: c.priority,
            complainantType: c.complainantType,
            createdAt: c.filingDate,
          }));

          // Run the real pure algorithm without fabricating scores
          const detected = scanForOverlapCandidates(targetInput, poolInputs, 0.35);

          const generatedOverlaps: OverlapCandidate[] = detected.map((cand) => ({
            id: `OVL-${cand.primaryComplaintId}-${cand.candidateComplaintId}`,
            sourceComplaintId: cand.primaryComplaintId,
            targetComplaintId: cand.candidateComplaintId,
            signalScore: Math.round(cand.overallScore * 100),
            matchingSignals: [
              {
                type: 'Text Similarity',
                detail: cand.matchingSignals.explanation,
              },
              ...(cand.matchingSignals.commonKeywords &&
              cand.matchingSignals.commonKeywords.length > 0
                ? [
                    {
                      type: 'Identical Faculty Named' as const,
                      detail: `Matching keywords: ${cand.matchingSignals.commonKeywords.join(', ')}`,
                    },
                  ]
                : []),
              ...(cand.matchingSignals.daysApart !== undefined &&
              cand.matchingSignals.daysApart !== null
                ? [
                    {
                      type: 'Temporal Proximity' as const,
                      detail: `Filing gap: ${cand.matchingSignals.daysApart} days`,
                    },
                  ]
                : []),
            ],
            reviewStatus: 'Pending',
          }));

          // Update local state
          setComplaints((prev) => [newComplaint, ...prev]);
          if (generatedOverlaps.length > 0) {
            setOverlaps((prev) => [...generatedOverlaps, ...prev]);
          }

          const newAudit: AuditEvent = {
            id: `AUD-${Date.now()}`,
            complaintId: newId,
            actor: currentOfficer?.name || 'Scrutiny Session',
            action: 'Submitted Institutional Grievance (Local Baseline)',
            details: `Registered ${newId} (${newComplaint.bureau}) with ${generatedOverlaps.length} advisory overlap candidates flagged`,
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          };
          setAuditLogs((prev) => [newAudit, ...prev]);

          return {
            success: true,
            complaint: newComplaint,
            overlaps: generatedOverlaps,
            mode: 'local-demo',
            evaluatedPoolSize: complaints.length,
            detectedCandidateCount: generatedOverlaps.length,
            rawSignals: detected,
          };
        }
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setActionError({
            title: 'Complaint Submission Error',
            code: err.code,
            status: err.status,
            endpoint: 'POST /api/v1/complaints',
            message: err.message,
            details: err.details,
          });
        }
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [backendStatus, complaints, currentOfficer]
  );

  const value = useMemo(
    () => ({
      complaints,
      overlaps,
      auditLogs,
      dashboardSummary,
      pendingOverlapCount,
      criticalComplaintCount,
      isLoading,
      backendStatus,
      dataSource,
      lastSyncedAt,
      syncError,
      actionError,
      isSubmitting,
      currentOfficer,
      switchOfficer,
      logoutOfficer,
      isLoginModalOpen,
      openLoginModal,
      closeLoginModal,
      clearActionError,
      refreshData,
      updateComplaintStatus,
      adjudicateOverlap,
      submitComplaint,
      getComplaint,
      getOverlap,
      getOverlapsForComplaint,
    }),
    [
      complaints,
      overlaps,
      auditLogs,
      dashboardSummary,
      pendingOverlapCount,
      criticalComplaintCount,
      isLoading,
      backendStatus,
      dataSource,
      lastSyncedAt,
      syncError,
      actionError,
      isSubmitting,
      currentOfficer,
      switchOfficer,
      logoutOfficer,
      isLoginModalOpen,
      openLoginModal,
      closeLoginModal,
      clearActionError,
      refreshData,
      updateComplaintStatus,
      adjudicateOverlap,
      submitComplaint,
      getComplaint,
      getOverlap,
      getOverlapsForComplaint,
    ]
  );

  return <ComplaintContext.Provider value={value}>{children}</ComplaintContext.Provider>;
};

export const useComplaints = (): ComplaintContextType => {
  const context = useContext(ComplaintContext);
  if (!context) {
    throw new Error('useComplaints must be used within a ComplaintProvider');
  }
  return context;
};
