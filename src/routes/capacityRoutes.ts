/**
 * Capacity Calculator Routes
 * Routes for session capacity calculation
 */

import { Router } from "express";
import * as capacityController from "../controllers/capacityCalculatorController.js";
import { requireRole } from "../middleware/auth.js";

const router: Router = Router();

/**
 * GET /api/capacity/calculate
 * Calculate session capacity and provide recommendations
 */
router.get("/calculate", requireRole("admin"), capacityController.calculateCapacity);

export default router;
