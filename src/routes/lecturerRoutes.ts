/**
 * Lecturer Routes (TypeScript)
 */

import express from "express";
import * as lecturerController from "../controllers/lecturerController.js";

import * as lecturerDashboardController from "../controllers/lecturerDashboardController.js";
import { requireRole } from "../middleware/auth.js";

const router: express.Router = express.Router();

// GET /api/lecturers - Get all lecturers with pagination
router.get("/", lecturerController.getAllLecturers);

// GET /api/lecturers/:id/dashboard - Get lecturer dashboard
router.get("/:id/dashboard", lecturerDashboardController.getLecturerDashboard);

// GET /api/lecturers/:id/supervised-topics - Get supervised topics
router.get("/:id/supervised-topics", lecturerDashboardController.getSupervisedTopics);

// GET /api/lecturers/:id/council-boards - Get assigned council boards
router.get("/:id/council-boards", lecturerDashboardController.getAssignedCouncilBoards);

// POST /api/lecturers - Create a lecturer
router.post("/", requireRole("admin"), lecturerController.createLecturer);

// GET /api/lecturers/:id - Get lecturer by ID
router.get("/:id", lecturerController.getLecturerById);

// PATCH /api/lecturers/:id - Update lecturer details
router.patch("/:id", requireRole("admin"), lecturerController.updateLecturer);

// DELETE /api/lecturers/:id - Delete lecturer
router.delete("/:id", requireRole("admin"), lecturerController.deleteLecturer);

// POST /api/lecturers/:id/reset-password - Reset lecturer password (Admin)
router.post("/:id/reset-password", requireRole("admin"), lecturerController.resetPassword);



// PATCH /api/lecturers/:id/qualifications - Batch update/upsert (legacy compatible)
router.patch("/:id/qualifications", requireRole("admin"), lecturerController.updateLecturerQualifications);

// POST /api/lecturers/:id/qualifications - Add qualifications
router.post("/:id/qualifications", requireRole("admin"), lecturerController.addLecturerQualifications);



// DELETE /api/lecturers/:id/qualifications/:qualificationId - Remove qualification
router.delete("/:id/qualifications/:qualificationId", requireRole("admin"), lecturerController.deleteLecturerQualification);

export default router;
