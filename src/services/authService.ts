/**
 * Auth Service
 * Contains all business logic for authentication via Supabase Auth
 */
import { supabase } from "../config/supabase.js";
import { prisma } from "../config/prisma.js";
import type { User } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppMeta {
  roles?: string[];
  lecturerId?: number;
}

export interface AuthUserPayload {
  id: string;
  email: string | undefined;
  roles: string[];
  lecturerId: number | null;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUserPayload;
}

export interface GoogleSignInResult {
  url: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractUserPayload(user: User): AuthUserPayload {
  const appMeta = user.app_metadata as AppMeta;
  return {
    id: user.id,
    email: user.email,
    roles: appMeta.roles ?? [],
    lecturerId: appMeta.lecturerId ?? null,
  };
}

// ─── Service Methods ──────────────────────────────────────────────────────────

/**
 * Sign in with email and password.
 * Returns session tokens and user metadata on success.
 * Returns null if credentials are invalid.
 */
export async function loginWithPassword(
  email: string,
  password: string,
): Promise<LoginResult | null> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return null;
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
    user: extractUserPayload(data.user),
  };
}

/**
 * Sign out the current user from Supabase.
 * Throws an error if the sign-out fails.
 */
export async function logoutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error("Logout failed");
  }
}

/**
 * Extract the authenticated user's payload from req.user (set by auth middleware).
 */
export function buildMePayload(user: User): AuthUserPayload {
  return extractUserPayload(user);
}

/**
 * Generate a Google OAuth URL using Supabase auth.
 * Returns the redirect URL to send the user to Google.
 */
export async function generateGoogleOAuthUrl(
  redirectTo: string,
): Promise<GoogleSignInResult> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    throw new Error("Failed to generate Google OAuth URL.");
  }

  return { url: data.url };
}

// ─── Google Callback result types ────────────────────────────────────────────

export type GoogleCallbackResult =
  | { kind: "success"; data: LoginResult }
  | { kind: "access_denied"; email: string };

/**
 * Synchronizes Supabase user metadata (roles, lecturerId) with the Lecturers table.
 * Used during both Web (callback), Mobile (idToken), and /me verification Google login flows.
 */
export async function syncUserMetadata(user: User): Promise<AppMeta | "access_denied"> {
  const appMeta = user.app_metadata as AppMeta;

  // If already has roles, no need to sync (avoid extra DB calls)
  if (appMeta.roles && appMeta.roles.length > 0) {
    return appMeta;
  }

  // First-time login: assign roles based on Lecturers table
  const lecturer = await prisma.lecturer.findFirst({
    where: { email: user.email ?? "" },
    select: { id: true },
  });

  if (!lecturer) {
    // Email not recognized — delete the ghost Supabase user and reject
    await supabase.auth.admin.deleteUser(user.id);
    return "access_denied";
  }

  const newMeta: AppMeta = {
    roles: ["lecturer"],
    lecturerId: lecturer.id,
  };

  // Assign lecturer role + link lecturerId in Supabase app_metadata
  await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: newMeta,
  });

  // Link authId in Lecturers table if not already set
  await prisma.lecturer.update({
    where: { id: lecturer.id },
    data: { authId: user.id },
  });

  return newMeta;
}

/**
 * Exchange a Google authorization code for a Supabase session (Web Flow).
 */
export async function handleGoogleCallback(
  code: string,
): Promise<GoogleCallbackResult> {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    throw new Error("Failed to exchange code for session. Please try again.");
  }

  const metaResult = await syncUserMetadata(data.user);

  if (metaResult === "access_denied") {
    return { kind: "access_denied", email: data.user.email ?? "" };
  }

  return {
    kind: "success",
    data: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      user: {
        id: data.user.id,
        email: data.user.email,
        roles: metaResult.roles ?? [],
        lecturerId: metaResult.lecturerId ?? null,
      },
    },
  };
}

/**
 * Sign in with a Google ID Token (Native Mobile Flow).
 * Returns session tokens and user metadata on success.
 */
export async function loginWithIdToken(
  idToken: string,
): Promise<GoogleCallbackResult> {
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });

  if (error || !data.session) {
    throw new Error(error?.message || "ID Token authentication failed.");
  }

  const metaResult = await syncUserMetadata(data.user);

  if (metaResult === "access_denied") {
    return { kind: "access_denied", email: data.user.email ?? "" };
  }

  return {
    kind: "success",
    data: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresIn: data.session.expires_in,
      user: {
        id: data.user.id,
        email: data.user.email,
        roles: metaResult.roles ?? [],
        lecturerId: metaResult.lecturerId ?? null,
      },
    },
  };
}
