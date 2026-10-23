const express = require("express")
const { rateLimit } = require("express-rate-limit")
const cors = require("cors")
const challenges = require("./challenges")
const db = require("./database")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
require("dotenv").config()

const { getLevelForXp } = require("./progression")
const progressStore = require("./progressStore")

const app = express()
const PORT = process.env.PORT || 5000

const JWT_SECRET = process.env.JWT_SECRET?.trim()
const JWT_ALGORITHM = "HS256"
const JWT_ISSUER = "logic-leak-api"
const JWT_AUDIENCE = "logic-leak-client"
const JWT_EXPIRES_IN = "1h"

const AUTH_COOKIE_NAME = "logic_leak_token"
const AUTH_COOKIE_MAX_AGE = 60 * 60 * 1000

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
  maxAge: AUTH_COOKIE_MAX_AGE,
}

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing")
}

if (JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters")
}

const isTestEnvironment = process.env.NODE_ENV === "test"

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTestEnvironment ? 1000 : 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Please try again later.",
  },
})

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTestEnvironment ? 1000 : 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many signup attempts. Please try again later.",
  },
})

const MAX_ANSWER_LENGTH = 1000
const LEADERBOARD_SIZE = 10

const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:5173"

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
  })
)

app.use(express.json({ limit: "10kb" }))

app.use((req, res, next) => {
  if (
    req.body === undefined ||
    req.body === null ||
    typeof req.body !== "object"
  ) {
    req.body = {}
  }

  next()
})

// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie

  if (!cookieHeader) {
    return null
  }

  const cookies = cookieHeader.split(";")

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=")

    if (separatorIndex === -1) {
      continue
    }

    const key = cookie.slice(0, separatorIndex).trim()

    if (key !== name) {
      continue
    }

    const value = cookie.slice(separatorIndex + 1).trim()

    try {
      return decodeURIComponent(value)
    } catch {
      return null
    }
  }

  return null
}

function requireTrustedOrigin(req, res, next) {
  const origin = req.headers.origin

  if (!origin) {
    return next()
  }

  if (origin !== FRONTEND_ORIGIN) {
    return res.status(403).json({
      message: "Untrusted request origin",
    })
  }

  next()
}

function authenticateToken(req, res, next) {
  const cookieToken = getCookie(
    req,
    AUTH_COOKIE_NAME
  )

  const authHeader = req.headers.authorization

  let token = cookieToken

  /*
   * Bearer authentication remains supported for API-level
   * clients and the existing backend regression suite.
   *
   * Browser authentication uses the HttpOnly cookie.
   */
  if (!token && authHeader) {
    const parts = authHeader.split(" ")

    if (
      parts.length !== 2 ||
      parts[0] !== "Bearer" ||
      !parts[1]
    ) {
      return res.status(401).json({
        message: "Invalid authorization format",
      })
    }

    token = parts[1]
  }

  if (!token) {
    return res.status(401).json({
      message: "Access token required",
    })
  }

  jwt.verify(
    token,
    JWT_SECRET,
    {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    },
    (error, user) => {
      if (error) {
        return res.status(401).json({
          message: "Invalid or expired token",
        })
      }

      if (
        !user ||
        !Number.isInteger(Number(user.userId)) ||
        Number(user.userId) <= 0 ||
        typeof user.username !== "string" ||
        user.username.length === 0
      ) {
        return res.status(401).json({
          message: "Invalid token payload",
        })
      }

      const existingUser = db.prepare(`
        SELECT id, username
        FROM users
        WHERE id = ?
      `).get(user.userId)

      if (!existingUser) {
        return res.status(401).json({
          message: "Authenticated user not found",
        })
      }

      req.user = {
        userId: existingUser.id,
        username: existingUser.username,
      }

      next()
    }
  )
}

// ========================================
// ANSWER CHECKING HELPERS
// ========================================

