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
 *     summary: Authenticate user with email and password
 *     description: Exchange email and password for a JWT access token and user metadata.
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
 *                 description: The user's registered email address.
 *                 example: lecturer@fpt.edu.vn
 *               password:
 *                 type: string
 *                 description: The user's password.
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful. Returns the JWT token and user info.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: JWT valid for API requests.
 *                     refreshToken:
 *                       type: string
 *                       description: Token used to obtain a new access token.
 *                     expiresIn:
 *                       type: integer
 *                       description: Number of seconds until the access token expires.
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                           format: email
 *                         roles:
 *                           type: array
 *                           items:
 *                             type: string
 *                         lecturerId:
 *                           type: integer
 *                           nullable: true
 *       400:
 *         description: Validation error. Email and password are required.
 *       401:
 *         description: Invalid credentials (wrong password or unregistered email).
 *       500:
 *         description: Internal server error.
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
 *     summary: Sign out the current user
 *     description: Invalidate the current session in Supabase and clear the authentication token. Requires a valid Bearer token.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logout successful"
 *                 data:
 *                   type: object
 *                   example: {}
 *       401:
 *         description: Unauthorized. Invalid or missing token.
 *       500:
 *         description: Internal server error during logout.
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
 *     summary: Retrieve current authenticated user profile
 *     description: Decodes the provided Bearer token and returns the current user's payload, including their roles and linked lecturer ID.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user profile information.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User info retrieved"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       description: Supabase Auth User ID.
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: The user's email address.
 *                     roles:
 *                       type: array
 *                       description: List of system roles assigned to the user.
 *                       items:
 *                         type: string
 *                     lecturerId:
 *                       type: integer
 *                       nullable: true
 *                       description: The ID of the associated Lecturer record, if applicable.
 *       401:
 *         description: Unauthorized. The token is missing, invalid, or expired.
 */
export const getMe = async (req: Request, res: Response): Promise<Response> => {
  const payload = buildMePayload(req.user!);
  return successResponse(res, payload, "User info retrieved");
};

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth Authorization URL
 *     description: Generates a Supabase Google OAuth URL. The frontend should redirect the user to this URL to start the Google login flow.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: redirectTo
 *         schema:
 *           type: string
 *         required: false
 *         description: The frontend callback URL where Supabase will redirect the user after Google authorization. Defaults to the environment frontend URL.
 *         example: http://localhost:5173/auth/callback
 *     responses:
 *       200:
 *         description: OAuth URL generated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Redirect to this URL to login with Google"
 *                 data:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       format: uri
 *                       description: Google OAuth authorization URL.
 *       500:
 *         description: Internal server error while generating the OAuth URL.
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
 *     summary: Exchange Google OAuth code for Session
 *     description: |
 *       Exchanges the authorization `code` returned by Google for a Supabase session containing JWT tokens.
 *       If it's the user's first time logging in, it attempts to assign the `lecturer` role and link their `lecturerId` by verifying if the email exists in the `Lecturers` database table.
 *       If the email is not registered in the system, it denies access and cleans up the newly created user record.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code provided by Google OAuth redirect.
 *     responses:
 *       200:
 *         description: Session established successfully. Returns JWT tokens and user metadata.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: JWT valid for API requests.
 *                     refreshToken:
 *                       type: string
 *                       description: Token used to obtain a new access token.
 *                     expiresIn:
 *                       type: integer
 *                       description: Seconds until the access token expires.
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         email:
 *                           type: string
 *                           format: email
 *                         roles:
 *                           type: array
 *                           items:
 *                             type: string
 *                         lecturerId:
 *                           type: integer
 *                           nullable: true
 *       400:
 *         description: Bad request. Missing authorization code.
 *       401:
 *         description: Authentication failed. Code exchange failed with Supabase.
 *       403:
 *         description: Access denied. The user's email was not found in the `Lecturers` table.
 *       500:
 *         description: Internal server error during callback processing.
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
