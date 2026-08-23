import Challenge from "./pages/Challenge"
import "./App.css"

function App() {
  return (
    <div className="app">
      <div className="app-container">
        <nav className="navbar">
          <div className="logo">
            Logic <span>Leak</span>
          </div>

          <div className="score-display">
            🔐 Secure Code Review
          </div>
        </nav>

        <Challenge />
      </div>
    </div>
  )
}

export default App