function normalizeAnswer(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function countWords(normalized) {
  return normalized
    ? normalized.split(" ").length
    : 0
}

function findMisconception(list, normalized) {
  if (!Array.isArray(list)) {
    return null
  }

  const hit = list.find((item) =>
    item.pattern.test(normalized)
  )

  return hit ? hit.message : null
}

function checkGroups(normalized, groups) {
  if (
    !Array.isArray(groups) ||
    groups.length === 0
  ) {
    throw new Error("Answer groups are not configured")
  }

  for (const group of groups) {
    const matched = group.patterns.some((pattern) =>
      pattern.test(normalized)
    )

    if (!matched) {
      return {
        passed: false,
        nudge: group.nudge,
      }
    }
  }

  return {
    passed: true,
    nudge: null,
  }
}

function evaluateAnswer(
  challenge,
  tierNumber,
  stepNumber,
  normalized
) {
  const wordCount = countWords(normalized)

  // ---------- TIER 1 ----------

  if (tierNumber === 1) {
    const config = challenge.tier1

    const named = config.accept.some((pattern) =>
      pattern.test(normalized)
    )

    if (
      named &&
      wordCount <= (config.maxWords || 10)
    ) {
      return {
        correct: true,
        points: Number(config.points),
        ...config.correct,
      }
    }

    if (named) {
      return {
        correct: false,
        points: 0,
        message:
          "Name the vulnerability in a few words. You will explain it in the next step.",
      }
    }

    return {
      correct: false,
      points: 0,
      message:
        findMisconception(
          config.misconceptions,
          normalized
        ) || config.incorrect,
    }
  }

  // ---------- TIER 2 ----------

  if (tierNumber === 2) {
    const config = challenge.tier2

    // Step 1: explain
    if (stepNumber === 1) {
      const explain = config.explain

      if (wordCount < explain.minWords) {
        return {
          correct: false,
          points: 0,
          message: explain.tooShort,
        }
      }

      const result = checkGroups(
        normalized,
        explain.groups
      )

      if (!result.passed) {
        return {
          correct: false,
          points: 0,
          message: result.nudge,
        }
      }

      return {
        correct: true,
        points: 0,
        ...explain.correct,
      }
    }

    // Step 2: fix
    const fix = config.fix

    const result = checkGroups(
      normalized,
      fix.groups
    )

    if (!result.passed) {
      return {
        correct: false,
        points: 0,
        message:
          findMisconception(
            fix.misconceptions,
            normalized
          ) || result.nudge,
      }
    }

    return {
      correct: true,
      points: Number(config.points),
      ...fix.correct,
      secureCode: fix.secureCode,
    }
  }

  // ---------- TIER 3 ----------

  const config = challenge.tier3

  if (wordCount < config.minWords) {
    return {
      correct: false,
      points: 0,
      message: config.tooShort,
    }
  }

  const result = checkGroups(
    normalized,
    config.groups
  )

  if (!result.passed) {
    return {
      correct: false,
      points: 0,
      message: result.nudge,
    }
  }

  return {
    correct: true,
    points: Number(config.points),
    ...config.correct,
    secureCode: config.secureCode,
  }
}

function getNextStep(tierNumber, stepNumber) {
  if (tierNumber === 1) {
    return {
      tier: 2,
      step: 1,
    }
  }

  if (
    tierNumber === 2 &&
    stepNumber === 1
  ) {
    return {
      tier: 2,
      step: 2,
    }
  }

  if (
    tierNumber === 2 &&
    stepNumber === 2
  ) {
    return {
      tier: 3,
      step: null,
    }
  }

  return null
}

// ========================================
// PUBLIC CHALLENGE PAYLOAD
// ========================================

function toPublicChallenge(challenge) {
  return {
    id: challenge.id,
    title: challenge.title,
    difficulty: challenge.difficulty,
    category: challenge.category || "",
    description: challenge.description || "",
    scenario: challenge.scenario || "",

    investigation: Array.isArray(
      challenge.investigation
    )
      ? challenge.investigation
      : [],

    code: challenge.code,

    hints: challenge.hints || [],

    totalPoints:
      Number(challenge.tier1.points) +
      Number(challenge.tier2.points) +
      Number(challenge.tier3.points),

    tier1: {
      question: challenge.tier1.question,
      points: challenge.tier1.points,
    },

    tier2: {
      question: challenge.tier2.question,
      points: challenge.tier2.points,
      explainPrompt:
        challenge.tier2.explainPrompt || "",
      fixPrompt:
        challenge.tier2.fixPrompt || "",
      hints: challenge.tier2.hints || [],
    },

    tier3: {
      question: challenge.tier3.question,
      points: challenge.tier3.points,
      hints: challenge.tier3.hints || [],
    },
  }
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
  res.json(
    challenges.map(toPublicChallenge)
  )
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

  res.json(
    toPublicChallenge(challenge)
  )
})

