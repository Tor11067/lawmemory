import { getSections, saveOrUpdateSection, deleteSection, getProgressForSection } from '../data/storage.js';
import { openEditModal } from './editModal.js';

export function renderLibraryView(container, onPlaySection) {
  let activeTab = 'all'; // 'all' | 'criminal' | 'civil'
  let searchQuery = '';

  function refresh() {
    const sections = getSections();
    const filtered = sections.filter(sec => {
      const matchTab = activeTab === 'all' || sec.code === activeTab;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch = !q ||
        sec.number.toLowerCase().includes(q) ||
        sec.title.toLowerCase().includes(q) ||
        sec.principles.toLowerCase().includes(q) ||
        (sec.tags && sec.tags.some(t => t.toLowerCase().includes(q)));
      return matchTab && matchSearch;
    });

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Top Toolbar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-700">
          <!-- Filter Tabs -->
          <div class="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
            <button class="filter-tab px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'all' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}" data-tab="all">
              ทั้งหมด (${sections.length})
            </button>
            <button class="filter-tab px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'criminal' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}" data-tab="criminal">
              ⚖️ กฎหมายอาญา (${sections.filter(s => s.code === 'criminal').length})
            </button>
            <button class="filter-tab px-4 py-2 rounded-xl text-sm font-medium transition ${activeTab === 'civil' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}" data-tab="civil">
              📜 กฎหมายแพ่งฯ (${sections.filter(s => s.code === 'civil').length})
            </button>
          </div>

          <!-- Search & Add Button -->
          <div class="flex items-center space-x-3 w-full md:w-auto">
            <div class="relative flex-1 md:w-64">
              <input
                type="text"
                id="search-input"
                value="${searchQuery}"
                placeholder="ค้นหาเลขมาตรา, ชื่อ, หรือคีย์เวิร์ด..."
                class="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none dark:text-white"
              />
              <span class="absolute left-3 top-2.5 text-slate-400">🔍</span>
            </div>

            <button id="btn-add-section" class="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-medium shadow-sm transition whitespace-nowrap">
              <span>➕</span>
              <span>เพิ่มมาตรา</span>
            </button>
          </div>
        </div>

        <!-- Section Grid -->
        ${filtered.length === 0 ? `
          <div class="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            <div class="text-4xl mb-3">🔍</div>
            <p class="text-slate-500 dark:text-slate-400 text-base font-medium">ไม่พบมาตราที่ตรงกับคำค้นหา</p>
            <p class="text-slate-400 dark:text-slate-500 text-xs mt-1">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "เพิ่มมาตรา" เพื่อเพิ่มด้วยตนเอง</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            ${filtered.map(sec => renderSectionCard(sec)).join('')}
          </div>
        `}
      </div>
    `;

    bindEvents();
  }

  function renderSectionCard(sec) {
    const prog = getProgressForSection(sec.id);
    const isCrim = sec.code === 'criminal';
    const highestLevel = prog.highestLevelPassed || 0;

    let badgeLevel = 'ยังไม่เริ่มท่อง';
    let badgeColor = 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
    if (highestLevel === 5) {
      badgeLevel = '⭐ ผ่านเลเวล 5 (เซียน)';
      badgeColor = 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700';
    } else if (highestLevel > 0) {
      badgeLevel = `ผ่านเลเวล ${highestLevel}/5`;
      badgeColor = 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300';
    }

    return `
      <div class="group bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between" data-id="${sec.id}">
        <div>
          <!-- Header Badge -->
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <span class="px-2.5 py-1 text-xs font-bold rounded-lg ${isCrim ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'}">
                ${isCrim ? 'ป.อ.' : 'ป.พ.พ.'} มาตรา ${sec.number}
              </span>
              <span class="text-xs px-2 py-0.5 rounded-md ${badgeColor} font-medium">
                ${badgeLevel}
              </span>
            </div>

            <!-- Options menu -->
            <div class="flex items-center space-x-1">
              <button class="btn-edit-sec p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition" title="แก้ไขมาตรา" data-id="${sec.id}">
                ✏️
              </button>
            </div>
          </div>

          <!-- Section Title -->
          <h3 class="text-base font-bold text-slate-900 dark:text-white line-clamp-1 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
            ${sec.title}
          </h3>

          <!-- Principle Preview (การวางหลัก) -->
          <div class="bg-slate-50 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-100 dark:border-slate-800 mb-4">
            <div class="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1 flex items-center">
              <span>🎯 วางหลักสำหรับท่อง:</span>
            </div>
            <p class="text-xs text-slate-700 dark:text-slate-300 line-clamp-3 leading-relaxed">
              ${sec.principles}
            </p>
          </div>

          <!-- Tags -->
          ${sec.tags && sec.tags.length > 0 ? `
            <div class="flex flex-wrap gap-1.5 mb-4">
              ${sec.tags.map(t => `<span class="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 rounded-md">#${t}</span>`).join('')}
            </div>
          ` : ''}
        </div>

        <!-- Action Buttons -->
        <div class="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center space-x-2">
          <button class="btn-view-sec flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition" data-id="${sec.id}">
            📖 ดูตัวบท & คำอธิบาย
          </button>
          <button class="btn-play-sec flex-1 py-2 px-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center justify-center space-x-1" data-id="${sec.id}">
            <span>🎮</span>
            <span>เล่นเกมท่อง</span>
          </button>
        </div>
      </div>
    `;
  }

  function bindEvents() {
    // Tab switching
    container.querySelectorAll('.filter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        activeTab = btn.getAttribute('data-tab');
        refresh();
      });
    });

    // Search input
    const searchInput = container.querySelector('#search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        refresh();
        // Restore focus
        const newSearch = container.querySelector('#search-input');
        if (newSearch) {
          newSearch.focus();
          newSearch.setSelectionRange(newSearch.value.length, newSearch.value.length);
        }
      });
    }

    // Add Section button
    const btnAdd = container.querySelector('#btn-add-section');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        openEditModal(null);
      });
    }

    // Edit Section buttons
    container.querySelectorAll('.btn-edit-sec').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const sections = getSections();
        const sec = sections.find(s => s.id === id);
        if (sec) openEditModal(sec);
      });
    });

    // View Section details
    container.querySelectorAll('.btn-view-sec').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const sections = getSections();
        const sec = sections.find(s => s.id === id);
        if (sec) openDetailModal(sec);
      });
    });

    // Play Section button
    container.querySelectorAll('.btn-play-sec').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (onPlaySection) onPlaySection(id);
      });
    });
  }

  // ===================== DETAIL MODAL =====================
  function openDetailModal(sec) {
    const modalRoot = document.getElementById('modal-root');
    const isCrim = sec.code === 'criminal';

    modalRoot.innerHTML = `
      <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div class="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
          <!-- Modal Header -->
          <div class="p-6 bg-gradient-to-r ${isCrim ? 'from-rose-500/10 via-rose-500/5 to-transparent' : 'from-amber-500/10 via-amber-500/5 to-transparent'} border-b border-slate-200 dark:border-slate-700 flex items-start justify-between">
            <div>
              <span class="inline-block px-3 py-1 text-xs font-bold rounded-lg ${isCrim ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'} mb-2">
                ${sec.codeName} มาตรา ${sec.number}
              </span>
              <h2 class="text-xl font-bold text-slate-900 dark:text-white">${sec.title}</h2>
            </div>
            <button id="modal-close" class="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition text-lg">✕</button>
          </div>

          <!-- Modal Body Tabs -->
          <div class="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <!-- Principle (วางหลัก) -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-1.5">
                  <span>🎯</span>
                  <span>การวางหลักสำหรับท่องจำ (พิมพ์ในเกม)</span>
                </h4>
                <button id="modal-btn-edit-principle" class="text-xs text-slate-400 hover:text-indigo-600 underline">แก้ไขข้อความนี้</button>
              </div>
              <div class="bg-indigo-50/60 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-slate-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-line font-medium">
                ${sec.principles}
              </div>
            </div>

            <!-- Full Text (บทบัญญัติเต็ม) -->
            <div class="space-y-2">
              <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <span>📜</span>
                <span>บทบัญญัติของมาตรา (ตัวบทเต็ม)</span>
              </h4>
              <div class="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                ${sec.fullText}
              </div>
            </div>

            <!-- Explanation (คำอธิบาย) -->
            <div class="space-y-2">
              <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <span>💡</span>
                <span>คำอธิบายสาระสำคัญและหลักเกณฑ์</span>
              </h4>
              <div class="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                ${sec.explanation || 'ยังไม่มีคำอธิบายเพิ่มเติม'}
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <button id="modal-btn-edit" class="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-sm font-medium transition">
              ✏️ แก้ไขข้อมูลมาตรา
            </button>
            <div class="flex items-center space-x-3">
              <button id="modal-btn-play" class="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-sm font-bold shadow-md transition flex items-center space-x-1.5">
                <span>🎮</span>
                <span>เข้าสู่เกมพิมพ์ท่องมาตรานี้</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('modal-close').onclick = () => { modalRoot.innerHTML = ''; };
    document.getElementById('modal-btn-edit').onclick = () => {
      modalRoot.innerHTML = '';
      openEditModal(sec, () => refresh());
    };
    document.getElementById('modal-btn-edit-principle').onclick = () => {
      modalRoot.innerHTML = '';
      openEditModal(sec, () => refresh());
    };
    document.getElementById('modal-btn-play').onclick = () => {
      modalRoot.innerHTML = '';
      if (onPlaySection) onPlaySection(sec.id);
    };
  }

  // Initial render
  refresh();
}
