import express from "express";
import * as qualificationGroupController from "../controllers/qualificationGroupController.js";
import { requireRole } from "../middleware/auth.js";

const router: express.Router = express.Router();

router.get("/", qualificationGroupController.getAllGroups);
router.get("/:id", qualificationGroupController.getGroupById);
router.post("/", requireRole("admin"), qualificationGroupController.createGroup);
router.patch("/:id", requireRole("admin"), qualificationGroupController.updateGroup);
router.delete("/:id", requireRole("admin"), qualificationGroupController.deleteGroup);

export default router;
