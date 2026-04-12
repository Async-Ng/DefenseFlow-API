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
  LecturerRoleSuitability,
  Qualification,
  LecturerDayAvailability,
  LecturerDefenseConfig,
  AvailabilityStatus,
  DefenseResult,
  TopicType,
  TopicDefense,
  CouncilBoardMember,
  CouncilRole,
  TopicSupervisor,
  DefenseCouncil,
  DefenseStatus,
  SemesterStatus,
  CriteriaComponent,
  SeniorityLevel,
} from "../../generated/prisma/client.js";

export type {
  Semester,
  Defense,
  DefenseDay,
  Topic,
  CouncilBoard,
  Lecturer,
  LecturerQualification,
  LecturerRoleSuitability,
  Qualification,
  LecturerDayAvailability,
  LecturerDefenseConfig,
  AvailabilityStatus,
  DefenseResult,
  TopicType,
  TopicDefense,
  CouncilBoardMember,
  CouncilRole,
  TopicSupervisor,
  DefenseCouncil,
  DefenseStatus,
  SemesterStatus,
  CriteriaComponent,
  SeniorityLevel,
};

/**
 * Status of a specific defense day
 */
export type DefenseDayStatus = 
  | "Chờ mở đăng ký" 
  | "Đang nhận đăng ký" 
  | "Hết hạn đăng ký" 
  | "Đã khóa đăng ký" 
  | "Đã xếp lịch nháp" 
  | "Đã công bố lịch";

/**
 * Raw data interface for calculating defense day status
 * Matches the Prisma include structure used in repositories
 */
export interface DefenseDayWithRelations extends DefenseDay {
  councilBoards?: { id: number }[];
  lecturerDayAvailability?: { 
    id: number;
    lecturerId: number | null; 
    status: AvailabilityStatus | null;
    defenseDayId: number | null;
  }[];
  defense?: {
    isAvailabilityPublished: boolean;
    isSchedulePublished: boolean;
    status: DefenseStatus | null;
    availabilityEndDate: Date | null;
    lecturerDefenseConfigs: { id: number }[];
  };
}

/**
 * Enhanced DefenseDay with calculated fields
 */
export type EnhancedDefenseDay = DefenseDay & {
  status: DefenseDayStatus;
  boardCount: number;
  availableLecturerCount: number;
  busyLecturerCount: number;
  totalConfiguredLecturers: number;
};

/**
 * Defense with its raw days (as returned by repository before enrichment)
 */
export type DefenseWithRawRelations = Defense & {
  semester?: Semester;
  defenseDays?: DefenseDayWithRelations[];
};

/**
 * Defense with its enhanced days and semester info (after service enrichment)
 */
export type DefenseWithRelations = Defense & {
  semester?: Semester;
  defenseDays?: EnhancedDefenseDay[];
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
  status?: string | string[];
  search?: string | string[];
};

/**
 * Defense filter query parameters
 */
export type DefenseFilterQuery = {
  semesterId?: string | string[];
  defenseCode?: string | string[];
  type?: string | string[];
  status?: string | string[];
  search?: string | string[];
};

/**
 * Council board filter query parameters
 */
export type CouncilBoardFilterQuery = {
  defenseDayId?: string | string[];
  semesterId?: string | string[];
  defenseId?: string | string[];
  boardCode?: string | string[];
  name?: string | string[];
  search?: string | string[];
};

// ============================================================================
// Input Types
// ============================================================================

export type CreateSemesterInput = {
  semesterCode: string;
  name: string;
  startDate?: string;
  endDate?: string;
  status?: SemesterStatus;
};

export type UpdateSemesterInput = Partial<CreateSemesterInput>;

export type CreateDefenseInput = {
  defenseCode: string;
  semesterId: number;
  name: string;
  type?: DefenseType;
  timePerTopic?: number;
  workStartTime?: string;
  status?: DefenseStatus;
  defenseDays?: CreateDefenseDayInput[];
  availabilityStartDate?: string;
  availabilityEndDate?: string;
};

export type CreateDefenseDayInput = {
  defenseDayCode: string;
  dayDate: string;
  note?: string;
  maxCouncils?: number;
};

export type UpdateDefenseInput = {
  defenseCode?: string;
  name?: string;
  type?: DefenseType;
  timePerTopic?: number;
  workStartTime?: string;
  status?: DefenseStatus;
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
  groupCode?: string;
  semesterId: number;
  title?: string;
  vietnameseTitle?: string;
  topicTypeId?: number;
  supervisorIds?: number[];
};

export type UpdateTopicInput = {
  topicCode?: string;
  groupCode?: string;
  title?: string;
  vietnameseTitle?: string;
  topicTypeId?: number;
  supervisorIds?: number[];
};

export type TopicFilterQuery = {
  topicCode?: string | string[];
  groupCode?: string | string[];
  title?: string | string[];
  semesterId?: string | string[];
  supervisorIds?: string | string[];
  search?: string | string[];
};

export type TopicFilters = {
  topicCode?: string;
  groupCode?: string;
  title?: string;
  semesterId?: number;
  supervisorIds?: number[];
  search?: string;
};

export type CreateQualificationGroupInput = {
  code: string;
  name: string;
  description?: string;
  /** List of qualification IDs to link to this group */
  qualificationIds?: number[];
};

export type UpdateQualificationGroupInput = Partial<CreateQualificationGroupInput>;

export type CreateQualificationInput = {
  qualificationCode: string;
  name: string;
  component?: CriteriaComponent;
  descHigh?: string;
  descGood?: string;
  descAcceptable?: string;
  descFail?: string;
  evaluationGuidelines?: string;
  /** Group ID to link this qualification to */
  groupId?: number;
};

