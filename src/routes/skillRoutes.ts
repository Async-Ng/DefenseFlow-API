import express from "express";
import * as skillController from "../controllers/skillController.js";

const router: express.Router = express.Router();


router.post("/", skillController.createSkill);

router.get("/", skillController.getSkills);

router.get("/:id", skillController.getSkill);

router.put("/:id", skillController.updateSkill);

router.delete("/:id", skillController.deleteSkill);

export default router;
