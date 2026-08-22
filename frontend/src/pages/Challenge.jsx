import { useState } from "react"
import challenges from "../data/challenges"

function Challenge() {
  const challenge = challenges[0]
  const [answer, setAnswer] = useState("")
  const [result, setResult] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()

    const normalizedAnswer = answer.trim().toLowerCase()

    if (!normalizedAnswer) {
      setResult("Please enter your finding.")
      return
    }

    if (challenge.correctAnswers.includes(normalizedAnswer)) {
      setResult("Correct. You spotted the vulnerability.")
    } else {
      setResult("Not quite. Review the code and try again.")
    }
  }

  return (
    <main>
      <h1>Challenge {challenge.id}</h1>

      <p>Can You Spot the Leak?</p>

      <section>
        <h2>{challenge.title}</h2>

        <p>{challenge.description}</p>

        <pre>{challenge.code}</pre>

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

          <button type="submit">Submit Finding</button>
        </form>

        {result && <p>{result}</p>}
      </section>
    </main>
  )
}

export default Challenge