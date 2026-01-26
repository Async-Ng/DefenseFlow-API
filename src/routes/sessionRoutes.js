/**
 * Session Routes
 * Define routes for session endpoints
 */

import express from "express";
import {
  createSession,
  getAllSessions,
  getSessionById,
  updateSession,
  deleteSession,
} from "../controllers/sessionController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Sessions
 *   description: Session management endpoints
 */

// Create session
router.post("/", createSession);

// Get all sessions
router.get("/", getAllSessions);

// Get session by ID
router.get("/:id", getSessionById);

// Update session
router.put("/:id", updateSession);

// Delete session
router.delete("/:id", deleteSession);

export default router;
