import { useState } from "react"

function Login({ onLogin }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")

    if (!username.trim() || !password) {
      setError("Enter your username and password.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            password,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Login failed.")
      }

      localStorage.setItem("logicLeakToken", data.token)
      localStorage.setItem("logicLeakUsername", data.username)

      onLogin()
    } catch (error) {
      setError(error.message || "Unable to connect to server.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">

      <div className="login-background-grid" />

      <section className="login-container">

        <div className="login-brand">
          <div className="login-logo">L</div>

          <div>
            <div className="login-brand-name">
              LOGIC LEAK
            </div>

            <div className="login-brand-subtitle">
              CODE SECURITY LAB
            </div>
          </div>
        </div>

        <div className="login-card">

          <div className="login-status">
            <span />
            SYSTEM ONLINE
          </div>

          <h1>Welcome back.</h1>

          <p className="login-description">
            Identify the vulnerability.
            <br />
            Fix the logic. Secure the code.
          </p>

          <form onSubmit={handleSubmit}>

            <div className="login-field">
              <label>USERNAME</label>

              <input
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>

            <div className="login-field">
              <label>PASSWORD</label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="login-error">
                <span>!</span>
                {error}
              </div>
            )}

            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "AUTHENTICATING..." : "ENTER LAB"}
              {!loading && <span>→</span>}
            </button>

          </form>

          <div className="login-footer">
            <span>AUTHENTICATED ACCESS</span>
            <span>•</span>
            <span>LOGIC LEAK v2.0</span>
          </div>

        </div>

      </section>

    </main>
  )
}

export default Login