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
    rules: schema.rules || [],
    fields: schema.fields.map((field) => ({
      label: field.label,
      type: field.type,
      required: field.validation?.required || false,
      options: field.options,
      validation: {
        ...field.validation,
        required: undefined, // 'required' lives at the top level in the backend DTO, not inside validation
        minLength: field.validation?.minLength,
        maxLength: field.validation?.maxLength,
        pattern: field.validation?.pattern,
      },
      defaultValue: field.defaultValue
    })),
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
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to save form');
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
  });
  if (!response.ok) throw new Error('Failed to delete submission');
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
  });
  if (!response.ok) throw new Error('Failed to delete form');
};

/**
 * Submits a new form response via the authenticated ID-based endpoint.
 * Calls POST /api/forms/{formId}/submissions.
 *
 * @param formId The internal form ID (string from URL params).
 * @param data   Map of {columnName: value} pairs from the respondent.
 * @returns The backend response containing {submissionId, message}.
 */
export const submitFormResponse = async (formId: string, data: Record<string, any>) => {
  const response = await fetch(`${API_BASE_URL}/forms/${formId}/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Submission failed');
  }

  return response.json();
};