import { Loader2 } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import LiquidBackdrop from "../components/LiquidBackdrop";

import { useAuth } from "./AuthContext";

function FullScreenLoader() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="relative grid min-h-screen place-items-center px-6">
      <LiquidBackdrop />
      <div className="panel relative z-10 flex items-center gap-3 rounded-full py-3 pl-3 pr-5" role="status">
        <Loader2 size={18} className="animate-spin text-brand-300" />
        <p className="text-sm text-slate-200">{isAdminRoute ? "Loading session..." : "Загрузка сессии..."}</p>
      </div>
    </div>
  );
}

export function RedirectIfAuthenticated() {
  const { isHydrating, session } = useAuth();

  if (isHydrating) {
    return <FullScreenLoader />;
  }

  if (session) {
    return <Navigate to={session.user.role === "admin" ? "/admin" : "/app"} replace />;
  }

  return <Outlet />;
}

export function RequireAuth() {
  const { isHydrating, session } = useAuth();
  const location = useLocation();

  if (isHydrating && !session) {
    return <FullScreenLoader />;
  }

  if (!session) {
    const redirectTarget = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from: redirectTarget }} />;
  }

  return <Outlet />;
}

export function RequireAdmin() {
  const { isHydrating, session } = useAuth();

  if (isHydrating && !session) {
    return <FullScreenLoader />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (session.user.role !== "admin") {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
