import express from "express";
import * as topicDefenseController from "../controllers/topicDefenseController.js";
import { requireRole } from "../middleware/auth.js";

const router: express.Router = express.Router();

router.post("/", requireRole("admin"), topicDefenseController.createTopicDefense);
router.get("/", requireRole("admin"), topicDefenseController.getTopicDefenses);
router.get("/:id", requireRole("admin"), topicDefenseController.getTopicDefenseById);
router.delete("/:id", requireRole("admin"), topicDefenseController.deleteTopicDefense);

export default router;
