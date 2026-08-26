const express = require("express")
const cors = require("cors")
const challenges = require("./challenges")
const db = require("./database")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const app = express()
const PORT = 5000
const JWT_SECRET = "logic-leak-development-secret"
app.use(cors())
app.use(express.json())
// ========================================
// AUTHENTICATION MIDDLEWARE
// ========================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization
  const token =
    authHeader && authHeader.split(" ")[1]
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
      req.user = user
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
      description:
        challenge.description || "",
      tier1: {
        question:
          challenge.tier1.question,
        points:
          challenge.tier1.points,
      },
      tier2: {
        question:
          challenge.tier2.question,
        points:
          challenge.tier2.points,
      },
      tier3: {
        question:
          challenge.tier3.question,
        points:
          challenge.tier3.points,
      },
    })
  )
  res.json(safeChallenges)
})
// ========================================
// GET ONE CHALLENGE
// ========================================
app.get(
  "/api/challenges/:id",
  (req, res) => {
    const id = Number(req.params.id)
    const challenge =
      challenges.find(
        (item) => item.id === id
      )
    if (!challenge) {
      return res.status(404).json({
        message: "Challenge not found",
      })
    }
    res.json({
      id: challenge.id,
      title: challenge.title,
      difficulty:
        challenge.difficulty,
      code: challenge.code,
      description:
        challenge.description || "",
      tier1: {
        question:
          challenge.tier1.question,
        points:
          challenge.tier1.points,
      },
      tier2: {
        question:
          challenge.tier2.question,
        points:
          challenge.tier2.points,
      },
      tier3: {
        question:
          challenge.tier3.question,
        points:
          challenge.tier3.points,
      },
    })
  }
)
// ========================================
// SUBMIT ANSWER
// ========================================
app.post(
  "/api/challenges/:id/answer",
  authenticateToken,
  (req, res) => {
    const userId = req.user.userId
    const challengeId =
      Number(req.params.id)
    const {
      tier,
      step,
      answer,
    } = req.body
    const challenge =
      challenges.find(
        (item) =>
          item.id === challengeId
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
    const tierNumber = Number(tier)
    const stepNumber =
      step === undefined ||
      step === null
        ? null
        : Number(step)
    const userAnswer =
      String(answer)
        .trim()
        .toLowerCase()
    if (!userAnswer) {
      return res.status(400).json({
        message:
          "Answer cannot be empty",
      })
    }
    // ========================================
    // GET EXISTING PROGRESS
    // ========================================
    const existingProgress =
      db.prepare(`
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
    // PREVENT REPEATED REWARDS
    // ========================================
    if (existingProgress) {
      // Tier 1 already completed
      if (
        tierNumber === 1 &&
        existingProgress
          .tier1_completed === 1
      ) {
        return res.json({
          correct: true,
          points: 0,
          message:
            "Tier 1 already completed",
        })
      }
      // Tier 2 Step 2 already completed
      if (
        tierNumber === 2 &&
        stepNumber === 2 &&
        existingProgress
          .tier2_completed === 1
      ) {
        return res.json({
          correct: true,
          points: 0,
          message:
            "Tier 2 already completed",
        })
      }
      // Tier 3 already completed
      if (
        tierNumber === 3 &&
        existingProgress
          .tier3_completed === 1
      ) {
        return res.json({
          correct: true,
          points: 0,
          message:
            "Tier 3 already completed",
        })
      }
    }
    let correct = false
    let points = 0
    let tierColumn = null
    // ========================================
    // TIER 1
    // ========================================
    if (tierNumber === 1) {
      tierColumn =
        "tier1_completed"
      correct =
        userAnswer ===
        challenge.tier1.answer
          .toLowerCase()
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
      tierColumn =
        "tier2_completed"
      // --------------------------------
      // STEP 1: EXPLANATION
      // --------------------------------
      if (stepNumber === 1) {
        const keyword =
          challenge
            .tier2
            .expectedKeywords[0]
            .toLowerCase()
        correct =
          userAnswer.includes(
            keyword
          )
        // Step 1 is explanation only
        points = 0
      }
      // --------------------------------
      // STEP 2: SECURE FIX
      // --------------------------------
      else if (stepNumber === 2) {
        const keywords =
          challenge
            .tier2
            .expectedKeywords
            .slice(1)
        correct =
          keywords.some(
            (keyword) =>
              userAnswer.includes(
                keyword.toLowerCase()
              )
          )
        if (correct) {
          points = Number(
            challenge.tier2.points
          )
        }
      }
      else {
        return res.status(400).json({
          message:
            "Invalid Tier 2 step",
        })
      }
    }
    // ========================================
    // TIER 3
    // ========================================
    else if (tierNumber === 3) {
      tierColumn =
        "tier3_completed"
      const keywords =
        challenge
          .tier3
          .expectedKeywords
      correct =
        keywords.every(
          (keyword) =>
            userAnswer.includes(
              keyword.toLowerCase()
            )
        )
      if (correct) {
        points = Number(
          challenge.tier3.points
        )
      }
    }
    // ========================================
    // INVALID TIER
    // ========================================
    else {
      return res.status(400).json({
        message: "Invalid tier",
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
    // UPDATE / CREATE PROGRESS
    // ========================================
    if (!existingProgress) {
      let tier1Completed = 0
      let tier2Completed = 0
      let tier3Completed = 0
      if (
        tierColumn ===
        "tier1_completed"
      ) {
        tier1Completed = 1
      }
      if (
        tierColumn ===
          "tier2_completed" &&
        tierNumber === 2 &&
        stepNumber === 2
      ) {
        tier2Completed = 1
      }
      if (
        tierColumn ===
        "tier3_completed"
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
    else {
      let tier1Completed =
        existingProgress
          .tier1_completed
      let tier2Completed =
        existingProgress
          .tier2_completed
      let tier3Completed =
        existingProgress
          .tier3_completed
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
        existingProgress.id
      )
    }
    // ========================================
    // RESPONSE
    // ========================================
    res.json({
      correct: true,
      points,
    })
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
      res.status(201).json({
        message:
          "Account created successfully",
        userId:
          result.lastInsertRowid,
      })
    }
    catch (error) {
      console.error(
        "Signup error:",
        error
      )
      res.status(400).json({
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
    res.json({
      message:
        "Login successful",
      token,
      userId: user.id,
      username: user.username,
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
  }
)
// ========================================
// START SERVER
// ========================================
app.listen(
  PORT,
  () => {
    console.log(
      `Logic Leak API running on http://localhost:${PORT}`
    )
  }
)