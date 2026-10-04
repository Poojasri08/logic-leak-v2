/* =========================================
   PHASE 3 CHECK SCRIPT

   Checks levels, streaks, XP, the leaderboard and the
   security rules against your RUNNING backend.

   1. Start the backend:   node server.js
   2. In another terminal: node scripts/check-phase3.js

   Needs Node 18 or newer (built-in fetch). No packages.

   It creates throw-away accounts named "phase3check-..."
   and deletes them at the end. Use --keep to keep them.
   Set API_URL if your server is not on http://localhost:5000.
========================================= */

const BASE_URL = process.env.API_URL || "http://localhost:5000"
const KEEP_DATA = process.argv.includes("--keep")
const TEST_PREFIX = "phase3check-"
const RUN_ID = Date.now().toString(36).slice(-6)

if (typeof fetch !== "function") {
  console.error("This script needs Node 18 or newer.")
  process.exit(1)
}

const progression = require("../progression")

const results = []
let currentSection = ""

function section(title) {
  currentSection = title
  console.log(`\n== ${title} ==`)
}

function check(name, condition, detail = "") {
  const passed = Boolean(condition)

  results.push({ section: currentSection, name, passed })

  const suffix = !passed && detail ? `  -> ${detail}` : ""

  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${suffix}`)
}

function show(value) {
  try {
    return JSON.stringify(value)
  } catch (error) {
    return String(value)
  }
}

async function request(
  method,
  path,
  { token, body, rawBody, authHeader } = {}
) {
  const headers = {}
  const options = { method, headers }

  if (authHeader) {
    headers.Authorization = authHeader
  } else if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (rawBody !== undefined) {
    headers["Content-Type"] = "application/json"
    options.body = rawBody
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json"
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${BASE_URL}${path}`, options)
  const text = await response.text()

  let data = null

  try {
    data = JSON.parse(text)
  } catch (error) {
    data = null
  }

  return { status: response.status, data, text }
}

/* =========================================
   ANSWERS THAT ARE CORRECT FOR EACH CHALLENGE
========================================= */

const TIER1_ANSWER = "sql injection"

const EXPLAIN_ANSWER =
  "It is SQL injection because user input is concatenated into the query string."

const FIX_ANSWER = "Use parameterized queries"

const TIER3_ANSWERS = {
  1: "A negative amount would reverse the transfer, so validate that amount is greater than zero.",
  2: "Treat unexpected characters as plain search text using parameterized queries, and add validation such as a length limit.",
  3: "Validate that the price is a positive number and look up the real price on the server.",
}

function submit(token, challengeId, tier, step, text, extra = {}) {
  const body = { tier, answer: text, ...extra }

  if (step !== null && step !== undefined) {
    body.step = step
  }

  return request("POST", `/api/challenges/${challengeId}/answer`, {
    token,
    body,
  })
}

async function completeChallenge(token, challengeId) {
  const steps = []

  steps.push(await submit(token, challengeId, 1, null, TIER1_ANSWER))
  steps.push(await submit(token, challengeId, 2, 1, EXPLAIN_ANSWER))
  steps.push(await submit(token, challengeId, 2, 2, FIX_ANSWER))
  steps.push(
    await submit(token, challengeId, 3, null, TIER3_ANSWERS[challengeId])
  )

  return steps
}

async function createUser(label) {
  const username = `${TEST_PREFIX}${label}-${RUN_ID}`
  const password = "check-pass-123"

  const signup = await request("POST", "/api/auth/signup", {
    body: { username, password },
  })

  const login = await request("POST", "/api/auth/login", {
    body: { username, password },
  })

  return {
    username,
    password,
    signup,
    login,
    token: login.data && login.data.token,
    id: login.data && login.data.userId,
  }
}

async function getProgress(token) {
  return request("GET", "/api/progress", { token })
}

function toBase64Url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url")
}

/* =========================================
   PART 1: RULES THAT NEED NO SERVER
========================================= */

