import express from "express";
import * as topicController from "../controllers/topicController.js";
import { requireRole } from "../middleware/auth.js";

const router: express.Router = express.Router();

router.post("/", requireRole("admin"), topicController.createTopic);
router.get("/", topicController.getAllTopics);
router.get("/:id", topicController.getTopicById);
router.patch("/:id", requireRole("admin"), topicController.updateTopic);
router.delete("/:id", requireRole("admin"), topicController.deleteTopic);
router.patch("/:id/result", requireRole("admin"), topicController.updateTopicResult);

export default router;
