import { INITIAL_SECTIONS } from '../../js/data/initialData.js';

// GET /api/sections - List all sections from Cloudflare D1
export async function onRequestGet(context) {
  const { env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({
      error: "D1 database binding 'DB' is not configured",
      d1Connected: false
    }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { results } = await env.DB.prepare(`
      SELECT id, code, code_name AS codeName, number, title, principles, full_text AS fullText, explanation, tags, updated_at
      FROM sections
      ORDER BY CASE WHEN code = 'criminal' THEN 1 ELSE 2 END, CAST(number AS INTEGER), number
    `).all();

    // If database is empty, auto-seed with initial sections
    if (!results || results.length === 0) {
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

      const refreshed = await env.DB.prepare(`
        SELECT id, code, code_name AS codeName, number, title, principles, full_text AS fullText, explanation, tags, updated_at
        FROM sections
        ORDER BY CASE WHEN code = 'criminal' THEN 1 ELSE 2 END, CAST(number AS INTEGER), number
      `).all();

      return formatSectionsResponse(refreshed.results || INITIAL_SECTIONS);
    }

    return formatSectionsResponse(results);
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// POST /api/sections - Upsert section (Create or Update)
export async function onRequestPost(context) {
  const { env, request } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await request.json();
    const { id, code, codeName, number, title, principles, fullText, explanation, tags } = body;

    if (!id || !title || !principles) {
      return new Response(JSON.stringify({ error: "Missing required fields: id, title, principles" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const tagsJson = JSON.stringify(tags || []);

    await env.DB.prepare(`
      INSERT INTO sections (id, code, code_name, number, title, principles, full_text, explanation, tags, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        code = excluded.code,
        code_name = excluded.code_name,
        number = excluded.number,
        title = excluded.title,
        principles = excluded.principles,
        full_text = excluded.full_text,
        explanation = excluded.explanation,
        tags = excluded.tags,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      id,
      code || 'criminal',
      codeName || (code === 'civil' ? 'ประมวลกฎหมายแพ่งและพาณิชย์' : 'ประมวลกฎหมายอาญา'),
      String(number || ''),
      title,
      principles,
      fullText || principles,
      explanation || '',
      tagsJson
    ).run();

    return new Response(JSON.stringify({
      success: true,
      section: {
        id,
        code,
        codeName,
        number,
        title,
        principles,
        fullText,
        explanation,
        tags: tags || []
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// DELETE /api/sections?id=xxx - Delete a section
export async function onRequestDelete(context) {
  const { env, request } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "D1 database binding 'DB' is not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const url = new URL(request.url);
    let id = url.searchParams.get("id");

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch (e) {}
    }

    if (!id) {
      return new Response(JSON.stringify({ error: "Missing section id to delete" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    await env.DB.prepare("DELETE FROM sections WHERE id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM user_progress WHERE section_id = ?").bind(id).run();
    await env.DB.prepare("DELETE FROM practice_logs WHERE section_id = ?").bind(id).run();

    return new Response(JSON.stringify({ success: true, deletedId: id }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

function formatSectionsResponse(rows) {
  const formatted = rows.map(r => {
    let parsedTags = [];
    try {
      parsedTags = typeof r.tags === 'string' ? JSON.parse(r.tags) : (r.tags || []);
    } catch (e) {
      parsedTags = [];
    }

    return {
      id: r.id,
      code: r.code,
      codeName: r.codeName,
      number: String(r.number),
      title: r.title,
      principles: r.principles,
      fullText: r.fullText,
      explanation: r.explanation || '',
      tags: parsedTags,
      updatedAt: r.updated_at
    };
  });

  return new Response(JSON.stringify(formatted), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=60",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
