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
import { AuthenticatedOfficer } from '../auth';

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

export interface SwitchOfficerResult {
  success: boolean;
  error?: string;
  category?: 'credentials' | 'database' | 'server' | 'network' | 'validation';
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
  updateComplaintStatus: (
    id: string,
    status: ComplaintStatus,
    note?: string
  ) => Promise<{ success: boolean; error?: string }>;
  deleteComplaint: (
    id: string
  ) => Promise<{ success: boolean; action?: 'DELETED' | 'ARCHIVED'; error?: string }>;
  adjudicateOverlap: (
    overlapId: string,
    decision: OverlapReviewStatus | string,
    note: string,
    officerName?: string,
    directive?: string
  ) => Promise<boolean>;
  submitComplaint: (input: ComplaintSubmissionInput) => Promise<ComplaintSubmissionResult>;
  currentOfficer: any | null;
  switchOfficer: (badgeNumber: string, email?: string) => Promise<SwitchOfficerResult>;
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

  const openLoginModal = useCallback(() => {
    setIsLoginModalOpen(true);
  }, []);

  const closeLoginModal = useCallback(() => {
    setIsLoginModalOpen(false);
  }, []);

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
        if (complaintsRes.status === 'fulfilled') {
          const serverComplaints = complaintsRes.value.complaints;
          setComplaints((prevComplaints) => {
            if (serverComplaints.length === 0) {
              return serverComplaints;
            }
            // Preserve locally attached evidence/allegations if server response omitted them
            return serverComplaints.map((sc) => {
              const prev = prevComplaints.find(
                (p) =>
                  p.id === sc.id ||
                  p.complaintNumber === sc.id ||
                  (p as any).dbId === sc.id ||
                  (p as any).dbId === (sc as any).dbId
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
                    prev.allegations && prev.allegations.length > 0
                      ? prev.allegations
                      : sc.allegations,
                };
              }
              return sc;
            });
          });
          hasLiveComplaints = serverComplaints.length > 0;
        }

        if (overlapsRes.status === 'fulfilled') {
          setOverlaps(overlapsRes.value.candidates);
        }

        if (summaryRes.status === 'fulfilled') {
          setDashboardSummary(summaryRes.value);
        }

        if (auditRes.status === 'fulfilled') {
          setAuditLogs(auditRes.value.logs);
        }

        setDataSource(hasLiveComplaints ? 'backend' : 'backend');
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
    async (
      id: string,
      newStatus: ComplaintStatus,
      note?: string
    ): Promise<{ success: boolean; error?: string }> => {
      setIsSubmitting(true);
      setActionError(null);

      const noteText = note || `Complaint ${id} transition to ${newStatus}`;

      try {
        // Attempt actual backend PATCH request
        await apiClient.updateComplaintStatus(id, newStatus, noteText);

        // If server accepted, update state
        setComplaints((prev) =>
          prev.map((item) =>
            item.id === id || item.complaintNumber === id || (item as any).dbId === id
              ? { ...item, status: newStatus }
              : item
          )
        );

        const newAudit: AuditEvent = {
          id: `AUD-${Date.now()}`,
          complaintId: id,
          actor: currentOfficer?.name || 'Authorized Scrutiny Officer',
          action: `Status Updated to ${newStatus}`,
          details: noteText,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        };
        setAuditLogs((prev) => [newAudit, ...prev]);

        // Background refresh to synchronize dashboard metrics and counts
        void refreshData();

        return { success: true };
      } catch (err: unknown) {
        const errorMsg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Failed to update complaint status';
        return { success: false, error: errorMsg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentOfficer, refreshData]
  );

  // Delete or archive a complaint
  const deleteComplaint = useCallback(
    async (
      id: string
    ): Promise<{ success: boolean; action?: 'DELETED' | 'ARCHIVED'; error?: string }> => {
      setIsSubmitting(true);
      setActionError(null);

      try {
        const res = await apiClient.deleteComplaint(id);

        if (res.action === 'DELETED') {
          setComplaints((prev) =>
            prev.filter(
              (item) => item.id !== id && item.complaintNumber !== id && (item as any).dbId !== id
            )
          );
        } else {
          setComplaints((prev) =>
            prev.map((item) =>
              item.id === id || item.complaintNumber === id || (item as any).dbId === id
                ? { ...item, status: 'Closed' as ComplaintStatus }
                : item
            )
          );
        }

        const newAudit: AuditEvent = {
          id: `AUD-${Date.now()}`,
          complaintId: id,
          actor: currentOfficer?.name || 'Authorized Scrutiny Officer',
          action: res.action === 'ARCHIVED' ? 'Complaint Archived' : 'Complaint Deleted',
          details: res.message,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        };
        setAuditLogs((prev) => [newAudit, ...prev]);

        // Background refresh to synchronize dashboard metrics and counts
        void refreshData();

        return { success: true, action: res.action };
      } catch (err: unknown) {
        const errorMsg =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Failed to delete complaint';
        return { success: false, error: errorMsg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentOfficer, refreshData]
  );

  // Adjudicate an overlap pair with backend review submission
  const adjudicateOverlap = useCallback(
    async (
      overlapId: string,
      decision: OverlapReviewStatus | string,
      note: string,
      officerName: string = 'Dr. S. K. Rao (Apex Scrutiny Officer)',
      directive?: string
    ): Promise<boolean> => {
      setIsSubmitting(true);
      setActionError(null);

      const noteText = note || `Human verdict '${decision}' recorded`;

      try {
        // Attempt actual backend POST review request
        await apiClient.reviewOverlap(overlapId, decision, noteText, directive);

        // Server confirmed: update local state
        let affectedSourceId = '';
        let affectedTargetId = '';

        const finalStatus: OverlapReviewStatus =
          decision === 'Linked'
            ? 'Linked'
            : decision === 'Independent' || decision === 'Dismissed' || decision === 'Pass'
            ? 'Independent'
            : 'Pending';

        setOverlaps((prev) =>
          prev.map((item) => {
            const matchesId =
              item.id === overlapId ||
              `${item.sourceComplaintId}-${item.targetComplaintId}` === overlapId ||
              `${item.targetComplaintId}-${item.sourceComplaintId}` === overlapId;
            if (matchesId) {
              affectedSourceId = item.sourceComplaintId;
              affectedTargetId = item.targetComplaintId;
              return {
                ...item,
                reviewStatus: finalStatus,
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
              const matchesSource =
                c.id === affectedSourceId ||
                c.complaintNumber === affectedSourceId ||
                (c as any).dbId === affectedSourceId;
              const matchesTarget =
                c.id === affectedTargetId ||
                c.complaintNumber === affectedTargetId ||
                (c as any).dbId === affectedTargetId;

              if (matchesSource) {
                const current = c.relatedCaseIds || [];
                return {
                  ...c,
                  relatedCaseIds: current.includes(affectedTargetId)
                    ? current
                    : [...current, affectedTargetId],
                };
              }
              if (matchesTarget) {
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

        // Background refresh to synchronize dashboard metrics and candidate queues
        void refreshData();

        return true;
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setActionError({
            title: 'Backend API Error',
            code: err.code,
            status: err.status,
            endpoint: `POST /api/v1/overlap-candidates/${overlapId}/review`,
            message: err.message,
            details: err.details,
          });
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
    [refreshData]
  );

  const getComplaint = useCallback(
    (id: string) => {
      if (!id) return undefined;
      return complaints.find(
        (c) => c.id === id || c.complaintNumber === id || (c as any).dbId === id
      );
    },
    [complaints]
  );

  const getOverlap = useCallback(
    (id: string) => {
      if (!id) return undefined;
      return overlaps.find(
        (o) =>
          o.id === id ||
          `${o.sourceComplaintId}-${o.targetComplaintId}` === id ||
          `${o.targetComplaintId}-${o.sourceComplaintId}` === id
      );
    },
    [overlaps]
  );

  const getOverlapsForComplaint = useCallback(
    (complaintId: string) => {
      if (!complaintId) return [];
      const c = complaints.find(
        (item) =>
          item.id === complaintId ||
          item.complaintNumber === complaintId ||
          (item as any).dbId === complaintId
      );
      const targetIds = new Set<string>();
      targetIds.add(complaintId);
      if (c) {
        if (c.id) targetIds.add(c.id);
        if (c.complaintNumber) targetIds.add(c.complaintNumber);
        if ((c as any).dbId) targetIds.add((c as any).dbId);
      }
      return overlaps.filter(
        (o) => targetIds.has(o.sourceComplaintId) || targetIds.has(o.targetComplaintId)
      );
    },
    [overlaps, complaints]
  );

  const switchOfficer = useCallback(
    async (badgeNumber: string, email?: string): Promise<SwitchOfficerResult> => {
      // 1. Frictionless Demo Login: If badgeNumber is empty, succeed immediately
      const cleanBadge = (badgeNumber || '').trim();
      const cleanEmail = (email || '').trim();

      if (!cleanBadge) {
        const demoOfficer: AuthenticatedOfficer = {
          id: 'demo-officer-prototype',
          badgeNumber: 'OFF-AICTE-DEMO',
          name: 'Apex Scrutiny Officer (Demo)',
          email: 'demo.officer@aicte.internal',
          bureauId: 'bureau-001',
          role: 'CASE_OFFICER',
        };
        setCurrentOfficer(demoOfficer);
        return { success: true };
      }

      // 2. If a badge is specified, attempt live verification if backend is live, otherwise create local demo session
      try {
        if (backendStatus === 'connected') {
          const res = await apiClient.login(cleanBadge, cleanEmail || undefined);
          if (res?.officer) {
            setCurrentOfficer(res.officer);
            return { success: true };
          }
        }
      } catch (_err: unknown) {
        // Fallback gracefully to demo session
      }

      // Create in-memory demo session for the given badge without database creation
      const demoOfficer: AuthenticatedOfficer = {
        id: `demo-${cleanBadge.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        badgeNumber: cleanBadge,
        name: `Officer ${cleanBadge}`,
        email: cleanEmail || `${cleanBadge.toLowerCase()}@demo.aicte.internal`,
        bureauId: 'bureau-001',
        role: 'CASE_OFFICER',
      };
      setCurrentOfficer(demoOfficer);
      return { success: true };
    },
    [backendStatus]
  );

  const logoutOfficer = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch {
      // Ignore network errors on demo logout
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
        const res = await apiClient.createComplaint({
          institutionId: input.institutionId,
          permanentId: input.permanentId,
          institutionName: input.institutionName,
          state: input.state,
          district: input.district,
          bureau: input.bureau,
          bureauId: input.bureauId || currentOfficer?.bureau?.id || currentOfficer?.bureauId,
          assignedOfficerId: currentOfficer?.id,
          subject: input.subject,
          description: input.description,
          category: input.category,
          priority: input.priority,
          complainantType: input.complainantType,
          complainantMaskedId: input.complainantMaskedId,
          allegations: input.allegations,
          evidence: input.evidence,
        });

        // Add to local state only upon confirmed database persistence
        setComplaints((prev) => {
          const exists = prev.some((c) => c.id === res.complaint.id);
          return exists ? prev : [res.complaint, ...prev];
        });
        if (res.overlaps.length > 0) {
          setOverlaps((prev) => [...res.overlaps, ...prev]);
        }

        const newAudit: AuditEvent = {
          id: `AUD-${Date.now()}`,
          complaintId: res.complaint.id,
          actor: currentOfficer?.name || 'Authorized Portal Submitter',
          action: 'Ingested Grievance via Portal',
          details: `Registered ${res.complaint.id} (${res.complaint.bureau}) with ${res.overlaps.length} cross-bureau overlap candidates flagged`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        };
        setAuditLogs((prev) => [newAudit, ...prev]);

        // Background refresh to synchronize dashboard metrics and counters from backend
        void refreshData();

        return {
          success: true,
          complaint: res.complaint,
          overlaps: res.overlaps,
          mode: 'live-backend',
          evaluatedPoolSize: res.rawResult.evaluatedPoolSize,
          detectedCandidateCount: res.rawResult.detectedCandidateCount,
        };
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
    [currentOfficer, refreshData]
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
      deleteComplaint,
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
      deleteComplaint,
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
