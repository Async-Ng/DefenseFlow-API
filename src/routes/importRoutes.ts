import express from "express";
import multer from "multer";
import {
  importTopics,
  importLecturers,
  downloadTopicTemplate,
  downloadLecturerTemplate,
} from "../controllers/importController.js";
import { requireRole } from "../middleware/auth.js";

const router: express.Router = express.Router();

// Configure Multer to store in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (
    _req: express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    if (
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.mimetype === "application/xlsx"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only .xlsx files are allowed"));
    }
  },
});

// Template Routes
router.get("/topics/template", requireRole("admin"), downloadTopicTemplate);
router.get("/lecturers/template", requireRole("admin"), downloadLecturerTemplate);

router.post("/topics", requireRole("admin"), upload.single("file"), importTopics);
router.post("/lecturers", requireRole("admin"), upload.single("file"), importLecturers);


export default router;
