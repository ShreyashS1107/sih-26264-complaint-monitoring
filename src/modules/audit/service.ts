import { db } from '@/server/db';
import type { AuditLog, Prisma, PrismaClient } from '@prisma/client';

/**
 * Compatible Prisma database client supporting both standard client and transaction client.
 */
export type AuditLogDbClient = Prisma.TransactionClient | PrismaClient;

/**
 * Input parameters for creating an audit log record.
 */
export interface CreateAuditLogParams {
  entityType: string;
  entityId: string;
  action: string;
  actorId?: string | null;
  actorRole?: string | null;
  bureauId?: string | null;
  details?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

/**
 * Sensitive field names that must never be recorded in audit details.
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'secret',
  'token',
  'authorization',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'nextauth_secret',
]);

/**
 * Recursively redacts sensitive keys from an audit details payload.
 */
function sanitizeDetails(value: unknown): Prisma.InputJsonValue {
  if (value === null || value === undefined) {
    return {};
  }
  if (typeof value !== 'object') {
    return value as Prisma.InputJsonValue;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeDetails) as Prisma.InputJsonValue;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeDetails(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized as Prisma.InputJsonValue;
}

/**
 * Creates an immutable operational audit log record in PostgreSQL.
 *
 * Designed to be called either standalone or atomically within an existing Prisma transaction.
 * Does not swallow database errors, allowing callers to handle transactions appropriately.
 *
 * @param params - The audit record attributes (entityType, entityId, action, actor, bureau, details)
 * @param client - Optional Prisma client or transaction client for atomic execution
 * @returns The persisted AuditLog record
 * @throws Error if required fields are missing or database query fails
 *
 * @example
 * // Standalone call:
 * await createAuditLog({
 *   entityType: 'COMPLAINT',
 *   entityId: complaint.id,
 *   action: 'INGEST_COMPLAINT',
 *   actorId: officer.id,
 *   bureauId: complaint.bureauId,
 *   details: { complaintNumber: complaint.complaintNumber }
 * });
 *
 * // Within Prisma $transaction:
 * await db.$transaction(async (tx) => {
 *   await tx.overlapCandidate.update({ ... });
 *   await createAuditLog({ ... }, tx);
 * });
 */
export async function createAuditLog(
  params: CreateAuditLogParams,
  client: AuditLogDbClient = db
): Promise<AuditLog> {
  const entityType = params.entityType?.trim();
  const entityId = params.entityId?.trim();
  const action = params.action?.trim();

  if (!entityType) {
    throw new Error('AuditLog entityType is required.');
  }
  if (!entityId) {
    throw new Error('AuditLog entityId is required.');
  }
  if (!action) {
    throw new Error('AuditLog action is required.');
  }

  const details = sanitizeDetails(params.details);

  return client.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      actorId: params.actorId?.trim() || null,
      actorRole: params.actorRole?.trim() || null,
      bureauId: params.bureauId?.trim() || null,
      details,
      ipAddress: params.ipAddress?.trim() || null,
    },
  });
}

/**
 * Retrieves chronological audit log records for a given entity.
 *
 * @param entityType - Entity type identifier (e.g., 'COMPLAINT', 'OVERLAP_CANDIDATE')
 * @param entityId - Entity primary identifier
 * @param client - Optional Prisma client or transaction client
 * @returns Array of AuditLog records ordered by timestamp descending
 */
export async function getAuditLogsForEntity(
  entityType: string,
  entityId: string,
  client: AuditLogDbClient = db
): Promise<AuditLog[]> {
  return client.auditLog.findMany({
    where: {
      entityType: entityType.trim(),
      entityId: entityId.trim(),
    },
    orderBy: {
      timestamp: 'desc',
    },
  });
}
