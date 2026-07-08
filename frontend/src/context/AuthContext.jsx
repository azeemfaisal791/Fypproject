import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    apiRequest("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  // Returns { requiresOtp: true, email } when the account has 2FA enabled,
  // otherwise logs in and returns { user }.
  const login = async (email, password) => {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
    if (data.requiresOtp) return { requiresOtp: true, email: data.email };
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return { user: data.user };
  };

  const verifyLoginOtp = async (email, otp) => {
    const data = await apiRequest("/auth/login/verify-otp", {
      method: "POST",
      body: { email, otp },
      auth: false,
    });
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password) => {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: { name, email, password },
      auth: false,
    });
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data.user;
  };

  const updateProfile = async (payload) => {
    const data = await apiRequest("/auth/profile", { method: "PUT", body: payload });
    setUser(data.user);
  };

  const toggle2FA = async () => {
    const data = await apiRequest("/auth/2fa/toggle", { method: "PATCH" });
    setUser(data.user);
    return data.message;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, verifyLoginOtp, register, logout, updateProfile, toggle2FA }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
