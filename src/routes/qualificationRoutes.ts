import express from "express";
import * as qualificationController from "../controllers/qualificationController.js";

const router: express.Router = express.Router();


router.post("/", qualificationController.createQualification);

router.get("/", qualificationController.getQualifications);

router.get("/:id", qualificationController.getQualification);

router.put("/:id", qualificationController.updateQualification);

router.delete("/:id", qualificationController.deleteQualification);

export default router;
