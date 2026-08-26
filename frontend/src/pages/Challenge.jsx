import { useEffect, useState } from "react"

const API_URL = "http://localhost:5000"

function Challenge() {
  const [challengeIndex, setChallengeIndex] = useState(0)
  const [answer, setAnswer] = useState("")
  const [result, setResult] = useState(null)
  const [resultType, setResultType] = useState("")
  const [tier, setTier] = useState(1)

  // Overall score from backend
  const [score, setScore] = useState(0)

  const [apiChallenges, setApiChallenges] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState("")

  const [tier2Explanation, setTier2Explanation] = useState("")
  const [tier2Fix, setTier2Fix] = useState("")
  const [tier2Step, setTier2Step] = useState(1)
  const [tier3Answer, setTier3Answer] = useState("")

  function getToken() {
    return localStorage.getItem("logicLeakToken")
  }

  function getAuthHeaders() {
    const token = getToken()

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }
  }

  // Load challenges
  useEffect(() => {
    fetch(`${API_URL}/api/challenges`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch challenges")
        }

        return response.json()
      })
      .then((data) => {
        setApiChallenges(data)
        setLoading(false)
      })
      .catch((error) => {
        console.error("API error:", error)
        setApiError(error.message)
        setLoading(false)
      })
  }, [])

  // Load TOTAL score from backend
  useEffect(() => {
    const token = getToken()

    if (!token || apiChallenges.length === 0) {
      return
    }

    fetch(`${API_URL}/api/progress`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch progress")
        }

        return response.json()
      })
      .then((data) => {
        const total = (data.progress || []).reduce(
          (sum, item) => sum + Number(item.score || 0),
          0
        )

        setScore(total)
      })
      .catch((error) => {
        console.error("Progress error:", error)
      })
  }, [apiChallenges, challengeIndex])

  if (loading) {
    return (
      <div className="challenge-page">
        Loading challenges...
      </div>
    )
  }

  if (apiError) {
    return (
      <div className="challenge-page">
        Frontend API Error: {apiError}
      </div>
    )
  }

  if (apiChallenges.length === 0) {
    return (
      <div className="challenge-page">
        No challenges available.
      </div>
    )
  }

  const challenge = apiChallenges[challengeIndex]

  function showResult(message, type) {
    setResult(message)
    setResultType(type)
  }

  function handleAuthError(data) {
    if (
      data.message === "Access token required" ||
      data.message === "Invalid or expired token"
    ) {
      showResult(
        "Your session has expired. Please log in again.",
        "error"
      )

      return true
    }

    return false
  }

  // TIER 1
  async function handleSubmit(event) {
    event.preventDefault()

    const normalizedAnswer = answer.trim()

    if (!normalizedAnswer) {
      showResult("Please enter your finding.", "error")
      return
    }

    if (!getToken()) {
      showResult(
        "You are not logged in. Please log in again.",
        "error"
      )
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/api/challenges/${challenge.id}/answer`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            tier: 1,
            answer: normalizedAnswer,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        if (handleAuthError(data)) {
          return
        }

        throw new Error(data.message || "Validation failed")
      }

      if (data.correct) {
        showResult(
          `Correct. +${data.points} points. Tier 2 unlocked.`,
          "success"
        )

        setTier(2)
        setTier2Step(1)

        // Reload authoritative backend score
        loadProgress()
      } else {
        showResult(
          "Not quite. Review the code and try again.",
          "error"
        )
      }
    } catch (error) {
      console.error("Tier 1 validation error:", error)

      showResult(
        "Unable to validate your answer. Please try again.",
        "error"
      )
    }
  }

  // TIER 2
  async function handleTier2Submit(event) {
    event.preventDefault()

    const currentAnswer =
      tier2Step === 1
        ? tier2Explanation.trim()
        : tier2Fix.trim()

    if (!currentAnswer) {
      showResult(
        tier2Step === 1
          ? "Please explain why the code is vulnerable."
          : "Please describe how you would fix it.",
        "error"
      )

      return
    }

    if (!getToken()) {
      showResult(
        "You are not logged in. Please log in again.",
        "error"
      )

      return
    }

    try {
      const response = await fetch(
        `${API_URL}/api/challenges/${challenge.id}/answer`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            tier: 2,
            step: tier2Step,
            answer: currentAnswer,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        if (handleAuthError(data)) {
          return
        }

        throw new Error(data.message || "Validation failed")
      }

      if (!data.correct) {
        showResult(
          tier2Step === 1
            ? "Your explanation does not identify the vulnerability correctly."
            : "Your fix is incomplete. Use a parameterized query or prepared statement.",
          "error"
        )

        return
      }

      if (tier2Step === 1) {
        showResult(
          "Correct. Now explain how you would fix it.",
          "success"
        )

        setTier2Step(2)
        return
      }

      showResult(
        `Correct. +${data.points} points. Tier 3 unlocked.`,
        "success"
      )

      setTier(3)

      // Reload authoritative backend score
      loadProgress()
    } catch (error) {
      console.error("Tier 2 validation error:", error)

      showResult(
        "Unable to validate your answer. Please try again.",
        "error"
      )
    }
  }

  // TIER 3
  async function handleTier3Submit(event) {
    event.preventDefault()

    const currentAnswer = tier3Answer.trim()

    if (!currentAnswer) {
      showResult("Please enter your answer.", "error")
      return
    }

    if (!getToken()) {
      showResult(
        "You are not logged in. Please log in again.",
        "error"
      )

      return
    }

    try {
      const response = await fetch(
        `${API_URL}/api/challenges/${challenge.id}/answer`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            tier: 3,
            answer: currentAnswer,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        if (handleAuthError(data)) {
          return
        }

        throw new Error(data.message || "Validation failed")
      }

      if (data.correct) {
        showResult(
          `Excellent. +${data.points} points. Challenge completed!`,
          "success"
        )

        setTier(4)

        // Reload authoritative backend score
        loadProgress()
      } else {
        showResult(
          "Your answer is incomplete. Think about the edge case and validation.",
          "error"
        )
      }
    } catch (error) {
      console.error("Tier 3 validation error:", error)

      showResult(
        "Unable to validate your answer. Please try again.",
        "error"
      )
    }
  }

  // Load total score from backend
  async function loadProgress() {
    const token = getToken()

    if (!token) {
      return
    }

    try {
      const response = await fetch(
        `${API_URL}/api/progress`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        return
      }

      const data = await response.json()

      const total = (data.progress || []).reduce(
        (sum, item) => sum + Number(item.score || 0),
        0
      )

      setScore(total)
    } catch (error) {
      console.error("Progress error:", error)
    }
  }

  // NEXT CHALLENGE
  function handleNextChallenge() {
    if (challengeIndex < apiChallenges.length - 1) {
      setChallengeIndex(
        (previousIndex) => previousIndex + 1
      )

      setTier(1)
      setAnswer("")
      setTier2Explanation("")
      setTier2Fix("")
      setTier2Step(1)
      setTier3Answer("")
      setResult(null)
      setResultType("")

      // Keep overall score.
      // Do NOT reset score to zero.
      loadProgress()
    }
  }

  return (
    <div className="challenge-page">

      <header className="brand-header">
        <div className="brand-text">
          <span className="brand-dot" />

          <div>
            <strong>LOGIC LEAK</strong>
            <small>2.0</small>
          </div>
        </div>
      </header>

      <div className="top-bar">
        <div>
          <span className="label">CHALLENGE</span>

          <h1>
            {String(challenge.id).padStart(2, "0")}
            <span>
              {" "}
              / {String(apiChallenges.length).padStart(2, "0")}
            </span>
          </h1>
        </div>

        <div className="score-panel">
          <span className="label">SCORE</span>

          <strong>
            {score}
            <small> / 300</small>
          </strong>
        </div>
      </div>

      <section className="challenge-intro">
        <span className="difficulty">
          {challenge.difficulty}
        </span>

        <h2>{challenge.title}</h2>

        {challenge.description && (
          <p>{challenge.description}</p>
        )}
      </section>

      <div className="tier-progress">

        <div className={tier >= 1 ? "tier active" : "tier"}>
          <span>01</span>

          <div>
            <strong>Find</strong>
            <small>Identify the flaw</small>
          </div>
        </div>

        <div className="progress-line" />

        <div className={tier >= 2 ? "tier active" : "tier"}>
          <span>02</span>

          <div>
            <strong>Explain + Fix</strong>
            <small>Understand the risk</small>
          </div>
        </div>

        <div className="progress-line" />

        <div className={tier >= 3 ? "tier active" : "tier"}>
          <span>03</span>

          <div>
            <strong>Edge Case</strong>
            <small>Think deeper</small>
          </div>
        </div>

      </div>

      <section className="code-section">

        <div className="code-header">
          <div>
            <span className="code-label">
              VULNERABLE CODE
            </span>

            <strong>challenge.js</strong>
          </div>

          <span className="code-language">
            JAVASCRIPT
          </span>
        </div>

        <div className="code-editor">

          <div className="line-numbers">
            {challenge.code.split("\n").map(
              (_, index) => (
                <span key={index}>
                  {String(index + 1).padStart(2, "0")}
                </span>
              )
            )}
          </div>

          <pre>
            <code>{challenge.code}</code>
          </pre>

        </div>
      </section>

      <section className="answer-section">

        {tier === 1 && (
          <form onSubmit={handleSubmit}>

            <span className="question-number">
              TIER 01
            </span>

            <h3>Identify the vulnerability</h3>

            <p className="hint">
              What security flaw is present in this code?
            </p>

            <input
              type="text"
              value={answer}
              onChange={(event) =>
                setAnswer(event.target.value)
              }
              placeholder="Enter vulnerability..."
              autoComplete="off"
            />

            <button type="submit">
              <span>Submit Finding</span>
              <span>→</span>
            </button>

          </form>
        )}

        {tier === 2 && (
          <form onSubmit={handleTier2Submit}>

            <span className="question-number">
              TIER 02
            </span>

            {tier2Step === 1 && (
              <>
                <h3>Explain the vulnerability</h3>

                <p className="hint">
                  Explain why this code is vulnerable.
                </p>

                <label>
                  Why is this code vulnerable?
                </label>

                <textarea
                  value={tier2Explanation}
                  onChange={(event) =>
                    setTier2Explanation(event.target.value)
                  }
                  placeholder="Explain the vulnerability..."
                  rows="6"
                />

                <button type="submit">
                  <span>Continue</span>
                  <span>→</span>
                </button>
              </>
            )}

            {tier2Step === 2 && (
              <>
                <h3>Explain the secure fix</h3>

                <p className="hint">
                  Describe how you would fix this vulnerability securely.
                </p>

                <label>
                  How would you fix it?
                </label>

                <textarea
                  value={tier2Fix}
                  onChange={(event) =>
                    setTier2Fix(event.target.value)
                  }
                  placeholder="Describe the secure fix..."
                  rows="6"
                />

                <button type="submit">
                  <span>Submit Fix</span>
                  <span>→</span>
                </button>
              </>
            )}

          </form>
        )}

        {tier === 3 && (
          <form onSubmit={handleTier3Submit}>

            <span className="question-number">
              TIER 03
            </span>

            <h3>Think about the edge case</h3>

            <p className="hint">
              Security problems often hide in unexpected input and boundary conditions.
            </p>

            <div className="tier-question">
              {challenge.tier3.question}
            </div>

            <textarea
              value={tier3Answer}
              onChange={(event) =>
                setTier3Answer(event.target.value)
              }
              placeholder="Explain the edge case and validation..."
              rows="6"
            />

            <button type="submit">
              <span>Submit Tier 3</span>
              <span>→</span>
            </button>

          </form>
        )}

        {tier === 4 && (
          <div className="completion">

            <div className="completion-icon">
              ✓
            </div>

            <span className="question-number">
              COMPLETE
            </span>

            <h3>Vulnerability identified.</h3>

            <p>
              You completed all three tiers of this challenge.
            </p>

            <div className="final-score">

              <span>CURRENT SCORE</span>

              <strong>
                {score}
                <small> / 300</small>
              </strong>

            </div>

            {challengeIndex < apiChallenges.length - 1 && (
              <button
                type="button"
                onClick={handleNextChallenge}
              >
                <span>Next Challenge</span>
                <span>→</span>
              </button>
            )}

            {challengeIndex === apiChallenges.length - 1 && (
              <div className="all-complete">

                <strong>
                  All challenges completed.
                </strong>

                <span>
                  {apiChallenges.length} / {apiChallenges.length} challenges completed
                </span>

                <span>
                  Final Score: {score} / 300
                </span>

              </div>
            )}

          </div>
        )}

        {result && (
          <div className={`result ${resultType}`}>
            <span>•</span>
            {result}
          </div>
        )}

      </section>

      <footer>
        <span>LOGIC LEAK 2.0</span>
        <span>SECURE CODE REVIEW TRAINING</span>
      </footer>

    </div>
  )
}

export default Challenge