import express from "express";
import {
  createDefense,
  getAllDefenses,
  getDefenseById,
  updateDefense,
  deleteDefense,
  publishAvailability,
  importFailedTopics,
} from "../controllers/defenseController.js";
import * as defenseDayController from "../controllers/defenseDayController.js";
import { requireRole } from "../middleware/auth.js";

const router: express.Router = express.Router();

// Create defense — Admin only
router.post("/", requireRole("admin"), createDefense);

// Get all defenses
router.get("/", getAllDefenses);

// Get defense by ID
router.get("/:id", getDefenseById);

// Update defense — Admin only
router.patch("/:id", requireRole("admin"), updateDefense);

// Delete defense — Admin only
router.delete("/:id", requireRole("admin"), deleteDefense);

// Publish availability — Admin only
router.post("/:id/publish-availability", requireRole("admin"), publishAvailability);

// Import failed topics from Main to Resit — Admin only
router.post("/:id/import-failed-topics", requireRole("admin"), importFailedTopics);

// Defense Day endpoints — Admin only
router.patch("/:defenseId/days/:dayId", requireRole("admin"), defenseDayController.updateDefenseDay);
router.delete("/:defenseId/days/:dayId", requireRole("admin"), defenseDayController.deleteDefenseDay);

export default router;
