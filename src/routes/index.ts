/**
 * Main Routes (TypeScript)
 */

import express, { Request, Response } from "express";
import { successResponse } from "@utils/apiResponse.js";
import semesterRoutes from "./semesterRoutes.js";
import sessionRoutes from "./sessionRoutes.js";

const router = express.Router();

// Health check route
router.get("/health", (req: Request, res: Response) => {
  return successResponse(
    res,
    { status: "OK", timestamp: new Date().toISOString() },
    "Server is running",
  );
});

// Register routes
router.use("/semesters", semesterRoutes);
router.use("/sessions", sessionRoutes);

export default router;