export type UpdateQualificationInput = Partial<CreateQualificationInput> & {
  /** Explicitly set to null to remove from group */
  groupId?: number | null;
};

export type QualificationFilterQuery = {
  qualificationCode?: string | string[];
  name?: string | string[];
  search?: string | string[];
};

export type QualificationFilters = {
  qualificationCode?: string;
  name?: string;
  search?: string;
};

export type CreateTopicTypeInput = {
  name: string;
  /** Link qualification groups with priority weights */
  groups?: {
    groupId: number;
    priorityWeight?: number;
  }[];
};

export type UpdateTopicTypeInput = {
  name?: string;
  /** If provided, syncs (replaces) the linked groups with their weights */
  groups?: {
    groupId: number;
    priorityWeight?: number;
  }[];
};

export type TopicTypeFilterQuery = {
  name?: string | string[];
  search?: string | string[];
};

export type TopicTypeFilters = {
  name?: string;
  search?: string;
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
  /** Admin-only: seniority level. Never exposed to Lecturers. */
  seniorityLevel?: SeniorityLevel;
  isLecturer?: boolean;
  isAdmin?: boolean;
};

export type UpdateLecturerInput = Partial<CreateLecturerInput> & {
  authId?: string;
};

export type UpdateLecturerRolesInput = {
  isLecturer: boolean;
  isAdmin: boolean;
};

export type PublishAvailabilityInput = {
  availabilityStartDate?: string;
  availabilityEndDate?: string;
};

export type CreateTopicDefenseInput = {
  topicIds: number[];
  defenseId: number;
};

export type TopicDefenseFilterQuery = {
  defenseId?: string | string[];
  topicId?: string | string[];
  topicCode?: string | string[];
  finalResult?: string | string[];
  isScheduled?: string | string[];
  search?: string | string[];
};

export type TopicDefenseFilters = {
  defenseId?: number;
  topicId?: number;
  topicCode?: string;
  finalResult?: DefenseResult;
  isScheduled?: boolean;
  search?: string;
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
 * Defense day with availability status and granular info (Enriched)
 */
export type DefenseDayWithAvailability = EnhancedDefenseDay & {
  lecturerDayAvailability: {
    id: number;
    lecturerId: number | null;
    status: AvailabilityStatus | null;
    defenseDayId: number | null;
  }[];
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
  status?: SemesterStatus;
  search?: string;
};

export type DefenseFilters = {
  defenseCode?: string;
  semesterId?: number;
  type?: DefenseType;
  status?: DefenseStatus;
  search?: string;
};

export type CouncilBoardFilters = {
  defenseDayId?: number;
  semesterId?: number;
  defenseId?: number;
  boardCode?: string;
  name?: string;
  search?: string;
  lecturerId?: number;
};

export type CouncilBoardSort = {
  field: string;
  order: "asc" | "desc";
};

export type LecturerFilters = {
  lecturerCode?: string;
  fullName?: string;
  email?: string;
  search?: string;
};

export type LecturerFilterQuery = {
  lecturerCode?: string | string[];
  fullName?: string | string[];
  email?: string | string[];
  search?: string | string[];
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
  defenseId: number; 
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
  totalCapacity: number;
  defenseDayAdjustment: DefenseDayAdjustment | null;
  minLecturersRequired: number;
  recommendedLecturers: number;
  maxLecturersNeeded: number;
  topicsPerCouncilBoardPerDay: TopicsPerCouncilBoardPerDay;
  councilBoardsPerDay: number;
  lecturerWorkload: LecturerWorkload;
};

/**
 * Detailed analysis per defense day
 */
export type DayCapacityAnalysis = {
  defenseDayId: number;
  date: Date;
  maxCouncils: number;
  availableLecturers: number;
  potentialCouncils: number;
  isUnderstaffed: boolean;
  maxTopics: number;
  maxTopicsPerBoard: number;
};

/**
 * Analysis data for capacity calculation
 */
export type CapacityAnalysis = {
  totalTopics: number;
  timePerTopic: number;
  workHoursPerDay: number;
  councilBoardSize: number;
  totalConfiguredCouncils: number;
  minTopicsPerLecturer: number;
  maxTopicsPerLecturer: number;
  days: DayCapacityAnalysis[];
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

// ============================================================================
// Dashboard Types
// ============================================================================

export type DashboardStats = {
  totalSemesters: number,
  totalLecturers: number,
  totalTopics: number,
  totalDefenses: number,
  totalCouncilBoards: number,
  topicsByResult: {
    pending: number,
    passed: number,
    failed: number,
  },
  upcomingDefenses: (Defense & {
    semester: { name: string },
  })[],
}

export type LecturerDashboardStats = {
  totalSupervisedTopics: number,
  totalCouncilBoards: number,
  upcomingCouncils: (CouncilBoard & {
    defenseDay: {
      dayDate: Date,
      defense: {
        name: string | null,
      },
    },
    councilBoardMembers: (CouncilBoardMember & {
      lecturer: Lecturer | null,
    })[],
  })[],
  supervisedTopics: (Topic & {
    semester: { name: string },
    topicType: { name: string } | null,
  })[],
}

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;

// ============================================================================
// Lecturer Role Suitability Types
// ============================================================================

export type LecturerRoleSuitabilityItem = {
  role: CouncilRole;
  suitability: number; // 0-100
};

export type SetLecturerRoleSuitabilitiesInput = {
  suitabilities: LecturerRoleSuitabilityItem[];
};
