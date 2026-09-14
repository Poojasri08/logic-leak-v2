const express = require("express")
const cors = require("cors")
const challenges = require("./challenges")
const db = require("./database")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
require("dotenv").config()

const app = express()
const PORT = 5000
const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing")
}

app.use(cors())
app.use(express.json())

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({
      message: "Access token required",
    })
  }

  const parts = authHeader.split(" ")

  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      message: "Invalid authorization format",
    })
  }

  const token = parts[1]

  if (!token) {
    return res.status(401).json({
      message: "Access token required",
    })
  }

  jwt.verify(
    token,
    JWT_SECRET,
    (error, user) => {
      if (error) {
        return res.status(403).json({
          message: "Invalid or expired token",
        })
      }

      console.log("JWT user:", user)

      // ========================================
      // DAY 14 SECURITY:
      // VERIFY USER STILL EXISTS
      // ========================================

      const existingUser = db.prepare(`
        SELECT id, username
        FROM users
        WHERE id = ?
      `).get(user.userId)

      if (!existingUser) {
        return res.status(403).json({
          message: "Authenticated user not found",
        })
      }

      // Use the database identity instead of
      // trusting username data stored in the JWT.
      req.user = {
        userId: existingUser.id,
        username: existingUser.username,
      }

      next()
    }
  )
}

// ========================================
// HOME
// ========================================

app.get("/", (req, res) => {
  res.json({
    message: "Logic Leak API is running",
  })
})

// ========================================
// GET ALL CHALLENGES
// ========================================

app.get("/api/challenges", (req, res) => {
  const safeChallenges = challenges.map(
    (challenge) => ({
      id: challenge.id,
      title: challenge.title,
      difficulty: challenge.difficulty,
      code: challenge.code,
      description: challenge.description || "",

      tier1: {
        question: challenge.tier1.question,
        points: challenge.tier1.points,
      },

      tier2: {
        question: challenge.tier2.question,
        points: challenge.tier2.points,
      },

      tier3: {
        question: challenge.tier3.question,
        points: challenge.tier3.points,
      },
    })
  )

  res.json(safeChallenges)
})

// ========================================
// GET ONE CHALLENGE
// ========================================

app.get("/api/challenges/:id", (req, res) => {
  const challengeId = Number(req.params.id)

  if (!Number.isInteger(challengeId)) {
    return res.status(400).json({
      message: "Invalid challenge ID",
    })
  }

  const challenge = challenges.find(
    (item) => item.id === challengeId
  )

  if (!challenge) {
    return res.status(404).json({
      message: "Challenge not found",
    })
  }

  res.json({
    id: challenge.id,
    title: challenge.title,
    difficulty: challenge.difficulty,
    code: challenge.code,
    description: challenge.description || "",

    tier1: {
      question: challenge.tier1.question,
      points: challenge.tier1.points,
    },

    tier2: {
      question: challenge.tier2.question,
      points: challenge.tier2.points,
    },

    tier3: {
      question: challenge.tier3.question,
      points: challenge.tier3.points,
    },
  })
})

// ========================================
// SUBMIT ANSWER
// ========================================

