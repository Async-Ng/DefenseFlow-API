import { Request, Response, NextFunction } from "express";
import * as scheduleService from "../services/scheduleService.js";
import { successResponse } from "../utils/apiResponse.js";
import { AppError } from "../middleware/errorHandler.js";
import { z } from "zod";

/**
 * Generate schedule for a session
 * POST /api/schedule/generate
 */
export const generateSchedule = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const schema = z.object({
      sessionId: z.number({ required_error: "Session ID is required" }).int(),
    });

    const validation = schema.safeParse(req.body);

    if (!validation.success) {
      throw new AppError(400, validation.error.errors[0].message);
    }

    const { sessionId } = validation.data;

    const result = await scheduleService.generateSchedule(sessionId);

    return successResponse(
        res, 
        result, 
        "Schedule generated successfully",
        201
    );
  } catch (error) {
    next(error);
  }
};
