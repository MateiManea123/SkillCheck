import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/AuthProvider";

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/interview" replace />;
  }

  return <>{children}</>;
}
