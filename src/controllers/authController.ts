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
  generateGoogleOAuthUrl,
  handleGoogleCallback,
  loginWithIdToken,
  syncUserMetadata,
  changeUserPassword,
  updateUserProfile,
  refreshSession,
} from "../services/authService.js";

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: "[LECTURER, ADMIN] Change own password"
 *     description: Allows the currently authenticated user to update their password. Password must be at least 6 characters. **NOTE - Old password is NOT required.**
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: The new password to set.
 *                 example: "newSecretPassword123"
 *     responses:
 *       200:
 *         description: Password changed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: Validation error (e.g., password too short).
 *       401:
 *         description: Unauthorized. Invalid or missing token.
 *       500:
 *         description: Internal server error.
 */
export const changePassword = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { newPassword } = req.body;
    const user = req.user!;

    if (!newPassword || newPassword.length < 6) {
      return validationErrorResponse(res, { message: "Mật khẩu mới phải có ít nhất 6 ký tự." });
    }

    await changeUserPassword(user.id, newPassword);

    return successResponse(res, null, "Đổi mật khẩu thành công.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Đổi mật khẩu thất bại.";
    return errorResponse(res, message, 500);
  }
};

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
 *                 example: phuonglhk@fe.edu.vn
 *               password:
 *                 type: string
 *                 description: The user's password.
 *                 example: 000000
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
    return validationErrorResponse(res, { message: "Email và password là bắt buộc." });
  }

  const result = await loginWithPassword(email, password);

  if (!result) {
    return res.status(401).json({ success: false, message: "Email hoặc mật khẩu không chính xác." });
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
 *     description: Decodes the provided Bearer token and returns the current user's payload, including their roles and linked lecturer ID. Verifies their email exists in the system.
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
 *       403:
 *         description: Access denied. The user's email was not found in the system.
 */
export const getMe = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = req.user!;
    const metaResult = await syncUserMetadata(user);

    if (metaResult === "access_denied") {
      return res.status(403).json({
        success: false,
        message: `Truy cập bị từ chối. Email "${user.email}" chưa được đăng ký trong hệ thống giảng viên. Vui lòng liên hệ Admin.`,
      });
    }

    const payload = {
      id: user.id,
      email: user.email,
      roles: metaResult.roles ?? [],
      lecturerId: metaResult.lecturerId ?? null,
      name: metaResult.fullName ?? null,
    };

    return successResponse(res, payload, "User info retrieved");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to retrieve user info";
    return errorResponse(res, message, 500);
  }
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
    return res.status(400).json({ success: false, message: "Thiếu mã xác thực (authorization code) từ Google." });
  }

  try {
    const result = await handleGoogleCallback(code);

    if (result.kind === "access_denied") {
      return res.status(403).json({
        success: false,
        message: `Truy cập bị từ chối. Email "${result.email}" chưa được đăng ký trong hệ thống giảng viên. Vui lòng liên hệ Admin.`,
      });
    }

    return successResponse(res, result.data, "Login successful");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed.";
    return res.status(401).json({ success: false, message });
  }
};
/**
 * @swagger
 * /api/auth/google-native:
 *   post:
 *     summary: Authenticate with Google ID Token (Native Mobile)
 *     description: |
 *       Exchanges a Google `idToken` (obtained via native mobile Google SDK) for a Supabase session.
 *       Follows the same role assignment and lecturer linking logic as the web-based Google login.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: The Google ID Token from the mobile client.
 *     responses:
 *       200:
 *         description: Login successful. Returns JWT tokens and user metadata.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     expiresIn:
 *                       type: integer
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         roles:
 *                           type: array
 *                           items:
 *                             type: string
 *                         lecturerId:
 *                           type: integer
 *                           nullable: true
 *       400:
 *         description: Missing idToken.
 *       401:
 *         description: Authentication failed.
 *       403:
 *         description: Access denied (email not registered).
 */
export const googleNativeSignIn = async (req: Request, res: Response): Promise<Response> => {
  const { idToken } = req.body;

  if (!idToken) {
    return validationErrorResponse(res, { message: "Thiếu idToken." });
  }

  try {
    const result = await loginWithIdToken(idToken);

    if (result.kind === "access_denied") {
      return res.status(403).json({
        success: false,
        message: `Truy cập bị từ chối. Email "${result.email}" chưa được đăng ký trong hệ thống.`,
      });
    }

    return successResponse(res, result.data, "Login successful");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed.";
    return res.status(401).json({ success: false, message });
  }
};
/**
 * @swagger
 * /api/auth/profile:
 *   patch:
 *     summary: "[LECTURER, ADMIN] Update own profile"
 *     description: Allows the currently authenticated user to update their full name and email.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Nguyen Van A"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "new.email@fpt.edu.vn"
 *     responses:
 *       200:
 *         description: Profile updated successfully.
 *       400:
 *         description: Validation or processing error.
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
export const updateProfile = async (req: Request, res: Response): Promise<Response> => {
  try {
    const user = req.user!;
    const { fullName, email } = req.body;
    const lecturerId = (user.app_metadata as any).lecturerId;

    if (!lecturerId) {
      return errorResponse(res, "Không tìm thấy thông tin giảng viên liên kết với tài khoản này.", 403);
    }

    const dataToUpdate: { fullName?: string; email?: string } = {};
    if (fullName) dataToUpdate.fullName = fullName;
    if (email) dataToUpdate.email = email;

    if (Object.keys(dataToUpdate).length === 0) {
      return errorResponse(res, "Không có thông tin nào để cập nhật.", 400);
    }

    await updateUserProfile(user.id, lecturerId, dataToUpdate);

    return successResponse(res, null, "Cập nhật profile thành công.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cập nhật profile thất bại.";
    return errorResponse(res, message, 500);
  }
};
/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh the user's session
 *     description: Takes a refresh token and returns a new session with an refreshed access token.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token provided during login or previous refresh.
 *     responses:
 *       200:
 *         description: Session refreshed successfully.
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
 *                   example: "Phiên làm mới thành công."
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: New JWT valid for API requests.
 *                     refreshToken:
 *                       type: string
 *                       description: New refresh token.
 *                     expiresIn:
 *                       type: integer
 *                       description: Seconds until the new access token expires.
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         roles:
 *                           type: array
 *                           items:
 *                             type: string
 *                         lecturerId:
 *                           type: integer
 *                           nullable: true
 *       400:
 *         description: Missing refreshToken.
 *       401:
 *         description: Invalid or expired refresh token.
 *       500:
 *         description: Internal server error.
 */
export const refreshToken = async (req: Request, res: Response): Promise<Response> => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return validationErrorResponse(res, { message: "Refresh token là bắt buộc." });
  }

  try {
    const result = await refreshSession(token);
    return successResponse(res, result, "Phiên làm mới thành công.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Phiên làm mới thất bại.";
    return res.status(401).json({ success: false, message });
  }
};
