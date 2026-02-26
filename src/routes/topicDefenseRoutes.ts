import express from "express";
import * as topicDefenseController from "../controllers/topicDefenseController.js";

const router: express.Router = express.Router();

router.post("/", topicDefenseController.createTopicDefense);
router.get("/", topicDefenseController.getTopicDefenses);
router.get("/:id", topicDefenseController.getTopicDefenseById);
router.delete("/:id", topicDefenseController.deleteTopicDefense);

export default router;
