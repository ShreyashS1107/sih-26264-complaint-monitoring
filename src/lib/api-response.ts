import { NextResponse } from 'next/server';

/**
 * Standard API metadata envelope as specified in docs/api/README.md
 */
export interface ApiMeta {
  timestamp: string;
  requestId: string;
}

/**
 * Structured API error object
 */
export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Standard successful API response payload
 */
export interface ApiSuccessPayload<T> {
  success: true;
  data: T;
  error: null;
  meta: ApiMeta;
}

/**
 * Standard error API response payload
 */
export interface ApiErrorPayload {
  success: false;
  data: null;
  error: ApiErrorDetail;
  meta: ApiMeta;
}

/**
 * Union type representing any standard API response envelope
 */
export type ApiResponsePayload<T> = ApiSuccessPayload<T> | ApiErrorPayload;

/**
 * Options for constructing a successful API response
 */
export interface ApiSuccessOptions {
  status?: number;
  headers?: HeadersInit;
  requestId?: string;
}

/**
 * Options for constructing an error API response
 */
export interface ApiErrorOptions {
  headers?: HeadersInit;
  requestId?: string;
  details?: unknown;
}

/**
 * Safe pattern for validating caller-provided request IDs
 * Accepts alphanumeric characters, hyphens, underscores, and dots (max 128 chars)
 */
const SAFE_REQUEST_ID_PATTERN = /^[a-zA-Z0-9_\-.]{1,128}$/;

/**
 * Resolves or generates a server-safe request ID
 */
function resolveRequestId(explicitId?: string): string {
  if (explicitId && SAFE_REQUEST_ID_PATTERN.test(explicitId)) {
    return explicitId;
  }
  return `req_${crypto.randomUUID()}`;
}

/**
 * Generates a standardized successful API response using Next.js NextResponse.
 *
 * @param data - The payload to return in the 'data' field
 * @param options - Optional configuration (status code, headers, requestId)
 * @returns NextResponse with standardized envelope
 *
 * @example
 * return apiSuccess({ complaint }, { status: 201 });
 */
export function apiSuccess<T>(
  data: T,
  options: ApiSuccessOptions = {}
): NextResponse<ApiSuccessPayload<T>> {
  const status = options.status ?? 200;
  const requestId = resolveRequestId(options.requestId);
  const timestamp = new Date().toISOString();

  const payload: ApiSuccessPayload<T> = {
    success: true,
    data,
    error: null,
    meta: {
      timestamp,
      requestId,
    },
  };

  return NextResponse.json(payload, {
    status,
    headers: options.headers,
  });
}

/**
 * Generates a standardized error API response using Next.js NextResponse.
 *
 * @param code - Machine-readable error code (e.g., 'NOT_FOUND', 'VALIDATION_ERROR')
 * @param message - Human-readable explanation of the error
 * @param status - HTTP status code (e.g., 400, 401, 403, 404, 500)
 * @param options - Optional configuration (headers, requestId, additional details)
 * @returns NextResponse with standardized error envelope
 *
 * @example
 * return apiError('NOT_FOUND', 'Complaint not found', 404);
 */
export function apiError(
  code: string,
  message: string,
  status: number,
  options: ApiErrorOptions = {}
): NextResponse<ApiErrorPayload> {
  const requestId = resolveRequestId(options.requestId);
  const timestamp = new Date().toISOString();

  const errorDetail: ApiErrorDetail = {
    code,
    message,
  };

  if (options.details !== undefined) {
    errorDetail.details = options.details;
  }

  const payload: ApiErrorPayload = {
    success: false,
    data: null,
    error: errorDetail,
    meta: {
      timestamp,
      requestId,
    },
  };

  return NextResponse.json(payload, {
    status,
    headers: options.headers,
  });
}

/**
 * Safely logs server-side exceptions without exposing connection strings,
 * credentials, authentication tokens, or personal complainant identifiers.
 */
export function logServerError(context: string, error: unknown): void {
  const errObj = error instanceof Error ? error : new Error(String(error));
  const rawMsg = errObj.message || String(error);

  // Redact potential connection strings (e.g. postgresql://user:pass@host:port/db)
  const safeMsg = rawMsg
    .replace(/postgres(ql)?:\/\/[^\s"'`]+/gi, '[DATABASE_URL_REDACTED]')
    .replace(/(password|passwd|pwd|secret|token|apiKey|api_key)[=:][^\s&,;'"]+/gi, '$1=[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED]')
    .replace(/eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]+/g, '[JWT_REDACTED]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
    .replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE_REDACTED]');

  const prismaCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code: string }).code
      : undefined;

  console.error(`[SERVER_ERROR] ${context}`, {
    name: errObj.name,
    code: prismaCode,
    message: safeMsg,
  });
}

/**
 * Standardized database and server error classifier.
 * Categorizes Prisma, connection, migration, constraint, and unexpected failures,
 * returning the appropriate HTTP status code (503, 409, 400, 404, or 500)
 * and safely logging diagnostics without credential leakage.
 */
export function handleDatabaseOrServerError(
  context: string,
  error: unknown,
  fallbackMessage: string
): NextResponse<ApiErrorPayload> {
  logServerError(context, error);

  if (typeof error === 'object' && error !== null) {
    const err = error as { name?: string; code?: string; message?: string };
    const errMsg = String(err.message || '');

    // 1. Prisma initialization / database connection failure
    if (
      err.name === 'PrismaClientInitializationError' ||
      errMsg.includes('Authentication failed against database server') ||
      errMsg.includes("Can't reach database server") ||
      errMsg.includes('ECONNREFUSED') ||
      errMsg.includes('Connection refused') ||
      errMsg.includes('ETIMEDOUT')
    ) {
      return apiError(
        'DATABASE_UNAVAILABLE',
        'Database connection is currently unavailable. Please verify database connectivity.',
        503,
        { details: { database: 'disconnected' } }
      );
    }

    // 2. Schema not migrated (table or column missing)
    if (
      err.code === 'P2021' ||
      err.code === 'P2022' ||
      errMsg.includes('does not exist in schema public') ||
      (errMsg.includes('relation') && errMsg.includes('does not exist')) ||
      (errMsg.includes('table') && errMsg.includes('does not exist'))
    ) {
      return apiError(
        'DATABASE_NOT_MIGRATED',
        'Database schema tables have not been migrated yet. Run prisma migrate deploy.',
        503,
        { details: { database: 'connected', tables: 'missing' } }
      );
    }

    // 3. Unique constraint violation
    if (err.code === 'P2002') {
      return apiError(
        'CONFLICT',
        'A record with this identifier already exists.',
        409
      );
    }

    // 4. Foreign key constraint violation
    if (err.code === 'P2003') {
      return apiError(
        'INVALID_RELATION',
        'A referenced relation (institution, bureau, or complaint) was not found or constraint failed.',
        400
      );
    }

    // 5. Dependent record required but not found
    if (err.code === 'P2025') {
      return apiError(
        'NOT_FOUND',
        'Required record was not found in the database.',
        404
      );
    }
  }

  return apiError('INTERNAL_SERVER_ERROR', fallbackMessage, 500);
}
