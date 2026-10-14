import { getSections, getAllProgress, getUserStats, getTodayDueSections, clearPracticeHistory, deletePracticeHistoryItem } from '../data/storage.js';

export function renderStatsView(container, onPlaySection) {
  const sections = getSections();
  const allProgress = getAllProgress();
  const stats = getUserStats();
  const dueSections = getTodayDueSections();

  // Calculate statistics
  let masteredCount = 0;
  let learningCount = 0;
  let notStartedCount = 0;

  sections.forEach(sec => {
    const prog = allProgress[sec.id];
    const highest = prog ? (prog.highestLevelPassed || 0) : 0;
    if (highest === 5) masteredCount++;
    else if (highest > 0) learningCount++;
    else notStartedCount++;
  });

  const totalSections = sections.length || 1;
  const progressPercent = Math.round((masteredCount / totalSections) * 100);

  // Collect recent history
  const recentLogs = [];
  sections.forEach(sec => {
    const prog = allProgress[sec.id];
    if (prog && prog.history) {
      prog.history.forEach(h => {
        recentLogs.push({
          ...h,
          id: h.id || h.date,
          sectionTitle: `[${sec.code === 'criminal' ? 'ป.อ.' : 'ป.พ.พ.'} ม.${sec.number}] ${sec.title}`,
          sectionId: sec.id
        });
      });
    }
  });

  recentLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
  const top10Logs = recentLogs.slice(0, 10);

  container.innerHTML = `
    <div class="space-y-6 max-w-4xl mx-auto">
      <!-- Streak & Hero Banner -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Daily Streak Card -->
        <div class="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div class="relative z-10">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider opacity-90">Daily Streak</span>
              <span class="text-2xl">🔥</span>
            </div>
            <div class="text-4xl font-black mt-2">${stats.currentStreak || 0} <span class="text-xl font-normal opacity-90">วัน</span></div>
            <p class="text-xs opacity-80 mt-1">สถิติสูงสุด: ${stats.longestStreak || 0} วันติดต่อกัน</p>
          </div>
          <div class="text-[11px] bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-xl mt-4 w-fit relative z-10">
            ฝึกฝนทุกวันเพื่อพัฒนาความจำระยะยาว
          </div>
          <div class="absolute -right-6 -bottom-6 text-8xl opacity-10 select-none">🔥</div>
        </div>

        <!-- Total Sessions Card -->
        <div class="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div class="relative z-10">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider opacity-90">แบบฝึกหัดที่สำเร็จ</span>
              <span class="text-2xl">🎯</span>
            </div>
            <div class="text-4xl font-black mt-2">${stats.totalCompletedSessions || 0} <span class="text-xl font-normal opacity-90">รอบ</span></div>
            <p class="text-xs opacity-80 mt-1">จำนวนคำที่ฝึกฝน: ${stats.totalTypedWords || 0} คำ</p>
          </div>
          <div class="text-[11px] bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-xl mt-4 w-fit relative z-10">
            สะสมความจำระยะยาวผ่านการพิมพ์
          </div>
          <div class="absolute -right-6 -bottom-6 text-8xl opacity-10 select-none">⌨️</div>
        </div>

        <!-- Mastered Level 5 Card -->
        <div class="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div class="relative z-10">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider opacity-90">จำได้แม่นยำ (เลเวล 5)</span>
              <span class="text-2xl">⭐</span>
            </div>
            <div class="text-4xl font-black mt-2">${masteredCount} / ${sections.length} <span class="text-xl font-normal opacity-90">มาตรา</span></div>
            <p class="text-xs opacity-80 mt-1">คิดเป็น ${progressPercent}% ของมาตราทั้งหมด</p>
          </div>
          <div class="w-full bg-black/20 rounded-full h-2 mt-4 overflow-hidden relative z-10">
            <div class="bg-white h-full rounded-full transition-all duration-500" style="width: ${progressPercent}%"></div>
          </div>
          <div class="absolute -right-6 -bottom-6 text-8xl opacity-10 select-none">🏆</div>
        </div>
      </div>

      <!-- Spaced Repetition Due Today Banner -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-2xl">📅</span>
            <div>
              <h3 class="font-bold text-slate-900 dark:text-white">มาตราที่ต้องทบทวนวันนี้ (Spaced Repetition)</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">ระบบคำนวณตามรอบเวลา 1, 3, 7 วัน เพื่อป้องกันการลืม</p>
            </div>
          </div>
          <span class="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl">
            ${dueSections.length} มาตรา
          </span>
        </div>

        ${dueSections.length === 0 ? `
          <div class="p-6 bg-slate-50 dark:bg-slate-900/60 rounded-2xl text-center border border-dashed border-slate-200 dark:border-slate-700">
            <span class="text-3xl">✨</span>
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-2">ยอดเยี่ยมมาก! ไม่มีมาตราค้างทบทวนในวันนี้</p>
            <p class="text-xs text-slate-400 mt-1">คุณสามารถเลือกท่องมาตราใหม่ หรือทบทวนมาตราที่ต้องการได้ในหน้า "คลังมาตรา"</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${dueSections.map(sec => {
              const prog = allProgress[sec.id] || {};
              return `
                <div class="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 flex items-center justify-between">
                  <div>
                    <span class="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                      ${sec.code === 'criminal' ? 'ป.อ.' : 'ป.พ.พ.'} ม.${sec.number}
                    </span>
                    <h4 class="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">${sec.title}</h4>
                    <span class="text-xs text-slate-500">รอบทบทวนถัดไป: เลเวล ${prog.highestLevelPassed || 1}</span>
                  </div>
                  <button class="btn-due-play px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition whitespace-nowrap" data-id="${sec.id}">
                    ⚡ ทบทวนทันที
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Mastery Breakdown -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 class="font-bold text-slate-900 dark:text-white">ภาพรวมสถานะการท่องจำทุกมาตรา</h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold text-emerald-800 dark:text-emerald-300">⭐ ระดับเซียน (เลเวล 5)</span>
              <span class="text-sm font-black text-emerald-700 dark:text-emerald-300">${masteredCount}</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">พิมพ์ตัวบทได้แม่นยำแม้ซ่อนคำ 100%</p>
          </div>

          <div class="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold text-indigo-800 dark:text-indigo-300">📖 กำลังฝึกฝน (เลเวล 1-4)</span>
              <span class="text-sm font-black text-indigo-700 dark:text-indigo-300">${learningCount}</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">กำลังไล่ระดับความยากในการซ่อนคำ</p>
          </div>

          <div class="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold text-slate-600 dark:text-slate-300">⏳ ยังไม่เริ่มท่อง</span>
              <span class="text-sm font-black text-slate-600 dark:text-slate-300">${notStartedCount}</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">รอให้คุณเริ่มต้นความท้าทาย</p>
          </div>
        </div>
      </div>

      <!-- Recent Practice Activity Table -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div class="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-700/60">
          <div>
            <h3 class="font-bold text-slate-900 dark:text-white">ประวัติการฝึกฝนล่าสุด</h3>
            <p class="text-xs text-slate-400">บันทึกผลการฝึกฝนและความแม่นยำ</p>
          </div>
          ${top10Logs.length > 0 ? `
            <button id="btn-clear-history" class="px-3.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/50 font-bold transition flex items-center space-x-1.5 shadow-sm" title="ล้างประวัติการฝึกฝนทั้งหมด">
              <span>🗑️</span>
              <span>ล้างประวัติการฝึก</span>
            </button>
          ` : ''}
        </div>

        ${top10Logs.length === 0 ? `
          <p class="text-xs text-slate-400 text-center py-6">ยังไม่มีประวัติการฝึกฝน เริ่มต้นเล่นเกมพิมพ์เพื่อบันทึกสถิติแรกของคุณ!</p>
        ` : `
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-left">
              <thead>
                <tr class="text-slate-400 border-b border-slate-100 dark:border-slate-700">
                  <th class="py-2.5 font-medium">วันเวลา</th>
                  <th class="py-2.5 font-medium">มาตรา</th>
                  <th class="py-2.5 font-medium text-center">เลเวล</th>
                  <th class="py-2.5 font-medium text-center">ความแม่นยำ</th>
                  <th class="py-2.5 font-medium text-center">ผลการฝึก</th>
                  <th class="py-2.5 font-medium text-center w-12">ลบ</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60 text-slate-700 dark:text-slate-300">
                ${top10Logs.map(log => {
                  const dateStr = new Date(log.date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
                  return `
                    <tr class="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                      <td class="py-3 text-slate-400 whitespace-nowrap">${dateStr}</td>
                      <td class="py-3 font-semibold line-clamp-1">${log.sectionTitle}</td>
                      <td class="py-3 text-center">
                        <span class="px-2 py-0.5 rounded-md font-bold ${log.level === 5 ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}">
                          L${log.level}
                        </span>
                      </td>
                      <td class="py-3 text-center font-bold ${log.accuracy >= 90 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}">${log.accuracy}%</td>
                      <td class="py-3 text-center">
                        <span class="px-2 py-0.5 rounded-md font-bold ${log.accuracy >= 80 ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'}">
                          ${log.accuracy >= 80 ? '✅ ผ่าน' : '🔄 ซ้ำ'}
                        </span>
                      </td>
                      <td class="py-3 text-center">
                        <button
                          class="btn-delete-log p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                          data-id="${log.id || log.date}"
                          data-section-id="${log.sectionId}"
                          title="ลบเฉพาะรายการนี้"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    </div>
  `;

  // Bind Individual Delete Log Buttons
  container.querySelectorAll('.btn-delete-log').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const logId = btn.getAttribute('data-id');
      const secId = btn.getAttribute('data-section-id');
      if (confirm('คุณต้องการลบรายการประวัติการฝึกรอบนี้ใช่หรือไม่?')) {
        deletePracticeHistoryItem(logId, secId);
        renderStatsView(container, onPlaySection);
      }
    });
  });

  // Bind Clear History Button (Delete All)
  const btnClearHistory = container.querySelector('#btn-clear-history');
  if (btnClearHistory) {
    btnClearHistory.addEventListener('click', () => {
      if (confirm('คุณต้องการลบประวัติการฝึกฝนทั้งหมดใช่หรือไม่?\n\n(บันทึกรอบการฝึกในอดีตจะถูกล้างออกทั้งหมด แต่ระดับเลเวลและมาตราจะไม่สูญหาย)')) {
        clearPracticeHistory();
        renderStatsView(container, onPlaySection);
      }
    });
  }

  // Bind Due Buttons
  container.querySelectorAll('.btn-due-play').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (onPlaySection) onPlaySection(id);
    });
  });
}
