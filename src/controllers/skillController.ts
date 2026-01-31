import { Request, Response } from "express";
import * as skillService from "../services/skillService.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { CreateSkillInput, UpdateSkillInput } from "../types/index.js";

/**
 * @swagger
 * /api/skills:
 *   post:
 *     summary: Create a new skill
 *     tags: [Skills]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSkillInput'
 *     responses:
 *       201:
 *         description: Skill created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Skill created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Skill'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       409:
 *         description: Skill already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @swagger
 * /api/skills:
 *   get:
 *     summary: Get all skills
 *     tags: [Skills]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: skillCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of skills
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @swagger
 * /api/skills/{id}:
 *   get:
 *     summary: Get skill by ID
 *     tags: [Skills]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Skill details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Skill retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Skill'
 *       404:
 *         description: Skill not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @swagger
 * /api/skills/{id}:
 *   put:
 *     summary: Update skill
 *     tags: [Skills]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSkillInput'
 *     responses:
 *       200:
 *         description: Skill updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Skill updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Skill'
 *       404:
 *         description: Skill not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Skill code already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 * @swagger
 * /api/skills/{id}:
 *   delete:
 *     summary: Delete skill
 *     tags: [Skills]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Skill deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Skill deleted successfully"
 *       404:
 *         description: Skill not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       400:
 *         description: Cannot delete skill (used in other records)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server Error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
