import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { hasSession } from "./api/client";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Send from "./pages/Send";
import Receive from "./pages/Receive";
import History from "./pages/History";
import Settings from "./pages/Settings";
import Withdraw from "./pages/Withdraw";

function Private({ children }: { children: ReactNode }) {
  return hasSession() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-[#faf8f4] md:my-6 md:min-h-[calc(100dvh-3rem)] md:overflow-hidden md:rounded-3xl md:shadow-xl">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Private><Home /></Private>} />
        <Route path="/send" element={<Private><Send /></Private>} />
        <Route path="/receive" element={<Private><Receive /></Private>} />
        <Route path="/history" element={<Private><History /></Private>} />
        <Route path="/settings" element={<Private><Settings /></Private>} />
        <Route path="/withdraw" element={<Private><Withdraw /></Private>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