function runRuleChecks() {
  section("Level rules (no server needed)")

  const levelCases = [
    [0, 1],
    [99, 1],
    [100, 2],
    [199, 2],
    [200, 3],
    [299, 3],
    [300, 4],
    [449, 4],
    [450, 5],
    [599, 5],
    [600, 6],
    [1499, 9],
    [1500, 10],
    [1799, 10],
    [1800, 11],
  ]

  for (const [xp, expected] of levelCases) {
    const actual = progression.getLevelForXp(xp)

    check(
      `${xp} XP is Level ${expected}`,
      actual === expected,
      `got Level ${actual}`
    )
  }

  const info = progression.describeLevel(240)

  check(
    "240 XP: Level 3, 40 XP into the level, next level at 300",
    info.level === 3 &&
      info.xpIntoLevel === 40 &&
      info.xpForNextLevel === 300 &&
      info.xpToNextLevel === 60,
    show(info)
  )

  section("Streak rules (no server needed)")

  const empty = {
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
  }

  const first = progression.computeStreakUpdate(empty, "2026-10-01")

  check(
    "first activity starts a streak of 1",
    first.changed && first.currentStreak === 1 && first.longestStreak === 1,
    show(first)
  )

  const sameDay = progression.computeStreakUpdate(first, "2026-10-01")

  check(
    "more activity on the same day does not change the streak",
    !sameDay.changed && sameDay.currentStreak === 1,
    show(sameDay)
  )

  const nextDay = progression.computeStreakUpdate(first, "2026-10-02")

  check(
    "activity on the next day adds 1",
    nextDay.currentStreak === 2 && nextDay.longestStreak === 2,
    show(nextDay)
  )

  const afterGap = progression.computeStreakUpdate(nextDay, "2026-10-05")

  check(
    "a gap resets the streak to 1 but keeps the longest streak",
    afterGap.currentStreak === 1 && afterGap.longestStreak === 2,
    show(afterGap)
  )

  const monthEnd = progression.computeStreakUpdate(
    { currentStreak: 4, longestStreak: 4, lastActivityDate: "2026-10-31" },
    "2026-11-01"
  )

  check("streak continues across a month boundary", monthEnd.currentStreak === 5)

  const yearEnd = progression.computeStreakUpdate(
    { currentStreak: 2, longestStreak: 2, lastActivityDate: "2026-12-31" },
    "2027-01-01"
  )

  check("streak continues across a year boundary", yearEnd.currentStreak === 3)

  const leapDay = progression.computeStreakUpdate(
    { currentStreak: 3, longestStreak: 3, lastActivityDate: "2028-02-29" },
    "2028-03-01"
  )

  check("streak continues from 29 Feb to 1 Mar in a leap year", leapDay.currentStreak === 4)

  const missedLeapDay = progression.computeStreakUpdate(
    { currentStreak: 3, longestStreak: 3, lastActivityDate: "2028-02-28" },
    "2028-03-01"
  )

  check("skipping 29 Feb in a leap year breaks the streak", missedLeapDay.currentStreak === 1)

  const clockBack = progression.computeStreakUpdate(
    { currentStreak: 5, longestStreak: 5, lastActivityDate: "2026-10-05" },
    "2026-10-03"
  )

  check(
    "a server clock that moves backwards does not break the streak",
    !clockBack.changed && clockBack.currentStreak === 5,
    show(clockBack)
  )

  const stale = { currentStreak: 5, longestStreak: 5, lastActivityDate: "2026-10-01" }

  check(
    "a streak is still shown the next day",
    progression.getDisplayedStreak(stale, "2026-10-02") === 5
  )

  check(
    "a streak is shown as 0 after a missed day",
    progression.getDisplayedStreak(stale, "2026-10-03") === 0
  )

  const summary = progression.buildProgressSummary({
    xp: 240,
    completedChallenges: 1,
    totalChallenges: 3,
    streak: { currentStreak: 2, longestStreak: 4, lastActivityDate: "2026-10-03" },
    today: "2026-10-03",
  })

  check(
    "summary combines XP, level, streak and progress",
    summary.level === 3 &&
      summary.xpForNextLevel === 300 &&
      summary.currentStreak === 2 &&
      summary.longestStreak === 4 &&
      summary.progressPercentage === 33,
    show(summary)
  )

  check(
    "server date looks like YYYY-MM-DD",
    /^\d{4}-\d{2}-\d{2}$/.test(progression.getDateString())
  )
}

/* =========================================
   PART 2: CHECKS AGAINST THE RUNNING SERVER
========================================= */

