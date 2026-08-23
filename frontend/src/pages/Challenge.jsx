import { useState } from "react"
import challenges from "../data/challenges"

function containsKeyword(text, keywords) {
  const normalizedText = text.trim().toLowerCase()

  return keywords.some((keyword) =>
    normalizedText.includes(keyword.toLowerCase())
  )
}

function Challenge() {
  const [challengeIndex, setChallengeIndex] = useState(0)
  const [answer, setAnswer] = useState("")
  const [result, setResult] = useState(null)
  const [tier, setTier] = useState(1)
  const [score, setScore] = useState(0)

  const [tier2Explanation, setTier2Explanation] = useState("")
  const [tier2Fix, setTier2Fix] = useState("")
  const [tier3Answer, setTier3Answer] = useState("")

  const challenge = challenges[challengeIndex]

  function handleSubmit(event) {
    event.preventDefault()

    const normalizedAnswer = answer.trim().toLowerCase()

    if (!normalizedAnswer) {
      setResult("Please enter your finding.")
      return
    }

    if (
      normalizedAnswer ===
      challenge.tier1.answer.trim().toLowerCase()
    ) {
      setScore(
        (previousScore) =>
          previousScore + challenge.tier1.points
      )

      setResult("Correct. Tier 2 unlocked.")
      setTier(2)
    } else {
      setResult("Not quite. Review the code and try again.")
    }
  }

  function handleTier2Submit(event) {
    event.preventDefault()

    const explanation = tier2Explanation.trim()
    const fix = tier2Fix.trim()

    if (!explanation || !fix) {
      setResult("Please complete both answers.")
      return
    }

    const vulnerabilityKeyword =
      challenge.tier2.expectedKeywords[0]

    const fixKeywords =
      challenge.tier2.expectedKeywords.slice(1)

    const knowsVulnerability = containsKeyword(
      explanation,
      [vulnerabilityKeyword]
    )

    const knowsSecureFix = containsKeyword(
      fix,
      fixKeywords
    )

    if (knowsVulnerability && knowsSecureFix) {
      setScore(
        (previousScore) =>
          previousScore + challenge.tier2.points
      )

      setResult("Correct. Tier 3 unlocked.")
      setTier(3)
    } else {
      setResult(
        "Your explanation or fix is incomplete. Try again."
      )
    }
  }

  function handleTier3Submit(event) {
    event.preventDefault()

    const normalizedAnswer = tier3Answer.trim()

    if (!normalizedAnswer) {
      setResult("Please enter your answer.")
      return
    }

    const hasRequiredKeywords =
      challenge.tier3.expectedKeywords.every(
        (keyword) =>
          normalizedAnswer
            .toLowerCase()
            .includes(keyword.toLowerCase())
      )

    if (hasRequiredKeywords) {
      setScore(
        (previousScore) =>
          previousScore + challenge.tier3.points
      )

      setResult("Excellent. Challenge completed!")
      setTier(4)
    } else {
      setResult(
        "Your answer is incomplete. Think about the edge case and validation."
      )
    }
  }

  function handleNextChallenge() {
    if (challengeIndex < challenges.length - 1) {
      setChallengeIndex(
        (previousIndex) => previousIndex + 1
      )

      setTier(1)
      setAnswer("")
      setTier2Explanation("")
      setTier2Fix("")
      setTier3Answer("")
      setResult(null)
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
              / {String(challenges.length).padStart(2, "0")}
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
            {challenge.code
              .split("\n")
              .map((_, index) => (
                <span key={index}>
                  {String(index + 1).padStart(2, "0")}
                </span>
              ))}
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

            <h3>
              Identify the vulnerability
            </h3>

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

            <h3>
              Explain the vulnerability and fix
            </h3>

            <p className="hint">
              Explain why the vulnerability exists and
              describe a secure solution.
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
              rows="5"
            />

            <label>
              How would you fix it?
            </label>

            <textarea
              value={tier2Fix}
              onChange={(event) =>
                setTier2Fix(event.target.value)
              }
              placeholder="Describe the secure fix..."
              rows="5"
            />

            <button type="submit">
              <span>Submit Tier 2</span>
              <span>→</span>
            </button>
          </form>
        )}

        {tier === 3 && (
          <form onSubmit={handleTier3Submit}>
            <span className="question-number">
              TIER 03
            </span>

            <h3>
              Think about the edge case
            </h3>

            <p className="hint">
              Security problems often hide in unexpected
              input and boundary conditions.
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

            <h3>
              Vulnerability identified.
            </h3>

            <p>
              You completed all three tiers of this
              challenge.
            </p>

            <div className="final-score">
              <span>FINAL SCORE</span>

              <strong>
                {score}
                <small> / 300</small>
              </strong>
            </div>

            {challengeIndex <
              challenges.length - 1 && (
              <button onClick={handleNextChallenge}>
                <span>Next Challenge</span>
                <span>→</span>
              </button>
            )}

            {challengeIndex ===
              challenges.length - 1 && (
              <p className="all-complete">
                All available challenges completed.
              </p>
            )}
          </div>
        )}

        {result && (
          <div className="result">
            <span>●</span>
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