/**
 * Request Parameter Extraction Utilities
 * Helper functions to extract and type request data
 */

import { Request } from "express";
import type {
  ValidatedPagination,
  ValidatedIncludeOptions,
  SemesterFilters,
  DefenseFilters,
  DefenseType,
  CouncilBoardFilters,
  LecturerFilters,
  TopicFilters,
  QualificationFilters,
  TopicTypeFilters,
  TopicDefenseFilters,
} from "../types/index.js";

/**
 * Type guard to check if value is a string
 */
const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

/**
 * Extract and parse ID from request params
 * @param req - Express request object
 * @returns Validated numeric ID
 * @throws Error if ID is invalid
 */
export const getIdParam = (req: Request): number => {
  const idParam = req.params.id;
  if (!isString(idParam)) {
    throw new Error("ID parameter must be a string");
  }
  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    throw new Error("Invalid ID parameter");
  }
  return id;
};

/**
 * Extract pagination params from query
 * @param req - Express request object
 * @returns Validated pagination object with page and limit
 */
export const getPaginationParams = (req: Request): ValidatedPagination => {
  const pageParam = req.query.page;
  const limitParam = req.query.limit;

  const pageStr = isString(pageParam) ? pageParam : "1";
  const limitStr = isString(limitParam) ? limitParam : "10";

  const page = parseInt(pageStr, 10);
  const limit = parseInt(limitStr, 10);

  return { page, limit };
};

/**
 * Extract include options from query
 * @param req - Express request object
 * @returns Record of include options
 */
export const getIncludeOptions = (req: Request): ValidatedIncludeOptions => {
  const include: ValidatedIncludeOptions = {};
  const includeParam = req.query.include;

  if (isString(includeParam)) {
    const includes = includeParam.split(",");
    includes.forEach((inc: string) => {
      include[inc.trim()] = true;
    });
  }

  return include;
};

/**
 * Extract semester filters from query
 * @param req - Express request object
 * @returns Semester filter object
 */
export const getSemesterFilters = (req: Request): SemesterFilters => {
  const semesterCodeParam = req.query.semesterCode;
  const nameParam = req.query.name;

  return {
    semesterCode: isString(semesterCodeParam) ? semesterCodeParam : undefined,
    name: isString(nameParam) ? nameParam : undefined,
    search: isString(req.query.search) ? req.query.search : undefined,
  };
};

/**
 * Extract session filters from query
 * @param req - Express request object
 * @returns Session filter object
 */
export const getDefenseFilters = (req: Request): DefenseFilters => {
  const semesterIdParam = req.query.semesterId;
  const defenseCodeParam = req.query.defenseCode;
  const typeParam = req.query.type;

  let defenseType: DefenseType | undefined = undefined;
  if (isString(typeParam) && (typeParam === "Main" || typeParam === "Resit")) {
    defenseType = typeParam;
  }

  const maxCouncilsParam = req.query.maxCouncilsPerDay;

  return {
    semesterId: isString(semesterIdParam)
      ? parseInt(semesterIdParam, 10)
      : undefined,
    defenseCode: isString(defenseCodeParam) ? defenseCodeParam : undefined,
    type: defenseType,
    maxCouncilsPerDay: isString(maxCouncilsParam)
      ? parseInt(maxCouncilsParam, 10)
      : undefined,
    search: isString(req.query.search) ? req.query.search : undefined,
  };
};

/**
 * Extract council board filters from query
 * @param req - Express request object
 * @returns Council board filter object
 */
export const getCouncilBoardFilters = (req: Request): CouncilBoardFilters => {
  const defenseDayIdParam = req.query.defenseDayId || req.query.defenseDay;
  const semesterIdParam = req.query.semesterId;
  const defenseIdParam = req.query.defenseId;
  const boardCodeParam = req.query.boardCode;
  const nameParam = req.query.name;
  const lecturerIdParam = req.query.lecturerId;

  return {
    defenseDayId: isString(defenseDayIdParam) ? parseInt(defenseDayIdParam, 10) : undefined,
    semesterId: isString(semesterIdParam) ? parseInt(semesterIdParam, 10) : undefined,
    defenseId: isString(defenseIdParam) ? parseInt(defenseIdParam, 10) : undefined,
    boardCode: isString(boardCodeParam) ? boardCodeParam : undefined,
    name: isString(nameParam) ? nameParam : undefined,
    search: isString(req.query.search) ? req.query.search : undefined,
    lecturerId: isString(lecturerIdParam) ? parseInt(lecturerIdParam, 10) : undefined,
  };
};
/**
 * Extract lecturer filters from query
 * @param req - Express request object
 * @returns Lecturer filter object
 */
