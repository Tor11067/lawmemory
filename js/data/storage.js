import { INITIAL_SECTIONS } from './initialData.js';

const STORAGE_KEYS = {
  SECTIONS: 'law_app_sections_v3',
  PROGRESS: 'law_app_srs_progress_v2',
  STATS: 'law_app_user_stats_v2',
  SETTINGS: 'law_app_settings_v2'
};

// ===================== SECTIONS MANAGEMENT =====================

export function getSections() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SECTIONS);
    if (!raw) {
      // First time initialization with v2
      saveSections(INITIAL_SECTIONS);
      return INITIAL_SECTIONS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading sections from localStorage', e);
    return INITIAL_SECTIONS;
  }
}

export function saveSections(sections) {
  try {
    localStorage.setItem(STORAGE_KEYS.SECTIONS, JSON.stringify(sections));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sections-updated', { detail: { sections } }));
    }
  } catch (e) {
    console.error('Error saving sections to localStorage', e);
  }
}

export function getSectionById(id) {
  const sections = getSections();
  return sections.find(s => s.id === id) || null;
}

export function saveOrUpdateSection(section) {
  const sections = getSections();
  const idx = sections.findIndex(s => s.id === section.id);
  let updated;
  if (idx >= 0) {
    updated = { ...sections[idx], ...section, updatedAt: new Date().toISOString() };
    sections[idx] = updated;
  } else {
    updated = {
      ...section,
      id: section.id || `custom-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    sections.push(updated);
  }
  saveSections(sections);
  syncSectionToCloudflare(updated);
  return updated;
}

export function deleteSection(id) {
  const sections = getSections();
  const filtered = sections.filter(s => s.id !== id);
  saveSections(filtered);
  deleteSectionFromCloudflare(id);
}

export function resetSectionsToDefault() {
  saveSections(INITIAL_SECTIONS);
  return INITIAL_SECTIONS;
}

// ===================== SRS PROGRESS & STREAK =====================

export function getAllProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Error reading progress', e);
    return {};
  }
}

export function getProgressForSection(sectionId) {
  const all = getAllProgress();
  return all[sectionId] || {
    sectionId,
    level: 1, // current level unlocked (1-5)
    highestLevelPassed: 0,
    interval: 0, // days
    repetitions: 0,
    easeFactor: 2.5,
    lastReviewed: null,
    nextReview: null,
    lastAccuracy: 0,
    lastWpm: 0,
    history: []
  };
}

export function saveSectionProgress(sectionId, progressUpdate) {
  const all = getAllProgress();
  const current = getProgressForSection(sectionId);
  all[sectionId] = {
    ...current,
    ...progressUpdate,
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(all));
  } catch (e) {
    console.error('Error saving progress', e);
  }
  return all[sectionId];
}

export function clearPracticeHistory() {
  try {
    const all = getAllProgress();
    Object.keys(all).forEach(secId => {
      if (all[secId]) {
        all[secId].history = [];
        all[secId].lastAccuracy = 0;
      }
    });
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(all));

    const stats = getUserStats();
    stats.totalCompletedSessions = 0;
    stats.totalTypedWords = 0;
    stats.totalPracticeSeconds = 0;
    saveUserStats(stats);
    clearAllHistoryFromCloudflare();
    return true;
  } catch (e) {
    console.error('Error clearing history', e);
    return false;
  }
}

export function deletePracticeHistoryItem(logId, sectionId = null) {
  try {
    const all = getAllProgress();
    let found = false;

    Object.keys(all).forEach(secId => {
      if (sectionId && secId !== sectionId) return;
      const prog = all[secId];
      if (prog && prog.history) {
        const initialLen = prog.history.length;
        prog.history = prog.history.filter(item => {
          if (item.id && item.id === logId) return false;
          if (item.date && item.date === logId) return false;
          return true;
        });
        if (prog.history.length < initialLen) found = true;
      }
    });

    if (found) {
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(all));
      const stats = getUserStats();
      if (stats.totalCompletedSessions > 0) {
        stats.totalCompletedSessions -= 1;
        saveUserStats(stats);
      }
      deleteHistoryFromCloudflare(logId);
    }
    return found;
  } catch (e) {
    console.error('Error deleting history item', e);
    return false;
  }
}

// ===================== USER STATS & DAILY STREAK =====================

export function getUserStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATS);
    const defaultStats = {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      totalPracticeSeconds: 0,
      totalCompletedSessions: 0,
      totalTypedWords: 0
    };
    return raw ? { ...defaultStats, ...JSON.parse(raw) } : defaultStats;
  } catch (e) {
    console.error('Error reading stats', e);
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      totalPracticeSeconds: 0,
      totalCompletedSessions: 0,
      totalTypedWords: 0
    };
  }
}

export function updateUserDailyStreak() {
  const stats = getUserStats();
  const todayStr = getTodayDateString();

  if (!stats.lastActiveDate) {
    // First day practice
    stats.currentStreak = 1;
    stats.longestStreak = 1;
    stats.lastActiveDate = todayStr;
  } else if (stats.lastActiveDate === todayStr) {
    // Already counted today
  } else {
    const yesterdayStr = getYesterdayDateString();
    if (stats.lastActiveDate === yesterdayStr) {
      // Practiced yesterday, streak increases
      stats.currentStreak += 1;
      if (stats.currentStreak > stats.longestStreak) {
        stats.longestStreak = stats.currentStreak;
      }
    } else {
      // Missed at least one day, reset streak to 1
      stats.currentStreak = 1;
    }
    stats.lastActiveDate = todayStr;
  }

  saveUserStats(stats);
  return stats;
}

export function recordPracticeSession({ sectionId, level, accuracy, wpm, timeSeconds, wordsCount }) {
  // Update Streak
  const stats = updateUserDailyStreak();
  stats.totalPracticeSeconds = (stats.totalPracticeSeconds || 0) + (timeSeconds || 0);
  stats.totalCompletedSessions = (stats.totalCompletedSessions || 0) + 1;
  stats.totalTypedWords = (stats.totalTypedWords || 0) + (wordsCount || 0);
  saveUserStats(stats);

  // Update Section SRS Progress
  const progress = getProgressForSection(sectionId);
  const isPassed = accuracy >= 80;

  let newHighest = progress.highestLevelPassed || 0;
  if (isPassed && level > newHighest) {
    newHighest = level;
  }

  // Calculate next SRS interval (Anki-like SM-2 simplified)
  let nextInterval = 1;
  let newRepetitions = progress.repetitions || 0;
  let ease = progress.easeFactor || 2.5;

  if (isPassed) {
    newRepetitions += 1;
    if (newRepetitions === 1) {
      nextInterval = 1;
    } else if (newRepetitions === 2) {
      nextInterval = 3;
    } else if (newRepetitions === 3) {
      nextInterval = 7;
    } else if (newRepetitions === 4) {
      nextInterval = 14;
    } else {
      nextInterval = Math.round(newRepetitions * 6 * (ease / 2.5));
    }
    // Boost ease slightly if high accuracy
    if (accuracy >= 95) ease = Math.min(3.0, ease + 0.1);
  } else {
    // Failed or low accuracy -> review again tomorrow
    newRepetitions = 0;
    nextInterval = 1;
    ease = Math.max(1.3, ease - 0.2);
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + nextInterval);
  const nextDateStr = nextDate.toISOString().split('T')[0];

  const historyItem = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    date: new Date().toISOString(),
    level,
    accuracy,
    wpm,
    timeSeconds
  };

  const updatedProgress = saveSectionProgress(sectionId, {
    highestLevelPassed: newHighest,
    repetitions: newRepetitions,
    interval: nextInterval,
    easeFactor: ease,
    lastReviewed: new Date().toISOString(),
    nextReview: nextDateStr,
    lastAccuracy: accuracy,
    lastWpm: wpm,
    history: [historyItem, ...(progress.history || []).slice(0, 19)] // keep last 20
  });

  // Background sync to Cloudflare D1
  syncSessionToCloudflare({
    sectionId,
    level,
    accuracy,
    logId: historyItem.id,
    date: historyItem.date,
    highestLevelPassed: newHighest,
    repetitions: newRepetitions,
    interval: nextInterval,
    easeFactor: ease,
    lastReviewed: historyItem.date,
    nextReview: nextDateStr
  });
  syncStatsToCloudflare(stats);

  return { stats, progress: updatedProgress };
}

export function saveUserStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
    syncStatsToCloudflare(stats);
  } catch (e) {
    console.error('Error saving user stats', e);
  }
}

// ===================== SETTINGS =====================

export function getSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const defaults = {
      soundEnabled: true,
      soundVolume: 60,
      autoAdvanceLevel: true,
      darkMode: false
    };
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch (e) {
    return { soundEnabled: true, soundVolume: 60, autoAdvanceLevel: true, darkMode: false };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings', e);
  }
}

// ===================== BACKUP & RESTORE =====================

export function exportAllDataAsJSON() {
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    sections: getSections(),
    progress: getAllProgress(),
    stats: getUserStats(),
    settings: getSettings()
  };
  return JSON.stringify(data, null, 2);
}

export function importAllDataFromJSON(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      throw new Error('รูปแบบไฟล์ไม่ถูกต้อง: ไม่พบรายการมาตรา');
    }
    saveSections(parsed.sections);
    if (parsed.progress) {
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(parsed.progress));
    }
    if (parsed.stats) {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(parsed.stats));
    }
    if (parsed.settings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed.settings));
    }
    return { success: true, count: parsed.sections.length };
  } catch (err) {
    console.error('Import failed', err);
    return { success: false, error: err.message };
  }
}

// ===================== HELPERS =====================

function getTodayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getYesterdayDateString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getTodayDueSections() {
  const sections = getSections();
  const allProgress = getAllProgress();
  const todayStr = getTodayDateString();

  return sections.filter(sec => {
    const prog = allProgress[sec.id];
    if (!prog || !prog.nextReview) {
      // Has not been reviewed yet -> could be due or new
      return false;
    }
    return prog.nextReview <= todayStr;
  });
}

// ===================== CLOUDFLARE D1 CLOUD SYNC =====================

let isCloudflareD1Active = false;

export function isCloudflareConnected() {
  return isCloudflareD1Active;
}

export async function checkAndSyncCloudflare() {
  try {
    const res = await fetch('/api/sections', {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) {
      isCloudflareD1Active = false;
      return false;
    }
    const remoteSections = await res.json();
    if (Array.isArray(remoteSections) && remoteSections.length > 0) {
      isCloudflareD1Active = true;
      saveSections(remoteSections);

      // Sync progress & history
      try {
        const progRes = await fetch('/api/progress');
        if (progRes.ok) {
          const remoteProg = await progRes.json();
          if (remoteProg && typeof remoteProg === 'object') {
            localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(remoteProg));
          }
        }
      } catch (e) {}

      // Sync stats
      try {
        const statsRes = await fetch('/api/stats');
        if (statsRes.ok) {
          const remoteStats = await statsRes.json();
          if (remoteStats && remoteStats.totalCompletedSessions !== undefined) {
            localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(remoteStats));
          }
        }
      } catch (e) {}

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cloudflare-status-changed', {
          detail: { connected: true, count: remoteSections.length }
        }));
      }
      return true;
    }
  } catch (err) {
    isCloudflareD1Active = false;
  }
  return false;
}

export async function setupCloudflareDatabase() {
  try {
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Accept': 'application/json' }
    });
    const data = await res.json();
    if (data.ok) {
      isCloudflareD1Active = true;
      await checkAndSyncCloudflare();
    }
    return data;
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function syncSectionToCloudflare(section) {
  try {
    await fetch('/api/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(section)
    });
  } catch (e) {}
}

async function deleteSectionFromCloudflare(id) {
  try {
    await fetch(`/api/sections?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  } catch (e) {}
}

async function syncSessionToCloudflare(sessionData) {
  try {
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionData)
    });
  } catch (e) {}
}

async function syncStatsToCloudflare(stats) {
  try {
    await fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stats)
    });
  } catch (e) {}
}

async function deleteHistoryFromCloudflare(logId) {
  try {
    await fetch(`/api/progress?logId=${encodeURIComponent(logId)}`, {
      method: 'DELETE'
    });
  } catch (e) {}
}

async function clearAllHistoryFromCloudflare() {
  try {
    await fetch('/api/progress?clearAll=true', {
      method: 'DELETE'
    });
  } catch (e) {}
}
