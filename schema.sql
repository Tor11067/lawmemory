-- ===================================================
-- Cloudflare D1 Database Schema for LawMemory App
-- ===================================================

-- 1. Table for Law Sections (มาตรากฎหมาย)
CREATE TABLE IF NOT EXISTS sections (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,                     -- 'criminal' หรือ 'civil'
  code_name TEXT NOT NULL,                -- 'ประมวลกฎหมายอาญา' หรือ 'ประมวลกฎหมายแพ่งและพาณิชย์'
  number TEXT NOT NULL,                   -- เลขมาตรา เช่น '59', '288'
  title TEXT NOT NULL,                    -- ชื่อเรียกมาตรา
  principles TEXT NOT NULL,               -- ข้อความการวางหลักสำหรับท่องจำ
  full_text TEXT NOT NULL,                -- ตัวบทกฎหมายฉบับเต็ม
  explanation TEXT,                       -- คำอธิบายมาตรา
  tags TEXT,                              -- แท็กหมวดหมู่ (JSON Array)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table for User Spaced Repetition Progress (ความคืบหน้าการท่องจำแต่ละมาตรา)
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

-- 3. Table for Practice History Logs (ประวัติการฝึกพิมพ์แต่ละรอบ)
CREATE TABLE IF NOT EXISTS practice_logs (
  id TEXT PRIMARY KEY,
  section_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  accuracy INTEGER NOT NULL,
  date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
);

-- 4. Table for User Overall Stats & Daily Streak (สถิติรวมและ Streak)
CREATE TABLE IF NOT EXISTS user_stats (
  id TEXT PRIMARY KEY DEFAULT 'default_user',
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_completed_sessions INTEGER DEFAULT 0,
  total_typed_words INTEGER DEFAULT 0,
  last_active_date TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_sections_code_num ON sections(code, number);
CREATE INDEX IF NOT EXISTS idx_practice_logs_date ON practice_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_practice_logs_sec ON practice_logs(section_id);
