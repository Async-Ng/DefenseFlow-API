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



// PATCH /api/lecturers/:id/qualifications - Update lecturer qualification scores
router.patch("/:id/qualifications", lecturerController.updateLecturerQualifications);

export default router;
