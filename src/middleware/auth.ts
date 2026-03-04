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
      message: "No token provided. Please include a Bearer token.",
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
      message: "Invalid or expired token.",
    });
  }

  req.user = user;
  next();
};

/**
 * requireRole middleware factory
 * Checks if the authenticated user has at least one of the allowed roles.
 * Roles are stored in user.app_metadata.roles as a string array.
 *
 * Usage: router.post("/", authenticate, requireRole("admin"), handler)
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void | Response => {
    const userRoles: string[] = (req.user?.app_metadata?.roles as string[]) ?? [];
    const hasAccess = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Required role(s): ${allowedRoles.join(", ")}.`,
      });
    }

    next();
  };
};
