/**
 * Formatters for API responses
 */

/**
 * Format defense data for API response
 * Specifically formats workStartTime from Date to HH:mm string
 */
export const formatDefense = (defense: any): any => {
  if (!defense) return defense;

  // Clone object to avoid mutation
  const formatted = { ...defense };

  // Format workStartTime if it exists
  // It is now a string "HH:mm" directly from DB, so no Date conversion needed
  if (formatted.workStartTime) {
    // Ensure it is a string just in case
    formatted.workStartTime = String(formatted.workStartTime);
  }

  // Recursively format nested objects if needed
  // For now, this is shallow as per current requirement

  return formatted;
};
