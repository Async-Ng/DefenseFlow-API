/**
 * Semester Routes (TypeScript)
 */

import express from "express";
import {
  createSemester,
  getAllSemesters,
  getSemesterById,
  updateSemester,
  deleteSemester,
} from "@controllers/semesterController.js";

const router = express.Router();

// Create semester
router.post("/", createSemester);

// Get all semesters
router.get("/", getAllSemesters);

// Get semester by ID
router.get("/:id", getSemesterById);

// Update semester
router.put("/:id", updateSemester);

// Delete semester
router.delete("/:id", deleteSemester);

export default router;
