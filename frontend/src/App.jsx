import { useState } from "react"
import Challenge from "./pages/Challenge"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import "./App.css"

function App() {
  const [loggedIn, setLoggedIn] = useState(
    !!localStorage.getItem("logicLeakToken")
  )

  const [showSignup, setShowSignup] = useState(false)

  function handleLogin() {
    setLoggedIn(true)
  }

  function handleLogout() {
    localStorage.removeItem("logicLeakToken")
    localStorage.removeItem("logicLeakUsername")
    setLoggedIn(false)
  }

  function handleSignupSuccess() {
    setShowSignup(false)
  }

  if (!loggedIn) {
    if (showSignup) {
      return (
        <Signup
          onSignup={handleSignupSuccess}
          onBackToLogin={() => setShowSignup(false)}
        />
      )
    }

    return (
      <Login
        onLogin={handleLogin}
        onSignup={() => setShowSignup(true)}
      />
    )
  }

  return (
    <Challenge
      username={localStorage.getItem("logicLeakUsername")}
      onLogout={handleLogout}
    />
  )
}

export default App