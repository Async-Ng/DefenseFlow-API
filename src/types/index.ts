/**
 * Type Definitions
 * Central type definitions for the application
 */

// ============================================================================
// Database Models
// ============================================================================
import type {
  Semester,
  Defense,
  DefenseDay,
  Topic,
  CouncilBoard,
  Lecturer,
  LecturerQualification,
  Qualification,
  LecturerDayAvailability,
  LecturerDefenseConfig,
  AvailabilityStatus,
  DefenseResult,
  TopicType,
  TopicDefense,
} from "../../generated/prisma/client.js";

export type {
  Semester,
  Defense,
  DefenseDay,
  Topic,
  CouncilBoard,
  Lecturer,
  LecturerQualification,
  Qualification,
  LecturerDayAvailability,
  LecturerDefenseConfig,
  AvailabilityStatus,
  DefenseResult,
  TopicType,
  TopicDefense,
};

// ============================================================================
// Enum Types
// ============================================================================

/**
 * Defense type enumeration
 */
export type DefenseType = "Main" | "Resit";

/**
 * Defense type values as const
 */
export const DEFENSE_TYPES = {
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
 * Defense filter query parameters
 */
export type DefenseFilterQuery = {
  semesterId?: string | string[];
  defenseCode?: string | string[];
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

export type CreateDefenseInput = {
  defenseCode: string;
  semesterId: number;
  name: string;
  type?: DefenseType;
  timePerTopic?: number;
  workStartTime?: string;
  defenseDays?: CreateDefenseDayInput[];
  availabilityStartDate?: string;
  availabilityEndDate?: string;
};

export type CreateDefenseDayInput = {
  defenseDayCode: string;
  dayDate: string;
  note?: string;
};

export type UpdateDefenseInput = {
  defenseCode?: string;
  name?: string;
  type?: DefenseType;
  timePerTopic?: number;
  workStartTime?: string;
  defenseDays?: CreateDefenseDayInput[];
  availabilityStartDate?: string;
  availabilityEndDate?: string;
};

export type LecturerDefenseConfigInput = {
  lecturerId: number;
  defenseId: number;
  minTopics?: number;
  maxTopics?: number;
};

export type UpdateLecturerDefenseConfigInput = {
  minTopics?: number;
  maxTopics?: number;
};

export type UpdateTopicResultInput = {
  result: DefenseResult;
};

export type CreateTopicInput = {
  topicCode: string;
  semesterId: number;
  title?: string;
  topicTypeId?: number;
  supervisorIds?: number[];
};

export type UpdateTopicInput = {
  topicCode?: string;
  title?: string;
  topicTypeId?: number;
  supervisorIds?: number[];
};

export type TopicFilterQuery = {
  topicCode?: string | string[];
  title?: string | string[];
  semesterId?: string | string[];
  supervisorIds?: string | string[];
};

export type TopicFilters = {
  topicCode?: string;
  title?: string;
  semesterId?: number;
  supervisorIds?: number[];
};

export type CreateQualificationInput = {
  qualificationCode: string;
  name: string;
  description?: string;
};

export type UpdateQualificationInput = Partial<CreateQualificationInput>;

export type QualificationFilterQuery = {
  qualificationCode?: string;
  name?: string;
};

export type CreateTopicTypeInput = {
  name: string;
  qualificationIds?: number[]; // Optional: link qualifications at creation time
};

export type UpdateTopicTypeInput = {
  name?: string;
  qualificationIds?: number[]; // If provided, syncs (replaces) the linked qualifications
};

export type TopicTypeFilterQuery = {
  name?: string;
};

export type LecturerQualificationInput = {
  qualificationId: number;
  score: number;
};

export type UpdateLecturerQualificationsInput = {
  qualifications: LecturerQualificationInput[];
};

export type UpdateLecturerQualificationInput = {
  score: number;
};

export type CreateLecturerInput = {
  lecturerCode: string;
  fullName?: string;
  email?: string;
};

export type UpdateLecturerInput = Partial<CreateLecturerInput>;

export type CreateTopicDefenseInput = {
  topicIds: number[];
  defenseId: number;
};

export type TopicDefenseFilters = {
  defenseId?: number;
  topicId?: number;
};

export type LecturerWithQualifications = Lecturer & {
  lecturerQualifications: (LecturerQualification & {
    qualification: Qualification;
  })[];
};

// ============================================================================
// Availability Types
// ============================================================================

/**
 * Defense day with availability status
 */
export type DefenseDayWithAvailability = DefenseDay & {
  lecturerDayAvailability?: LecturerDayAvailability[];
};

/**
 * Lecturer availability status update input
 */
export type UpdateAvailabilityInput = {
  defenseDayId: number;
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
  defenseId: number;
  isRegistrationOpen: boolean;
  defenseConfig?: LecturerDefenseConfig | null;
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

export type DefenseFilters = {
  defenseCode?: string;
  semesterId?: number;
  type?: DefenseType;
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

export type DefenseDaysValidationResult = ValidationResultWithDetails<{
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

export type DefenseValidationResult = {
  isValid: boolean;
  errors: string[];
};

// ============================================================================
// Repository Types
// ============================================================================

export type IncludeOptions = {
  defenses?: boolean;
  defenseDays?: boolean;
  topics?: boolean;
  councilBoards?: boolean;
  semester?: boolean;
};

export type DefenseDependencies = {
  hasCouncilBoards: boolean;
  hasRegistrations: boolean;
};

// ============================================================================
// Capacity Calculator Types
// ============================================================================

/**
 * Request for capacity calculation
 */
export type CapacityCalculationRequest = {
  semesterId: number;
  defenseId?: number; // If provided, will analyze current defense days
  timePerTopic?: number; // minutes, default from defense or 30
  workHoursPerDay?: number; // minutes, default 480 (8 hours)
  councilBoardSize?: number; // default 5 (1 President + 1 Secretary + 3 Members)
  plannedDays?: number; // optional: planned days if no defense exists
};

/**
 * Defense day adjustment recommendation
 */
export type DefenseDayAdjustment = {
  shouldAdjust: boolean;
  suggestedChange: number; // +2 (add 2 days) or -1 (remove 1 day)
  reason: string;
};

/**
 * Topics per council board per day breakdown
 */
export type TopicsPerCouncilBoardPerDay = {
  minimum: number;
  maximum: number;
  average: number;
};

/**
 * Lecturer workload recommendations
 */
export type LecturerWorkload = {
  recommendedMin: number;
  recommendedMax: number;
  idealAverage: number;
};

/**
 * Capacity calculation recommendations
 */
export type CapacityRecommendations = {
  minimumDaysRequired: number;
  recommendedDays: number;
  currentDefenseDays: number | null;
  defenseDayAdjustment: DefenseDayAdjustment | null;
  minLecturersRequired: number;
  recommendedLecturers: number;
  maxLecturersNeeded: number;
  topicsPerCouncilBoardPerDay: TopicsPerCouncilBoardPerDay;
  councilBoardsPerDay: number;
  lecturerWorkload: LecturerWorkload;
};

/**
 * Analysis data for capacity calculation
 */
export type CapacityAnalysis = {
  totalTopics: number;
  timePerTopic: number;
  workHoursPerDay: number;
  councilBoardSize: number;
};

/**
 * Complete capacity calculation response
 */
export type CapacityCalculationResponse = {
  semesterId: number;
  defenseId: number | null;
  analysis: CapacityAnalysis;
  recommendations: CapacityRecommendations;
  warnings: string[];
  suggestions: string[];
};

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
