import { Navigate, Route, Routes } from "react-router-dom";
import ChatPage from "./pages/ChatPage";

export default function WebApp() {
  return (
    <Routes>
      <Route index element={<ChatPage />} />
      <Route path="chat/:conversationId" element={<ChatPage />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}

