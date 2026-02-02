/**
 * Formatters for API responses
 */

/**
 * Format session data for API response
 * Specifically formats workStartTime from Date to HH:mm string
 */
export const formatSession = (session: any): any => {
  if (!session) return session;

  // Clone object to avoid mutation
  const formatted = { ...session };

  // Format workStartTime if it exists
  if (formatted.workStartTime && formatted.workStartTime instanceof Date) {
    const hours = formatted.workStartTime.getHours().toString().padStart(2, "0");
    const minutes = formatted.workStartTime.getMinutes().toString().padStart(2, "0");
    formatted.workStartTime = `${hours}:${minutes}`;
  }

  // Recursively format nested objects if needed (e.g. if we had nested sessions)
  // For now, this is shallow as per current requirement

  return formatted;
};
