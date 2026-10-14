import { getSections, getSectionById, getProgressForSection, getSettings, saveSettings } from '../data/storage.js';
import { TypingEngine } from '../game/typingEngine.js';
import { LEVEL_CONFIG } from '../game/tokenizer.js';
import { setMuted, isSoundMuted, setSoundVolume, getSoundVolume, playKeyClick } from '../game/soundEngine.js';
import { openEditModal } from './editModal.js';

export function renderGameView(container, initialSectionId = null, initialLevel = 1) {
  let sections = getSections();
  if (sections.length === 0) {
    container.innerHTML = `
      <div class="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700">
        <p class="text-slate-600 dark:text-slate-300">ยังไม่มีข้อมูลมาตราในระบบ</p>
      </div>
    `;
    return;
  }

  // Find target section or fallback to first
  let currentSection = sections.find(s => s.id === initialSectionId) || sections[0];
  let currentLevel = Number(initialLevel) || 1;
  let textType = 'principles'; // 'principles' | 'fullText'
  let isPeekingHints = false; // true when user clicks & holds hint button

  let engine = null;

  function initUI() {
    // Re-read sections from storage to ensure freshest data
    sections = getSections();
    currentSection = getSectionById(currentSection.id) || currentSection;

    container.innerHTML = `
      <div class="space-y-6 max-w-4xl mx-auto">
        <!-- Top Control Bar -->
        <div class="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-200/90 dark:border-slate-700 space-y-4">
          <!-- Section Selector & Options -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex-1">
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">เลือกมาตราที่ต้องการท่องจำ:</label>
              <select id="game-section-select" class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                ${sections.map(s => `
                  <option value="${s.id}" ${s.id === currentSection.id ? 'selected' : ''}>
                    [${s.code === 'criminal' ? 'ป.อ.' : 'ป.พ.พ.'} ม.${s.number}] ${s.title}
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Mode Selector (การวางหลัก vs ตัวบทเต็ม) & Volume Controls & Edit Button -->
            <div class="flex flex-wrap items-center gap-2 pt-2 md:pt-4">
              <!-- Mode Toggle -->
              <div class="bg-slate-100 dark:bg-slate-900/80 p-1 rounded-2xl flex items-center text-xs font-medium">
                <button id="btn-mode-principles" class="px-3 py-1.5 rounded-xl transition ${textType === 'principles' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}">
                  🎯 การวางหลัก
                </button>
                <button id="btn-mode-fulltext" class="px-3 py-1.5 rounded-xl transition ${textType === 'fullText' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}">
                  📜 ตัวบทเต็ม
                </button>
              </div>

              <!-- Edit Section in Game Button -->
              <button id="btn-edit-game-sec" class="px-3 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 font-semibold text-xs border border-indigo-200 dark:border-indigo-800 transition flex items-center space-x-1" title="แก้ไขข้อความการวางหลักหรือตัวบทมาตรานี้">
                <span>✏️</span>
                <span class="hidden sm:inline">แก้ไขข้อความ</span>
              </button>

              <!-- Sound & Volume Slider Controls -->
              <div class="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-900/80 px-2.5 py-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-800" title="ปรับระดับเสียงพิมพ์และเสียงแจ้งเตือน">
                <button id="btn-sound-toggle" class="text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition" title="เปิด/ปิดเสียง">
                  <span id="sound-icon">${isSoundMuted() ? '🔇' : (Math.round(getSoundVolume() * 100) > 50 ? '🔊' : '🔉')}</span>
                </button>
                <input
                  type="range"
                  id="sound-volume-slider"
                  min="0"
                  max="100"
                  value="${isSoundMuted() ? 0 : Math.round(getSoundVolume() * 100)}"
                  class="w-14 sm:w-16 accent-indigo-600 cursor-pointer h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg"
                  title="ปรับระดับเสียง (0 - 100%)"
                />
                <span id="sound-volume-label" class="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold min-w-[26px] text-right">${isSoundMuted() ? '0%' : Math.round(getSoundVolume() * 100) + '%'}</span>
              </div>
            </div>
          </div>

          <!-- 5-Level Progression Selector -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-bold text-slate-500 dark:text-slate-400">เลือกระดับความท้าทาย (5 ระดับการซ่อนคำ):</label>
              <span id="level-desc" class="text-xs text-indigo-600 dark:text-indigo-400 font-bold">
                ${LEVEL_CONFIG[currentLevel].name}
              </span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
              ${[1, 2, 3, 4, 5].map(lvl => {
                const conf = LEVEL_CONFIG[lvl];
                const isActive = lvl === currentLevel;
                return `
                  <button
                    class="btn-level-select btn-level-pill relative px-3 py-2.5 rounded-2xl text-center flex flex-col items-center justify-center ${isActive ? 'lvl-active' : 'lvl-inactive'}"
                    data-level="${lvl}"
                    title="${conf.name}: ${conf.description}"
                  >
                    <span class="text-xs font-bold">เลเวล ${lvl}</span>
                    <span class="text-[11px] opacity-85">ซ่อน ${conf.percentHidden}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <!-- Live Metrics HUD (เน้นความคืบหน้าและความแม่นยำ ปราศจากตัวจับเวลา/ความเร็วที่กดดัน) -->
        <div class="grid grid-cols-3 gap-3 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200/90 dark:border-slate-700 shadow-sm text-center">
          <div class="p-2">
            <div class="text-xs text-slate-400 font-medium mb-0.5">🎯 ความคืบหน้า</div>
            <div id="stat-progress" class="text-xl md:text-3xl font-black text-indigo-600 dark:text-indigo-400">0%</div>
          </div>
          <div class="p-2">
            <div class="text-xs text-slate-400 font-medium mb-0.5">✨ ความแม่นยำ</div>
            <div id="stat-accuracy" class="text-xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400">100%</div>
          </div>
          <div class="p-2">
            <div class="text-xs text-slate-400 font-medium mb-0.5">📝 ตัวอักษรที่พิมพ์แล้ว</div>
            <div id="stat-typed-chars" class="text-lg md:text-2xl font-black text-slate-700 dark:text-slate-300 font-mono pt-0.5">0 / 0</div>
          </div>
        </div>

        <!-- Mode Indicator Banner -->
        <div class="flex items-center justify-between px-2 text-xs">
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full ${textType === 'principles' ? 'bg-indigo-600' : 'bg-amber-600'}"></span>
            <span class="font-bold ${textType === 'principles' ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}">
              โหมดที่กำลังท่อง: ${textType === 'principles' ? '🎯 การวางหลัก (ข้อความย่อท่องจำ)' : '📜 บทบัญญัติเต็ม (ตัวบทฉบับเต็ม)'}
            </span>
          </div>
          <button id="btn-edit-inline-tag" class="text-slate-400 hover:text-indigo-600 underline font-medium">
            แก้ไขข้อความโหมดนี้ ✏️
          </button>
        </div>

        <!-- Main Typing Arena -->
        <div class="relative bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-md p-6 md:p-8 cursor-text min-h-[280px] flex flex-col" id="typing-arena">
          <!-- Top Stationary Action Bar (Remains at top so hint button NEVER shifts position) -->
          <div class="pb-4 mb-4 border-b border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 z-20 select-none">
            <div class="flex items-center space-x-2">
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span id="typing-status-hint">คลิกแล้วพิมพ์ภาษาไทยตามตัวบท (พิมพ์ผิดจะขึ้นสีแดง)...</span>
            </div>

            <div class="flex items-center space-x-2">
              <button
                id="btn-hint"
                class="px-3.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 active:bg-amber-200 text-amber-800 dark:text-amber-300 font-bold rounded-xl border border-amber-300 dark:border-amber-700 transition flex items-center space-x-1.5 select-none cursor-pointer shadow-sm touch-none"
                title="คลิกค้างไว้เพื่อดูคำที่ซ่อนทั้งหมด (ปล่อยมือจะซ่อนกลับ)"
              >
                <span>💡</span>
                <span>ดูคำใบ้</span>
                <span class="text-[10px] font-normal opacity-80">(คลิกค้าง)</span>
              </button>
              <button
                id="btn-restart"
                class="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition flex items-center space-x-1 shadow-sm"
                title="เริ่มฝึกมาตรานี้ใหม่ตั้งแต่ต้น"
              >
                <span>🔄</span>
                <span>เริ่มใหม่</span>
              </button>
            </div>
          </div>

          <!-- Text Display Area -->
          <div id="arena-display" class="font-sarabun text-lg md:text-xl leading-relaxed tracking-wide text-slate-800 dark:text-slate-200 select-none flex-1 pb-4 break-words">
            <!-- Will be dynamically populated -->
          </div>

          <!-- Hidden Synchronized Input Field -->
          <textarea
            id="typing-input"
            rows="1"
            class="opacity-0 absolute inset-0 w-full h-full cursor-text resize-none z-10"
            autofocus
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          ></textarea>
        </div>

        <!-- Section Quick Info Footer -->
        <div class="bg-indigo-50/60 dark:bg-slate-900/60 p-4 rounded-2xl border border-indigo-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <div>
            <span class="font-bold text-indigo-700 dark:text-indigo-300">ชื่อมาตรา:</span>
            <span class="ml-1">${currentSection.title}</span>
          </div>
          <button id="btn-view-explanation-quick" class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
            📖 อ่านคำอธิบายมาตรานี้
          </button>
        </div>
      </div>
    `;

    bindControls();
    startNewGame();
  }

  function bindControls() {
    // Section Selector
    const secSelect = container.querySelector('#game-section-select');
    secSelect.addEventListener('change', (e) => {
      sections = getSections();
      const selected = sections.find(s => s.id === e.target.value);
      if (selected) {
        currentSection = selected;
        startNewGame();
      }
    });

    // Level Selector Pills
    container.querySelectorAll('.btn-level-select').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.currentTarget;
        currentLevel = Number(targetBtn.getAttribute('data-level')) || 1;

        container.querySelectorAll('.btn-level-select').forEach(b => {
          b.classList.remove('lvl-active');
          b.classList.add('lvl-inactive');
        });
        targetBtn.classList.remove('lvl-inactive');
        targetBtn.classList.add('lvl-active');

        container.querySelector('#level-desc').textContent = LEVEL_CONFIG[currentLevel].name;
        startNewGame();
      });
    });

    // Mode Selector (Principles vs FullText)
    const btnPrinc = container.querySelector('#btn-mode-principles');
    const btnFull = container.querySelector('#btn-mode-fulltext');
    btnPrinc.addEventListener('click', () => {
      if (textType !== 'principles') {
        textType = 'principles';
        initUI();
      }
    });
    btnFull.addEventListener('click', () => {
      if (textType !== 'fullText') {
        textType = 'fullText';
        initUI();
      }
    });

    // Edit Section from inside Game View
    const btnEditGameSec = container.querySelector('#btn-edit-game-sec');
    const btnEditInlineTag = container.querySelector('#btn-edit-inline-tag');
    const handleOpenEdit = () => {
      const freshSec = getSectionById(currentSection.id) || currentSection;
      openEditModal(freshSec, (updated) => {
        if (updated) {
          currentSection = updated;
          sections = getSections();
          initUI();
        }
      });
    };
    if (btnEditGameSec) btnEditGameSec.addEventListener('click', handleOpenEdit);
    if (btnEditInlineTag) btnEditInlineTag.addEventListener('click', handleOpenEdit);

    // Sound toggle & Volume slider
    const btnSound = container.querySelector('#btn-sound-toggle');
    const volSlider = container.querySelector('#sound-volume-slider');
    const volLabel = container.querySelector('#sound-volume-label');
    const soundIcon = container.querySelector('#sound-icon');

    if (volSlider) {
      volSlider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        setSoundVolume(val / 100);
        if (volLabel) volLabel.textContent = `${val}%`;
        if (soundIcon) soundIcon.textContent = val === 0 ? '🔇' : (val > 50 ? '🔊' : '🔉');
        const settings = getSettings();
        saveSettings({ ...settings, soundVolume: val, soundEnabled: val > 0 });
      });
      volSlider.addEventListener('change', () => {
        playKeyClick();
      });
    }

    if (btnSound) {
      btnSound.addEventListener('click', () => {
        const nowMuted = !isSoundMuted();
        setMuted(nowMuted);
        const curVol = Math.round(getSoundVolume() * 100);
        if (soundIcon) soundIcon.textContent = nowMuted ? '🔇' : (curVol > 50 ? '🔊' : '🔉');
        if (volLabel) volLabel.textContent = nowMuted ? '0%' : `${curVol}%`;
        if (volSlider) volSlider.value = nowMuted ? 0 : curVol;
        const settings = getSettings();
        saveSettings({ ...settings, soundEnabled: !nowMuted });
      });
    }

    // Typing arena click-to-focus
    const arena = container.querySelector('#typing-arena');
    const inputArea = container.querySelector('#typing-input');
    arena.addEventListener('click', () => {
      inputArea.focus();
    });

    // Input handler
    inputArea.addEventListener('input', (e) => {
      if (engine) {
        engine.handleInput(e.target.value);
      }
    });

    // Hint button - Press and hold to reveal all hidden words in dark yellow!
    const btnHint = container.querySelector('#btn-hint');
    if (btnHint) {
      const startPeek = (e) => {
        if (e) {
          e.preventDefault();
          if (e.pointerId && btnHint.setPointerCapture) {
            try {
              btnHint.setPointerCapture(e.pointerId);
            } catch (err) {}
          }
        }
        if (!isPeekingHints) {
          isPeekingHints = true;
          if (engine) renderState(engine.getState());
        }
      };

      const stopPeek = (e) => {
        if (e && e.pointerId && btnHint.releasePointerCapture) {
          try {
            btnHint.releasePointerCapture(e.pointerId);
          } catch (err) {}
        }
        if (isPeekingHints) {
          isPeekingHints = false;
          if (engine) renderState(engine.getState());
        }
      };

      // Pointer events with pointer capture guarantee reliable hold even with slight drift or layout shifts
      btnHint.addEventListener('pointerdown', startPeek);
      btnHint.addEventListener('pointerup', stopPeek);
      btnHint.addEventListener('pointercancel', stopPeek);
      btnHint.addEventListener('lostpointercapture', stopPeek);

      // Traditional fallbacks
      btnHint.addEventListener('mousedown', startPeek);
      btnHint.addEventListener('mouseup', stopPeek);
      btnHint.addEventListener('touchstart', startPeek, { passive: false });
      btnHint.addEventListener('touchend', stopPeek);
      btnHint.addEventListener('touchcancel', stopPeek);
      btnHint.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Restart button
    container.querySelector('#btn-restart').addEventListener('click', (e) => {
      e.stopPropagation();
      startNewGame();
      inputArea.focus();
    });

    // View explanation quick button
    container.querySelector('#btn-view-explanation-quick').addEventListener('click', () => {
      showExplanationModal(currentSection);
    });
  }

  function startNewGame() {
    // Re-fetch currentSection from storage to guarantee freshest edits
    const freshSection = getSectionById(currentSection.id);
    if (freshSection) {
      currentSection = freshSection;
    }

    // Destroy any existing engine
    if (engine) {
      engine.destroy();
      engine = null;
    }

    const inputArea = container.querySelector('#typing-input');
    if (inputArea) inputArea.value = '';

    // Immediately reset live HUD metrics
    const statProgress = container.querySelector('#stat-progress');
    const statAccuracy = container.querySelector('#stat-accuracy');
    const statTypedChars = container.querySelector('#stat-typed-chars');

    const rawText = (textType === 'fullText' && currentSection.fullText)
      ? currentSection.fullText
      : currentSection.principles;
    const normalized = rawText.trim().replace(/\r\n/g, '\n');
    let subCount = 0;
    for (let i = 0; i < normalized.length; i++) {
      if (!/\s/.test(normalized[i])) subCount++;
    }

    if (statProgress) statProgress.textContent = '0%';
    if (statAccuracy) statAccuracy.textContent = '100%';
    if (statTypedChars) statTypedChars.textContent = `0 / ${subCount}`;

    engine = new TypingEngine({
      onUpdate: (state) => {
        renderState(state);
      },
      onComplete: (result) => {
        showVictoryModal(result);
      }
    });

    engine.loadSection(currentSection, currentLevel, textType);
    if (inputArea) inputArea.focus();
  }

  function renderState(state) {
    // Update HUD metrics (based purely on substantive characters, not spaces/newlines)
    const statProgress = container.querySelector('#stat-progress');
    const statAccuracy = container.querySelector('#stat-accuracy');
    const statTypedChars = container.querySelector('#stat-typed-chars');

    if (statProgress) statProgress.textContent = `${state.progressPercent}%`;
    if (statAccuracy) statAccuracy.textContent = `${state.accuracy}%`;
    if (statTypedChars) statTypedChars.textContent = `${state.substantiveMatched} / ${state.totalSubstantive}`;

    // Synchronize textarea value with engine
    const inputArea = container.querySelector('#typing-input');
    if (inputArea && inputArea.value !== state.userInput) {
      inputArea.value = state.userInput;
    }

    // Render Text Arena
    const arenaDisplay = container.querySelector('#arena-display');
    if (!arenaDisplay) return;

    const { tokens, currentIndex } = state;

    // Render token by token cleanly without artificial linebreaks or wrapper blocks
    const htmlTokens = tokens.map((token) => {
      const isWord = token.isWord;
      const start = token.startOffset;
      const end = token.endOffset;
      const text = token.text;

      // Handle line breaks cleanly
      if (text.includes('\n')) {
        return text.replace(/\n/g, '<br/>');
      }

      // Token fully typed
      if (end <= currentIndex) {
        return `<span class="text-emerald-600 dark:text-emerald-400 font-bold transition-colors">${escapeHtml(text)}</span>`;
      }

      // Token active (cursor is at or inside this token)
      if (start <= currentIndex && currentIndex < end) {
        const typedPart = text.slice(0, currentIndex - start);
        const remainingPart = text.slice(currentIndex - start);

        let unTypedDisplay = '';
        if (token.isMasked) {
          if (isPeekingHints) {
            unTypedDisplay = `<span class="inline px-1 py-0.5 rounded peek-hint-active select-none shadow-sm align-middle">${escapeHtml(remainingPart)}</span>`;
          } else {
            unTypedDisplay = `<span class="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 border border-dashed border-indigo-400 dark:border-indigo-600 text-indigo-500 font-mono text-xs select-none align-middle">${'•'.repeat(Math.min(6, Math.max(2, remainingPart.length)))}</span>`;
          }
        } else {
          unTypedDisplay = `<span class="text-slate-800 dark:text-slate-200">${escapeHtml(remainingPart)}</span>`;
        }

        const typedDisplay = typedPart.length > 0
          ? `<span class="text-emerald-600 dark:text-emerald-400 font-bold">${escapeHtml(typedPart)}</span>`
          : '';

        // Display user typos in bold red with underline, without blocking typing!
        const errorDisplay = state.errorChars
          ? `<span class="bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 font-bold px-1 rounded underline decoration-rose-500 whitespace-pre-wrap">${escapeHtml(state.errorChars).replace(/\n/g, '<br/>')}</span>`
          : '';

        const cursorClass = state.errorChars
          ? 'bg-rose-600 dark:bg-rose-400'
          : 'bg-indigo-600 dark:bg-indigo-400';

        return `${typedDisplay}${errorDisplay}<span class="inline-block w-0.5 h-[1.15em] ${cursorClass} animate-pulse align-text-bottom mx-0.5"></span>${unTypedDisplay}`;
      }

      // Token not typed yet
      if (token.isMasked) {
        if (isPeekingHints) {
          // Peek Hint in Dark Yellow as requested (shows full hidden text while holding)
          return `<span class="inline px-1 py-0.5 rounded peek-hint-active select-none shadow-sm align-middle">${escapeHtml(text)}</span>`;
        } else {
          // Distinct masked placeholder slot
          return `<span class="inline-flex items-center justify-center px-2 py-0.5 mx-0.5 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/40 border border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-500 dark:text-indigo-400 font-mono text-xs select-none shadow-sm align-middle" title="คำที่ถูกซ่อน (${token.charCount} ตัวอักษร)">${'•'.repeat(Math.min(6, Math.max(2, token.charCount)))}</span>`;
        }
      } else {
        // Visible word slot
        return `<span class="text-slate-800 dark:text-slate-200 transition-opacity">${escapeHtml(text)}</span>`;
      }
    }).join('');

    let renderedHtml = htmlTokens;
    if (currentIndex >= state.targetLength && state.errorChars) {
      renderedHtml += `<span class="bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 font-bold px-1 rounded underline decoration-rose-500 whitespace-pre-wrap">${escapeHtml(state.errorChars).replace(/\n/g, '<br/>')}</span><span class="inline-block w-0.5 h-[1.15em] bg-rose-600 dark:bg-rose-400 animate-pulse align-text-bottom mx-0.5"></span>`;
    }

    arenaDisplay.innerHTML = renderedHtml;

    // Helpful status hint update
    const typingStatusHint = container.querySelector('#typing-status-hint');
    if (typingStatusHint) {
      if (state.errorChars) {
        typingStatusHint.innerHTML = `<span class="text-rose-600 dark:text-rose-400 font-bold">มีตัวอักษรพิมพ์ผิด (สีแดง) — ลบออกเพื่อฟื้นฟูความแม่นยำ</span>`;
      } else if (state.substantiveMatched > 0) {
        typingStatusHint.textContent = 'กำลังพิมพ์... (พิมพ์ผิดจะขึ้นสีแดง)';
      } else {
        typingStatusHint.textContent = 'คลิกแล้วพิมพ์ภาษาไทยตามตัวบท (พิมพ์ผิดจะขึ้นสีแดง)...';
      }
    }
  }

  // Victory Celebration Modal (No speed or timer metrics)
  function showVictoryModal(result) {
    const modalRoot = document.getElementById('modal-root');
    const isLevel5 = currentLevel === 5;
    const nextLevel = Math.min(5, currentLevel + 1);

    modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white dark:bg-slate-800 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-center p-8 animate-in fade-in zoom-in-95 duration-200">
          <!-- Confetti / Trophy Emoji -->
          <div class="text-6xl mb-4 animate-bounce">
            ${result.accuracy >= 90 ? '🏆' : '🎉'}
          </div>

          <h3 class="text-2xl font-black text-slate-900 dark:text-white mb-1">
            ยอดเยี่ยมมาก! ท่องจำสำเร็จ
          </h3>
          <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">
            ${currentSection.codeName} มาตรา ${currentSection.number} (${LEVEL_CONFIG[currentLevel].name})
          </p>

          <!-- Performance Stats Card (Only accuracy & completion) -->
          <div class="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-6">
            <div>
              <div class="text-xs text-slate-400 font-medium">ความคืบหน้า</div>
              <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">100%</div>
            </div>
            <div>
              <div class="text-xs text-slate-400 font-medium">ความแม่นยำ</div>
              <div class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${result.accuracy}%</div>
            </div>
          </div>

          <!-- Spaced Repetition (SRS) Notice -->
          <div class="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 text-xs text-slate-700 dark:text-slate-300 text-left mb-6 flex items-start space-x-3">
            <span class="text-xl">📅</span>
            <div>
              <div class="font-bold text-indigo-700 dark:text-indigo-300">ระบบทบทวน Spaced Repetition บันทึกแล้ว</div>
              <p class="mt-0.5 text-slate-600 dark:text-slate-400">
                รอบการทบทวนถัดไปในอีก <strong>${result.sessionResult.progress.interval} วัน</strong> เพื่อรักษาความจำระยะยาว
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="space-y-3">
            ${!isLevel5 ? `
              <button id="btn-next-level" class="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl text-sm font-bold shadow-md transition flex items-center justify-center space-x-2">
                <span>⚡ ท้าทายเลเวลถัดไป (${LEVEL_CONFIG[nextLevel].name})</span>
              </button>
            ` : `
              <button id="btn-repeat-level5" class="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-sm font-bold shadow-md transition flex items-center justify-center space-x-2">
                <span>🌟 คุณบรรลุเลเวล 5 สูงสุดแล้ว! ซ้อมอีกครั้ง</span>
              </button>
            `}

            <div class="flex items-center space-x-2">
              <button id="btn-play-again" class="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition">
                🔄 เล่นซ้ำเลเวลนี้
              </button>
              <button id="btn-modal-close" class="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition">
                📋 เลือกมาตราอื่น
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    if (!isLevel5) {
      document.getElementById('btn-next-level').onclick = () => {
        modalRoot.innerHTML = '';
        currentLevel = nextLevel;
        initUI();
      };
    } else {
      document.getElementById('btn-repeat-level5').onclick = () => {
        modalRoot.innerHTML = '';
        startNewGame();
      };
    }

    document.getElementById('btn-play-again').onclick = () => {
      modalRoot.innerHTML = '';
      startNewGame();
    };

    document.getElementById('btn-modal-close').onclick = () => {
      modalRoot.innerHTML = '';
    };
  }

  // Explanation Modal
  function showExplanationModal(sec) {
    const modalRoot = document.getElementById('modal-root');
    modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white dark:bg-slate-800 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
          <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 mb-4">
            <h3 class="font-bold text-slate-900 dark:text-white">คำอธิบาย ${sec.codeName} ม.${sec.number}</h3>
            <button id="quick-exp-close" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
          </div>
          <div class="text-sm text-slate-700 dark:text-slate-300 space-y-3 leading-relaxed whitespace-pre-line max-h-[60vh] overflow-y-auto">
            ${sec.explanation || 'ไม่มีคำอธิบายเพิ่มเติม'}
          </div>
        </div>
      </div>
    `;
    document.getElementById('quick-exp-close').onclick = () => { modalRoot.innerHTML = ''; };
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  initUI();
}
