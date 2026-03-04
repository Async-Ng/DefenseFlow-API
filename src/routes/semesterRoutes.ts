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
} from "../controllers/semesterController.js";
import { requireRole } from "../middleware/auth.js";

const router: express.Router = express.Router();

// Create semester — Admin only
router.post("/", requireRole("admin"), createSemester);

// Get all semesters
router.get("/", getAllSemesters);

// Get semester by ID
router.get("/:id", getSemesterById);

// Update semester — Admin only
router.patch("/:id", requireRole("admin"), updateSemester);

// Delete semester — Admin only
router.delete("/:id", requireRole("admin"), deleteSemester);

export default router;
