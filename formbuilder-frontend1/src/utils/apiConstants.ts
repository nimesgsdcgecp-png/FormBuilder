/**
 * API Constants
 * 
 * Centralized API endpoint paths and configuration.
 * Single source of truth for all API calls in the frontend.
 * 
 * When API version changes, update VERSION constant to update all endpoints.
 */

// ═══════════════════════════════════════════════════════════════
// BASE CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/** Backend server URL - Change for different environments */
export const API_SERVER = 'http://localhost:8080';

/** Current API Version - Change this to update all endpoints */
export const API_VERSION = 'v1';

/** Base API Path */
export const API_BASE = `${API_SERVER}/api/${API_VERSION}`;

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION & SESSION
// ═══════════════════════════════════════════════════════════════

export const AUTH = {
  BASE: `${API_BASE}/auth`,
  LOGIN: `${API_BASE}/auth/login`,
  LOGOUT: `${API_BASE}/auth/logout`,
  REGISTER: `${API_BASE}/auth/register`,
  ME: `${API_BASE}/auth/me`,
  PERMISSIONS: `${API_BASE}/auth/permissions`,
} as const;

// ═══════════════════════════════════════════════════════════════
// FORM MANAGEMENT
// ═══════════════════════════════════════════════════════════════

export const FORMS = {
  BASE: `${API_BASE}/forms`,
  LIST: `${API_BASE}/forms`,
  CREATE: `${API_BASE}/forms`,
  GET: (id: string) => `${API_BASE}/forms/${id}`,
  UPDATE: (id: string) => `${API_BASE}/forms/${id}`,
  DELETE: (id: string) => `${API_BASE}/forms/${id}`,
  RESTORE: (id: string) => `${API_BASE}/forms/${id}/restore`,
  DELETE_PERMANENT: (id: string) => `${API_BASE}/forms/${id}/permanent`,
  ARCHIVED: `${API_BASE}/forms/archived`,
  STATS: `${API_BASE}/forms/stats`,
  
  // Public form access (no auth required)
  PUBLIC: (token: string) => `${API_BASE}/forms/public/${token}`,
  PUBLIC_SUBMISSIONS: (token: string) => `${API_BASE}/forms/public/${token}/submissions`,
  PUBLIC_SUBMISSION_GET: (token: string, submissionId: string) => 
    `${API_BASE}/forms/public/${token}/submissions/${submissionId}`,
  PUBLIC_SUBMISSION_UPDATE: (token: string, submissionId: string) => 
    `${API_BASE}/forms/public/${token}/submissions/${submissionId}`,
} as const;

// ═══════════════════════════════════════════════════════════════
// FORM VERSIONS
// ═══════════════════════════════════════════════════════════════

export const VERSIONS = {
  BASE: (formId: string) => `${API_BASE}/forms/${formId}/versions`,
  CREATE: (formId: string) => `${API_BASE}/forms/${formId}/versions`,
  LIST: (formId: string) => `${API_BASE}/forms/${formId}/versions`,
  GET: (formId: string, versionId: string) => `${API_BASE}/forms/${formId}/versions/${versionId}`,
  ACTIVATE: (formId: string, versionId: string) => `${API_BASE}/forms/${formId}/versions/${versionId}/activate`,
} as const;

// ═══════════════════════════════════════════════════════════════
// SUBMISSIONS
// ═══════════════════════════════════════════════════════════════

export const SUBMISSIONS = {
  LIST: (formId: string) => `${API_BASE}/forms/${formId}/submissions`,
  CREATE: (formId: string) => `${API_BASE}/forms/${formId}/submissions`,
  GET: (formId: string, submissionId: string) => `${API_BASE}/forms/${formId}/submissions/${submissionId}`,
  UPDATE: (formId: string, submissionId: string) => `${API_BASE}/forms/${formId}/submissions/${submissionId}`,
  DELETE: (formId: string, submissionId: string) => `${API_BASE}/forms/${formId}/submissions/${submissionId}`,
  BULK: (formId: string) => `${API_BASE}/forms/${formId}/submissions/bulk`,
  RESTORE: (formId: string, submissionId: string) => `${API_BASE}/forms/${formId}/submissions/${submissionId}/restore`,
  EXPORT: (formId: string) => `${API_BASE}/forms/${formId}/submissions/export`,
  
  // Lookup values for dropdowns
  LOOKUP_VALUES: (formId: string, fieldKey: string) => 
    `${API_BASE}/forms/${formId}/columns/${fieldKey}/values`,
} as const;

