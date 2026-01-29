/**
 * Availability Routes
 * Routes for lecturer availability management
 */

import express from "express";
import * as availabilityController from "../controllers/availabilityController.js";

const router: express.Router = express.Router();

// ============================================================================
// Session Days Routes
// ============================================================================

/**
 * GET /api/availability/sessions/:sessionId/days
 * Get all session days for a specific session
 */
router.get("/sessions/:sessionId/days", availabilityController.getSessionDays);

/**
 * GET /api/availability/sessions/:sessionId/days/with-availability
 * Get session days with lecturer's availability status
 */
router.get(
  "/sessions/:sessionId/days/with-availability",
  availabilityController.getSessionDaysWithAvailability,
);

// ============================================================================
// Lecturer Availability Routes
// ============================================================================

/**
 * GET /api/availability/lecturers/:lecturerId/status
 * Get lecturer's registered status for a session
 */
router.get(
  "/lecturers/:lecturerId/status",
  availabilityController.getLecturerStatus,
);

/**
 * PUT /api/availability/lecturers/:lecturerId/availability/batch
 * Batch update lecturer availability for multiple session days
 */
router.put(
  "/lecturers/:lecturerId/availability/batch",
  availabilityController.batchUpdateAvailability,
);

/**
 * DELETE /api/availability/lecturers/:lecturerId/availability/:sessionDayId
 * Remove availability record (revert to Available)
 */
router.delete(
  "/lecturers/:lecturerId/availability/:sessionDayId",
  availabilityController.removeAvailability,
);

export default router;
