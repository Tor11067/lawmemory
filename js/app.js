import { renderLibraryView } from './ui/libraryView.js';
import { renderGameView } from './ui/gameView.js';
import { renderStatsView } from './ui/statsView.js';
import { renderSettingsView } from './ui/settingsView.js';
import { getUserStats, getTodayDueSections, getSettings, saveSettings, checkAndSyncCloudflare } from './data/storage.js';
import { setSoundVolume, setMuted } from './game/soundEngine.js';

class App {
  constructor() {
    this.currentView = 'library';
    this.selectedGameSectionId = null;
    this.selectedGameLevel = 1;
    this.init();
  }

  init() {
    const settings = getSettings();
    if (settings.soundVolume !== undefined) {
      setSoundVolume(settings.soundVolume / 100);
    }
    if (settings.soundEnabled !== undefined) {
      setMuted(!settings.soundEnabled);
    }
    this.applyTheme();
    this.updateNavbarBadges();
    this.bindNavigation();
    this.renderCurrentView();

    // Automatically check and sync with Cloudflare D1 if deployed
    checkAndSyncCloudflare().then(connected => {
      if (connected) {
        this.updateNavbarBadges();
        if (this.currentView === 'library' || this.currentView === 'stats') {
          this.renderCurrentView();
        }
      }
    });

    // Listen for custom navigation events
    window.addEventListener('navigate-game', (e) => {
      this.selectedGameSectionId = e.detail?.sectionId || null;
      this.selectedGameLevel = e.detail?.level || 1;
      this.switchView('game');
    });

    window.addEventListener('cloudflare-status-changed', () => {
      this.updateNavbarBadges();
    });
  }

  applyTheme() {
    const settings = getSettings();
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) {
      themeBtn.innerHTML = settings.darkMode ? '☀️' : '🌙';
    }
  }

  toggleTheme() {
    const settings = getSettings();
    settings.darkMode = !settings.darkMode;
    saveSettings(settings);
    this.applyTheme();
  }

  updateNavbarBadges() {
    const stats = getUserStats();
    const due = getTodayDueSections();

    // Streak badge
    const streakEl = document.getElementById('nav-streak-count');
    if (streakEl) {
      streakEl.textContent = stats.currentStreak || 0;
    }

    // Due badge
    const dueEl = document.getElementById('nav-due-badge');
    if (dueEl) {
      if (due.length > 0) {
        dueEl.textContent = due.length;
        dueEl.classList.remove('hidden');
      } else {
        dueEl.classList.add('hidden');
      }
    }
  }

  bindNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = link.getAttribute('data-view');
        this.switchView(targetView);
      });
    });

    const themeBtn = document.getElementById('btn-toggle-theme');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }
  }

  switchView(viewName) {
    this.currentView = viewName;

    // Update active nav styling
    document.querySelectorAll('.nav-link').forEach(link => {
      const view = link.getAttribute('data-view');
      if (view === viewName) {
        link.classList.add('bg-indigo-50', 'dark:bg-indigo-950/60', 'text-indigo-600', 'dark:text-indigo-400', 'font-bold');
        link.classList.remove('text-slate-600', 'dark:text-slate-400');
      } else {
        link.classList.remove('bg-indigo-50', 'dark:bg-indigo-950/60', 'text-indigo-600', 'dark:text-indigo-400', 'font-bold');
        link.classList.add('text-slate-600', 'dark:text-slate-400');
      }
    });

    this.renderCurrentView();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  renderCurrentView() {
    const mainContainer = document.getElementById('app-main');
    if (!mainContainer) return;

    this.updateNavbarBadges();

    if (this.currentView === 'library') {
      renderLibraryView(mainContainer, (sectionId) => {
        this.selectedGameSectionId = sectionId;
        this.selectedGameLevel = 1;
        this.switchView('game');
      });
    } else if (this.currentView === 'game') {
      renderGameView(mainContainer, this.selectedGameSectionId, this.selectedGameLevel);
    } else if (this.currentView === 'stats') {
      renderStatsView(mainContainer, (sectionId) => {
        this.selectedGameSectionId = sectionId;
        this.selectedGameLevel = 1;
        this.switchView('game');
      });
    } else if (this.currentView === 'settings') {
      renderSettingsView(mainContainer, () => {
        this.renderCurrentView();
      });
    }
  }
}

// Boot application
window.addEventListener('DOMContentLoaded', () => {
  window.appInstance = new App();
});