// ═══════════════════════════════════════════════════════════════
// RUNTIME (Form Fill)
// ═══════════════════════════════════════════════════════════════

export const RUNTIME = {
  BASE: `${API_BASE}/runtime`,
  GET_FORM: (formCode: string) => `${API_BASE}/runtime/forms/${formCode}`,
  SUBMIT: (formCode: string) => `${API_BASE}/runtime/forms/${formCode}/submissions`,
  SAVE_DRAFT: (formCode: string) => `${API_BASE}/runtime/forms/${formCode}/drafts`,
} as const;

// ═══════════════════════════════════════════════════════════════
// WORKFLOW (Approval System)
// ═══════════════════════════════════════════════════════════════

export const WORKFLOW = {
  BASE: `${API_BASE}/workflows`,
  INITIATE: `${API_BASE}/workflows/initiate`,
  APPROVE: (stepId: string) => `${API_BASE}/workflows/steps/${stepId}/approve`,
  REJECT: (stepId: string) => `${API_BASE}/workflows/steps/${stepId}/reject`,
  AUTHORITIES: `${API_BASE}/workflows/available-authorities`,
  MY_SUBMISSIONS: `${API_BASE}/workflows/my-submissions`,
  MY_PENDING: `${API_BASE}/workflows/my-pending`,
  MY_HANDLED: `${API_BASE}/workflows/my-handled`,
  FIX_DB: `${API_BASE}/workflows/fix-db`,
} as const;

// ═══════════════════════════════════════════════════════════════
// ADMIN - USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════

export const ADMIN_USERS = {
  BASE: `${API_BASE}/admin/users`,
  LIST: `${API_BASE}/admin/users`,
  CREATE: `${API_BASE}/admin/users`,
  GET: (id: string) => `${API_BASE}/admin/users/${id}`,
  UPDATE: (id: string) => `${API_BASE}/admin/users/${id}`,
  DELETE: (id: string) => `${API_BASE}/admin/users/${id}`,
  TOGGLE_DELETE: (id: string) => `${API_BASE}/admin/users/${id}/toggle-delete`,
  ASSIGN_ROLE: (userId: string) => `${API_BASE}/admin/users/${userId}/roles`,
  REVOKE_ROLE: (userId: string, assignmentId: string) => 
    `${API_BASE}/admin/users/${userId}/roles/${assignmentId}`,
} as const;

// ═══════════════════════════════════════════════════════════════
// ADMIN - ROLE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

export const ADMIN_ROLES = {
  BASE: `${API_BASE}/admin/roles`,
  LIST: `${API_BASE}/admin/roles`,
  CREATE: `${API_BASE}/admin/roles`,
  GET: (id: string) => `${API_BASE}/admin/roles/${id}`,
  UPDATE: (id: string) => `${API_BASE}/admin/roles/${id}`,
  DELETE: (id: string) => `${API_BASE}/admin/roles/${id}`,
} as const;

// ═══════════════════════════════════════════════════════════════
// ADMIN - PERMISSIONS
// ═══════════════════════════════════════════════════════════════

export const ADMIN_PERMISSIONS = {
  BASE: `${API_BASE}/admin/permissions`,
  LIST: `${API_BASE}/admin/permissions`,
} as const;

// ═══════════════════════════════════════════════════════════════
// ADMIN - AUDIT LOGS
// ═══════════════════════════════════════════════════════════════

export const ADMIN_AUDIT = {
  BASE: `${API_BASE}/admin/audit`,
  LIST: `${API_BASE}/admin/audit`,
} as const;

// ═══════════════════════════════════════════════════════════════
// ADMIN - APPROVAL HISTORY
// ═══════════════════════════════════════════════════════════════

