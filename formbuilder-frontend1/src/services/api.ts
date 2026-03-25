/**
 * api.ts — API Client Functions.
 * Centralises all HTTP calls from the frontend to the Spring Boot backend.
 */
import { FormSchema } from '@/types/schema';

// Custom error to allow components to catch 401s and redirect to /login
export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

import { extractApiError } from '@/utils/error-handler';

const API_BASE_URL = 'http://localhost:8080/api/v1';


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
    title: schema.title,
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
    formValidations: (schema as any).formValidations || [],
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
    const errMsg = await extractApiError(response);
    throw new Error(errMsg);
  }

  return response.json();
};

/**
 * Updates an existing form directly.
 */
export const updateForm = async (id: number, schema: any) => {
    const payload = {
      title: schema.title,
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
      formValidations: schema.formValidations || [],
    };
  
    const response = await fetch(`http://localhost:8080/api/v1/forms/${id}`, {
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
  const response = await fetch(`${API_BASE_URL}/forms/${formId}/submissions/${submissionId}`, {
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
  const response = await fetch(`${API_BASE_URL}/forms/${formId}/submissions/bulk`, {
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
    const errMsg = await extractApiError(response);
    throw new Error(errMsg);
  }
};

/**
 * Fetches the list of archived forms for the current user.
 * Calls GET /api/forms/archived.
 */
export const getArchivedForms = async () => {
  const response = await fetch(`${API_BASE_URL}/forms/archived`, {
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
 * @param id The form's numeric ID.
 */
export const restoreForm = async (id: number) => {
  const response = await fetch(`${API_BASE_URL}/forms/${id}/restore`, {
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
export const submitFormResponse = async (formId: string, data: Record<string, any>, status: 'RESPONSE_DRAFT' | 'FINAL' = 'FINAL', formVersionId?: number) => {
  const response = await fetch(`${API_BASE_URL}/forms/${formId}/submissions`, {
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