app.post(
  "/api/challenges/:id/answer",
  authenticateToken,
  (req, res) => {
    try {
      const userId = Number(req.user.userId)
      const challengeId = Number(req.params.id)

      if (!Number.isInteger(userId) || userId <= 0) {
        return res.status(401).json({
          message: "Invalid authenticated user",
        })
      }

      if (!Number.isInteger(challengeId) || challengeId <= 0) {
        return res.status(400).json({
          message: "Invalid challenge ID",
        })
      }

      const {
        tier,
        step,
        answer,
      } = req.body

      // ========================================
      // FIND CHALLENGE
      // ========================================

      const challenge = challenges.find(
        (item) => item.id === challengeId
      )

      if (!challenge) {
        return res.status(404).json({
          message: "Challenge not found",
        })
      }

      // ========================================
      // BASIC INPUT VALIDATION
      // ========================================

      if (
        answer === undefined ||
        answer === null ||
        tier === undefined ||
        tier === null
      ) {
        return res.status(400).json({
          message: "Tier and answer are required",
        })
      }

      const tierNumber = Number(tier)

      const stepNumber =
        step === undefined || step === null
          ? null
          : Number(step)

      if (
        !Number.isInteger(tierNumber) ||
        tierNumber < 1 ||
        tierNumber > 3
      ) {
        return res.status(400).json({
          message: "Invalid tier",
        })
      }

      if (
        tierNumber === 2 &&
        stepNumber !== 1 &&
        stepNumber !== 2
      ) {
        return res.status(400).json({
          message: "Invalid Tier 2 step",
        })
      }

      if (
        tierNumber !== 2 &&
        stepNumber !== null
      ) {
        return res.status(400).json({
          message: "Step is only valid for Tier 2",
        })
      }

      const userAnswer =
        String(answer).trim().toLowerCase()

      if (!userAnswer) {
        return res.status(400).json({
          message: "Answer cannot be empty",
        })
      }

      // ========================================
      // GET CURRENT CHALLENGE PROGRESS
      // ========================================

      const existingProgress = db.prepare(`
        SELECT
          id,
          score,
          completed,
          tier1_completed,
          tier2_completed,
          tier3_completed
        FROM progress
        WHERE user_id = ?
          AND challenge_id = ?
      `).get(
        userId,
        challengeId
      )

      // ========================================
      // SECURITY: CHALLENGE ORDER
      // ========================================

      if (challengeId > 1) {
        const previousChallenge =
          db.prepare(`
            SELECT completed
            FROM progress
            WHERE user_id = ?
              AND challenge_id = ?
          `).get(
            userId,
            challengeId - 1
          )

        if (
          !previousChallenge ||
          previousChallenge.completed !== 1
        ) {
          return res.status(403).json({
            correct: false,
            points: 0,
            message:
              `Complete Challenge ${challengeId - 1} first`,
          })
        }
      }

      // ========================================
      // SECURITY: TIER ORDER
      // ========================================

      if (tierNumber === 2) {
        if (
          !existingProgress ||
          existingProgress.tier1_completed !== 1
        ) {
          return res.status(403).json({
            correct: false,
            points: 0,
            message: "Complete Tier 1 first",
          })
        }
      }

      if (tierNumber === 3) {
        if (
          !existingProgress ||
          existingProgress.tier1_completed !== 1 ||
          existingProgress.tier2_completed !== 1
        ) {
          return res.status(403).json({
            correct: false,
            points: 0,
            message:
              "Complete Tier 1 and Tier 2 first",
          })
        }
      }

      // ========================================
      // PREVENT REPEATED REWARDS
      // ========================================

      if (existingProgress) {
        if (
          tierNumber === 1 &&
          existingProgress.tier1_completed === 1
        ) {
          return res.json({
            correct: true,
            points: 0,
            message: "Tier 1 already completed",
          })
        }

        if (
          tierNumber === 2 &&
          stepNumber === 2 &&
          existingProgress.tier2_completed === 1
        ) {
          return res.json({
            correct: true,
            points: 0,
            message: "Tier 2 already completed",
          })
        }

        if (
          tierNumber === 3 &&
          existingProgress.tier3_completed === 1
        ) {
          return res.json({
            correct: true,
            points: 0,
            message: "Tier 3 already completed",
          })
        }
      }

      // ========================================
      // CHECK ANSWER
      // ========================================

      let correct = false
      let points = 0
      let tierColumn = null

      // ========================================
      // TIER 1
      // ========================================

      if (tierNumber === 1) {
        tierColumn = "tier1_completed"

        correct =
          userAnswer ===
          String(
            challenge.tier1.answer
          ).trim().toLowerCase()

        if (correct) {
          points = Number(
            challenge.tier1.points
          )
        }
      }

      // ========================================
      // TIER 2
      // ========================================

      else if (tierNumber === 2) {
        tierColumn = "tier2_completed"

        // --------------------------------
        // STEP 1
        // --------------------------------

        if (stepNumber === 1) {
          const expectedKeywords =
            challenge.tier2.expectedKeywords || []

          const keyword =
            String(
              expectedKeywords[0] || ""
            ).toLowerCase()

          if (!keyword) {
            return res.status(500).json({
              message:
                "Tier 2 configuration error",
            })
          }

          correct =
            userAnswer.includes(keyword)

          points = 0
        }

        // --------------------------------
        // STEP 2
        // --------------------------------

        if (stepNumber === 2) {
          const expectedKeywords =
            challenge.tier2.expectedKeywords || []

          const keywords =
            expectedKeywords.slice(1)

          correct =
            keywords.length > 0 &&
            keywords.some(
              (keyword) =>
                userAnswer.includes(
                  String(keyword).toLowerCase()
                )
            )

          if (correct) {
            points = Number(
              challenge.tier2.points
            )
          }
        }
      }

      // ========================================
      // TIER 3
      // ========================================

      else if (tierNumber === 3) {
        tierColumn = "tier3_completed"

        const keywords =
          challenge.tier3.expectedKeywords || []

        correct =
          keywords.length > 0 &&
          keywords.every(
            (keyword) =>
              userAnswer.includes(
                String(keyword).toLowerCase()
              )
          )

        if (correct) {
          points = Number(
            challenge.tier3.points
          )
        }
      }

      // ========================================
      // POINT VALIDATION
      // ========================================

      if (
        !Number.isFinite(points) ||
        points < 0
      ) {
        return res.status(500).json({
          message:
            "Challenge point configuration error",
        })
      }

      // ========================================
      // WRONG ANSWER
      // ========================================

      if (!correct) {
        return res.json({
          correct: false,
          points: 0,
        })
      }

      // ========================================
      // CREATE PROGRESS
      // ========================================

      if (!existingProgress) {
        let tier1Completed = 0
        let tier2Completed = 0
        let tier3Completed = 0

        if (
          tierColumn === "tier1_completed"
        ) {
          tier1Completed = 1
        }

        if (
          tierColumn === "tier2_completed" &&
          tierNumber === 2 &&
          stepNumber === 2
        ) {
          tier2Completed = 1
        }

        if (
          tierColumn === "tier3_completed"
        ) {
          tier3Completed = 1
        }

        const completed =
          tier1Completed === 1 &&
          tier2Completed === 1 &&
          tier3Completed === 1
            ? 1
            : 0

        db.prepare(`
          INSERT INTO progress (
            user_id,
            challenge_id,
            score,
            completed,
            tier1_completed,
            tier2_completed,
            tier3_completed
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          userId,
          challengeId,
          points,
          completed,
          tier1Completed,
          tier2Completed,
          tier3Completed
        )
      }

      // ========================================
      // UPDATE EXISTING PROGRESS
      // ========================================

      else {
        let tier1Completed =
          Number(
            existingProgress.tier1_completed
          )

        let tier2Completed =
          Number(
            existingProgress.tier2_completed
          )

        let tier3Completed =
          Number(
            existingProgress.tier3_completed
          )

        if (
          tierNumber === 1 &&
          correct
        ) {
          tier1Completed = 1
        }

        if (
          tierNumber === 2 &&
          stepNumber === 2 &&
          correct
        ) {
          tier2Completed = 1
        }

        if (
          tierNumber === 3 &&
          correct
        ) {
          tier3Completed = 1
        }

        const completed =
          tier1Completed === 1 &&
          tier2Completed === 1 &&
          tier3Completed === 1
            ? 1
            : 0

        db.prepare(`
          UPDATE progress
          SET
            score = score + ?,
            completed = ?,
            tier1_completed = ?,
            tier2_completed = ?,
            tier3_completed = ?
          WHERE id = ?
        `).run(
          points,
          completed,
          tier1Completed,
          tier2Completed,
          tier3Completed,
          Number(existingProgress.id)
        )
      }

      // ========================================
      // SUCCESS RESPONSE
      // ========================================

      return res.json({
        correct: true,
        points,
      })

    } catch (error) {
      console.error(
        "Submit answer error:",
        error
      )

      return res.status(500).json({
        message: "Internal server error",
      })
    }
  }
)

// ========================================
// SIGN UP
// ========================================

app.post(
  "/api/auth/signup",
  async (req, res) => {
    const {
      username,
      password,
    } = req.body

    if (!username || !password) {
      return res.status(400).json({
        message:
          "Username and password are required",
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters",
      })
    }

    try {
      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        )

      const result =
        db.prepare(`
          INSERT INTO users
          (username, password)
          VALUES (?, ?)
        `).run(
          username,
          hashedPassword
        )

      return res.status(201).json({
        message:
          "Account created successfully",
        userId:
          result.lastInsertRowid,
      })

    } catch (error) {
      console.error(
        "Signup error:",
        error
      )

      return res.status(400).json({
        message:
          "Username already exists",
      })
    }
  }
)

// ========================================
// LOGIN
// ========================================

app.post(
  "/api/auth/login",
  async (req, res) => {
    try {
      const {
        username,
        password,
      } = req.body

      if (!username || !password) {
        return res.status(400).json({
          message:
            "Username and password are required",
        })
      }

      const user =
        db.prepare(`
          SELECT
            id,
            username,
            password
          FROM users
          WHERE username = ?
        `).get(username)

      if (!user) {
        return res.status(401).json({
          message:
            "Invalid username or password",
        })
      }

      const passwordMatch =
        await bcrypt.compare(
          password,
          user.password
        )

      if (!passwordMatch) {
        return res.status(401).json({
          message:
            "Invalid username or password",
        })
      }

      const token =
        jwt.sign(
          {
            userId: user.id,
            username: user.username,
          },
          JWT_SECRET,
          {
            expiresIn: "1h",
          }
        )

      return res.json({
        message:
          "Login successful",
        token,
        userId:
          user.id,
        username:
          user.username,
      })

    } catch (error) {
      console.error(
        "Login error:",
        error
      )

      return res.status(500).json({
        message: "Internal server error",
      })
    }
  }
)

// ========================================
// CURRENT USER
// ========================================

app.get(
  "/api/auth/me",
  authenticateToken,
  (req, res) => {
    res.json({
      message:
        "Authenticated successfully",
      user: req.user,
    })
  }
)

// ========================================
// USER PROGRESS
// ========================================

app.get(
  "/api/progress",
  authenticateToken,
  (req, res) => {
    try {
      const progress =
        db.prepare(`
          SELECT
            challenge_id,
            score,
            completed,
            tier1_completed,
            tier2_completed,
            tier3_completed
          FROM progress
          WHERE user_id = ?
          ORDER BY challenge_id
        `).all(
          req.user.userId
        )

      res.json({
        userId:
          req.user.userId,
        username:
          req.user.username,
        progress,
      })

    } catch (error) {
      console.error(
        "Progress error:",
        error
      )

      res.status(500).json({
        message:
          "Unable to retrieve progress",
      })
    }
  }
)

// ========================================
// SECURITY: GLOBAL ERROR HANDLER
// ========================================

app.use((error, req, res, next) => {
  // Handle malformed JSON without exposing
  // internal stack traces or file paths.
  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    "body" in error
  ) {
    return res.status(400).json({
      message: "Invalid JSON payload",
    })
  }

  // Log technical details on the server only.
  console.error(
    "Unhandled server error:",
    error
  )

  return res.status(500).json({
    message: "Internal server error",
  })
})

// ========================================
// START SERVER
// ========================================

app.listen(
  PORT,
  () => {
    console.log(
      "Database connected successfully"
    )

    console.log(
      `Logic Leak API running on http://localhost:${PORT}`
    )
  }
)