// client/src/pages/LoginPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleGuestPlay() {
    navigate("/home");
  }

  async function handleGoogleSignIn() {
    alert("Google Sign-In will be added here with Firebase.");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    alert(`Logging in as ${username}`);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    alert(`Signing up ${username} (${email})`);
  }

  function handleForgotPassword(e: React.MouseEvent) {
    e.preventDefault();
    alert("Forgot Password flow will be added here with Firebase.");
  }

  const container: React.CSSProperties = {
    maxWidth: 1000,
    margin: "0 auto",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    padding: 16,
    fontFamily: "system-ui, sans-serif",
  };

  const titleBlock: React.CSSProperties = {
    textAlign: "center",
    marginBottom: 24,
    marginTop: 8,
  };

  const panel: React.CSSProperties = {
    border: "1px solid #e6e6e6",
    borderRadius: 10,
    padding: 16,
    background: "#fafafa",
  };

  const leftPanel: React.CSSProperties = {
    ...panel,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    justifyContent: "center",
  };

  const rightPanel: React.CSSProperties = {
    ...panel,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  const formBox: React.CSSProperties = {
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: 16,
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    overflow: "hidden",
  };

  const field: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "#fff",
    fontSize: 14,
    boxSizing: "border-box",
  };

  const buttonBase: React.CSSProperties = {
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid #333",
    background: "#fff",
    color: "#111",
    cursor: "pointer",
    fontWeight: 700,
  };

  const buttonPrimary: React.CSSProperties = {
    ...buttonBase,
    background: "#111",
    color: "#fff",
    borderColor: "#111",
  };

  const subtleLink: React.CSSProperties = {
    color: "#0a58ca",
    textDecoration: "none",
    cursor: "pointer",
    fontWeight: 600,
  };

  const footerToggleRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  };

  return (
    <div style={container}>
      {/* Responsive styles for this page */}
      <style>
        {`
          .login-grid {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 20px;
            align-items: stretch;
          }
          .login-divider {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding-inline: 10px;
            min-width: 60px;
          }
          .login-vline {
            width: 1px;
            background: #ddd;
            flex: 1;
          }
          .login-or {
            font-weight: 700;
            color: #666;
            margin: 8px 0;
          }

          @media (max-width: 800px) {
            .login-grid {
              grid-template-columns: 1fr;
              gap: 16px;
            }
            .login-divider {
              flex-direction: row;
              min-width: 0;
              padding-inline: 0;
              gap: 10px;
            }
            .login-vline {
              width: 100%;
              height: 1px;
              flex: 0 0 auto;
            }
            .login-or {
              margin: 0;
            }
          }
        `}
      </style>

      <div style={titleBlock}>
        <h1 style={{ margin: 0 }}>Welcome to NBA Feud!</h1>
      </div>

      <div className="login-grid">
        {/* Left section */}
        <div style={leftPanel}>
          <button type="button" onClick={handleGuestPlay} style={buttonPrimary} aria-label="Play as Guest">
            Play as Guest
          </button>
          <button type="button" onClick={handleGoogleSignIn} style={buttonBase} aria-label="Sign in with Google">
            Sign in with Google
          </button>
        </div>

        {/* Middle divider with vertical lines and OR */}
        <div className="login-divider" aria-hidden="true">
          <div className="login-vline" />
          <div className="login-or">OR</div>
          <div className="login-vline" />
        </div>

        {/* Right section */}
        <div style={rightPanel}>
          <div style={formBox}>
            {!isSignUp ? (
              <form onSubmit={handleLogin}>
                <div style={field}>
                  <label>Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={field}>
                  <label>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <button type="submit" style={buttonPrimary} aria-label="Log In">
                    Log In
                  </button>

                  <a href="#forgot" onClick={handleForgotPassword} style={subtleLink}>
                    Forgot password?
                  </a>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignUp}>
                <div style={field}>
                  <label>Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={field}>
                  <label>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={field}>
                  <label>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password"
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={field}>
                  <label>Confirm Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", marginTop: 6 }}>
                  <button type="submit" style={buttonPrimary} aria-label="Sign Up">
                    Sign Up
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Toggle between Login and Sign Up below the box */}
          <div style={footerToggleRow}>
            <span style={{ color: "#555" }}>{isSignUp ? "Already have an account?" : "New here?"}</span>
            <a
              href="#toggle"
              onClick={(e) => {
                e.preventDefault();
                setIsSignUp((s) => !s);
                setPassword("");
                setConfirmPassword("");
              }}
              style={subtleLink}
              aria-label={isSignUp ? "Log In" : "Sign Up"}
            >
              {isSignUp ? "Log In" : "Sign Up"}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}