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

export default router;
