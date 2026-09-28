import { useEffect, useState } from "react"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Dashboard from "./pages/Dashboard"
import Challenge from "./pages/Challenge"

function App() {
  const [page, setPage] = useState("login")
  const [selectedChallenge, setSelectedChallenge] =
    useState(null)

  useEffect(() => {
    const token =
      localStorage.getItem("logicLeakToken")

    if (token) {
      setPage("dashboard")
    }
  }, [])

  function handleLogin() {
    setPage("dashboard")
  }

  function handleSignup() {
    setPage("dashboard")
  }

  function handleLogout() {
    localStorage.removeItem("logicLeakToken")
    localStorage.removeItem("logicLeakUsername")

    setSelectedChallenge(null)
    setPage("login")
  }

  function handleChallenge(challengeId) {
    setSelectedChallenge(challengeId)
    setPage("challenge")
  }

  function handleDashboard() {
    setSelectedChallenge(null)
    setPage("dashboard")
  }

  if (page === "login") {
    return (
      <Login
        onLogin={handleLogin}
        onSignup={() => setPage("signup")}
      />
    )
  }

  if (page === "signup") {
    return (
      <Signup
        onSignup={handleSignup}
        onLogin={() => setPage("login")}
      />
    )
  }

  if (page === "dashboard") {
    return (
      <Dashboard
        onChallenge={handleChallenge}
      />
    )
  }

  if (page === "challenge") {
    return (
      <Challenge
        challengeId={selectedChallenge}
        onBack={handleDashboard}
        onLogout={handleLogout}
      />
    )
  }

  return null
}

export default App