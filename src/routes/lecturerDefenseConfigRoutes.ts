import express from "express";
import * as lecturerDefenseConfigController from "../controllers/lecturerDefenseConfigController.js";

const router: express.Router = express.Router();

router.post("/", lecturerDefenseConfigController.createConfig);
router.put("/:id", lecturerDefenseConfigController.updateConfig);
router.get("/", lecturerDefenseConfigController.getConfigs);
router.get("/:id", lecturerDefenseConfigController.getConfigById);
router.delete("/:id", lecturerDefenseConfigController.deleteConfig);

export default router;
