/**
 * Type Definitions
 * Central type definitions for the application
 */

// ============================================================================
// Database Models
// ============================================================================
import type {
  Semester,
  Session,
  SessionDay,
  Topic,
  Council,
  Lecturer,
  LecturerSkill,
  Skill,
  LecturerDayAvailability,
  LecturerSessionConfig,
  AvailabilityStatus,
} from "../../generated/prisma/client.js";

export type {
  Semester,
  Session,
  SessionDay,
  Topic,
  Council,
  Lecturer,
  LecturerSkill,
  Skill,
  LecturerDayAvailability,
  LecturerSessionConfig,
  AvailabilityStatus,
};

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
  sessionDays?: CreateSessionDayInput[];
};

export type LecturerSessionConfigInput = {
  lecturerId: number;
  sessionId: number;
  minTopics?: number;
  maxTopics?: number;
};

export type UpdateLecturerSessionConfigInput = {
  minTopics?: number;
  maxTopics?: number;
};

export type CreateSkillInput = {
  skillCode: string; // Added
  name: string;
  description?: string;
};

export type UpdateSkillInput = Partial<CreateSkillInput>;

export type SkillFilterQuery = {
  skillCode?: string; // Added
  name?: string;
};

export type UpdateLecturerRolesInput = {
  isPresidentQualified?: boolean;
  isSecretaryQualified?: boolean;
};

export type LecturerSkillInput = {
  skillId: number;
  score: number;
};

export type UpdateLecturerSkillsInput = {
  skills: LecturerSkillInput[];
};

export type LecturerWithSkills = Lecturer & {
  lecturerSkills: (LecturerSkill & {
    skill: Skill;
  })[];
};

// ============================================================================
// Availability Types
// ============================================================================

/**
 * Session day with availability status
 */
export type SessionDayWithAvailability = SessionDay & {
  lecturerDayAvailability?: LecturerDayAvailability[];
};

/**
 * Lecturer availability status update input
 */
export type UpdateAvailabilityInput = {
  sessionDayId: number;
  status: AvailabilityStatus;
};

/**
 * Batch availability update input
 */
export type BatchUpdateAvailabilityInput = {
  availabilities: UpdateAvailabilityInput[];
};

/**
 * Lecturer status response
 */
export type LecturerStatusResponse = {
  lecturerId: number;
  sessionId: number;
  isRegistrationOpen: boolean;
  sessionConfig?: LecturerSessionConfig | null;
  availabilities: LecturerDayAvailability[];
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

export type LecturerFilters = {
  lecturerCode?: string;
  fullName?: string;
  email?: string;
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
