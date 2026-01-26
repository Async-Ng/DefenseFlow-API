/**
 * Session Routes (TypeScript)
 */

import express from "express";
import {
  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  deleteSession,
} from "@controllers/sessionController.js";

const router: express.Router = express.Router();

// Create session
router.post("/", createSession);

// Get all sessions
router.get("/", getAllSessions);

// Get session by ID
router.get("/:id", getSessionById);

// Update session
router.patch("/:id", updateSession);

// Delete session
router.delete("/:id", deleteSession);

export default router;
