import {
  exportAllDataAsJSON,
  importAllDataFromJSON,
  resetSectionsToDefault,
  getSections,
  clearPracticeHistory,
  isCloudflareConnected,
  checkAndSyncCloudflare,
  setupCloudflareDatabase
} from '../data/storage.js';

export function renderSettingsView(container, onDataChanged) {
  const sections = getSections();
  const cfConnected = isCloudflareConnected();

  container.innerHTML = `
    <div class="space-y-6 max-w-3xl mx-auto">
      <!-- Cloudflare D1 Cloud Sync Card -->
      <div class="bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900/80 rounded-3xl p-6 border-2 border-indigo-200 dark:border-indigo-900/60 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <span class="text-3xl">☁️</span>
            <div>
              <h3 class="font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Cloudflare Database (D1 Cloud Sync)</span>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${cfConnected ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}">
                  ${cfConnected ? '🟢 เชื่อมต่อแล้ว' : '📱 LocalStorage'}
                </span>
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                ${cfConnected
                  ? 'ข้อมูลมาตรา การแก้ไข และสถิติของคุณซิงค์กับฐานข้อมูล Cloudflare D1 บนคลาวด์อัตโนมัติ'
                  : 'ระบบทำงานในโหมด Offline/LocalStorage (และพร้อมเชื่อมต่อกับ Cloudflare D1 อัตโนมัติเมื่อรันบนโฮสติ้ง)'}
              </p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button id="btn-sync-cloudflare" class="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm">
            <span>🔄</span>
            <span>ตรวจสอบและซิงค์ Cloudflare D1</span>
          </button>
          <button id="btn-setup-cloudflare" class="py-2.5 px-4 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-indigo-700 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm">
            <span>⚡</span>
            <span>ตั้งค่าฐานข้อมูล D1 ครั้งแรก (Seed)</span>
          </button>
        </div>
      </div>
      <!-- Backup & Restore Card -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div class="flex items-center space-x-3">
          <span class="text-2xl">💾</span>
          <div>
            <h3 class="font-bold text-slate-900 dark:text-white">สำรองและกู้คืนข้อมูล (Backup & Restore)</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">สำรองข้อความการวางหลักที่คุณแก้ไข สถิติความจำ และประวัติการฝึกไว้ในเครื่องของคุณ</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <!-- Export -->
          <div class="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
            <div>
              <h4 class="text-sm font-bold text-slate-900 dark:text-white mb-1">ส่งออกข้อมูลสำรอง (Export JSON)</h4>
              <p class="text-xs text-slate-500 leading-relaxed mb-4">
                ดาวน์โหลดไฟล์ .json เพื่อเก็บไว้เป็นข้อมูลสำรอง หรือส่งต่อให้เพื่อนนักศึกษากฎหมาย
              </p>
            </div>
            <button id="btn-export-json" class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm">
              <span>📥</span>
              <span>ดาวน์โหลดไฟล์สำรอง</span>
            </button>
          </div>

          <!-- Import -->
          <div class="p-5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
            <div>
              <h4 class="text-sm font-bold text-slate-900 dark:text-white mb-1">นำเข้าข้อมูลสำรอง (Import JSON)</h4>
              <p class="text-xs text-slate-500 leading-relaxed mb-4">
                กู้คืนข้อมูลมาตราและสถิติจากไฟล์ .json ที่เคยส่งออกไว้
              </p>
            </div>
            <label class="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm">
              <span>📤</span>
              <span>เลือกไฟล์เพื่อนำเข้า</span>
              <input type="file" id="file-import-json" accept=".json" class="hidden" />
            </label>
          </div>
        </div>
      </div>

      <!-- Reset Data Card -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div class="flex items-center space-x-3">
          <span class="text-2xl">🔄</span>
          <div>
            <h3 class="font-bold text-rose-600 dark:text-rose-400">รีเซ็ตข้อมูลสู่ค่าเริ่มต้น (Reset Data)</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">คืนค่ามาตรากฎหมายเริ่มต้นทั้งหมด (ป.อ. ม.56, 59, 60, 61, 62, 67, 68, 69, 72, 80, 83, 84, 86 และ ป.พ.พ.)</p>
          </div>
        </div>

        <div class="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/30 flex items-center justify-between">
          <div class="text-xs text-rose-800 dark:text-rose-300">
            การรีเซ็ตจะเขียนทับข้อความที่คุณเคยแก้ไขด้วยชุดมาตรามาตรฐานเริ่มต้น
          </div>
          <button id="btn-reset-default" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap">
            รีเซ็ตค่าเริ่มต้น
          </button>
        </div>

        <div class="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/30 flex items-center justify-between">
          <div class="text-xs text-amber-800 dark:text-amber-300">
            ลบเฉพาะประวัติและสถิติรอบการฝึกฝนทั้งหมด (โดยไม่ลบหรือเปลี่ยนข้อความมาตรา)
          </div>
          <button id="btn-clear-history-settings" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap">
            ล้างประวัติการฝึก
          </button>
        </div>
      </div>

      <!-- App Guide & Study Technique -->
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div class="flex items-center space-x-2">
          <span class="text-xl">💡</span>
          <h3 class="font-bold text-slate-900 dark:text-white">เคล็ดลับการท่องจำตัวบทด้วยแอพนี้</h3>
        </div>
        <ul class="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside leading-relaxed">
          <li><strong>ลำดับขั้น 5 เลเวล:</strong> แนะนำให้เริ่มจากเลเวล 1 เพื่อจับจังหวะและทำความเข้าใจข้อความ -> เลเวล 2-3 ฝึกเชื่อมโยงคำสลับ -> เลเวล 4 มีคำใบ้จุดสังเกต -> เลเวล 5 ทดสอบความจำล้วน</li>
          <li><strong>การปรับแต่ง "การวางหลัก":</strong> แต่ละคนมีสไตล์และคีย์เวิร์ดที่จำถนัดต่างกัน คุณสามารถกดปุ่มดินสอ ✏️ ในหน้าคลังมาตรา เพื่อปรับสำนวนการวางหลักให้สอดคล้องกับที่คุณถนัดได้เสมอ</li>
          <li><strong>Spaced Repetition:</strong> พยายามฝึกทุกวันอย่างต่อเนื่องเพื่อสะสม Streak 🔥 การทบทวนซ้ำตามรอบ 1, 3, 7, 14 วัน จะช่วยเปลี่ยนความจำระยะสั้นเป็นความจำระยะยาวในสมองได้อย่างถาวร</li>
        </ul>
      </div>
    </div>
  `;

  // Bind Export
  container.querySelector('#btn-export-json').addEventListener('click', () => {
    const jsonStr = exportAllDataAsJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `law_app_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Bind Import
  container.querySelector('#file-import-json').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const res = importAllDataFromJSON(event.target.result);
      if (res.success) {
        alert(`นำเข้าข้อมูลสำเร็จ! พบข้อมูลทั้งหมด ${res.count} มาตรา`);
        if (onDataChanged) onDataChanged();
      } else {
        alert(`นำเข้าข้อมูลไม่สำเร็จ: ${res.error}`);
      }
    };
    reader.readAsText(file);
  });

  // Bind Reset
  container.querySelector('#btn-reset-default').addEventListener('click', () => {
    if (confirm('คุณต้องการรีเซ็ตข้อมูลมาตราทั้งหมดกลับเป็นค่าเริ่มต้นใช่หรือไม่? (การแก้ไขส่วนตัวจะถูกเขียนทับ)')) {
      resetSectionsToDefault();
      alert('รีเซ็ตข้อมูลสู่ค่าเริ่มต้นเรียบร้อยแล้ว');
      if (onDataChanged) onDataChanged();
    }
  });

  // Bind Clear History
  container.querySelector('#btn-clear-history-settings').addEventListener('click', () => {
    if (confirm('คุณต้องการลบประวัติการฝึกฝนทั้งหมดใช่หรือไม่?\n\n(บันทึกรอบการฝึกในอดีตจะถูกลบออกทั้งหมด แต่ระดับเลเวลและมาตราจะไม่สูญหาย)')) {
      clearPracticeHistory();
      alert('ล้างประวัติการฝึกฝนเรียบร้อยแล้ว');
      if (onDataChanged) onDataChanged();
    }
  });

  // Bind Cloudflare Sync Button
  container.querySelector('#btn-sync-cloudflare').addEventListener('click', async () => {
    const btn = container.querySelector('#btn-sync-cloudflare');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span>⏳</span><span>กำลังตรวจสอบ...</span>`;

    const success = await checkAndSyncCloudflare();
    btn.disabled = false;
    btn.innerHTML = originalText;

    if (success) {
      alert('เชื่อมต่อ Cloudflare D1 สำเร็จ! ทำการซิงค์ข้อมูลล่าสุดเรียบร้อย');
      renderSettingsView(container, onDataChanged);
      if (onDataChanged) onDataChanged();
    } else {
      alert('ยังไม่พบการเชื่อมต่อ Cloudflare D1\n\n(หากกำลังรันในเครื่อง Local ระบบจะทำงานในโหมด LocalStorage อัตโนมัติ และเมื่ออัปโหลดขึ้น Cloudflare Pages + ผูก D1 ระบบจะเชื่อมต่อทันที)');
    }
  });

  // Bind Cloudflare Seed / Setup Button
  container.querySelector('#btn-setup-cloudflare').addEventListener('click', async () => {
    if (!confirm('ต้องการส่งคำสั่งติดตั้ง Table และ Seed ข้อมูลมาตราเริ่มต้นไปยัง Cloudflare D1 ใช่หรือไม่?')) {
      return;
    }
    const btn = container.querySelector('#btn-setup-cloudflare');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span>⏳</span><span>กำลังติดตั้ง D1...</span>`;

    const res = await setupCloudflareDatabase();
    btn.disabled = false;
    btn.innerHTML = originalText;

    if (res.ok) {
      alert(`สำเร็จ! Cloudflare D1 ทำงานเรียบร้อย (มีข้อมูล ${res.sectionsCount} มาตรา)`);
      renderSettingsView(container, onDataChanged);
      if (onDataChanged) onDataChanged();
    } else {
      alert(`ไม่สามารถเชื่อมต่อ D1: ${res.error || 'กรุณาตรวจสอบการผูก D1 Binding "DB" บน Cloudflare Pages'}`);
    }
  });
}
