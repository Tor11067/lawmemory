// GET /api/progress - Fetch all section progress and practice logs
export async function onRequestGet(context) {
  const { env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "D1 database binding 'DB' not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // 1. Get all user_progress
    const progressRes = await env.DB.prepare(`
      SELECT section_id, highest_level_passed AS highestLevelPassed, repetitions,
             interval_days AS interval, ease_factor AS easeFactor,
             last_reviewed AS lastReviewed, next_review AS nextReview,
             last_accuracy AS lastAccuracy
      FROM user_progress
    `).all();

    // 2. Get recent practice logs
    const logsRes = await env.DB.prepare(`
      SELECT id, section_id AS sectionId, level, accuracy, date
      FROM practice_logs
      ORDER BY date DESC
      LIMIT 100
    `).all();

    const logsBySection = {};
    (logsRes.results || []).forEach(log => {
      if (!logsBySection[log.sectionId]) logsBySection[log.sectionId] = [];
      logsBySection[log.sectionId].push({
        id: log.id,
        level: log.level,
        accuracy: log.accuracy,
        date: log.date
      });
    });

    const progressMap = {};
    (progressRes.results || []).forEach(p => {
      progressMap[p.section_id] = {
        highestLevelPassed: p.highestLevelPassed || 0,
        repetitions: p.repetitions || 0,
        interval: p.interval || 1,
        easeFactor: p.easeFactor || 2.5,
        lastReviewed: p.lastReviewed,
        nextReview: p.nextReview,
        lastAccuracy: p.lastAccuracy || 0,
        history: logsBySection[p.section_id] || []
      };
    });

    return new Response(JSON.stringify(progressMap), {
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

// POST /api/progress - Record session result & update SRS progress
export async function onRequestPost(context) {
  const { env, request } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "D1 database binding 'DB' not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const data = await request.json();
    const {
      sectionId,
      level,
      accuracy,
      logId,
      highestLevelPassed,
      repetitions,
      interval,
      easeFactor,
      lastReviewed,
      nextReview,
      date
    } = data;

    if (!sectionId) {
      return new Response(JSON.stringify({ error: "Missing sectionId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const uniqueLogId = logId || ('log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));
    const logDate = date || new Date().toISOString();

    // 1. Insert practice log
    await env.DB.prepare(`
      INSERT INTO practice_logs (id, section_id, level, accuracy, date)
      VALUES (?, ?, ?, ?, ?)
    `).bind(uniqueLogId, sectionId, Number(level) || 1, Number(accuracy) || 0, logDate).run();

    // 2. Upsert user_progress
    await env.DB.prepare(`
      INSERT INTO user_progress (section_id, highest_level_passed, repetitions, interval_days, ease_factor, last_reviewed, next_review, last_accuracy, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(section_id) DO UPDATE SET
        highest_level_passed = MAX(user_progress.highest_level_passed, excluded.highest_level_passed),
        repetitions = excluded.repetitions,
        interval_days = excluded.interval_days,
        ease_factor = excluded.ease_factor,
        last_reviewed = excluded.last_reviewed,
        next_review = excluded.next_review,
        last_accuracy = excluded.last_accuracy,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      sectionId,
      Number(highestLevelPassed) || 0,
      Number(repetitions) || 0,
      Number(interval) || 1,
      Number(easeFactor) || 2.5,
      lastReviewed || logDate,
      nextReview || null,
      Number(accuracy) || 0
    ).run();

    return new Response(JSON.stringify({ success: true, logId: uniqueLogId }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// DELETE /api/progress - Delete specific log item or clear history
export async function onRequestDelete(context) {
  const { env, request } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "D1 database binding 'DB' not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const url = new URL(request.url);
    const logId = url.searchParams.get("logId");
    const clearAll = url.searchParams.get("clearAll") === 'true';

    if (clearAll) {
      await env.DB.prepare("DELETE FROM practice_logs").run();
      await env.DB.prepare("UPDATE user_progress SET repetitions = 0, interval_days = 1").run();
      await env.DB.prepare("UPDATE user_stats SET total_completed_sessions = 0").run();
      return new Response(JSON.stringify({ success: true, clearedAll: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (logId) {
      await env.DB.prepare("DELETE FROM practice_logs WHERE id = ? OR date = ?").bind(logId, logId).run();
      await env.DB.prepare(`
        UPDATE user_stats
        SET total_completed_sessions = MAX(0, total_completed_sessions - 1)
        WHERE id = 'default_user'
      `).run();
      return new Response(JSON.stringify({ success: true, deletedLogId: logId }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Missing logId or clearAll parameter" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
