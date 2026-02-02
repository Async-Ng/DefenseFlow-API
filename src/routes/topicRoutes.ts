import express from "express";
import * as topicController from "../controllers/topicController.js";

const router: express.Router = express.Router();

router.get("/", topicController.getAllTopics);
router.get("/:id", topicController.getTopicById);
router.patch("/:id", topicController.updateTopic);
router.delete("/:id", topicController.deleteTopic);
router.patch("/:id/result", topicController.updateTopicResult);

export default router;