// ========================================
// SUBMIT ANSWER
// ========================================

app.post(
  "/api/challenges/:id/answer",
  authenticateToken,
  requireTrustedOrigin,
  (req, res) => {
    try {
      const userId = Number(
        req.user.userId
      )

      const challengeId = Number(
        req.params.id
      )

      if (
        !Number.isInteger(userId) ||
        userId <= 0
      ) {
        return res.status(401).json({
          message:
            "Invalid authenticated user",
        })
      }

      if (
        !Number.isInteger(challengeId) ||
        challengeId <= 0
      ) {
        return res.status(400).json({
          message: "Invalid challenge ID",
        })
      }

      const {
        tier,
        step,
        answer,
      } = req.body

      const challenge = challenges.find(
        (item) => item.id === challengeId
      )

      if (!challenge) {
        return res.status(404).json({
          message: "Challenge not found",
        })
      }

      if (
        answer === undefined ||
        answer === null ||
        tier === undefined ||
        tier === null
      ) {
        return res.status(400).json({
          message:
            "Tier and answer are required",
        })
      }

      if (typeof answer !== "string") {
        return res.status(400).json({
          message: "Answer must be text",
        })
      }

      if (
        answer.length >
        MAX_ANSWER_LENGTH
      ) {
        return res.status(400).json({
          message:
            `Answer is too long (maximum ${MAX_ANSWER_LENGTH} characters)`,
        })
      }

      const tierNumber = Number(tier)

      const stepNumber =
        step === undefined ||
        step === null
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
          message:
            "Invalid Tier 2 step",
        })
      }

      if (
        tierNumber !== 2 &&
        stepNumber !== null
      ) {
        return res.status(400).json({
          message:
            "Step is only valid for Tier 2",
        })
      }

      const userAnswer =
        normalizeAnswer(answer)

      if (!userAnswer) {
        return res.status(400).json({
          message:
            "Answer cannot be empty",
        })
      }

      const existingProgress =
        db.prepare(`
          SELECT
            id,
            score,
            completed,
            tier1_completed,
            tier2_completed,
            tier3_completed,
            tier2_explained
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
            message:
              "Complete Tier 1 first",
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
            alreadyCompleted: true,
            message:
              "Tier 1 already completed",
          })
        }

        if (
          tierNumber === 2 &&
          existingProgress.tier2_completed === 1
        ) {
          return res.json({
            correct: true,
            points: 0,
            alreadyCompleted: true,
            message:
              "Tier 2 already completed",
          })
        }

        if (
          tierNumber === 3 &&
          existingProgress.tier3_completed === 1
        ) {
          return res.json({
            correct: true,
            points: 0,
            alreadyCompleted: true,
            message:
              "Tier 3 already completed",
          })
        }
      }

      // ========================================
      // SECURITY: TIER 2 FIX REQUIRES EXPLANATION
      // ========================================

      if (
        tierNumber === 2 &&
        stepNumber === 2 &&
        Number(
          existingProgress?.tier2_explained
        ) !== 1
      ) {
        return res.status(403).json({
          correct: false,
          points: 0,
          message:
            "Explain the vulnerability first, then submit your fix",
        })
      }

      // ========================================
      // CHECK ANSWER
      // ========================================

      const result =
        evaluateAnswer(
          challenge,
          tierNumber,
          stepNumber,
          userAnswer
        )

      const points = Number(
        result.points
      )

      if (
        !Number.isFinite(points) ||
        points < 0
      ) {
        return res.status(500).json({
          message:
            "Challenge point configuration error",
        })
      }

      if (!result.correct) {
        return res.json({
          correct: false,
          points: 0,
          message: result.message,
        })
      }

      // ========================================
      // SAVE PROGRESS + STREAK
      // ========================================

      const saveProgress =
        db.transaction(() => {
          const currentProgress =
            db.prepare(`
              SELECT
                id,
                score,
                completed,
                tier1_completed,
                tier2_completed,
                tier3_completed,
                tier2_explained
              FROM progress
              WHERE user_id = ?
                AND challenge_id = ?
            `).get(
              userId,
              challengeId
            )

          // Prevent duplicate XP during concurrent submissions.
          if (
            currentProgress &&
            (
              (
                tierNumber === 1 &&
                Number(
                  currentProgress.tier1_completed
                ) === 1
              ) ||
              (
                tierNumber === 2 &&
                stepNumber === 2 &&
                Number(
                  currentProgress.tier2_completed
                ) === 1
              ) ||
              (
                tierNumber === 3 &&
                Number(
                  currentProgress.tier3_completed
                ) === 1
              )
            )
          ) {
            return {
              xpBefore:
                progressStore.getTotalXp(
                  userId
                ),
              awardedPoints: 0,
              alreadyCompleted: true,
              completed:
                Number(
                  currentProgress.completed
                ) === 1,
            }
          }

          const xpBefore =
            progressStore.getTotalXp(
              userId
            )

          let nextTier1Completed =
            currentProgress
              ? Number(
                  currentProgress.tier1_completed
                )
              : 0

          let nextTier2Completed =
            currentProgress
              ? Number(
                  currentProgress.tier2_completed
                )
              : 0

          let nextTier3Completed =
            currentProgress
              ? Number(
                  currentProgress.tier3_completed
                )
              : 0

          let nextTier2Explained =
            currentProgress
              ? Number(
                  currentProgress.tier2_explained
                )
              : 0

          if (tierNumber === 1) {
            nextTier1Completed = 1
          }

          if (
            tierNumber === 2 &&
            stepNumber === 1
          ) {
            nextTier2Explained = 1
          }

          if (
            tierNumber === 2 &&
            stepNumber === 2
          ) {
            nextTier2Completed = 1
          }

          if (tierNumber === 3) {
            nextTier3Completed = 1
          }

          const nextCompleted =
            nextTier1Completed === 1 &&
            nextTier2Completed === 1 &&
            nextTier3Completed === 1
              ? 1
              : 0

          if (!currentProgress) {
            db.prepare(`
              INSERT INTO progress (
                user_id,
                challenge_id,
                score,
                completed,
                tier1_completed,
                tier2_completed,
                tier3_completed,
                tier2_explained
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              userId,
              challengeId,
              points,
              nextCompleted,
              nextTier1Completed,
              nextTier2Completed,
              nextTier3Completed,
              nextTier2Explained
            )
          } else {
            db.prepare(`
              UPDATE progress
              SET
                score = score + ?,
                completed = ?,
                tier1_completed = ?,
                tier2_completed = ?,
                tier3_completed = ?,
                tier2_explained = ?
              WHERE id = ?
            `).run(
              points,
              nextCompleted,
              nextTier1Completed,
              nextTier2Completed,
              nextTier3Completed,
              nextTier2Explained,
              Number(currentProgress.id)
            )
          }

          if (points > 0) {
            progressStore.recordLearningActivity(
              userId
            )
          }

          return {
            xpBefore,
            awardedPoints: points,
            alreadyCompleted: false,
            completed:
              nextCompleted === 1,
          }
        })

      const {
        xpBefore,
        awardedPoints,
        alreadyCompleted,
        completed: finalCompleted,
      } = saveProgress.immediate()

      // ========================================
      // SUCCESS RESPONSE
      // ========================================

      const summary =
        progressStore.getProgressSummary(
          userId,
          challenges.length
        )

      const challengeCompleted =
        finalCompleted

      const hasNextChallenge =
        challenges.some(
          (item) =>
            item.id === challengeId + 1
        )

      return res.json({
        correct: true,
        points: awardedPoints,

        message: alreadyCompleted
          ? "Already completed"
          : result.message || "",

        concept:
          result.concept || null,

        takeaway:
          result.takeaway || null,

        secureCode:
          result.secureCode || null,

        nextStep:
          getNextStep(
            tierNumber,
            stepNumber
          ),

        challengeCompleted,

        nextChallengeId:
          challengeCompleted &&
          hasNextChallenge
            ? challengeId + 1
            : null,

        leveledUp:
          summary.level >
          getLevelForXp(xpBefore),

        summary,

        ...(alreadyCompleted
          ? {
              alreadyCompleted: true,
            }
          : {}),
      })
    } catch (error) {
      console.error(
        "Submit answer error:",
        error
      )

      return res.status(500).json({
        message:
          "Internal server error",
      })
    }
  }
)

