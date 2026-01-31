import { Request, Response } from "express";
import * as skillService from "../services/skillService.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { CreateSkillInput, UpdateSkillInput } from "../types/index.js";

/**
 * Create a new skill
 */
export const createSkill = async (req: Request, res: Response) => {
  try {
    const input: CreateSkillInput = req.body;

    // validation
    if (!input.skillCode || !input.name) {
      return errorResponse(res, "Missing required fields: skillCode, name", 400);
    }

    const skill = await skillService.createSkill(input);
    return successResponse(res, skill, "Skill created successfully", 201);
  } catch (error: any) {
    if (error.message.includes("already exists")) {
        return errorResponse(res, error.message, 409);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get all skills
 */
export const getSkills = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Helper to allow single string or take first if array
    const getString = (param: any): string | undefined => {
        if (!param) return undefined;
        return Array.isArray(param) ? (param[0] as string) : (param as string);
    };

    const filters = {
      skillCode: getString(req.query.skillCode),
      name: getString(req.query.name),
    };

    const result = await skillService.getAllSkills({ page, limit }, filters);
    return successResponse(res, result, "Skills retrieved successfully");
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Get skill by ID
 */
export const getSkill = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return errorResponse(res, "Invalid ID", 400);
    }

    const skill = await skillService.getSkillById(id);
    if (!skill) {
      return errorResponse(res, "Skill not found", 404);
    }

    return successResponse(res, skill, "Skill retrieved successfully");
  } catch (error: any) {
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Update skill
 */
export const updateSkill = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return errorResponse(res, "Invalid ID", 400);
    }

    const input: UpdateSkillInput = req.body;
    const skill = await skillService.updateSkill(id, input);
    return successResponse(res, skill, "Skill updated successfully");
  } catch (error: any) {
     if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    if (error.message.includes("already exists")) {
      return errorResponse(res, error.message, 409);
    }
    return errorResponse(res, error.message, 500);
  }
};

/**
 * Delete skill
 */
export const deleteSkill = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return errorResponse(res, "Invalid ID", 400);
    }

    await skillService.deleteSkill(id);
    return successResponse(res, null, "Skill deleted successfully");
  } catch (error: any) {
    if (error.message.includes("not found")) {
      return errorResponse(res, error.message, 404);
    }
    // Check foreign key constraint error from Prisma (roughly)
    if (error.code === 'P2003') {
        return errorResponse(res, "Cannot delete skill because it is being used", 400);
    }
    return errorResponse(res, error.message, 500);
  }
};
