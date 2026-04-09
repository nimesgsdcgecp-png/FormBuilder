/**
 * api.ts — API Client Functions.
 * Centralises all HTTP calls from the frontend to the Spring Boot backend.
 */
import { FormSchema } from '@/types/schema';
import { FORMS, SUBMISSIONS } from '@/utils/apiConstants';

// Custom error to allow components to catch 401s and redirect to /login
export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

import { extractApiError } from '@/utils/error-handler';

const mapFieldsForApi = (fields: FormSchema['fields']): Array<Record<string, unknown>> => {
  return fields.map((field) => ({
    label: field.label,
    fieldKey: field.columnName,
    type: field.type,
    required: field.validation?.required || false,
    options: field.options,
    validation: {
      ...field.validation,
      required: undefined,
      minLength: field.validation?.minLength,
      maxLength: field.validation?.maxLength,
      pattern: field.validation?.pattern,
    },
    defaultValue: field.defaultValue,
    calculationFormula: field.calculationFormula,
    helpText: field.helpText,
    hidden: field.isHidden || false,
    readOnly: field.isReadOnly || false,
    disabled: field.isDisabled || false,
    isMultiSelect: field.isMultiSelect || false,
    children: field.children ? mapFieldsForApi(field.children) : undefined
  }));
};


/**
 * Saves a form to the backend.
 * Creates (POST) if schema lacks an ID, otherwise updates (PUT) existing.
 *
 * @param schema The current form state from the Zustand store.
 * @returns The saved Form entity returned by the backend.
 */
