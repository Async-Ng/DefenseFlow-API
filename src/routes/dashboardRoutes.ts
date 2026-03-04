/**
 * Dashboard Routes (TypeScript)
 */

import express from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";
import { requireRole } from "../middleware/auth.js";

const router: express.Router = express.Router();

// Get dashboard statistics
router.get("/", requireRole("admin"), getDashboardStats);

export default router;
