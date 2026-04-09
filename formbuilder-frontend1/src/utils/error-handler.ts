/**
 * Utility to extract a human-readable error message from various error formats
 * returned by the Spring Boot backend (including our ErrorResponseDTO).
 */
export const getErrorMessage = (error: unknown): string => {
  if (!error) return 'An unexpected error occurred';

  // If it's already a string, return it
  if (typeof error === 'string') return error;

  // Handle standard Error objects where we've already extracted the message
  if (error instanceof Error && error.message) {
    return error.message;
  }

  // Handle Fetch/Response objects if passed directly
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return 'An unexpected error occurred';
};

/**
 * Extracts detailed error message from a fetch Response or JSON data.
 */
export const extractApiError = async (response: Response): Promise<string> => {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data: unknown = await response.json();
      
      // 1. Check for 'details' array (ErrorResponseDTO)
      if (
        typeof data === 'object' &&
        data !== null &&
        'details' in data &&
        Array.isArray(data.details) &&
        data.details.length > 0
      ) {
        return data.details
          .map((d) => (typeof d === 'object' && d !== null && 'message' in d ? String(d.message) : 'Unknown error'))
          .join('\n');
      }
      
      // 2. Check for 'message' field
      if (typeof data === 'object' && data !== null && 'message' in data && data.message) {
        return String(data.message);
      }

      // 3. Fallback to 'code' if message is missing
      if (typeof data === 'object' && data !== null && 'code' in data && data.code) {
        return `Error: ${data.code}`;
      }
    }
    
    // Fallback for non-JSON or missing fields
    return `Server returned ${response.status}: ${response.statusText}`;
  } catch {
    return `Connection error (${response.status})`;
  }
};
