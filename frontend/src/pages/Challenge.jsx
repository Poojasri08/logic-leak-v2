import { useState } from "react"
import challenges from "../data/challenges"

function Challenge() {
  const [challengeIndex, setChallengeIndex] = useState(0)

  const challenge = challenges[challengeIndex]

  const [answer, setAnswer] = useState("")
  const [result, setResult] = useState(null)
  const [tier, setTier] = useState(1)
  const [score, setScore] = useState(0)

  const [tier2Explanation, setTier2Explanation] = useState("")
  const [tier2Fix, setTier2Fix] = useState("")
  const [tier3Answer, setTier3Answer] = useState("")

  function handleSubmit(event) {
    event.preventDefault()

    const normalizedAnswer = answer.trim().toLowerCase()

    if (!normalizedAnswer) {
      setResult("Please enter your finding.")
      return
    }

    if (normalizedAnswer === challenge.tier1.answer) {
      setScore(challenge.tier1.points)
      setResult("Correct. Tier 2 unlocked.")
      setTier(2)
    } else {
      setResult("Not quite. Review the code and try again.")
    }
  }

  function handleTier2Submit(event) {
    event.preventDefault()

    const explanation = tier2Explanation.trim().toLowerCase()
    const fix = tier2Fix.trim().toLowerCase()

    if (!explanation || !fix) {
      setResult("Please complete both answers.")
      return
    }

    const knowsSqlInjection =
      explanation.includes("sql injection")

    const knowsSecureFix =
      fix.includes("parameterized query") ||
      fix.includes("prepared statement")

    if (knowsSqlInjection && knowsSecureFix) {
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

    const normalizedAnswer = tier3Answer.trim().toLowerCase()

    if (!normalizedAnswer) {
      setResult("Please enter your answer.")
      return
    }

    const hasNegative =
      normalizedAnswer.includes("negative")

    const hasValidation =
      normalizedAnswer.includes("validation") ||
      normalizedAnswer.includes("validate")

    if (hasNegative && hasValidation) {
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
      setChallengeIndex((previousIndex) => previousIndex + 1)

      setTier(1)
      setAnswer("")
      setTier2Explanation("")
      setTier2Fix("")
      setTier3Answer("")
      setResult(null)
      setScore(0)
    }
  }

  return (
    <main>
      <h1>Challenge {challenge.id}</h1>

      <p>Can You Spot the Leak?</p>

      <p>
        Tier: {tier > 3 ? 3 : tier} / 3 | Score: {score}
      </p>

      <section>
        <h2>{challenge.title}</h2>

        <p>{challenge.description}</p>

        <pre>{challenge.code}</pre>

        {tier === 1 && (
          <form onSubmit={handleSubmit}>
            <label htmlFor="answer">
              What vulnerability do you see?
            </label>

            <input
              id="answer"
              type="text"
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Enter your answer..."
            />

            <button type="submit">
              Submit Finding
            </button>
          </form>
        )}

        {tier === 2 && (
          <section>
            <h2>Tier 2: Explain + Fix</h2>

            <p>{challenge.tier2.question}</p>

            <form onSubmit={handleTier2Submit}>
              <label htmlFor="explanation">
                Why is this code vulnerable?
              </label>

              <textarea
                id="explanation"
                value={tier2Explanation}
                onChange={(event) =>
                  setTier2Explanation(event.target.value)
                }
                placeholder="Explain the vulnerability..."
                rows="5"
              />

              <label htmlFor="fix">
                How would you fix it?
              </label>

              <textarea
                id="fix"
                value={tier2Fix}
                onChange={(event) =>
                  setTier2Fix(event.target.value)
                }
                placeholder="Describe the secure fix..."
                rows="5"
              />

              <button type="submit">
                Submit Tier 2
              </button>
            </form>
          </section>
        )}

        {tier === 3 && (
          <section>
            <h2>Tier 3: Edge Case</h2>

            <p>{challenge.tier3.question}</p>

            <form onSubmit={handleTier3Submit}>
              <label htmlFor="tier3Answer">
                Your answer
              </label>

              <textarea
                id="tier3Answer"
                value={tier3Answer}
                onChange={(event) =>
                  setTier3Answer(event.target.value)
                }
                placeholder="Explain the edge case and how to handle it..."
                rows="6"
              />

              <button type="submit">
                Submit Tier 3
              </button>
            </form>
          </section>
        )}

        {tier === 4 && (
          <section>
            <h2>Challenge Complete!</h2>

            <p>You completed all three tiers.</p>

            <p>Final Score: {score} / 100</p>

            {challengeIndex < challenges.length - 1 && (
              <button onClick={handleNextChallenge}>
                Next Challenge
              </button>
            )}

            {challengeIndex === challenges.length - 1 && (
              <p>You completed all available challenges.</p>
            )}
          </section>
        )}

        {result && <p>{result}</p>}
      </section>
    </main>
  )
}

export default Challenge