import express from "express";
import * as topicDefenseController from "../controllers/topicDefenseController.js";
import { requireRole } from "../middleware/auth.js";

const router: express.Router = express.Router();

router.post("/", requireRole("admin"), topicDefenseController.createTopicDefense);
router.get("/", topicDefenseController.getTopicDefenses);
router.get("/:id", topicDefenseController.getTopicDefenseById);
router.delete("/:id", requireRole("admin"), topicDefenseController.deleteTopicDefense);

export default router;
