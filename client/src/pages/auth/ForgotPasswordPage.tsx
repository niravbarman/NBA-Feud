// client/src/pages/auth/ForgotPasswordPage.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthProvider";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await resetPassword(email);
      // Generic message to avoid email enumeration
      setMessage("If an account exists for that email, a reset link has been sent.");
    } catch {
      // Same generic message even on error
      setMessage("If an account exists for that email, a reset link has been sent.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 20, border: "1px solid #eee", borderRadius: 8 }}>
      <h1 style={{ marginTop: 0 }}>Reset Password</h1>
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
        {error && <div style={{ color: "#b00020", marginBottom: 10 }}>{error}</div>}
        {message && <div style={{ color: "#1a7f37", marginBottom: 10 }}>{message}</div>}
        <button
          type="submit"
          disabled={submitting}
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #111", background: "#111", color: "#fff" }}
        >
          {submitting ? "Sending…" : "Send Reset Link"}
        </button>
      </form>

      <div style={{ marginTop: 12 }}>
        <Link to="/login">Back to login</Link>
      </div>
    </div>
  );
}