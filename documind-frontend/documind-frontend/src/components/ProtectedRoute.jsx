import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }) {
  let auth = null;
  try {
    auth = useAuth();
  } catch {
    auth = null;
  }

  const user = auth?.user ?? null;
  const loading = auth?.loading ?? false;

  if (loading) {
    return (
      <div className="min-h-dvh bg-ink-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-400" size={28} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}
