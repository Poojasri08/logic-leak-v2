const express = require("express")
const cors = require("cors")
const challenges = require("./challenges")
const db = require("./database")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
require("dotenv").config()
const { getLevelForXp } = require("./progression")
const progressStore = require("./progressStore")

const app = express()
const PORT = 5000
const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing")
}

const MAX_ANSWER_LENGTH = 1000
const LEADERBOARD_SIZE = 10

app.use(cors())
app.use(express.json())

// Express 5 leaves req.body undefined when no JSON body was sent.
// Normalise it so every route can safely read req.body fields and
// return a clean 400 instead of crashing into a 500.
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

  jwt.verify(token, JWT_SECRET, (error, user) => {
    if (error) {
      return res.status(403).json({
        message: "Invalid or expired token",
      })
    }

    // ========================================
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

    // The user id used everywhere else comes from here
    // (the verified token), never from the request body or URL.
    req.user = {
      userId: existingUser.id,
      username: existingUser.username,
    }

    next()
  })
}

// ========================================
// ANSWER CHECKING HELPERS
// ========================================

// Lower-case, turn punctuation into spaces, collapse spaces.
function normalizeAnswer(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function countWords(normalized) {
  return normalized ? normalized.split(" ").length : 0
}

function findMisconception(list, normalized) {
  if (!Array.isArray(list)) {
    return null
  }

  const hit = list.find((item) => item.pattern.test(normalized))

  return hit ? hit.message : null
}

// Every group must be matched by at least one pattern.
// Returns the nudge of the first group that is not matched.
function checkGroups(normalized, groups) {
  if (!Array.isArray(groups) || groups.length === 0) {
    throw new Error("Answer groups are not configured")
  }

  for (const group of groups) {
    const matched = group.patterns.some((pattern) =>
      pattern.test(normalized)
    )

    if (!matched) {
      return { passed: false, nudge: group.nudge }
    }
  }

  return { passed: true, nudge: null }
}

// Decides correctness and the XP for ONE submission.
// The browser never supplies points; they come from challenges.js.
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

    if (named && wordCount <= (config.maxWords || 10)) {
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
        findMisconception(config.misconceptions, normalized) ||
        config.incorrect,
    }
  }

  // ---------- TIER 2 ----------
  if (tierNumber === 2) {
    const config = challenge.tier2

    // Step 1: explain (no XP)
    if (stepNumber === 1) {
      const explain = config.explain

      if (wordCount < explain.minWords) {
        return {
          correct: false,
          points: 0,
          message: explain.tooShort,
        }
      }

      const result = checkGroups(normalized, explain.groups)

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

    // Step 2: fix (XP awarded here)
    const fix = config.fix
    const result = checkGroups(normalized, fix.groups)

    if (!result.passed) {
      return {
        correct: false,
        points: 0,
        message:
          findMisconception(fix.misconceptions, normalized) ||
          result.nudge,
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

  const result = checkGroups(normalized, config.groups)

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
    return { tier: 2, step: 1 }
  }

  if (tierNumber === 2 && stepNumber === 1) {
    return { tier: 2, step: 2 }
  }

  if (tierNumber === 2 && stepNumber === 2) {
    return { tier: 3, step: null }
  }

  return null
}

// ========================================
// PUBLIC CHALLENGE PAYLOAD
// Explicit whitelist: answer patterns, correct-answer
// feedback and secure code are never sent from here.
// ========================================
function toPublicChallenge(challenge) {
  return {
    id: challenge.id,
    title: challenge.title,
    difficulty: challenge.difficulty,
    category: challenge.category || "",
    description: challenge.description || "",
    scenario: challenge.scenario || "",
    investigation: Array.isArray(challenge.investigation)
      ? challenge.investigation
      : [],
    code: challenge.code,

    // Tier 1 hints (progressive)
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
      explainPrompt: challenge.tier2.explainPrompt || "",
      fixPrompt: challenge.tier2.fixPrompt || "",
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
  res.json(challenges.map(toPublicChallenge))
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

  res.json(toPublicChallenge(challenge))
})

// ========================================
// SUBMIT ANSWER
// ========================================
app.post(
  "/api/challenges/:id/answer",
  authenticateToken,
  (req, res) => {
    try {
      // The learner is ALWAYS the user in the verified token.
      // A userId, xp, level or streak in the request is ignored.
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

      const { tier, step, answer } = req.body

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

      if (typeof answer !== "string") {
        return res.status(400).json({
          message: "Answer must be text",
        })
      }

      if (answer.length > MAX_ANSWER_LENGTH) {
        return res.status(400).json({
          message: `Answer is too long (maximum ${MAX_ANSWER_LENGTH} characters)`,
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

      if (tierNumber !== 2 && stepNumber !== null) {
        return res.status(400).json({
          message: "Step is only valid for Tier 2",
        })
      }

      const userAnswer = normalizeAnswer(answer)

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
          tier3_completed,
          tier2_explained
        FROM progress
        WHERE user_id = ?
          AND challenge_id = ?
      `).get(userId, challengeId)

      // ========================================
      // SECURITY: CHALLENGE ORDER
      // ========================================
      if (challengeId > 1) {
        const previousChallenge = db.prepare(`
          SELECT completed
          FROM progress
          WHERE user_id = ?
            AND challenge_id = ?
        `).get(userId, challengeId - 1)

        if (
          !previousChallenge ||
          previousChallenge.completed !== 1
        ) {
          return res.status(403).json({
            correct: false,
            points: 0,
            message: `Complete Challenge ${challengeId - 1} first`,
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
            message: "Complete Tier 1 and Tier 2 first",
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
            message: "Tier 1 already completed",
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
            alreadyCompleted: true,
            message: "Tier 3 already completed",
          })
        }
      }

      // ========================================
      // SECURITY: THE FIX CANNOT BE SUBMITTED
      // BEFORE THE EXPLANATION STEP IS PASSED
      // ========================================
      if (
        tierNumber === 2 &&
        stepNumber === 2 &&
        Number(existingProgress.tier2_explained) !== 1
      ) {
        return res.status(403).json({
          correct: false,
          points: 0,
          message:
            "Explain the vulnerability first, then submit your fix",
        })
      }

      // ========================================
      // CHECK ANSWER (server decides points)
      // ========================================
      const result = evaluateAnswer(
        challenge,
        tierNumber,
        stepNumber,
        userAnswer
      )

      const points = Number(result.points)

      if (!Number.isFinite(points) || points < 0) {
        return res.status(500).json({
          message: "Challenge point configuration error",
        })
      }

      // ========================================
      // WRONG ANSWER
      // ========================================
      if (!result.correct) {
        return res.json({
          correct: false,
          points: 0,
          message: result.message,
        })
      }

      // ========================================
      // SAVE PROGRESS + STREAK TOGETHER
      // One transaction: either XP and streak are both
      // saved, or neither is.
      // ========================================
      let tier1Completed = existingProgress
        ? Number(existingProgress.tier1_completed)
        : 0
      let tier2Completed = existingProgress
        ? Number(existingProgress.tier2_completed)
        : 0
      let tier3Completed = existingProgress
        ? Number(existingProgress.tier3_completed)
        : 0
      let tier2Explained = existingProgress
        ? Number(existingProgress.tier2_explained)
        : 0

      if (tierNumber === 1) {
        tier1Completed = 1
      }

      if (tierNumber === 2 && stepNumber === 1) {
        tier2Explained = 1
      }

      if (tierNumber === 2 && stepNumber === 2) {
        tier2Completed = 1
      }

      if (tierNumber === 3) {
        tier3Completed = 1
      }

      const completed =
        tier1Completed === 1 &&
        tier2Completed === 1 &&
        tier3Completed === 1
          ? 1
          : 0

      const saveProgress = db.transaction(() => {
        const xpBefore = progressStore.getTotalXp(userId)

        if (!existingProgress) {
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
            completed,
            tier1Completed,
            tier2Completed,
            tier3Completed,
            tier2Explained
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
            completed,
            tier1Completed,
            tier2Completed,
            tier3Completed,
            tier2Explained,
            Number(existingProgress.id)
          )
        }

        // Only a step that actually awards XP counts as
        // learning activity for the streak.
        if (points > 0) {
          progressStore.recordLearningActivity(userId)
        }

        return { xpBefore }
      })

      const { xpBefore } = saveProgress()

      // ========================================
      // SUCCESS RESPONSE
      // ========================================
      const summary = progressStore.getProgressSummary(
        userId,
        challenges.length
      )

      const challengeCompleted = completed === 1

      const hasNextChallenge = challenges.some(
        (item) => item.id === challengeId + 1
      )

      return res.json({
        correct: true,
        points,
        message: result.message || "",
        concept: result.concept || null,
        takeaway: result.takeaway || null,
        secureCode: result.secureCode || null,
        nextStep: getNextStep(tierNumber, stepNumber),
        challengeCompleted,
        nextChallengeId:
          challengeCompleted && hasNextChallenge
            ? challengeId + 1
            : null,
        leveledUp: summary.level > getLevelForXp(xpBefore),
        summary,
      })
    } catch (error) {
      console.error("Submit answer error:", error)

      return res.status(500).json({
        message: "Internal server error",
      })
    }
  }
)

// ========================================
// SIGN UP
// ========================================
app.post("/api/auth/signup", async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({
      message: "Username and password are required",
    })
  }

  if (
    typeof username !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      message: "Username and password must be text",
    })
  }

  const cleanUsername = username.trim()

  if (cleanUsername.length < 3 || cleanUsername.length > 30) {
    return res.status(400).json({
      message: "Username must be 3 to 30 characters",
    })
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters",
    })
  }

  // bcrypt ignores everything after 72 bytes
  if (password.length > 72) {
    return res.status(400).json({
      message: "Password must be at most 72 characters",
    })
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10)

    const result = db.prepare(`
      INSERT INTO users
      (username, password)
      VALUES (?, ?)
    `).run(cleanUsername, hashedPassword)

    return res.status(201).json({
      message: "Account created successfully",
      userId: result.lastInsertRowid,
    })
  } catch (error) {
    if (
      error &&
      typeof error.code === "string" &&
      error.code.startsWith("SQLITE_CONSTRAINT")
    ) {
      return res.status(400).json({
        message: "Username already exists",
      })
    }

    console.error("Signup error:", error)

    return res.status(500).json({
      message: "Internal server error",
    })
  }
})

// ========================================
// LOGIN
// ========================================
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      })
    }

    if (
      typeof username !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Username and password must be text",
      })
    }

    const user = db.prepare(`
      SELECT
        id,
        username,
        password
      FROM users
      WHERE username = ?
    `).get(username.trim())

    if (!user) {
      return res.status(401).json({
        message: "Invalid username or password",
      })
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    )

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid username or password",
      })
    }

    const token = jwt.sign(
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
      message: "Login successful",
      token,
      userId: user.id,
      username: user.username,
    })
  } catch (error) {
    console.error("Login error:", error)

    return res.status(500).json({
      message: "Internal server error",
    })
  }
})

// ========================================
// CURRENT USER
// ========================================
app.get(
  "/api/auth/me",
  authenticateToken,
  (req, res) => {
    res.json({
      message: "Authenticated successfully",
      user: req.user,
    })
  }
)

// ========================================
// USER PROGRESS
// "progress" is the original per-challenge list (unchanged).
// "summary" adds XP, level, streaks and overall progress.
// Both are read from the database for the token's user only.
// ========================================
app.get(
  "/api/progress",
  authenticateToken,
  (req, res) => {
    try {
      const progress = db.prepare(`
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
      `).all(req.user.userId)

      const summary = progressStore.getProgressSummary(
        req.user.userId,
        challenges.length
      )

      res.json({
        userId: req.user.userId,
        username: req.user.username,
        progress,
        summary,
      })
    } catch (error) {
      console.error("Progress error:", error)

      res.status(500).json({
        message: "Unable to retrieve progress",
      })
    }
  }
)

// ========================================
// LEADERBOARD
// Login required. Returns only rank, username, xp and level
// (plus a flag for the requester's own row).
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
      console.error("Leaderboard error:", error)

      res.status(500).json({
        message: "Unable to retrieve the leaderboard",
      })
    }
  }
)

// ========================================
// GLOBAL ERROR HANDLER
// ========================================
app.use((error, req, res, next) => {
  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    "body" in error
  ) {
    return res.status(400).json({
      message: "Invalid JSON payload",
    })
  }

  if (error && error.type === "entity.too.large") {
    return res.status(413).json({
      message: "Request body is too large",
    })
  }

  console.error("Unhandled server error:", error)

  return res.status(500).json({
    message: "Internal server error",
  })
})

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
  console.log("Database connected successfully")
  console.log(
    `Logic Leak API running on http://localhost:${PORT}`
  )
})
