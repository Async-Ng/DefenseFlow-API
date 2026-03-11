/**
 * Authentication & Authorization Middleware
 * Uses Supabase Auth to verify JWTs and enforce role-based access control
 */
import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase.js";

/**
 * Authenticate middleware
 * Verifies the Bearer token from the Authorization header via Supabase Auth.
 * Attaches the Supabase user object to req.user on success.
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void | Response> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Không có token. Vui lòng cung cấp Bearer token.",
    });
  }

  const token = authHeader.split("Bearer ")[1];

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn.",
    });
  }

  req.user = user;
  next();
};

import { getActiveRole } from "../utils/requestHelpers.js";

/**
 * requireRole middleware factory
 * Checks if the authenticated user's active role is in the allowed roles list.
 * The active role is determined by the 'X-Active-Role' header or falls back to 'admin' > 'lecturer'.
 *
 * Usage: router.post("/", authenticate, requireRole("admin"), handler)
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void | Response => {
    try {
      // Determine the active role (throws if they request an invalid X-Active-Role)
      const activeRole = getActiveRole(req);

      if (!activeRole || !allowedRoles.includes(activeRole)) {
        return res.status(403).json({
          success: false,
          message: `Từ chối truy cập. Yêu cầu quyền: ${allowedRoles.join(", ")}. Quyền hiện tại của bạn: '${activeRole}'.`,
        });
      }

      next();
    } catch (error: any) {
      return res.status(403).json({
        success: false,
        message: error.message || "Từ chối truy cập",
      });
    }
  };
};
