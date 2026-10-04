/* =========================================
   PROGRESS STORE

   All SQL for XP, streaks and the leaderboard.
   Every query is parameterized, and every value
   comes from the database. Nothing here accepts
   XP, level or streak values from a client.
========================================= */

const db = require("./database")
const {
  getDateString,
  computeStreakUpdate,
  buildProgressSummary,
  getLevelForXp,
} = require("./progression")

/* =========================================
   PREPARED STATEMENTS
========================================= */

const totalXpStatement = db.prepare(`
  SELECT COALESCE(SUM(score), 0) AS xp
  FROM progress
  WHERE user_id = ?
`)

const completedCountStatement = db.prepare(`
  SELECT COUNT(*) AS completed
  FROM progress
  WHERE user_id = ?
    AND completed = 1
`)

const streakStatement = db.prepare(`
  SELECT
    username,
    current_streak,
    longest_streak,
    last_activity_date
  FROM users
  WHERE id = ?
`)

const updateStreakStatement = db.prepare(`
  UPDATE users
  SET
    current_streak = ?,
    longest_streak = ?,
    last_activity_date = ?
  WHERE id = ?
`)

// Learners with at least 1 XP, best first.
// Ties are broken by the earliest account (lowest id), so the
// order is always the same for the same data.
const topLearnersStatement = db.prepare(`
  SELECT
    u.id AS id,
    u.username AS username,
    SUM(p.score) AS xp
  FROM users u
  JOIN progress p ON p.user_id = u.id
  GROUP BY u.id
  HAVING SUM(p.score) > 0
  ORDER BY xp DESC, u.id ASC
  LIMIT ?
`)

// How many learners are ranked ahead of a given learner.
const learnersAheadStatement = db.prepare(`
  SELECT COUNT(*) AS ahead
  FROM (
    SELECT
      u.id AS id,
      SUM(p.score) AS xp
    FROM users u
    JOIN progress p ON p.user_id = u.id
    GROUP BY u.id
  ) AS totals
  WHERE totals.xp > ?
     OR (totals.xp = ? AND totals.id < ?)
`)

/* =========================================
   XP
========================================= */

function getTotalXp(userId) {
  return Number(totalXpStatement.get(userId).xp)
}

function getCompletedChallengeCount(userId) {
  return Number(completedCountStatement.get(userId).completed)
}

/* =========================================
   STREAK
========================================= */

function getStreakState(userId) {
  const row = streakStatement.get(userId)

  if (!row) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
    }
  }

  return {
    currentStreak: Number(row.current_streak) || 0,
    longestStreak: Number(row.longest_streak) || 0,
    lastActivityDate: row.last_activity_date || null,
  }
}

// Call this when the learner earns XP. It is safe to call many
// times on the same day: the streak only changes once per day.
function recordLearningActivity(userId, now = new Date()) {
  const today = getDateString(now)
  const state = getStreakState(userId)
  const update = computeStreakUpdate(state, today)

  if (update.changed) {
    updateStreakStatement.run(
      update.currentStreak,
      update.longestStreak,
      update.lastActivityDate,
      userId
    )
  }

  return update
}

/* =========================================
   SUMMARY
========================================= */

function getProgressSummary(userId, totalChallenges, now = new Date()) {
  return buildProgressSummary({
    xp: getTotalXp(userId),
    completedChallenges: getCompletedChallengeCount(userId),
    totalChallenges,
    streak: getStreakState(userId),
    today: getDateString(now),
  })
}

/* =========================================
   LEADERBOARD

   Public fields only: rank, username, xp, level,
   and a flag marking the requesting user's own row.
   User ids, password hashes and tokens are never returned.
========================================= */

function getLeaderboard(currentUserId, limit) {
  const rows = topLearnersStatement.all(limit)

  const leaderboard = rows.map((row, index) => ({
    rank: index + 1,
    username: row.username,
    xp: Number(row.xp),
    level: getLevelForXp(row.xp),
    isCurrentUser: row.id === currentUserId,
  }))

  const currentUserXp = getTotalXp(currentUserId)
  const currentUserRow = streakStatement.get(currentUserId)

  // A learner with no XP yet has no rank.
  let currentUserRank = null

  if (currentUserXp > 0) {
    const { ahead } = learnersAheadStatement.get(
      currentUserXp,
      currentUserXp,
      currentUserId
    )

    currentUserRank = Number(ahead) + 1
  }

  return {
    leaderboard,
    currentUser: {
      rank: currentUserRank,
      username: currentUserRow ? currentUserRow.username : "",
      xp: currentUserXp,
      level: getLevelForXp(currentUserXp),
    },
  }
}

module.exports = {
  getTotalXp,
  getCompletedChallengeCount,
  getStreakState,
  recordLearningActivity,
  getProgressSummary,
  getLeaderboard,
}
