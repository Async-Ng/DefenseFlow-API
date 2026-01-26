/**
 * Domain Validators
 * Business rule validations for Semesters and Sessions
 */

import type {
  DateValidationResult,
  SessionDaysValidationResult,
  FieldValidationResult,
  SemesterValidationResult,
  SessionValidationResult,
  CreateSessionDayInput,
} from "../types/index.js";

/**
 * Validate date range
 */
export const validateDateRange = (
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
): DateValidationResult => {
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
 */
export const validateSessionDaysInSemester = (
  sessionDays: CreateSessionDayInput[],
  semesterStartDate: string | Date | null | undefined,
  semesterEndDate: string | Date | null | undefined,
): SessionDaysValidationResult => {
  if (!sessionDays || sessionDays.length === 0) {
    return {
      isValid: false,
      error: "At least one session day is required",
      details: { invalidDates: [] },
    };
  }

  if (!semesterStartDate || !semesterEndDate) {
    return {
      isValid: false,
      error: "Semester dates are required for validation",
      details: { invalidDates: [] },
    };
  }

  const semesterStart = new Date(semesterStartDate);
  const semesterEnd = new Date(semesterEndDate);

  const invalidDates: Array<{ date: string; reason: string }> = [];

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
      details: { invalidDates },
    };
  }

  return { isValid: true, error: null, details: { invalidDates: [] } };
};

/**
 * Validate required fields
 */
export const validateRequiredFields = (
  data: Record<string, unknown>,
  requiredFields: string[],
): FieldValidationResult => {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = data[field];
    if (value === undefined || value === null || value === "") {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields: ${missingFields.join(", ")}`,
      details: { missingFields },
    };
  }

  return { isValid: true, error: null, details: { missingFields: [] } };
};

/**
 * Validate semester data
 */
export const validateSemesterData = (
  data: Record<string, unknown>,
): SemesterValidationResult => {
  const errors: string[] = [];

  // Check required fields
  const requiredValidation = validateRequiredFields(data, [
    "semesterCode",
    "name",
  ]);
  if (!requiredValidation.isValid && requiredValidation.error) {
    errors.push(requiredValidation.error);
  }

  // Validate date range if dates are provided
  if (data.startDate && data.endDate) {
    const dateValidation = validateDateRange(
      data.startDate as string,
      data.endDate as string,
    );
    if (!dateValidation.isValid && dateValidation.error) {
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
 */
export const validateSessionData = (
  data: Record<string, unknown>,
): SessionValidationResult => {
  const errors: string[] = [];

  // Check required fields
  const requiredValidation = validateRequiredFields(data, [
    "sessionCode",
    "semesterId",
    "name",
  ]);
  if (!requiredValidation.isValid && requiredValidation.error) {
    errors.push(requiredValidation.error);
  }

  // Validate timePerTopic if provided
  if (data.timePerTopic !== undefined && data.timePerTopic !== null) {
    if (
      typeof data.timePerTopic !== "number" ||
      (data.timePerTopic as number) <= 0
    ) {
      errors.push("Time per topic must be a positive number");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