// ========================================
// SIGN UP
// ========================================

app.post(
  "/api/auth/signup",
  signupLimiter,
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

    if (
      typeof username !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message:
          "Username and password must be text",
      })
    }

    const cleanUsername =
      username.trim()

    if (
      cleanUsername.length < 3 ||
      cleanUsername.length > 30
    ) {
      return res.status(400).json({
        message:
          "Username must be 3 to 30 characters",
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters",
      })
    }

    if (password.length > 72) {
      return res.status(400).json({
        message:
          "Password must be at most 72 characters",
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
          cleanUsername,
          hashedPassword
        )

      return res.status(201).json({
        message:
          "Account created successfully",
        userId:
          result.lastInsertRowid,
      })
    } catch (error) {
      if (
        error &&
        typeof error.code === "string" &&
        error.code.startsWith(
          "SQLITE_CONSTRAINT"
        )
      ) {
        return res.status(400).json({
          message:
            "Username already exists",
        })
      }

      console.error(
        "Signup error:",
        error
      )

      return res.status(500).json({
        message:
          "Internal server error",
      })
    }
  }
)

// ========================================
// LOGIN
// ========================================

app.post(
  "/api/auth/login",
  loginLimiter,
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

      if (
        typeof username !== "string" ||
        typeof password !== "string"
      ) {
        return res.status(400).json({
          message:
            "Username and password must be text",
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
        `).get(
          username.trim()
        )

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
            algorithm:
              JWT_ALGORITHM,
            expiresIn:
              JWT_EXPIRES_IN,
            issuer:
              JWT_ISSUER,
            audience:
              JWT_AUDIENCE,
          }
        )

      res.cookie(
        AUTH_COOKIE_NAME,
        token,
        COOKIE_OPTIONS
      )

      return res.json({
        message:
          "Login successful",
        userId: user.id,
        username:
          user.username,
      })
    } catch (error) {
      console.error(
        "Login error:",
        error
      )

      return res.status(500).json({
        message:
          "Internal server error",
      })
    }
  }
)

// ========================================
// LOGOUT
// ========================================

app.post(
  "/api/auth/logout",
  requireTrustedOrigin,
  (req, res) => {
    res.clearCookie(
      AUTH_COOKIE_NAME,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "strict",
        path: "/",
      }
    )

    return res.json({
      message:
        "Logout successful",
    })
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
            tier3_completed,
            tier2_explained
          FROM progress
          WHERE user_id = ?
          ORDER BY challenge_id
        `).all(
          req.user.userId
        )

      const summary =
        progressStore.getProgressSummary(
          req.user.userId,
          challenges.length
        )

      res.json({
        userId:
          req.user.userId,
        username:
          req.user.username,
        progress,
        summary,
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
// LEADERBOARD
// ========================================

app.get(
  "/api/leaderboard",
  authenticateToken,
  (req, res) => {
    try {
      res.json(
        progressStore.getLeaderboard(
          req.user.userId,
          LEADERBOARD_SIZE
        )
      )
    } catch (error) {
      console.error(
        "Leaderboard error:",
        error
      )

      res.status(500).json({
        message:
          "Unable to retrieve the leaderboard",
      })
    }
  }
)

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use(
  (error, req, res, next) => {
    if (
      error instanceof SyntaxError &&
      error.status === 400 &&
      "body" in error
    ) {
      return res.status(400).json({
        message:
          "Invalid JSON payload",
      })
    }

    if (
      error &&
      error.type ===
        "entity.too.large"
    ) {
      return res.status(413).json({
        message:
          "Request body is too large",
      })
    }

    console.error(
      "Unhandled server error:",
      error
    )

    return res.status(500).json({
      message:
        "Internal server error",
    })
  }
)

// ========================================
// START SERVER
// ========================================

app.listen(PORT, () => {
  console.log(
    "Database connected successfully"
  )

  console.log(
    `Logic Leak API running on http://localhost:${PORT}`
  )
})