export const ADMIN_APPROVALS = {
  BASE: `${API_BASE}/admin/approvals/history`,
  LIST: `${API_BASE}/admin/approvals/history`,
} as const;

// ═══════════════════════════════════════════════════════════════
// USER PROFILE
// ═══════════════════════════════════════════════════════════════

export const PROFILE = {
  BASE: `${API_BASE}/profile`,
  UPDATE: `${API_BASE}/profile`,
  CHANGE_PASSWORD: `${API_BASE}/profile/change-password`,
} as const;

// ═══════════════════════════════════════════════════════════════
// MODULES & MENU (Dynamic Navigation)
// ═══════════════════════════════════════════════════════════════

export const MODULES = {
  BASE: `${API_BASE}/modules`,
  LIST: `${API_BASE}/modules`,
} as const;

export const MENU = {
  BASE: `${API_BASE}/menu`,
  LIST: `${API_BASE}/menu`,
} as const;

// ═══════════════════════════════════════════════════════════════
// ROLE-MODULE MAPPING
// ═══════════════════════════════════════════════════════════════

export const ROLE_MODULES = {
  BASE: `${API_BASE}/roles`,
  GET: (roleId: string) => `${API_BASE}/roles/${roleId}/modules`,
  ASSIGN: (roleId: string) => `${API_BASE}/roles/${roleId}/modules`,
  REVOKE: (roleId: string, moduleId: string) => `${API_BASE}/roles/${roleId}/modules/${moduleId}`,
} as const;

// ═══════════════════════════════════════════════════════════════
// FILE UPLOAD
// ═══════════════════════════════════════════════════════════════

export const FILES = {
  UPLOAD: `${API_BASE}/upload`,
  DOWNLOAD: (filename: string) => `${API_BASE}/files/${filename}`,
} as const;

// ═══════════════════════════════════════════════════════════════
// LEVEL UP (User Permission Elevation)
// ═══════════════════════════════════════════════════════════════

export const LEVEL_UP = {
  REQUEST: `${API_BASE}/level-up/request`,
  PENDING: `${API_BASE}/level-up/pending`,
  DECIDE: (id: string) => `${API_BASE}/level-up/${id}/decide`,
} as const;

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Build URL with query parameters
 * @example
 * buildUrl(FORMS.LIST, { page: 0, size: 10 })
 * // Returns: "http://localhost:8080/api/v1/forms?page=0&size=10"
 */
export function buildUrl(baseUrl: string, params?: Record<string, string | number | boolean | null | undefined>): string {
  if (!params || Object.keys(params).length === 0) {
    return baseUrl;
  }
  
  const queryString = new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  ).toString();
  
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Standard fetch options with credentials
 */
export const fetchOptions = {
  credentials: 'include' as RequestCredentials,
};

/**
 * GET request helper
 */
export function getOptions(): RequestInit {
  return {
    method: 'GET',
    ...fetchOptions,
  };
}

/**
 * POST request helper
 */
export function postOptions(body?: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    ...fetchOptions,
  };
}

/**
 * PUT request helper
 */
export function putOptions(body?: unknown): RequestInit {
  return {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    ...fetchOptions,
  };
}

/**
 * DELETE request helper
 */
export function deleteOptions(): RequestInit {
  return {
    method: 'DELETE',
    ...fetchOptions,
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORT ALL AS DEFAULT FOR CONVENIENCE
// ═══════════════════════════════════════════════════════════════

const apiConstants = {
  AUTH,
  FORMS,
  VERSIONS,
  SUBMISSIONS,
  RUNTIME,
  WORKFLOW,
  ADMIN_USERS,
  ADMIN_ROLES,
  ADMIN_PERMISSIONS,
  ADMIN_AUDIT,
  ADMIN_APPROVALS,
  PROFILE,
  MODULES,
  MENU,
  ROLE_MODULES,
  FILES,
  LEVEL_UP,
  buildUrl,
  fetchOptions,
  getOptions,
  postOptions,
  putOptions,
  deleteOptions,
};

export default apiConstants;