export const saveForm = async (schema: FormSchema) => {
  let defaultCode = schema.title.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').substring(0, 90);
  if (!defaultCode || !/^[a-z]/.test(defaultCode)) {
    defaultCode = 'form_' + Date.now();
  }

  const payload = {
    name: schema.title,
    code: schema.code || defaultCode,
    description: schema.description,
    allowEditResponse: schema.allowEditResponse,
    status: schema.status || 'DRAFT',
    rules: {
      theme: {
        color: schema.themeColor,
        font: schema.themeFont
      },
      logic: schema.rules || []
    },
    fields: mapFieldsForApi(schema.fields),
    formValidations: schema.formValidations || [],
  };

  // DEV: logs the rules being sent to the backend for debugging
  console.log("SENDING PAYLOAD TO DB:", JSON.stringify(payload.rules, null, 2));

  // Determine whether this is a create or an update call
  const isUpdate = !!schema.id;
  const url = isUpdate
    ? FORMS.UPDATE(schema.id)
    : FORMS.CREATE;

  const response = await fetch(url, {
    method: isUpdate ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    const errMsg = await extractApiError(response);
    throw new Error(errMsg);
  }

  return response.json();
};

/**
 * Updates an existing form directly.
 */
export const updateForm = async (id: string, schema: FormSchema) => {
  const payload = {
    name: schema.title,
    code: schema.code,
    description: schema.description,
    allowEditResponse: schema.allowEditResponse,
    status: schema.status || 'DRAFT',
    rules: {
      theme: {
        color: schema.themeColor,
        font: schema.themeFont
      },
      logic: schema.rules || []
    },
    fields: mapFieldsForApi(schema.fields),
    formValidations: schema.formValidations || [],
  };

  const response = await fetch(FORMS.UPDATE(id), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    const errMsg = await extractApiError(response);
    throw new Error(errMsg);
  }

  return response.json();
};

export interface SubmissionsResponse {
  content: (Record<string, unknown> & { id: string })[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

/**
 * Fetches the list of submissions for a form with pagination, sorting, and filtering.
 *
 * @param formId   The internal form ID.
 * @param page     Page number (starts at 0).
 * @param size     Number of records per page.
 * @param sortBy   Column to sort by.
 * @param sortOrder 'ASC' or 'DESC'.
 * @param filters  Key-value pairs for column filtering.
 * @returns Paginated results.
 */
export const getSubmissions = async (
  formId: string,
  page = 0,
  size = 50,
  sortBy = 'submitted_at',
  sortOrder = 'DESC',
  filters: Record<string, string> = {}
): Promise<SubmissionsResponse> => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
    sortBy,
    sortOrder,
    ...filters
  });

  const response = await fetch(`${SUBMISSIONS.LIST(formId)}?${queryParams}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    const errMsg = await extractApiError(response);
    throw new Error(errMsg);
  }

  return response.json();
};

/**
 * Deletes a single submission row from the admin responses page.
 * Calls DELETE /api/forms/{formId}/submissions/{submissionId}.
 *
 * @param formId       The internal form ID (as a string from URL params).
 * @param submissionId The UUID of the submission to delete.
 */
export const deleteSubmission = async (formId: string, submissionId: string) => {
  const response = await fetch(SUBMISSIONS.DELETE(formId, submissionId), {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    const errMsg = await extractApiError(response);
    throw new Error(errMsg);
  }
};

/**
 * Deletes multiple submissions in one call.
 * Calls DELETE /api/forms/{formId}/submissions/bulk.
 *
 * @param formId       The internal form ID.
 * @param submissionIds Array of submission UUIDs.
 */
export const deleteSubmissionsBulk = async (formId: string, submissionIds: string[]) => {
  const response = await fetch(SUBMISSIONS.BULK(formId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation: 'DELETE', submissionIds }),
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    const errMsg = await extractApiError(response);
    throw new Error(errMsg);
  }
};

/**
 * Updates status of multiple submissions in one call.
 * Calls POST /api/forms/{formId}/submissions/bulk with STATUS_UPDATE operation.
 */
export const updateSubmissionStatusBulk = async (formId: string, submissionIds: string[], status: string) => {
  const response = await fetch(SUBMISSIONS.BULK(formId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation: 'STATUS_UPDATE', submissionIds, status }),
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    const errMsg = await extractApiError(response);
    throw new Error(errMsg);
  }
};

/**
 * Restores a single soft-deleted submission.
 */
export const restoreSubmission = async (formId: string, submissionId: string) => {
  const response = await fetch(SUBMISSIONS.RESTORE(formId, submissionId), {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    const errMsg = await extractApiError(response);
    throw new Error(errMsg);
  }
};

/**
 * Restores multiple soft-deleted submissions in bulk.
 */
export const restoreSubmissionsBulk = async (formId: string, submissionIds: string[]) => {
  const response = await fetch(SUBMISSIONS.BULK(formId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation: 'RESTORE', submissionIds }),
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    const errMsg = await extractApiError(response);
    throw new Error(errMsg);
  }
};

/**
 * Archives (soft-deletes) a form via DELETE /api/forms/{id}.
 * Currently not used directly from a component — archiving is done inline
 * in the dashboard page — but exported here for future reuse.
 *
 * @param id The form's UUID string.
 */
export const deleteForm = async (id: string) => {
  const response = await fetch(FORMS.DELETE(id), {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    const errMsg = await extractApiError(response);
    throw new Error(errMsg);
  }
};

/**
 * Fetches the list of archived forms for the current user.
 * Calls GET /api/forms/archived.
 */
export const getArchivedForms = async () => {
  const response = await fetch(FORMS.ARCHIVED, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    const errMsg = await extractApiError(response);
    throw new Error(errMsg);
  }
  return response.json();
};

/**
 * Restores an archived form back to DRAFT state.
 * Calls PUT /api/forms/{id}/restore.
 *
 * @param id The form's UUID string.
 */
export const restoreForm = async (id: string) => {
  const response = await fetch(FORMS.RESTORE(id), {
    method: 'PUT',
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    const errMsg = await extractApiError(response);
    throw new Error(errMsg);
  }
};

/**
 * Submits a new form response via the authenticated ID-based endpoint.
 * Calls POST /api/forms/{formId}/submissions.
 *
 * @param formId The internal form ID (string from URL params).
 * @param data   Map of {columnName: value} pairs from the respondent.
 * @returns The backend response containing {submissionId, message}.
 */
export const submitFormResponse = async (formId: string, data: Record<string, unknown>, status: 'RESPONSE_DRAFT' | 'FINAL' = 'FINAL', formVersionId?: number) => {
  const response = await fetch(SUBMISSIONS.CREATE(formId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data, status, formVersionId }),
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    const errMsg = await extractApiError(response);
    throw new Error(errMsg);
  }

  return response.json();
};

/**
 * Interface for dashboard statistics.
 */
export interface DashboardStats {
  totalForms: number;
  publishedForms: number;
  draftForms: number;
  totalSubmissions: number;
  recentForms: Array<Record<string, unknown>>; // FormSummaryResponseDTO
}

/**
 * Fetches dashboard statistics from the backend.
 * Calls GET /api/v1/forms/stats.
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await fetch(FORMS.STATS, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    const errMsg = await extractApiError(response);
    throw new Error(errMsg);
  }

  return response.json();
};
