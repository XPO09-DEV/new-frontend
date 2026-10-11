import { useNavigate } from "react-router-dom";
import { api, clearToken, getToken, saveSession } from "../api/client";

export function useAuth() {
  const navigate = useNavigate();

  return {
    isLoggedIn: Boolean(getToken()),
    login: (token: string, refreshToken?: string) => saveSession(token, refreshToken),
    logout: () => {
      void api.logout().catch(() => undefined).finally(() => {
        clearToken();
        navigate("/login", { replace: true });
      });
    },
  };
}
