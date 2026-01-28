import express from "express";
import multer from "multer";
import {
  importTopics,
  importLecturers,
  downloadTopicTemplate,
  downloadLecturerTemplate,
} from "../controllers/importController.js";

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
router.get("/topics/template", downloadTopicTemplate);
router.get("/lecturers/template", downloadLecturerTemplate);

router.post("/topics", upload.single("file"), importTopics);
router.post("/lecturers", upload.single("file"), importLecturers);

export default router;
