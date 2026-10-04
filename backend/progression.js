/* =========================================
   PROGRESSION RULES (pure functions)

   Levels, streaks and dates.
   No database access in this file, so every
   rule can be tested on its own.
========================================= */

// XP needed to REACH each level. Index 0 is Level 1.
//   Level 1:    0 - 99
//   Level 2:  100 - 199
//   Level 3:  200 - 299
//   Level 4:  300 - 449
//   Level 5:  450 - 599
//   ...
const LEVEL_START_XP = [0, 100, 200, 300, 450, 600, 800, 1000, 1250, 1500]

// After the table ends, every extra level needs this much more XP.
const XP_PER_EXTRA_LEVEL = 300

const DEFAULT_TIMEZONE = "UTC"
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MS_PER_DAY = 24 * 60 * 60 * 1000

/* =========================================
   LEVELS
========================================= */

function toSafeXp(xp) {
  const number = Math.floor(Number(xp))

  return Number.isFinite(number) && number > 0 ? number : 0
}

// The XP at which a level begins.
function getLevelStartXp(level) {
  if (level <= LEVEL_START_XP.length) {
    return LEVEL_START_XP[level - 1]
  }

  const lastLevel = LEVEL_START_XP.length
  const extraLevels = level - lastLevel

  return LEVEL_START_XP[lastLevel - 1] + extraLevels * XP_PER_EXTRA_LEVEL
}

function getLevelForXp(xp) {
  const safeXp = toSafeXp(xp)
  let level = 1

  while (safeXp >= getLevelStartXp(level + 1)) {
    level += 1
  }

  return level
}

function describeLevel(xp) {
  const safeXp = toSafeXp(xp)
  const level = getLevelForXp(safeXp)
  const levelStartXp = getLevelStartXp(level)
  const xpForNextLevel = getLevelStartXp(level + 1)
  const levelSpan = xpForNextLevel - levelStartXp
  const xpIntoLevel = safeXp - levelStartXp

  return {
    level,
    levelStartXp,
    xpForNextLevel,
    xpIntoLevel,
    xpToNextLevel: xpForNextLevel - safeXp,
    levelProgressPercent: Math.min(
      100,
      Math.round((xpIntoLevel / levelSpan) * 100)
    ),
  }
}

/* =========================================
   DATES

   One calendar day is decided by the SERVER,
   in one timezone (STREAK_TIMEZONE, default UTC).
   The browser never supplies a date.
========================================= */

let cachedTimezone = null

function getStreakTimezone() {
  if (cachedTimezone) {
    return cachedTimezone
  }

  const requested = process.env.STREAK_TIMEZONE || DEFAULT_TIMEZONE

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: requested })
    cachedTimezone = requested
  } catch (error) {
    console.warn(
      `Unknown STREAK_TIMEZONE "${requested}". Using ${DEFAULT_TIMEZONE}.`
    )
    cachedTimezone = DEFAULT_TIMEZONE
  }

  return cachedTimezone
}

// Returns the calendar date as "YYYY-MM-DD" in the streak timezone.
function getDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: getStreakTimezone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)

  const pick = (type) => parts.find((part) => part.type === type).value

  return `${pick("year")}-${pick("month")}-${pick("day")}`
}

function isValidDateString(value) {
  return typeof value === "string" && DATE_PATTERN.test(value)
}

function toUtcMs(dateString) {
  const [year, month, day] = dateString.split("-").map(Number)

  return Date.UTC(year, month - 1, day)
}

// Whole calendar days from one date string to another.
// Plain calendar maths, so daylight saving cannot break it.
function daysBetween(fromDate, toDate) {
  return Math.round((toUtcMs(toDate) - toUtcMs(fromDate)) / MS_PER_DAY)
}

/* =========================================
   STREAKS

   state = { currentStreak, longestStreak, lastActivityDate }
========================================= */

function normalizeStreakState(state) {
  const source = state || {}

  return {
    currentStreak: Math.max(0, Math.floor(Number(source.currentStreak)) || 0),
    longestStreak: Math.max(0, Math.floor(Number(source.longestStreak)) || 0),
    lastActivityDate: isValidDateString(source.lastActivityDate)
      ? source.lastActivityDate
      : null,
  }
}

// What the streak becomes when the learner earns XP on `today`.
function computeStreakUpdate(state, today) {
  const { currentStreak, longestStreak, lastActivityDate } =
    normalizeStreakState(state)

  const gap = lastActivityDate ? daysBetween(lastActivityDate, today) : null

  // Same day (or the server clock moved backwards):
  // never count the same day twice.
  if (gap !== null && gap <= 0) {
    return {
      changed: false,
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      lastActivityDate,
    }
  }

  // Yesterday -> continue the streak. Anything else -> start again at 1.
  const nextStreak = gap === 1 ? currentStreak + 1 : 1

  return {
    changed: true,
    currentStreak: nextStreak,
    longestStreak: Math.max(longestStreak, nextStreak),
    lastActivityDate: today,
  }
}

// The streak to SHOW. If the learner missed a whole day,
// the stored value is stale, so we show 0 without changing the database.
function getDisplayedStreak(state, today) {
  const { currentStreak, lastActivityDate } = normalizeStreakState(state)

  if (!lastActivityDate) {
    return 0
  }

  return daysBetween(lastActivityDate, today) <= 1 ? currentStreak : 0
}

/* =========================================
   SUMMARY (shape returned by /api/progress)
========================================= */

function buildProgressSummary({
  xp,
  completedChallenges,
  totalChallenges,
  streak,
  today,
}) {
  const safeXp = toSafeXp(xp)
  const levelInfo = describeLevel(safeXp)
  const normalizedStreak = normalizeStreakState(streak)
  const currentStreak = getDisplayedStreak(normalizedStreak, today)

  const total = Math.max(0, Math.floor(Number(totalChallenges)) || 0)
  const completed = Math.min(
    total,
    Math.max(0, Math.floor(Number(completedChallenges)) || 0)
  )

  return {
    xp: safeXp,
    level: levelInfo.level,
    levelStartXp: levelInfo.levelStartXp,
    xpForNextLevel: levelInfo.xpForNextLevel,
    xpIntoLevel: levelInfo.xpIntoLevel,
    xpToNextLevel: levelInfo.xpToNextLevel,
    levelProgressPercent: levelInfo.levelProgressPercent,
    currentStreak,
    longestStreak: Math.max(normalizedStreak.longestStreak, currentStreak),
    lastActivityDate: normalizedStreak.lastActivityDate,
    completedChallenges: completed,
    totalChallenges: total,
    progressPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}

module.exports = {
  LEVEL_START_XP,
  getLevelStartXp,
  getLevelForXp,
  describeLevel,
  getDateString,
  isValidDateString,
  daysBetween,
  computeStreakUpdate,
  getDisplayedStreak,
  buildProgressSummary,
}
