import { useState } from "react"
import Challenge from "./pages/Challenge"
import Login from "./pages/Login"
import "./App.css"

function App() {
  const [loggedIn, setLoggedIn] = useState(
    !!localStorage.getItem("logicLeakToken")
  )

  function handleLogin() {
    setLoggedIn(true)
  }

  function handleLogout() {
    localStorage.removeItem("logicLeakToken")
    localStorage.removeItem("logicLeakUsername")
    setLoggedIn(false)
  }

  if (!loggedIn) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <Challenge
      username={localStorage.getItem("logicLeakUsername")}
      onLogout={handleLogout}
    />
  )
}

export default App