/**
 * Domain Validators
 * Business rule validations for Semesters and Sessions
 */

/**
 * Validate date range
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export const validateDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) {
    return { isValid: false, error: "Start date and end date are required" };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: "Invalid date format" };
  }

  if (start >= end) {
    return {
      isValid: false,
      error: "Start date must be before end date",
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate session days fall within semester date range
 * @param {Array} sessionDays - Array of session day objects with dayDate
 * @param {Date|string} semesterStartDate - Semester start date
 * @param {Date|string} semesterEndDate - Semester end date
 * @returns {Object} { isValid: boolean, error: string|null, invalidDates: Array }
 */
export const validateSessionDaysInSemester = (
  sessionDays,
  semesterStartDate,
  semesterEndDate,
) => {
  if (!sessionDays || sessionDays.length === 0) {
    return {
      isValid: false,
      error: "At least one session day is required",
      invalidDates: [],
    };
  }

  const semesterStart = new Date(semesterStartDate);
  const semesterEnd = new Date(semesterEndDate);

  const invalidDates = [];

  for (const sessionDay of sessionDays) {
    const dayDate = new Date(sessionDay.dayDate);

    if (isNaN(dayDate.getTime())) {
      invalidDates.push({
        date: sessionDay.dayDate,
        reason: "Invalid date format",
      });
      continue;
    }

    if (dayDate < semesterStart || dayDate > semesterEnd) {
      invalidDates.push({
        date: sessionDay.dayDate,
        reason: `Date must be between ${semesterStart.toISOString().split("T")[0]} and ${semesterEnd.toISOString().split("T")[0]}`,
      });
    }
  }

  if (invalidDates.length > 0) {
    return {
      isValid: false,
      error: "Some session days fall outside the semester date range",
      invalidDates,
    };
  }

  return { isValid: true, error: null, invalidDates: [] };
};

/**
 * Validate required fields
 * @param {Object} data - Data object to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} { isValid: boolean, error: string|null, missingFields: Array }
 */
export const validateRequiredFields = (data, requiredFields) => {
  const missingFields = [];

  for (const field of requiredFields) {
    if (
      data[field] === undefined ||
      data[field] === null ||
      data[field] === ""
    ) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields: ${missingFields.join(", ")}`,
      missingFields,
    };
  }

  return { isValid: true, error: null, missingFields: [] };
};

/**
 * Validate semester data
 * @param {Object} data - Semester data
 * @returns {Object} { isValid: boolean, errors: Array }
 */
export const validateSemesterData = (data) => {
  const errors = [];

  // Check required fields
  const requiredValidation = validateRequiredFields(data, [
    "semesterCode",
    "name",
  ]);
  if (!requiredValidation.isValid) {
    errors.push(requiredValidation.error);
  }

  // Validate date range if dates are provided
  if (data.startDate && data.endDate) {
    const dateValidation = validateDateRange(data.startDate, data.endDate);
    if (!dateValidation.isValid) {
      errors.push(dateValidation.error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validate session data
 * @param {Object} data - Session data
 * @returns {Object} { isValid: boolean, errors: Array }
 */
export const validateSessionData = (data) => {
  const errors = [];

  // Check required fields
  const requiredValidation = validateRequiredFields(data, [
    "sessionCode",
    "semesterId",
    "name",
  ]);
  if (!requiredValidation.isValid) {
    errors.push(requiredValidation.error);
  }

  // Validate timePerTopic if provided
  if (data.timePerTopic !== undefined && data.timePerTopic !== null) {
    if (typeof data.timePerTopic !== "number" || data.timePerTopic <= 0) {
      errors.push("Time per topic must be a positive number");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
