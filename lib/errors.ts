// lib/errors.ts

/**
 * Sanitizes error messages before returning to clients.
 * Logs full error server-side, returns safe message to client.
 */
export function sanitizeError(error: unknown, context: string): string {
  // Log full error server-side for debugging
  console.error(`[${context}] Error:`, error);

  // Map known Afterpay error patterns to safe messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("unauthorized") || message.includes("401")) {
      return "Authentication failed";
    }
    if (message.includes("invalid_token") || message.includes("token")) {
      return "Invalid or expired token";
    }
    if (message.includes("declined")) {
      return "Payment was declined";
    }
    if (message.includes("not found") || message.includes("404")) {
      return "Resource not found";
    }
    if (message.includes("amount")) {
      return "Invalid amount specified";
    }
    if (message.includes("already")) {
      return "This action has already been performed";
    }
  }

  // Default safe message
  return "An error occurred. Please try again.";
}

/**
 * Safe error response helper
 */
export function errorResponse(error: unknown, context: string, status = 500) {
  const safeMessage = sanitizeError(error, context);
  return { error: safeMessage, status };
}
