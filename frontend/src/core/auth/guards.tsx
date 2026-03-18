import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="panel max-w-sm p-6 text-center">
        <p className="text-sm text-slate-300">Loading session...</p>
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

  if (isHydrating) {
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

  if (isHydrating) {
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

