import express from "express";
import * as lecturerSessionConfigController from "../controllers/lecturerSessionConfigController.js";

const router: express.Router = express.Router();

router.post("/", lecturerSessionConfigController.createConfig);
router.put("/:id", lecturerSessionConfigController.updateConfig);
router.get("/", lecturerSessionConfigController.getConfigs);

export default router;