async function runServerChecks() {
  try {
    await request("GET", "/")
  } catch (error) {
    console.error(
      `\nCannot reach ${BASE_URL}. Start the backend first (node server.js).`
    )
    process.exit(1)
  }

  /* ---------- signup and login ---------- */

  section("Signup and login")

  const userA = await createUser("a")

  check("signup works (201)", userA.signup.status === 201, show(userA.signup))

  check(
    "signup response contains no password",
    !userA.signup.text.toLowerCase().includes("password")
  )

  if (!userA.token) {
    console.error("\nLogin failed, so the remaining checks cannot run.")
    console.error(show(userA.login))
    process.exit(1)
  }

  check("login returns a token", typeof userA.token === "string")

  check(
    "login response has no password hash",
    !("password" in userA.login.data) && !userA.login.text.includes("$2")
  )

  const duplicate = await request("POST", "/api/auth/signup", {
    body: { username: userA.username, password: userA.password },
  })

  check("duplicate username is rejected (400)", duplicate.status === 400, show(duplicate.data))

  const shortPassword = await request("POST", "/api/auth/signup", {
    body: { username: `${TEST_PREFIX}x-${RUN_ID}`, password: "123" },
  })

  check("short password is rejected (400)", shortPassword.status === 400)

  const numericPassword = await request("POST", "/api/auth/signup", {
    body: { username: `${TEST_PREFIX}y-${RUN_ID}`, password: 123456 },
  })

  check("non-text password is rejected (400)", numericPassword.status === 400)

  const shortName = await request("POST", "/api/auth/signup", {
    body: { username: "ab", password: "check-pass-123" },
  })

  check("too-short username is rejected (400)", shortName.status === 400)

  const wrongPassword = await request("POST", "/api/auth/login", {
    body: { username: userA.username, password: "wrong-password" },
  })

  check("wrong password is rejected (401)", wrongPassword.status === 401)

  const loginNoBody = await request("POST", "/api/auth/login")

  check("login with no body returns 400, not 500", loginNoBody.status === 400, `status ${loginNoBody.status}`)

  const loginBadJson = await request("POST", "/api/auth/login", {
    rawBody: "{ not valid json",
  })

  check("login with invalid JSON returns 400", loginBadJson.status === 400, `status ${loginBadJson.status}`)

  /* ---------- unauthenticated access ---------- */

  section("Protected endpoints need a valid login")

  const protectedCalls = [
    ["GET", "/api/progress"],
    ["GET", "/api/leaderboard"],
    ["GET", "/api/auth/me"],
    ["POST", "/api/challenges/1/answer"],
  ]

  for (const [method, path] of protectedCalls) {
    const response = await request(method, path)

    check(
      `${method} ${path} without a token is rejected (401)`,
      response.status === 401,
      `status ${response.status}`
    )
  }

  const garbageProgress = await request("GET", "/api/progress", { token: "garbage" })

  check("garbage token is rejected on /api/progress (403)", garbageProgress.status === 403)

  const garbageBoard = await request("GET", "/api/leaderboard", { token: "garbage" })

  check("garbage token is rejected on /api/leaderboard (403)", garbageBoard.status === 403)

  const basicAuth = await request("GET", "/api/progress", { authHeader: "Basic abc" })

  check("non-Bearer authorization is rejected (401)", basicAuth.status === 401)

  /* ---------- fresh account ---------- */

  section("Fresh account progress")

  const fresh = await getProgress(userA.token)
  const freshSummary = fresh.data && fresh.data.summary

  check("progress works with a token", fresh.status === 200)

  check(
    "new account starts at 0 XP, Level 1, no streak",
    freshSummary &&
      freshSummary.xp === 0 &&
      freshSummary.level === 1 &&
      freshSummary.currentStreak === 0 &&
      freshSummary.longestStreak === 0 &&
      freshSummary.lastActivityDate === null,
    show(freshSummary)
  )

  check(
    "new account shows 0 of 3 challenges, next level at 100 XP",
    freshSummary &&
      freshSummary.completedChallenges === 0 &&
      freshSummary.totalChallenges === 3 &&
      freshSummary.progressPercentage === 0 &&
      freshSummary.xpForNextLevel === 100,
    show(freshSummary)
  )

  check("progress response has no password data", !fresh.text.includes("$2"))

  /* ---------- order rules ---------- */

  section("Existing progression rules still hold")

  const lockedChallenge = await submit(userA.token, 2, 1, null, TIER1_ANSWER)

  check("Challenge 2 is locked until Challenge 1 is done (403)", lockedChallenge.status === 403)

  const tierTwoEarly = await submit(userA.token, 1, 2, 1, EXPLAIN_ANSWER)

  check("Tier 2 is locked until Tier 1 is done (403)", tierTwoEarly.status === 403)

  /* ---------- challenge 1 end to end ---------- */

  section("Challenge 1: XP, level-up and streak")

  const wrongOne = await submit(userA.token, 1, 1, null, "xss")

  check(
    "a wrong answer gets teaching feedback and 0 XP",
    wrongOne.status === 200 &&
      wrongOne.data.correct === false &&
      wrongOne.data.points === 0 &&
      typeof wrongOne.data.message === "string" &&
      wrongOne.data.message.length > 10,
    show(wrongOne.data)
  )

  const afterWrong = await getProgress(userA.token)

  check("a wrong answer does not change XP", afterWrong.data.summary.xp === 0)

  const tierOne = await submit(userA.token, 1, 1, null, TIER1_ANSWER)

  check(
    "Tier 1 correct: +30 XP, streak starts at 1",
    tierOne.data.correct === true &&
      tierOne.data.points === 30 &&
      tierOne.data.summary.xp === 30 &&
      tierOne.data.summary.level === 1 &&
      tierOne.data.summary.currentStreak === 1 &&
      tierOne.data.summary.longestStreak === 1 &&
      /^\d{4}-\d{2}-\d{2}$/.test(tierOne.data.summary.lastActivityDate),
    show(tierOne.data)
  )

  const tierOneAgain = await submit(userA.token, 1, 1, null, TIER1_ANSWER)
  const afterRepeat = await getProgress(userA.token)

  check(
    "repeating Tier 1 gives no extra XP",
    tierOneAgain.data.points === 0 &&
      tierOneAgain.data.alreadyCompleted === true &&
      afterRepeat.data.summary.xp === 30,
    show(tierOneAgain.data)
  )

  const skipExplain = await submit(userA.token, 1, 2, 2, FIX_ANSWER)

  check("the fix cannot be submitted before the explanation (403)", skipExplain.status === 403)

  const shortExplain = await submit(userA.token, 1, 2, 1, "sql injection")

  check("a one-phrase explanation is not accepted", shortExplain.data.correct === false)

  const explain = await submit(userA.token, 1, 2, 1, EXPLAIN_ANSWER)

  check(
    "a good explanation passes and gives 0 XP",
    explain.data.correct === true && explain.data.points === 0 && explain.data.summary.xp === 30,
    show(explain.data)
  )

  const wrongFix = await submit(userA.token, 1, 2, 2, "sanitize the input")

  check("cleaning input alone is not accepted as the fix", wrongFix.data.correct === false)

  const fix = await submit(userA.token, 1, 2, 2, FIX_ANSWER)

  check(
    "the fix gives +30 XP (60 total, still Level 1)",
    fix.data.correct === true &&
      fix.data.points === 30 &&
      fix.data.summary.xp === 60 &&
      fix.data.summary.level === 1 &&
      fix.data.leveledUp === false,
    show(fix.data)
  )

  const tierThree = await submit(userA.token, 1, 3, null, TIER3_ANSWERS[1])

  check(
    "Tier 3 gives +40 XP: 100 total crosses into Level 2",
    tierThree.data.correct === true &&
      tierThree.data.points === 40 &&
      tierThree.data.summary.xp === 100 &&
      tierThree.data.summary.level === 2 &&
      tierThree.data.leveledUp === true &&
      tierThree.data.challengeCompleted === true &&
      tierThree.data.nextChallengeId === 2,
    show(tierThree.data)
  )

  const afterOne = await getProgress(userA.token)
  const summaryOne = afterOne.data.summary

  check(
    "saved progress shows 100 XP, Level 2, 1 of 3 challenges",
    summaryOne.xp === 100 &&
      summaryOne.level === 2 &&
      summaryOne.xpForNextLevel === 200 &&
      summaryOne.xpToNextLevel === 100 &&
      summaryOne.completedChallenges === 1 &&
      summaryOne.progressPercentage === 33,
    show(summaryOne)
  )

  /* ---------- same-day streak ---------- */

  section("Streak does not grow twice on the same day")

  const stepsTwo = await completeChallenge(userA.token, 2)

  check(
    "Challenge 2 steps all succeed",
    stepsTwo.every((step) => step.status === 200 && step.data.correct === true),
    show(stepsTwo.map((step) => step.status))
  )

  check(
    "streak stays at 1 after every step of a second challenge today",
    stepsTwo.every(
      (step) =>
        step.data.summary &&
        step.data.summary.currentStreak === 1 &&
        step.data.summary.longestStreak === 1
    )
  )

  const lastStepTwo = stepsTwo[stepsTwo.length - 1].data

  check(
    "200 XP reaches Level 3",
    lastStepTwo.summary.xp === 200 && lastStepTwo.summary.level === 3 && lastStepTwo.leveledUp === true,
    show(lastStepTwo.summary)
  )

  const stepsThree = await completeChallenge(userA.token, 3)
  const lastStepThree = stepsThree[stepsThree.length - 1].data

  check(
    "all 3 challenges: 300 XP, Level 4, streak still 1",
    lastStepThree.summary.xp === 300 &&
      lastStepThree.summary.level === 4 &&
      lastStepThree.summary.completedChallenges === 3 &&
      lastStepThree.summary.progressPercentage === 100 &&
      lastStepThree.summary.currentStreak === 1 &&
      lastStepThree.summary.longestStreak === 1,
    show(lastStepThree.summary)
  )

  /* ---------- XP manipulation ---------- */

  section("The client cannot supply XP, level or streak")

  const userB = await createUser("b")

  check("second test account created", Boolean(userB.token))

  const fakeFields = {
    points: 9999,
    xp: 9999,
    score: 9999,
    level: 50,
    currentStreak: 99,
    longestStreak: 99,
    lastActivityDate: "2099-01-01",
  }

  const cheatWrong = await submit(userB.token, 1, 1, null, "xss", fakeFields)
  const afterCheatWrong = await getProgress(userB.token)

  check(
    "fake XP/level/streak with a wrong answer changes nothing",
    cheatWrong.data.correct === false &&
      afterCheatWrong.data.summary.xp === 0 &&
      afterCheatWrong.data.summary.currentStreak === 0,
    show(afterCheatWrong.data.summary)
  )

  const cheatRight = await submit(userB.token, 1, 1, null, TIER1_ANSWER, fakeFields)

  check(
    "fake XP/level/streak with a right answer: server still awards exactly 30 XP",
    cheatRight.data.points === 30 &&
      cheatRight.data.summary.xp === 30 &&
      cheatRight.data.summary.level === 1 &&
      cheatRight.data.summary.currentStreak === 1 &&
      cheatRight.data.summary.longestStreak === 1 &&
      cheatRight.data.summary.lastActivityDate !== "2099-01-01",
    show(cheatRight.data.summary)
  )

  for (const [method, path] of [
    ["POST", "/api/progress"],
    ["PUT", "/api/progress"],
    ["PATCH", "/api/progress"],
    ["POST", "/api/leaderboard"],
    ["GET", "/api/progress/1"],
  ]) {
    const response = await request(method, path, {
      token: userB.token,
      body: { xp: 9999, level: 50 },
    })

    check(
      `${method} ${path} has no way to write XP (404)`,
      response.status === 404,
      `status ${response.status}`
    )
  }

  /* ---------- other users ---------- */

  section("Users cannot change each other's progress")

  const beforeA = await getProgress(userA.token)

  const rowBefore = beforeA.data.progress.find((row) => row.challenge_id === 1)

  const sneaky = await request(
    "POST",
    `/api/challenges/1/answer?userId=${userA.id}&user_id=${userA.id}`,
    {
      token: userB.token,
      body: {
        tier: 2,
        step: 1,
        answer: EXPLAIN_ANSWER,
        userId: userA.id,
        user_id: userA.id,
      },
    }
  )

  const afterA = await getProgress(userA.token)
  const afterB = await getProgress(userB.token)

  const rowAfter = afterA.data.progress.find((row) => row.challenge_id === 1)
  const rowB = afterB.data.progress.find((row) => row.challenge_id === 1)

  check(
    "a request carrying another user's id is applied to the token's user only",
    sneaky.status === 200 && rowB && rowB.tier2_explained === 1,
    show(rowB)
  )

  check(
    "the other user's progress is untouched",
    show(rowBefore) === show(rowAfter) && afterA.data.summary.xp === 300,
    show(afterA.data.summary)
  )

  const forgedHs = `${toBase64Url({ alg: "HS256", typ: "JWT" })}.${toBase64Url({
    userId: userA.id,
    username: userA.username,
  })}.forgedsignature`

  const forgedNone = `${toBase64Url({ alg: "none", typ: "JWT" })}.${toBase64Url({
    userId: userA.id,
    username: userA.username,
  })}.`

  const forgedOne = await getProgress(forgedHs)
  const forgedTwo = await getProgress(forgedNone)

  check("a forged token with a fake signature is rejected (403)", forgedOne.status === 403)
  check('a forged token using alg "none" is rejected (403)', forgedTwo.status === 403)

  /* ---------- malformed requests ---------- */

  section("Malformed requests are handled safely")

  const base = { tier: 1, answer: "sql injection" }

  const malformed = [
    ["tier is not a number", { ...base, tier: "abc" }, 400],
    ["tier is out of range", { ...base, tier: 99 }, 400],
    ["tier is missing", { answer: "sql injection" }, 400],
    ["answer is a number", { ...base, answer: 12345 }, 400],
    ["answer is an array", { ...base, answer: ["a"] }, 400],
    ["answer is empty", { ...base, answer: "" }, 400],
    ["answer is too long", { ...base, answer: "a".repeat(1001) }, 400],
    ["step used with Tier 1", { ...base, step: 1 }, 400],
    ["Tier 2 with an invalid step", { tier: 2, step: 5, answer: "x" }, 400],
  ]

  for (const [label, body, expected] of malformed) {
    const response = await request("POST", "/api/challenges/1/answer", {
      token: userB.token,
      body,
    })

    check(
      `${label} -> ${expected}`,
      response.status === expected,
      `status ${response.status}`
    )
  }

  const noBody = await request("POST", "/api/challenges/1/answer", {
    token: userB.token,
  })

  check("no body at all -> 400", noBody.status === 400, `status ${noBody.status}`)

  const badJson = await request("POST", "/api/challenges/1/answer", {
    token: userB.token,
    rawBody: "{ broken",
  })

  check("invalid JSON -> 400", badJson.status === 400, `status ${badJson.status}`)

  const hugeBody = await request("POST", "/api/challenges/1/answer", {
    token: userB.token,
    body: { tier: 1, answer: "a".repeat(200000) },
  })

  check("oversized body -> 413", hugeBody.status === 413, `status ${hugeBody.status}`)

  const badId = await request("POST", "/api/challenges/abc/answer", {
    token: userB.token,
    body: base,
  })

  check("challenge id that is not a number -> 400", badId.status === 400)

  const missingChallenge = await request("POST", "/api/challenges/999/answer", {
    token: userB.token,
    body: base,
  })

  check("unknown challenge id -> 404", missingChallenge.status === 404)

  /* ---------- leaderboard ---------- */

  section("Leaderboard")

  const boardA = await request("GET", "/api/leaderboard", { token: userA.token })
  const boardB = await request("GET", "/api/leaderboard", { token: userB.token })

  check("leaderboard works with a token", boardA.status === 200 && Array.isArray(boardA.data.leaderboard))

  const rows = boardA.data.leaderboard

  check("at most 10 rows are returned", rows.length <= 10)

  check(
    "rows have only rank, username, xp, level and isCurrentUser",
    rows.every(
      (row) =>
        Object.keys(row).sort().join(",") ===
        "isCurrentUser,level,rank,username,xp"
    ),
    show(rows[0])
  )

  check(
    "no password hash, user id or token appears anywhere",
    !boardA.text.includes("$2") &&
      !boardA.text.toLowerCase().includes("password") &&
      !boardA.text.includes(userA.token) &&
      !boardA.text.toLowerCase().includes("userid")
  )

  check(
    "ranks run 1, 2, 3... and XP never goes up as rank goes down",
    rows.every(
      (row, index) =>
        row.rank === index + 1 && (index === 0 || rows[index - 1].xp >= row.xp)
    )
  )

  check(
    "level in each row matches its XP",
    rows.every((row) => row.level === progression.getLevelForXp(row.xp))
  )

  const me = boardA.data.currentUser
  const meB = boardB.data.currentUser

  check(
    "currentUser shows the requester's own rank, XP and level",
    me &&
      me.username === userA.username &&
      me.xp === 300 &&
      me.level === 4 &&
      Number.isInteger(me.rank) &&
      me.rank >= 1,
    show(me)
  )

  check(
    "the user with more XP ranks higher than the user with less",
    meB && meB.xp === 30 && Number.isInteger(meB.rank) && me.rank < meB.rank,
    `${show(me)} vs ${show(meB)}`
  )

  const myRow = rows.find((row) => row.username === userA.username)

  check(
    "the requester's own row is flagged (if inside the top 10)",
    !myRow || (myRow.isCurrentUser === true && myRow.rank === me.rank)
  )

  const boardAgain = await request("GET", "/api/leaderboard", { token: userA.token })

  check("the order is stable between requests", show(boardAgain.data) === show(boardA.data))

  const userC = await createUser("c")
  const boardC = await request("GET", "/api/leaderboard", { token: userC.token })

  check(
    "a user with 0 XP is unranked (rank null, 0 XP, Level 1)",
    boardC.data.currentUser.rank === null &&
      boardC.data.currentUser.xp === 0 &&
      boardC.data.currentUser.level === 1 &&
      !boardC.data.leaderboard.some((row) => row.username === userC.username),
    show(boardC.data.currentUser)
  )

  /* ---------- existing features ---------- */

  section("Existing features still work")

  const challengeList = await request("GET", "/api/challenges")

  check(
    "challenge list returns the 3 challenges",
    challengeList.status === 200 &&
      Array.isArray(challengeList.data) &&
      challengeList.data.length === 3
  )

  check(
    "challenge list does not leak answers or secure code",
    !challengeList.text.includes("secureCode") &&
      !challengeList.text.includes('"accept"') &&
      !challengeList.text.includes('"groups"') &&
      !challengeList.text.includes("misconceptions")
  )

  const oneChallenge = await request("GET", "/api/challenges/1")

  check("single challenge works", oneChallenge.status === 200 && oneChallenge.data.id === 1)

  const missingOne = await request("GET", "/api/challenges/999")

  check("unknown challenge is 404", missingOne.status === 404)

  const me2 = await request("GET", "/api/auth/me", { token: userA.token })

  check(
    "/api/auth/me returns the logged-in user",
    me2.status === 200 && me2.data.user.username === userA.username
  )

  const relogin = await request("POST", "/api/auth/login", {
    body: { username: userB.username, password: userB.password },
  })

  check("logging in again works", relogin.status === 200 && Boolean(relogin.data.token))

  const lockedForC = await submit(userC.token, 3, 1, null, TIER1_ANSWER)

  check("a brand-new account cannot jump to Challenge 3 (403)", lockedForC.status === 403)
}

