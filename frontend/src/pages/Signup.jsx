import { useState } from "react"
import { apiRequest } from "../api"

function Signup({ onSignup, onLogin }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")

    if (!username.trim() || !password) {
      setError("Enter a username and password.")
      return
    }

    // Mirrors the server rule (password.length < 6 is rejected).
    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setLoading(true)

    try {
      await apiRequest("/api/auth/signup", {
        method: "POST",
        body: {
          username: username.trim(),
          password,
        },
      })

      // The backend does not issue a token at signup.
      // App sends the learner to the login screen.
      if (onSignup) {
        onSignup()
      }
    } catch (error) {
      setError(error.message || "Unable to create your account.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-pattern" />

      <section className="login-content">

        {/* Logo */}
        <header className="login-header">
          <div className="login-logo-mark">
            L
          </div>

          <div className="login-logo-text">
            LOGIC LEAK
          </div>
        </header>

        {/* Intro */}
        <div className="login-intro">
          <h1>Start learning security.</h1>

          <p>
            Build your security skills by finding,
            understanding, and fixing vulnerable code.
          </p>
        </div>

        {/* Signup Card */}
        <div className="login-card">

          <form onSubmit={handleSubmit}>

            <div className="login-field">
              <label htmlFor="signup-username">
                Username
              </label>

              <input
                id="signup-username"
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="Choose a username"
                autoComplete="username"
              />
            </div>

            <div className="login-field">
              <label htmlFor="signup-password">
                Password
              </label>

              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Create a password (6+ characters)"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading
                ? "Creating account..."
                : "Create account"}

              {!loading && <span>→</span>}
            </button>

          </form>

          <div className="login-signup">
            <span>Already have an account?</span>

            <button
              type="button"
              onClick={onLogin}
            >
              Sign in
            </button>
          </div>

        </div>

        {/* Learning steps */}
        <div className="login-features">

          <div className="login-feature">
            <span className="feature-number">
              01
            </span>

            <div>
              <strong>Find</strong>
              <p>Spot the vulnerability.</p>
            </div>
          </div>

          <div className="login-feature">
            <span className="feature-number">
              02
            </span>

            <div>
              <strong>Understand</strong>
              <p>Learn why it matters.</p>
            </div>
          </div>

          <div className="login-feature">
            <span className="feature-number">
              03
            </span>

            <div>
              <strong>Fix</strong>
              <p>Apply the secure solution.</p>
            </div>
          </div>

        </div>

        <footer className="login-footer">
          LOGIC LEAK · INTERACTIVE SECURITY LEARNING
        </footer>

      </section>
    </main>
  )
}

export default Signup