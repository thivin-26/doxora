import { useContext } from "react";
import { AuthContext } from "./AuthContext";

/**
 * useAuth — hook to access the authentication context.
 * Must be used inside <AuthProvider>.
 * Kept in a separate file from AuthProvider so Vite Fast Refresh
 * can handle both independently without HMR warnings.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
