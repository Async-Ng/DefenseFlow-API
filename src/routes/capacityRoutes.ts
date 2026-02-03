/**
 * Capacity Calculator Routes
 * Routes for session capacity calculation
 */

import { Router } from "express";
import * as capacityController from "../controllers/capacityCalculatorController.js";

const router = Router();

/**
 * POST /api/capacity/calculate
 * Calculate session capacity and provide recommendations
 */
router.post("/calculate", capacityController.calculateCapacity);

export default router;
