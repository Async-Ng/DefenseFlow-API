/**
 * Main Routes (TypeScript)
 */

import express, { Request, Response } from "express";
import { successResponse } from "../utils/apiResponse.js";
import semesterRoutes from "./semesterRoutes.js";
import sessionRoutes from "./sessionRoutes.js";
import importRoutes from "./importRoutes.js";
import lecturerRoutes from "./lecturerRoutes.js";
import availabilityRoutes from "./availabilityRoutes.js";

const router: express.Router = express.Router();

// Health check route
router.get("/health", (_req: Request, res: Response) => {
  return successResponse(
    res,
    { status: "OK", timestamp: new Date().toISOString() },
    "Server is running",
  );
});

// Register routes
router.use("/semesters", semesterRoutes);
router.use("/sessions", sessionRoutes);
router.use("/import", importRoutes);
router.use("/lecturers", lecturerRoutes);
router.use("/availability", availabilityRoutes);

export default router;
