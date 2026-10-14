import { INITIAL_SECTIONS } from '../../js/data/initialData.js';

export async function onRequest(context) {
  const { env, request } = context;

  // Check D1 binding
  if (!env.DB) {
    return new Response(JSON.stringify({
      ok: false,
      error: "Cloudflare D1 database binding 'DB' is not configured in Cloudflare Pages. Please bind your D1 database with variable name 'DB'."
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // 1. Create tables if not exist
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS sections (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        code_name TEXT NOT NULL,
        number TEXT NOT NULL,
        title TEXT NOT NULL,
        principles TEXT NOT NULL,
        full_text TEXT NOT NULL,
        explanation TEXT,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_progress (
        section_id TEXT PRIMARY KEY,
        highest_level_passed INTEGER DEFAULT 0,
        repetitions INTEGER DEFAULT 0,
        interval_days INTEGER DEFAULT 1,
        ease_factor REAL DEFAULT 2.5,
        last_reviewed TEXT,
        next_review TEXT,
        last_accuracy INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS practice_logs (
        id TEXT PRIMARY KEY,
        section_id TEXT NOT NULL,
        level INTEGER NOT NULL,
        accuracy INTEGER NOT NULL,
        date TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_stats (
        id TEXT PRIMARY KEY DEFAULT 'default_user',
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        total_completed_sessions INTEGER DEFAULT 0,
        total_typed_words INTEGER DEFAULT 0,
        last_active_date TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_sections_code_num ON sections(code, number);
      CREATE INDEX IF NOT EXISTS idx_practice_logs_date ON practice_logs(date DESC);
      CREATE INDEX IF NOT EXISTS idx_practice_logs_sec ON practice_logs(section_id);
    `);

    // 2. Check sections count
    const countRes = await env.DB.prepare("SELECT COUNT(*) AS total FROM sections").first();
    let seeded = 0;

    if (!countRes || countRes.total === 0) {
      // Seed initial sections
      const stmt = env.DB.prepare(`
        INSERT OR IGNORE INTO sections (id, code, code_name, number, title, principles, full_text, explanation, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const batch = INITIAL_SECTIONS.map(s => stmt.bind(
        s.id,
        s.code,
        s.codeName,
        s.number,
        s.title,
        s.principles,
        s.fullText,
        s.explanation || '',
        JSON.stringify(s.tags || [])
      ));

      await env.DB.batch(batch);
      seeded = INITIAL_SECTIONS.length;
    }

    // 3. Ensure default user stats row
    await env.DB.prepare(`
      INSERT OR IGNORE INTO user_stats (id, current_streak, longest_streak, total_completed_sessions, total_typed_words)
      VALUES ('default_user', 0, 0, 0, 0)
    `).run();

    const currentCount = await env.DB.prepare("SELECT COUNT(*) AS total FROM sections").first();

    return new Response(JSON.stringify({
      ok: true,
      message: "Cloudflare D1 Database connected and initialized successfully!",
      sectionsCount: currentCount ? currentCount.total : seeded,
      newlySeeded: seeded
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({
      ok: false,
      error: err.message,
      stack: err.stack
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
