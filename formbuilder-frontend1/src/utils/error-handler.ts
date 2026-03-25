/**
 * Utility to extract a human-readable error message from various error formats
 * returned by the Spring Boot backend (including our ErrorResponseDTO).
 */
export const getErrorMessage = (error: any): string => {
  if (!error) return 'An unexpected error occurred';

  // If it's already a string, return it
  if (typeof error === 'string') return error;

  // Handle standard Error objects where we've already extracted the message
  if (error instanceof Error && error.message) {
    return error.message;
  }

  // Handle Fetch/Response objects if passed directly
  if (error.message) return error.message;

  return 'An unexpected error occurred';
};

/**
 * Extracts detailed error message from a fetch Response or JSON data.
 */
export const extractApiError = async (response: Response): Promise<string> => {
  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      
      // 1. Check for 'details' array (ErrorResponseDTO)
      if (data.details && Array.isArray(data.details) && data.details.length > 0) {
        return data.details.map((d: any) => d.message).join('\n');
      }
      
      // 2. Check for 'message' field
      if (data.message) {
        return data.message;
      }

      // 3. Fallback to 'code' if message is missing
      if (data.code) {
        return `Error: ${data.code}`;
      }
    }
    
    // Fallback for non-JSON or missing fields
    return `Server returned ${response.status}: ${response.statusText}`;
  } catch (e) {
    return `Connection error (${response.status})`;
  }
};
