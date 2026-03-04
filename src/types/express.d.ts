/**
 * Express Request type extension
 * Adds the `user` property injected by the Supabase authenticate middleware
 */
import { User } from "@supabase/supabase-js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
