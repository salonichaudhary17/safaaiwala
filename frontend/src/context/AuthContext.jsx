import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { API_BASE } from "../lib/api";

const AuthContext = createContext(null);
const TOKEN_KEY = "safaaiwala_token";
const USER_KEY = "safaaiwala_user";

async function parseJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));
  const [error, setError] = useState("");

  function persist(nextToken, nextUser) {
    setToken(nextToken);
    setUser(nextUser);
    if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken);
    else localStorage.removeItem(TOKEN_KEY);
    if (nextUser) localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    else localStorage.removeItem(USER_KEY);
  }

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(parseJson)
      .then((data) => {
        if (!cancelled) persist(token, data.user);
      })
      .catch(() => {
        if (!cancelled) persist("", null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function register(payload) {
    setError("");
    const data = await parseJson(
      await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    );
    persist(data.token, data.user);
    return data.user;
  }

  async function login(email, password) {
    setError("");
    const data = await parseJson(
      await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
    );
    persist(data.token, data.user);
    return data.user;
  }

  function logout() {
    persist("", null);
  }

  async function authFetch(path, options = {}) {
    const headers = {
      ...(options.headers || {}),
    };
    if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    if (token) headers.Authorization = `Bearer ${token}`;

    return fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  }

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      error,
      setError,
      register,
      login,
      logout,
      authFetch,
      isAuthenticated: Boolean(token && user),
    }),
    [token, user, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
