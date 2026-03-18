import { Navigate, Route, Routes } from "react-router-dom";
import AdminApp from "../apps/admin";
import WebApp from "../apps/web";
import LandingPage from "../apps/web/pages/LandingPage";
import LoginPage from "../apps/web/pages/LoginPage";
import RegisterPage from "../apps/web/pages/RegisterPage";
import { RedirectIfAuthenticated, RequireAdmin, RequireAuth } from "./auth";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<RedirectIfAuthenticated />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/app/*" element={<WebApp />} />
      </Route>

      <Route element={<RequireAdmin />}>
        <Route path="/admin/*" element={<AdminApp />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
