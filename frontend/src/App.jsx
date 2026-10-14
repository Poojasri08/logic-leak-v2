import {
  useEffect,
  useState,
} from "react"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Dashboard from "./pages/Dashboard"
import Challenge from "./pages/Challenge"
import { apiRequest } from "./api"

function App() {
  const [page, setPage] = useState("login")
  const [sessionStatus, setSessionStatus] =
    useState("checking")
  const [user, setUser] = useState(null)
  const [notice, setNotice] = useState(null)
  const [retryCount, setRetryCount] =
    useState(0)

  useEffect(() => {
    let cancelled = false

    async function checkSession() {
      try {
        const data = await apiRequest(
          "/api/auth/me"
        )

        if (cancelled) {
          return
        }

        setUser(data.user)
        setPage("dashboard")
        setSessionStatus("ready")
      } catch (error) {
        if (cancelled) {
          return
        }

        if (error?.status === 401) {
          setUser(null)
          setPage("login")
          setSessionStatus("ready")
          return
        }

        setSessionStatus("error")
      }
    }

    checkSession()

    return () => {
      cancelled = true
    }
  }, [retryCount])

  function handleLogin(loggedInUser) {
    setUser(loggedInUser)
    setNotice(null)
    setPage("dashboard")
  }

  function handleSignup() {
    setNotice({
      type: "success",
      message:
        "Account created. Please log in.",
    })

    setPage("login")
  }

  async function handleLogout() {
    try {
      await apiRequest(
        "/api/auth/logout",
        {
          method: "POST",
        }
      )
    } catch {
      // Clear local state even if the server
      // cannot be reached.
    } finally {
      setUser(null)
      setNotice(null)
      setPage("login")
    }
  }

  function handleDashboardAuthError() {
    setUser(null)

    setNotice({
      type: "error",
      message:
        "Your session has expired. Please log in again.",
    })

    setPage("login")
  }

  function handleChallenge() {
    setPage("challenge")
  }

  function handleDashboard() {
    setPage("dashboard")
  }

  if (sessionStatus === "checking") {
    return (
      <main className="app-status-page">
        <section className="app-status-card">
          <span className="app-status-eyebrow">
            LOGIC LEAK
          </span>

          <h1>Checking your session</h1>

          <p>
            Verifying your authentication
            session...
          </p>
        </section>
      </main>
    )
  }

  if (sessionStatus === "error") {
    return (
      <main className="app-status-page">
        <section className="app-status-card">
          <span className="app-status-eyebrow">
            CONNECTION ERROR
          </span>

          <h1>Could not reach the server</h1>

          <p>
            Your progress is safe. The backend
            is not responding right now.
          </p>

          <div className="app-status-actions">
            <button
              type="button"
              className="app-status-primary"
              onClick={() =>
                setRetryCount(
                  (count) => count + 1
                )
              }
            >
              Try again
            </button>

            <button
              type="button"
              className="app-status-secondary"
              onClick={handleLogout}
            >
              Log out
            </button>
          </div>
        </section>
      </main>
    )
  }

  if (page === "login") {
    return (
      <Login
        onLogin={handleLogin}
        onSignup={() => {
          setNotice(null)
          setPage("signup")
        }}
        notice={notice}
      />
    )
  }

  if (page === "signup") {
    return (
      <Signup
        onSignup={handleSignup}
        onLogin={() => {
          setNotice(null)
          setPage("login")
        }}
      />
    )
  }

  if (page === "dashboard") {
    return (
      <Dashboard
        username={user?.username || ""}
        onChallenge={handleChallenge}
        onLogout={handleLogout}
        onAuthError={
          handleDashboardAuthError
        }
      />
    )
  }

  if (page === "challenge") {
    return (
      <Challenge
        onLogout={handleLogout}
        onBack={handleDashboard}
      />
    )
  }

  return null
}

export default App