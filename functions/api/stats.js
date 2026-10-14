// GET /api/stats - Get overall stats & streak from Cloudflare D1
export async function onRequestGet(context) {
  const { env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "D1 database binding 'DB' not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const row = await env.DB.prepare(`
      SELECT current_streak AS currentStreak,
             longest_streak AS longestStreak,
             total_completed_sessions AS totalCompletedSessions,
             total_typed_words AS totalTypedWords,
             last_active_date AS lastActiveDate
      FROM user_stats
      WHERE id = 'default_user'
    `).first();

    const stats = row || {
      currentStreak: 0,
      longestStreak: 0,
      totalCompletedSessions: 0,
      totalTypedWords: 0,
      lastActiveDate: null
    };

    return new Response(JSON.stringify(stats), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// POST /api/stats - Update streak & stats in Cloudflare D1
export async function onRequestPost(context) {
  const { env, request } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "D1 database binding 'DB' not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await request.json();
    const { currentStreak, longestStreak, totalCompletedSessions, totalTypedWords, lastActiveDate } = body;

    await env.DB.prepare(`
      INSERT INTO user_stats (id, current_streak, longest_streak, total_completed_sessions, total_typed_words, last_active_date, updated_at)
      VALUES ('default_user', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        current_streak = excluded.current_streak,
        longest_streak = excluded.longest_streak,
        total_completed_sessions = excluded.total_completed_sessions,
        total_typed_words = excluded.total_typed_words,
        last_active_date = excluded.last_active_date,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      Number(currentStreak) || 0,
      Number(longestStreak) || 0,
      Number(totalCompletedSessions) || 0,
      Number(totalTypedWords) || 0,
      lastActiveDate || null
    ).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
