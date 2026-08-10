// client/src/pages/auth/SignUpPage.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";
import { setAuthPersistence } from "../../lib/firebase";

function friendlyAuthError(e: any): string {
  const code: string = e?.code || "";
  if (code.includes("email-already-in-use")) return "An account already exists for that email.";
  if (code.includes("weak-password")) return "Please use a stronger password.";
  return "Unable to create the account. Please try again.";
}

export default function SignUpPage() {
  const { signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    try {
      await setAuthPersistence(remember);
      await signup(email, password);
      navigate("/", { replace: true });
    } catch (err: any) {
      setError(friendlyAuthError(err));
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
      navigate("/", { replace: true });
    } catch (err: any) {
      setError("Unable to sign up with Google. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 20, border: "1px solid #eee", borderRadius: 8 }}>
      <h1 style={{ marginTop: 0 }}>Create Account</h1>
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
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", marginBottom: 10 }}
        />
        <label style={{ display: "block", marginBottom: 6 }}>Confirm Password</label>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", marginBottom: 10 }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 12px" }}>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Keep me signed in
        </label>
        {error && <div style={{ color: "#b00020", marginBottom: 10 }}>{error}</div>}
        <button
          type="submit"
          disabled={submitting}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #111", background: "#111", color: "#fff" }}
        >
          {submitting ? "Creating…" : "Create Account"}
        </button>
      </form>

      <button
        onClick={onGoogle}
        disabled={submitting}
        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", background: "#fff", marginTop: 10 }}
      >
        Sign up with Google
      </button>

      <div style={{ marginTop: 12 }}>
        <Link to="/login">Have an account? Sign in</Link>
      </div>
    </div>
  );
}