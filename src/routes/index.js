import express from "express";
import { successResponse } from "../utils/apiResponse.js";

const router = express.Router();

// Health check route
router.get("/health", (req, res) => {
  return successResponse(
    res,
    { status: "OK", timestamp: new Date().toISOString() },
    "Server is running"
  );
});


export default router;
