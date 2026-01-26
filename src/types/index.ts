/**
 * Type Definitions
 * Central type definitions for the application
 */

// ============================================================================
// Database Models
// ============================================================================
export type {
  Semester,
  Session,
  SessionDay,
  Topic,
  Council,
} from "@prisma/client";

// ============================================================================
// Enum Types
// ============================================================================

/**
 * Session type enumeration
 */
export type SessionType = "Main" | "Resit";

/**
 * Session type values as const
 */
export const SESSION_TYPES = {
  MAIN: "Main" as const,
  RESIT: "Resit" as const,
};

// ============================================================================
// Request Parameter Types
// ============================================================================

/**
 * ID parameter from route params
 */
export type IdParam = {
  id: string;
};

/**
 * Pagination query parameters
 */
export type PaginationQuery = {
  page?: string | string[];
  limit?: string | string[];
};

/**
 * Include options query parameter
 */
export type IncludeQuery = {
  include?: string | string[];
};

/**
 * Semester filter query parameters
 */
export type SemesterFilterQuery = {
  semesterCode?: string | string[];
  name?: string | string[];
};

/**
 * Session filter query parameters
 */
export type SessionFilterQuery = {
  semesterId?: string | string[];
  sessionCode?: string | string[];
  type?: string | string[];
};

// ============================================================================
// Input Types
// ============================================================================

export type CreateSemesterInput = {
  semesterCode: string;
  name: string;
  startDate?: string;
  endDate?: string;
};

export type UpdateSemesterInput = Partial<CreateSemesterInput>;

export type CreateSessionInput = {
  sessionCode: string;
  semesterId: number;
  name: string;
  type?: SessionType;
  timePerTopic?: number;
  workStartTime?: string;
  sessionDays?: CreateSessionDayInput[];
};

export type CreateSessionDayInput = {
  sessionDayCode: string;
  dayDate: string;
  note?: string;
};

export type UpdateSessionInput = {
  sessionCode?: string;
  name?: string;
  type?: SessionType;
  timePerTopic?: number;
  workStartTime?: string;
};

// ============================================================================
// Parsed/Validated Types
// ============================================================================

/**
 * Validated pagination parameters
 */
export type ValidatedPagination = {
  page: number;
  limit: number;
};

/**
 * Validated include options
 */
export type ValidatedIncludeOptions = Record<string, boolean>;

// ============================================================================
// Pagination & Filtering
// ============================================================================

export type PaginationParams = {
  page: number;
  limit: number;
};

export type PaginationMeta = {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

export type SemesterFilters = {
  semesterCode?: string;
  name?: string;
};

export type SessionFilters = {
  sessionCode?: string;
  semesterId?: number;
  type?: SessionType;
};

// ============================================================================
// Validation Types
// ============================================================================

export type ValidationResult = {
  isValid: boolean;
  error: string | null;
};

export type ValidationResultWithDetails<T = unknown> = {
  isValid: boolean;
  error: string | null;
  details?: T;
};

export type DateValidationResult = ValidationResult;

export type SessionDaysValidationResult = ValidationResultWithDetails<{
  invalidDates: Array<{
    date: string;
    reason: string;
  }>;
}>;

export type FieldValidationResult = ValidationResultWithDetails<{
  missingFields: string[];
}>;

export type SemesterValidationResult = {
  isValid: boolean;
  errors: string[];
};

export type SessionValidationResult = {
  isValid: boolean;
  errors: string[];
};

// ============================================================================
// Repository Types
// ============================================================================

export type IncludeOptions = {
  sessions?: boolean;
  sessionDays?: boolean;
  topics?: boolean;
  councils?: boolean;
  semester?: boolean;
};

export type SessionDependencies = {
  hasCouncils: boolean;
  hasRegistrations: boolean;
};

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
