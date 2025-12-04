// src/components/RequireAuth.tsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * RequireAuth
 * - Synchronously reads token from localStorage under "access_token"
 * - Shows an optional minimal loading state while doing an initial check
 * - If token missing => redirect to /auth preserving intended location
 *
 * Usage:
 * <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
 */
const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // localStorage is synchronous; we only need a short "checking" window
    // so that pages which depend on async initialization don't flicker.
    const token = localStorage.getItem("access_token");
    // optionally: validate token format here (e.g., non-empty)
    setChecking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    // You can return a spinner component if you have one.
    // Returning null is fine — it prevents child render while verifying.
    return null;
  }

  const token = localStorage.getItem("access_token");
  if (!token) {
    // Save where the user wanted to go and redirect to /auth
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // token exists -> render children
  return children;
};

export default RequireAuth;
