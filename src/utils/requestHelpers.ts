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

  return {
    semesterId: isString(semesterIdParam)
      ? parseInt(semesterIdParam, 10)
      : undefined,
    defenseCode: isString(defenseCodeParam) ? defenseCodeParam : undefined,
    type: defenseType,
  };
};
