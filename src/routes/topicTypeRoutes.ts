import express from "express";
import * as topicTypeController from "../controllers/topicTypeController.js";

const router: express.Router = express.Router();

router.post("/", topicTypeController.createTopicType);
router.get("/", topicTypeController.getTopicTypes);
router.get("/:id", topicTypeController.getTopicType);
router.put("/:id", topicTypeController.updateTopicType);
router.delete("/:id", topicTypeController.deleteTopicType);

export default router;