/* =========================================
   CLEAN UP AND REPORT
========================================= */

function cleanUp() {
  if (KEEP_DATA) {
    console.log(`\nTest accounts kept (--keep). Their names start with "${TEST_PREFIX}".`)
    return
  }

  try {
    const db = require("../database")
    const pattern = `${TEST_PREFIX}%`

    db.prepare(`
      DELETE FROM progress
      WHERE user_id IN (
        SELECT id FROM users WHERE username LIKE ?
      )
    `).run(pattern)

    const removed = db
      .prepare("DELETE FROM users WHERE username LIKE ?")
      .run(pattern)

    console.log(`\nRemoved ${removed.changes} test accounts.`)
  } catch (error) {
    console.log(
      `\nCould not remove the test accounts automatically (${error.message}).`
    )
    console.log(`They are named "${TEST_PREFIX}...". You can ignore them or delete them.`)
  }
}

function report() {
  const failed = results.filter((item) => !item.passed)

  console.log("\n=========================================")
  console.log(`${results.length - failed.length} passed, ${failed.length} failed, ${results.length} total`)

  if (failed.length > 0) {
    console.log("\nFailed checks:")

    for (const item of failed) {
      console.log(`  [${item.section}] ${item.name}`)
    }
  }

  console.log("=========================================")

  return failed.length
}

async function main() {
  runRuleChecks()

  try {
    await runServerChecks()
  } catch (error) {
    console.error("\nThe check script stopped because of an unexpected error:")
    console.error(error)
    results.push({
      section: currentSection,
      name: "script finished without errors",
      passed: false,
    })
  }

  cleanUp()

  process.exit(report() === 0 ? 0 : 1)
}

main()
