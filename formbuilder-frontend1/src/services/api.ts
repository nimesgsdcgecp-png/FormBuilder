/**
 * api.ts — API Client Functions
 *
 * What it does:
 *   Centralises all HTTP calls from the frontend to the Spring Boot backend.
 *   Having a dedicated API layer means components never have raw fetch() calls
 *   inside them — if the backend URL or request shape changes, only this file
 *   needs to be updated.
 *
 * Base URL:
 *   All requests go to http://localhost:8080/api (dev backend). For production,
 *   replace this constant with an environment variable (e.g. process.env.NEXT_PUBLIC_API_URL).
 *
 * Functions:
 *   - saveForm()            — Creates (POST) or updates (PUT) a form based on whether
 *                             the schema already has an ID. Used by the builder's Save button.
 *   - deleteSubmission()    — Deletes a single submission row from the admin responses page.
 *   - deleteForm()          — Archives a form via DELETE /api/forms/{id}.
 *   - submitFormResponse()  — Submits a new form response from the public form page
 *                             (uses the form ID path, called from /forms/{id}/submissions).
 *
 * Note: The public form page uses the /api/forms/public/{token}/submissions endpoint
 * directly via fetch() to pass the token. submitFormResponse() is used from the
 * admin responses page "Edit" flow where the form ID is available.
 */
import { FormSchema } from '@/types/schema';

// Custom error to allow components to catch 401s and redirect to /login
export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

const API_BASE_URL = 'http://localhost:8080/api';

/**
 * Saves a form to the backend.
 *
 * - If the schema has an {@code id} → PUT /api/forms/{id} (update existing).
 * - If the schema has no {@code id} → POST /api/forms (create new).
 *
 * Transforms the Zustand FormSchema into the shape expected by
 * CreateFormRequestDTO / UpdateFormRequestDTO (field validation is restructured,
 * and the local 'required' flag is moved out of the validation object).
 *
 * @param schema The current form state from the Zustand store.
 * @returns The saved Form entity returned by the backend (includes generated ID on create).
 */
export const saveForm = async (schema: FormSchema) => {
  const payload = {
    title: schema.title,
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
    fields: (() => {
      const mapFields = (fields: any[]): any[] => {
        return fields.map((field) => ({
          label: field.label,
          columnName: field.columnName,
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
          children: field.children ? mapFields(field.children) : undefined
        }));
      };
      return mapFields(schema.fields);
    })(),
  };

  // DEV: logs the rules being sent to the backend for debugging
  console.log("SENDING PAYLOAD TO DB:", JSON.stringify(payload.rules, null, 2));

  // Determine whether this is a create or an update call
  const isUpdate = !!schema.id;
  const url = isUpdate
    ? `${API_BASE_URL}/forms/${schema.id}`
    : `${API_BASE_URL}/forms`;

  const response = await fetch(url, {
    method: isUpdate ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to save form');
  }

  return response.json();
};

export interface SubmissionsResponse {
  content: Record<string, any>[];
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

  const response = await fetch(`${API_BASE_URL}/forms/${formId}/submissions?${queryParams}`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    throw new Error('Failed to fetch submissions');
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
  const response = await fetch(`${API_BASE_URL}/forms/${formId}/submissions/${submissionId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    throw new Error('Failed to delete submission');
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
  const response = await fetch(`${API_BASE_URL}/forms/${formId}/submissions/bulk`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submissionIds),
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    throw new Error('Failed to delete submissions');
  }
};

/**
 * Archives (soft-deletes) a form via DELETE /api/forms/{id}.
 * Currently not used directly from a component — archiving is done inline
 * in the dashboard page — but exported here for future reuse.
 *
 * @param id The form's numeric ID.
 */
export const deleteForm = async (id: number) => {
  const response = await fetch(`${API_BASE_URL}/forms/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    throw new Error('Failed to delete form');
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
export const submitFormResponse = async (formId: string, data: Record<string, any>, status: 'DRAFT' | 'FINAL' = 'FINAL') => {
  const response = await fetch(`${API_BASE_URL}/forms/${formId}/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data, status }),
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) throw new UnauthorizedError();
    const error = await response.json();
    throw new Error(error.message || 'Submission failed');
  }

  return response.json();
};