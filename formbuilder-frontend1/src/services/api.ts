import { FormSchema } from '@/types/schema';

const API_BASE_URL = 'http://localhost:8080/api';

export const saveForm = async (schema: FormSchema) => {
  const payload = {
    title: schema.title,
    description: schema.description,
    // status: schema.status, // <--- Add this line
    status: schema.status || 'DRAFT', // <--- Add this line
    rules: schema.rules || [],
    fields: schema.fields.map((field) => ({
      label: field.label,
      type: field.type,
      required: field.validation?.required || false,
      options: field.options,
      validation: {
        ...field.validation,
        required: undefined,
        // Explicitly ensure these are passed
        minLength: field.validation?.minLength,
        maxLength: field.validation?.maxLength,
        pattern: field.validation?.pattern,
      },
      // --- CRITICAL FIX: Send the default value to backend ---
      defaultValue: field.defaultValue 
      // ------------------------------------------------------
    })),
  };
  console.log("SENDING PAYLOAD TO DB:", JSON.stringify(payload.rules, null, 2));

  // CHECK: Do we have an ID?
  // If YES -> PUT (Update) at /api/forms/{id}
  // If NO  -> POST (Create) at /api/forms
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

export const deleteSubmission = async (formId: string, submissionId: string) => {
  const response = await fetch(`${API_BASE_URL}/forms/${formId}/submissions/${submissionId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete submission');
};

export const deleteForm = async (id: number) => {
  const response = await fetch(`${API_BASE_URL}/forms/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete form');
};

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