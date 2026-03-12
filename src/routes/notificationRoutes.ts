import express from "express";
import { getMyNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "../controllers/notificationController.js";
import { authenticate } from "../middleware/auth.js";

const router: express.Router = express.Router();

// All notification routes must be authenticated
router.use(authenticate);

// Get my notifications
router.get("/", getMyNotifications);

// Mark all as read
router.put("/read-all", markAllNotificationsAsRead);

// Mark specific notification as read
router.put("/:id/read", markNotificationAsRead);

export default router;
