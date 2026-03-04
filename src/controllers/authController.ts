/**
 * Auth Controller
 * Handles login and logout via Supabase Auth
 */
import { Request, Response } from "express";
import { supabase } from "../config/supabase.js";
import { successResponse, errorResponse, validationErrorResponse } from "../utils/apiResponse.js";
import { prisma } from "../config/prisma.js";

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
export const login = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { email, password } = req.body;

  if (!email || !password) {
    return validationErrorResponse(res, {
      message: "Email and password are required.",
    });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password.",
    });
  }

  const user = data.user;
  const appMeta = user.app_metadata as {
    roles?: string[];
    lecturerId?: number;
  };

  return successResponse(
    res,
    {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      user: {
        id: user.id,
        email: user.email,
        roles: appMeta.roles ?? [],
        lecturerId: appMeta.lecturerId ?? null,
      },
    },
    "Login successful",
  );
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
export const logout = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return errorResponse(res, "Logout failed", 500);
  }

  return successResponse(res, {}, "Logout successful");
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
export const getMe = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const user = req.user!;
  const appMeta = user.app_metadata as {
    roles?: string[];
    lecturerId?: number;
  };

  return successResponse(
    res,
    {
      id: user.id,
      email: user.email,
      roles: appMeta.roles ?? [],
      lecturerId: appMeta.lecturerId ?? null,
    },
    "User info retrieved",
  );
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
export const googleSignIn = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const redirectTo =
    (req.query.redirectTo as string) ||
    `${process.env.FRONTEND_URL ?? "http://localhost:5173"}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return errorResponse(res, "Failed to generate Google OAuth URL.", 500);
  }

  return successResponse(res, { url: data.url }, "Redirect to this URL to login with Google");
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
 */
export const googleCallback = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const code = req.query.code as string;

  if (!code) {
    return res.status(400).json({
      success: false,
      message: "Missing authorization code from Google.",
    });
  }

  // Exchange the code for a Supabase session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return res.status(401).json({
      success: false,
      message: "Failed to exchange code for session. Please try again.",
    });
  }

  const user = data.user;
  const appMeta = user.app_metadata as { roles?: string[]; lecturerId?: number };

  // First-time Google login: assign roles based on Lecturers table
  if (!appMeta.roles || appMeta.roles.length === 0) {
    const lecturer = await prisma.lecturer.findFirst({
      where: { email: user.email ?? "" },
      select: { id: true },
    });

    if (!lecturer) {
      // Email not recognized — delete the ghost Supabase user and reject
      await supabase.auth.admin.deleteUser(user.id);
      return res.status(403).json({
        success: false,
        message: `Access denied. The email "${user.email}" is not registered in the system. Please contact your administrator.`,
      });
    }

    // Assign lecturer role + link lecturerId in Supabase metadata
    await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: {
        roles: ["lecturer"],
        lecturerId: lecturer.id,
      },
    });

    // Link authId in Lecturers table if not already set
    await prisma.lecturer.update({
      where: { id: lecturer.id },
      data: { authId: user.id },
    });

    appMeta.roles = ["lecturer"];
    appMeta.lecturerId = lecturer.id;
  }


  return successResponse(
    res,
    {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      user: {
        id: user.id,
        email: user.email,
        roles: appMeta.roles ?? [],
        lecturerId: appMeta.lecturerId ?? null,
      },
    },
    "Login successful",
  );
};
