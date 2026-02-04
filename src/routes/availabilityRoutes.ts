/**
 * Availability Routes
 * Routes for lecturer availability management
 */

import express from "express";
import * as availabilityController from "../controllers/availabilityController.js";

const router: express.Router = express.Router();

// ============================================================================
// Defense Days Routes
// ============================================================================

/**
 * GET /api/availability/defenses/:defenseId/days
 * Get all defense days for a specific defense
 */
router.get(
  "/defenses/:defenseId/days",
  availabilityController.getDefenseDays,
);

/**
 * GET /api/availability/defenses/:defenseId/days/with-availability
 * Get defense days with lecturer's availability status
 */
router.get(
  "/defenses/:defenseId/days/with-availability",
  availabilityController.getDefenseDaysWithAvailability,
);

// ============================================================================
// Lecturer Availability Routes
// ============================================================================

/**
 * GET /api/availability/lecturers/:lecturerId/status
 * Get lecturer's registered status for a defense
 */
router.get(
  "/lecturers/:lecturerId/status",
  availabilityController.getLecturerStatus,
);

/**
 * PUT /api/availability/lecturers/:lecturerId/availability
 * Update lecturer availability for a specific defense day
 */
router.put(
  "/lecturers/:lecturerId/availability",
  availabilityController.updateAvailability,
);

/**
 * PUT /api/availability/lecturers/:lecturerId/availability/batch
 * Batch update lecturer availability for multiple defense days
 */
router.put(
  "/lecturers/:lecturerId/availability/batch",
  availabilityController.batchUpdateAvailability,
);

/**
 * DELETE /api/availability/lecturers/:lecturerId/availability/:defenseDayId
 * Remove availability record (revert to Available)
 */
router.delete(
  "/lecturers/:lecturerId/availability/:defenseDayId",
  availabilityController.removeAvailability,
);

export default router;
