/**
 * Auth Controller
 * Handles HTTP request/response for authentication.
 * All business logic is delegated to authService.
 */
import { Request, Response } from "express";
import { successResponse, errorResponse, validationErrorResponse } from "../utils/apiResponse.js";
import {
  loginWithPassword,
  logoutUser,
  buildMePayload,
  generateGoogleOAuthUrl,
  handleGoogleCallback,
} from "../services/authService.js";

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: lecturer@fpt.edu.vn
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: string
 *                     lecturerId:
 *                       type: integer
 *                       nullable: true
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials
 */
export const login = async (req: Request, res: Response): Promise<Response> => {
  const { email, password } = req.body;

  if (!email || !password) {
    return validationErrorResponse(res, { message: "Email and password are required." });
  }

  const result = await loginWithPassword(email, password);

  if (!result) {
    return res.status(401).json({ success: false, message: "Invalid email or password." });
  }

  return successResponse(res, result, "Login successful");
};

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
export const logout = async (_req: Request, res: Response): Promise<Response> => {
  try {
    await logoutUser();
    return successResponse(res, {}, "Logout successful");
  } catch {
    return errorResponse(res, "Logout failed", 500);
  }
};

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user info
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User info retrieved
 *       401:
 *         description: Not authenticated
 */
export const getMe = async (req: Request, res: Response): Promise<Response> => {
  const payload = buildMePayload(req.user!);
  return successResponse(res, payload, "User info retrieved");
};

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     description: Returns a Google OAuth URL. Redirect the user to this URL to start the Google login flow.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: redirectTo
 *         schema:
 *           type: string
 *         description: Frontend callback URL after Google login
 *         example: http://localhost:5173/auth/callback
 *     responses:
 *       200:
 *         description: OAuth URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: Google OAuth URL to redirect the user to
 */
export const googleSignIn = async (req: Request, res: Response): Promise<Response> => {
  const redirectTo =
    (req.query.redirectTo as string) ||
    `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/auth/callback`;

  try {
    const result = await generateGoogleOAuthUrl(redirectTo);
    return successResponse(res, result, "Redirect to this URL to login with Google");
  } catch {
    return errorResponse(res, "Failed to generate Google OAuth URL.", 500);
  }
};

/**
 * @swagger
 * /api/auth/callback:
 *   get:
 *     summary: Handle Google OAuth callback
 *     description: |
 *       Exchanges the authorization code (returned by Google) for a Supabase session.
 *       Automatically assigns the `lecturer` role and links `lecturerId` if the user email
 *       matches an existing lecturer in the database.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from Google
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Missing authorization code
 *       401:
 *         description: Failed to exchange code for session
 *       403:
 *         description: Email not registered in the system
 */
export const googleCallback = async (req: Request, res: Response): Promise<Response> => {
  const code = req.query.code as string;

  if (!code) {
    return res.status(400).json({ success: false, message: "Missing authorization code from Google." });
  }

  try {
    const result = await handleGoogleCallback(code);

    if (result.kind === "access_denied") {
      return res.status(403).json({
        success: false,
        message: `Access denied. The email "${result.email}" is not registered in the system. Please contact your administrator.`,
      });
    }

    return successResponse(res, result.data, "Login successful");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed.";
    return res.status(401).json({ success: false, message });
  }
};
