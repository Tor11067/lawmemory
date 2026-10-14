import { saveOrUpdateSection, deleteSection } from '../data/storage.js';

export function openEditModal(sec = null, onSaved = null) {
  const isNew = !sec;
  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  modalRoot.innerHTML = `
    <div class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div class="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        <div class="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white">
            ${isNew ? '➕ เพิ่มมาตราใหม่' : `✏️ แก้ไขมาตรา ${sec.number}`}
          </h2>
          <button id="edit-modal-close" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg">✕</button>
        </div>

        <form id="edit-section-form" class="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Code Category -->
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ประมวลกฎหมาย *</label>
              <select id="form-code" class="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white">
                <option value="criminal" ${sec && sec.code === 'criminal' ? 'selected' : ''}>ประมวลกฎหมายอาญา (ป.อ.)</option>
                <option value="civil" ${sec && sec.code === 'civil' ? 'selected' : ''}>ประมวลกฎหมายแพ่งและพาณิชย์ (ป.พ.พ.)</option>
              </select>
            </div>

            <!-- Section Number -->
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">เลขมาตรา *</label>
              <input
                type="text"
                id="form-number"
                value="${sec ? sec.number : ''}"
                placeholder="เช่น 59 หรือ 149"
                required
                class="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>
          </div>

          <!-- Title -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ชื่อเรียกมาตรา *</label>
            <input
              type="text"
              id="form-title"
              value="${sec ? sec.title : ''}"
              placeholder="เช่น ความรับผิดทางอาญา (เจตนา/ประมาท)"
              required
              class="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>

          <!-- Principle (วางหลัก) -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block text-xs font-bold text-indigo-600 dark:text-indigo-400">
                🎯 การวางหลักของมาตรา (ข้อความที่ใช้ในเกมพิมพ์โหมดการวางหลัก) *
              </label>
              <span class="text-[11px] text-slate-400">ปรับแต่งสำนวนให้เข้ากับการท่องจำของคุณได้</span>
            </div>
            <textarea
              id="form-principles"
              rows="4"
              required
              placeholder="พิมพ์ข้อความวางหลักสำหรับท่องจำที่กระชับและจำง่าย..."
              class="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white leading-relaxed"
            >${sec ? sec.principles : ''}</textarea>
          </div>

          <!-- Full statutory text -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              📜 บทบัญญัติของมาตรา (ตัวบทฉบับเต็ม ใช้ในเกมพิมพ์โหมดตัวบทเต็ม)
            </label>
            <textarea
              id="form-fulltext"
              rows="4"
              placeholder="พิมพ์ตัวบทกฎหมายเต็มตามราชกิจจานุเบกษา..."
              class="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white leading-relaxed"
            >${sec ? sec.fullText : ''}</textarea>
          </div>

          <!-- Explanation -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">คำอธิบายและแนวคิด</label>
            <textarea
              id="form-explanation"
              rows="3"
              placeholder="คำอธิบายเพิ่มเติม ฎีกาสำคัญ หรือข้อยกเว้น..."
              class="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white leading-relaxed"
            >${sec && sec.explanation ? sec.explanation : ''}</textarea>
          </div>

          <!-- Tags -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">แท็ก (คั่นด้วยจุลภาค ,)</label>
            <input
              type="text"
              id="form-tags"
              value="${sec && sec.tags ? sec.tags.join(', ') : ''}"
              placeholder="เจตนา, ความรับผิด, ภาคทั่วไป"
              class="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>

          <!-- Delete section button if editing -->
          ${!isNew ? `
            <div class="pt-2">
              <button type="button" id="btn-delete-section" class="text-xs text-rose-500 hover:text-rose-700 hover:underline">
                🗑️ ลบมาตรานี้ออกจากระบบ
              </button>
            </div>
          ` : ''}

          <!-- Footer actions -->
          <div class="pt-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end space-x-3">
            <button type="button" id="edit-modal-cancel" class="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-sm font-medium transition">
              ยกเลิก
            </button>
            <button type="submit" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md transition">
              💾 บันทึกข้อมูล
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.getElementById('edit-modal-close').onclick = () => { modalRoot.innerHTML = ''; };
  document.getElementById('edit-modal-cancel').onclick = () => { modalRoot.innerHTML = ''; };

  if (!isNew) {
    document.getElementById('btn-delete-section').onclick = () => {
      if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ มาตรา ${sec.number} (${sec.title})?`)) {
        deleteSection(sec.id);
        modalRoot.innerHTML = '';
        if (onSaved) onSaved(null);
      }
    };
  }

  document.getElementById('edit-section-form').onsubmit = (e) => {
    e.preventDefault();
    const code = document.getElementById('form-code').value;
    const number = document.getElementById('form-number').value.trim();
    const title = document.getElementById('form-title').value.trim();
    const principles = document.getElementById('form-principles').value.trim();
    const fullText = document.getElementById('form-fulltext').value.trim();
    const explanation = document.getElementById('form-explanation').value.trim();
    const tagsRaw = document.getElementById('form-tags').value.trim();
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    const codeName = code === 'criminal' ? 'ประมวลกฎหมายอาญา' : 'ประมวลกฎหมายแพ่งและพาณิชย์';

    const updated = {
      id: sec ? sec.id : `${code}-${number}-${Date.now()}`,
      code,
      codeName,
      number,
      title,
      principles,
      fullText: fullText || principles,
      explanation,
      tags
    };

    saveOrUpdateSection(updated);
    modalRoot.innerHTML = '';
    if (onSaved) onSaved(updated);
  };
}
