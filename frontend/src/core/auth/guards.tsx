import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./AuthContext";

function FullScreenLoader() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div
      className={[
        "grid min-h-screen place-items-center px-6",
        isAdminRoute ? "bg-[rgb(9,23,40)]" : "bg-[linear-gradient(180deg,_#07101a_0%,_#03070d_100%)]",
      ].join(" ")}
    >
      <div className="panel max-w-sm p-6 text-center">
        <p className="text-sm text-slate-300">{isAdminRoute ? "Loading session..." : "Загрузка сессии..."}</p>
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
