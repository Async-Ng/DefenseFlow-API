import express from "express";
import * as lecturerDefenseConfigController from "../controllers/lecturerDefenseConfigController.js";
import { requireRole } from "../middleware/auth.js";

const router: express.Router = express.Router();

router.post("/", requireRole("admin"), lecturerDefenseConfigController.createConfig);
router.put("/:id", requireRole("admin"), lecturerDefenseConfigController.updateConfig);
router.get("/", lecturerDefenseConfigController.getConfigs);
router.get("/:id", lecturerDefenseConfigController.getConfigById);
router.delete("/:id", requireRole("admin"), lecturerDefenseConfigController.deleteConfig);


export default router;
