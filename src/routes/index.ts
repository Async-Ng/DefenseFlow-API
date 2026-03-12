/**
 * Main Routes (TypeScript)
 */

import express, { Request, Response } from "express";
import { successResponse } from "../utils/apiResponse.js";
import semesterRoutes from "./semesterRoutes.js";
import defenseRoutes from "./defenseRoutes.js";
import importRoutes from "./importRoutes.js";
import lecturerRoutes from "./lecturerRoutes.js";
import availabilityRoutes from "./availabilityRoutes.js";

import lecturerDefenseConfigRoutes from "./lecturerDefenseConfigRoutes.js";
import topicRoutes from "./topicRoutes.js";
import scheduleRoutes from "./scheduleRoutes.js";
import capacityRoutes from "./capacityRoutes.js";
import qualificationRoutes from "./qualificationRoutes.js";
import topicTypeRoutes from "./topicTypeRoutes.js";
import topicDefenseRoutes from "./topicDefenseRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import notificationRoutes from "./notificationRoutes.js";

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
router.use("/defenses", defenseRoutes);
router.use("/import", importRoutes);
router.use("/lecturers", lecturerRoutes);
router.use("/availability", availabilityRoutes);
router.use("/lecturer-defense-configs", lecturerDefenseConfigRoutes);
router.use("/topics", topicRoutes);
router.use("/schedule", scheduleRoutes);
router.use("/capacity", capacityRoutes);
router.use("/qualifications", qualificationRoutes);
router.use("/topic-types", topicTypeRoutes);
router.use("/topic-defenses", topicDefenseRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/notifications", notificationRoutes);

export default router;
