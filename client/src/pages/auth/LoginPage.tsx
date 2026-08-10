// client/src/pages/auth/LoginPage.tsx
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import { setAuthPersistence } from "../../lib/firebase";
import { safeInternalPath } from "../../lib/safeNav";

export default function LoginPage() {
  const { login, loginWithGoogle, loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as any;
  // If a ProtectedRoute sent the user here, go back there; otherwise go to /home
  const from = safeInternalPath(location.state?.from?.pathname) || "/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await setAuthPersistence(remember);
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      // Required phrasing
      setError("Incorrect Username or Password");
    } finally {
      setSubmitting(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setSubmitting(true);
    try {
      await setAuthPersistence(remember);
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch {
      setError("Unable to sign in with Google. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onGuest() {
    setError(null);
    setSubmitting(true);
    try {
      // For guests, session-only persistence is usually better
      await setAuthPersistence(false);
      await loginAsGuest();
      navigate("/home", { replace: true });
    } catch {
      setError("Unable to continue as guest. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 20, border: "1px solid #eee", borderRadius: 8 }}>
      <h1 style={{ marginTop: 0 }}>Sign In</h1>
      <form onSubmit={onSubmit}>
        <label style={{ display: "block", marginBottom: 6 }}>Email</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", marginBottom: 10 }}
        />
        <label style={{ display: "block", marginBottom: 6 }}>Password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", marginBottom: 10 }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 12px" }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember me
        </label>
        {error && <div style={{ color: "#b00020", marginBottom: 10 }}>{error}</div>}
        <button
          type="submit"
          disabled={submitting}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #111", background: "#111", color: "#fff" }}
        >
          {submitting ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <button
        onClick={onGoogle}
        disabled={submitting}
        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", background: "#fff", marginTop: 10 }}
      >
        Continue with Google
      </button>

      <button
        onClick={onGuest}
        disabled={submitting}
        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", background: "#fff", marginTop: 10 }}
      >
        Continue as Guest
      </button>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
        <Link to="/signup">Create account</Link>
        <Link to="/forgot-password">Forgot password?</Link>
      </div>
    </div>
  );
}