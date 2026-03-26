import express from "express";
import * as scheduleController from "../controllers/scheduleController.js";
import { requireRole } from "../middleware/auth.js";


const router: express.Router = express.Router();

router.post("/generate", requireRole("admin"), scheduleController.generateSchedule);

router.post("/publish", requireRole("admin"), scheduleController.publishSchedule);

router.put("/defense-councils/:defenseCouncilId", requireRole("admin"), scheduleController.updateDefenseCouncil);

router.post("/defense-councils", requireRole("admin"), scheduleController.createDefenseCouncil);

router.delete("/defense-councils/:id", requireRole("admin"), scheduleController.deleteDefenseCouncil);

router.put("/council-boards/:councilBoardId", requireRole("admin"), scheduleController.updateCouncilBoard);

router.get("/council-boards/:id", scheduleController.getCouncilBoardById);

router.get("/council-boards/:id/suitable-lecturers", requireRole("admin"), scheduleController.getSuitableLecturers);

router.get("/:defenseId", scheduleController.getSchedule);

router.get("/:defenseId/export", scheduleController.exportSchedule);

export default router;
