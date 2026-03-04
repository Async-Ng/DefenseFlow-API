/**
 * Auth Routes
 * Public endpoints for authentication (no token required)
 */
import express from "express";
import { login, logout, getMe, googleSignIn, googleCallback } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";


const router: express.Router = express.Router();

// POST /api/auth/login — public
router.post("/login", login);

// GET /api/auth/google — returns Google OAuth URL (public)
router.get("/google", googleSignIn);

// GET /api/auth/callback — handles Google OAuth redirect (public)
router.get("/callback", googleCallback);

// POST /api/auth/logout — requires token
router.post("/logout", authenticate, logout);

// GET /api/auth/me — requires token
router.get("/me", authenticate, getMe);

export default router;
