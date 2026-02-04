/**
 * Lecturer Routes (TypeScript)
 */

import express from "express";
import * as lecturerController from "../controllers/lecturerController.js";

const router: express.Router = express.Router();

// GET /api/lecturers - Get all lecturers with pagination
router.get("/", lecturerController.getAllLecturers);

// GET /api/lecturers/:id - Get lecturer by ID
router.get("/:id", lecturerController.getLecturerById);



// PATCH /api/lecturers/:id/qualifications - Batch update/upsert (legacy compatible)
router.patch("/:id/qualifications", lecturerController.updateLecturerQualifications);

// POST /api/lecturers/:id/qualifications - Add qualifications
router.post("/:id/qualifications", lecturerController.addLecturerQualifications);



// DELETE /api/lecturers/:id/qualifications/:qualificationId - Remove qualification
router.delete("/:id/qualifications/:qualificationId", lecturerController.deleteLecturerQualification);

export default router;
