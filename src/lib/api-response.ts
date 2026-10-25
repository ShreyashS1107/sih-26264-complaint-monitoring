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