export const getLecturerFilters = (req: Request): LecturerFilters => {
  return {
    lecturerCode: isString(req.query.lecturerCode) ? req.query.lecturerCode : undefined,
    fullName: isString(req.query.fullName) ? req.query.fullName : undefined,
    email: isString(req.query.email) ? req.query.email : undefined,
    search: isString(req.query.search) ? req.query.search : undefined,
  };
};

/**
 * Extract topic filters from query
 * @param req - Express request object
 * @returns Topic filter object
 */
export const getTopicFilters = (req: Request): TopicFilters => {
  const supervisorIdsParam = req.query.supervisorIds;
  let supervisorIds: number[] | undefined = undefined;

  if (isString(supervisorIdsParam)) {
    supervisorIds = supervisorIdsParam.split(",").map(id => parseInt(id, 10)).filter(id => !isNaN(id));
  } else if (Array.isArray(supervisorIdsParam)) {
    supervisorIds = supervisorIdsParam.map(id => parseInt(String(id), 10)).filter(id => !isNaN(id));
  }

  return {
    topicCode: isString(req.query.topicCode) ? req.query.topicCode : undefined,
    title: isString(req.query.title) ? req.query.title : undefined,
    semesterId: isString(req.query.semesterId) ? parseInt(req.query.semesterId, 10) : undefined,
    supervisorIds,
    search: isString(req.query.search) ? req.query.search : undefined,
  };
};

/**
 * Extract qualification filters from query
 * @param req - Express request object
 * @returns Qualification filter object
 */
export const getQualificationFilters = (req: Request): QualificationFilters => {
  return {
    qualificationCode: isString(req.query.qualificationCode) ? req.query.qualificationCode : undefined,
    name: isString(req.query.name) ? req.query.name : undefined,
    search: isString(req.query.search) ? req.query.search : undefined,
  };
};

/**
 * Extract topic type filters from query
 * @param req - Express request object
 * @returns Topic type filter object
 */
export const getTopicTypeFilters = (req: Request): TopicTypeFilters => {
  return {
    name: isString(req.query.name) ? req.query.name : undefined,
    search: isString(req.query.search) ? req.query.search : undefined,
  };
};
/**
 * Extract topic defense filters from query
 * @param req - Express request object
 * @returns Topic defense filter object
 */
export const getTopicDefenseFilters = (req: Request): TopicDefenseFilters => {
  return {
    defenseId: isString(req.query.defenseId) ? parseInt(req.query.defenseId, 10) : undefined,
    topicId: isString(req.query.topicId) ? parseInt(req.query.topicId, 10) : undefined,
    topicCode: isString(req.query.topicCode) ? req.query.topicCode : undefined,
    finalResult: req.query.finalResult as any,
    isScheduled: req.query.isScheduled === "true" ? true : req.query.isScheduled === "false" ? false : undefined,
    search: isString(req.query.search) ? req.query.search : undefined,
  };
};
/**
 * Extract sort params from query
 * @param req - Express request object
 * @param defaultField - Default sort field
 * @returns Sort object with field and order
 */
export const getSortParams = (
  req: Request,
  defaultField: string = "id"
): { field: string; order: "asc" | "desc" } => {
  const sortField = isString(req.query.sortField) ? req.query.sortField : defaultField;
  const sortOrder =
    isString(req.query.sortOrder) && req.query.sortOrder.toLowerCase() === "desc"
      ? ("desc" as const)
      : ("asc" as const);

  return { field: sortField, order: sortOrder };
};

/**
 * Extracts the active role for the current request.
 * Allows multi-role users to switch perspectives via the 'X-Active-Role' header.
 * If the header is missing, it falls back to the highest privilege ('admin' > 'lecturer').
 * 
 * @param req - Express request object
 * @returns The active role string (e.g., 'admin', 'lecturer') or null if undefined.
 * @throws Error if the provided header role is not held by the user.
 */
export const getActiveRole = (req: Request): string | null => {
  const userRoles: string[] = (req.user?.app_metadata?.roles as string[]) ?? [];
  const activeRoleHeader = req.headers["x-active-role"] as string | undefined;

  // 1. If header is provided, strictly validate it
  if (activeRoleHeader) {
    if (!userRoles.includes(activeRoleHeader)) {
      throw new Error(`Forbidden: User does not have the requested role '${activeRoleHeader}'`);
    }
    return activeRoleHeader;
  }

  // 2. Fallback logic: Admin > Lecturer
  if (userRoles.includes("admin")) return "admin";
  if (userRoles.includes("lecturer")) return "lecturer";

  // 3. Unknown / no roles
  return userRoles.length > 0 ? userRoles[0] : null;
};
