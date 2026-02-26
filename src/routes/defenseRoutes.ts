/**
 * Defense Routes (TypeScript)
 */

import express from "express";
import {
  createDefense,
  getAllDefenses,
  getDefenseById,
  updateDefense,
  deleteDefense,
} from "../controllers/defenseController.js";
import * as defenseDayController from "../controllers/defenseDayController.js";

const router: express.Router = express.Router();

// Create defense
router.post("/", createDefense);

// Get all defenses
router.get("/", getAllDefenses);

// Get defense by ID
router.get("/:id", getDefenseById);

// Update defense
router.patch("/:id", updateDefense);

// Delete defense
router.delete("/:id", deleteDefense);

// Defense Day endpoints (nested)
router.patch("/:defenseId/days/:dayId", defenseDayController.updateDefenseDay);
router.delete("/:defenseId/days/:dayId", defenseDayController.deleteDefenseDay);

export default router;
