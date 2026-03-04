import express from "express";
import * as topicTypeController from "../controllers/topicTypeController.js";
import { requireRole } from "../middleware/auth.js";

const router: express.Router = express.Router();

router.post("/", requireRole("admin"), topicTypeController.createTopicType);
router.get("/", topicTypeController.getTopicTypes);
router.get("/:id", topicTypeController.getTopicType);
router.put("/:id", requireRole("admin"), topicTypeController.updateTopicType);
router.delete("/:id", requireRole("admin"), topicTypeController.deleteTopicType);

export default router;
