/**
 * Dashboard Routes (TypeScript)
 */

import express from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";

const router: express.Router = express.Router();

// Get dashboard statistics
router.get("/", getDashboardStats);

export default router;
