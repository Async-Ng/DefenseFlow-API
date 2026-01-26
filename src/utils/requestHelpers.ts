/**
 * Request Parameter Extraction Utilities
 * Helper functions to extract and type request data
 */

import { Request } from "express";

/**
 * Type guard to check if value is a string
 */
const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

/**
 * Extract and parse ID from request params
 */
export const getIdParam = (req: Request): number => {
  const idParam = req.params.id;
  if (!isString(idParam)) {
    throw new Error("ID parameter must be a string");
  }
  const id = parseInt(idParam);
  if (isNaN(id)) {
    throw new Error("Invalid ID parameter");
  }
  return id;
};

/**
 * Extract pagination params from query
 */
export const getPaginationParams = (
  req: Request,
): { page: number; limit: number } => {
  const pageParam = req.query.page;
  const limitParam = req.query.limit;

  const pageStr = isString(pageParam) ? pageParam : "1";
  const limitStr = isString(limitParam) ? limitParam : "10";

  const page = parseInt(pageStr);
  const limit = parseInt(limitStr);

  return { page, limit };
};

/**
 * Extract include options from query
 */
export const getIncludeOptions = (req: Request): Record<string, boolean> => {
  const include: Record<string, boolean> = {};
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
 */
export const getSemesterFilters = (req: Request) => {
  const semesterCodeParam = req.query.semesterCode;
  const nameParam = req.query.name;

  return {
    semesterCode: isString(semesterCodeParam) ? semesterCodeParam : undefined,
    name: isString(nameParam) ? nameParam : undefined,
  };
};

/**
 * Extract session filters from query
 */
export const getSessionFilters = (req: Request) => {
  const semesterIdParam = req.query.semesterId;
  const sessionCodeParam = req.query.sessionCode;
  const typeParam = req.query.type;

  let sessionType: "Main" | "Resit" | undefined = undefined;
  if (isString(typeParam) && (typeParam === "Main" || typeParam === "Resit")) {
    sessionType = typeParam;
  }

  return {
    semesterId: isString(semesterIdParam)
      ? parseInt(semesterIdParam)
      : undefined,
    sessionCode: isString(sessionCodeParam) ? sessionCodeParam : undefined,
    type: sessionType,
  };
};
