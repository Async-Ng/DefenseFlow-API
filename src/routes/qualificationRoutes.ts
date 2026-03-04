import express from "express";
import * as qualificationController from "../controllers/qualificationController.js";
import { requireRole } from "../middleware/auth.js";

const router: express.Router = express.Router();


router.post("/", requireRole("admin"), qualificationController.createQualification);

router.get("/", qualificationController.getQualifications);

router.get("/:id", qualificationController.getQualification);

router.put("/:id", requireRole("admin"), qualificationController.updateQualification);

router.delete("/:id", requireRole("admin"), qualificationController.deleteQualification);

export default router;
