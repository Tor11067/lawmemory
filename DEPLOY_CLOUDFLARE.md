# 🚀 คู่มือการนำ LawMemory ขึ้น Cloudflare Hosting และเชื่อมต่อ Cloudflare D1 Database

แอพ **LawMemory** ถูกออกแบบและพัฒนาให้รองรับการทำงานแบบ Full-Stack บน **Cloudflare Pages** พร้อมเชื่อมต่อกับ **Cloudflare D1 (Serverless SQLite Database)** อย่างสมบูรณ์แบบ

---

## 🏗️ สถาปัตยกรรมระบบบน Cloudflare

* **Frontend Hosting**: **Cloudflare Pages** (โฮสต์เว็บฟรี ความเร็วสูงระดับ Edge ทั่วโลก พร้อม SSL และ CDN ฟรี)
* **Backend API (Serverless)**: **Cloudflare Pages Functions** (รัน API อยู่ในโฟลเดอร์ `/functions/api`)
  * `/api/sections`: ค้นหา, เพิ่ม, แก้ไขตัวบทและวางหลักกฎหมายใน D1
  * `/api/progress`: บันทึกความคืบหน้าการจำ (Spaced Repetition) และประวัติการฝึกใน D1
  * `/api/stats`: บันทึกจำนวนวันท่องต่อเนื่อง (Daily Streak) และสถิติรวมใน D1
  * `/api/setup`: สร้างตาราง (Tables) และโหลดข้อมูลมาตราเริ่มต้น (Seed) อัตโนมัติในคลิกเดียว
* **Database**: **Cloudflare D1 Database** ฐานข้อมูล SQL Serverless ประสิทธิภาพสูง

---

## 🌟 วิธีที่ 1: ติดตั้งผ่านหน้าเว็บ Cloudflare Dashboard (วิธีที่ง่ายที่สุด & แนะนำ)

วิธีนี้ไม่ต้องติดตั้งโปรแกรมหรือ Node.js ในเครื่อง เพียงนำโค้ดขึ้น GitHub แล้วกดเชื่อมต่อบนหน้าเว็บ Cloudflare ได้ทันที:

### ขั้นตอนที่ 1: นำโค้ดขึ้น GitHub
1. เปิด Terminal ในโฟลเดอร์โปรเจกต์นี้ แล้วรันคำสั่ง:
   ```bash
   git init
   git add .
   git commit -m "feat: complete LawMemory app with Cloudflare D1 integration"
   git branch -M main
   ```
2. สร้าง Repository ใหม่บน [GitHub.com](https://github.com/new) (เช่น ตั้งชื่อว่า `lawmemory`)
3. นำคำสั่งจาก GitHub มาเชื่อมและ Push ขึ้นไป:
   ```bash
   git remote add origin https://github.com/<your-username>/lawmemory.git
   git push -u origin main
   ```

---

### ขั้นตอนที่ 2: สร้างฐานข้อมูล Cloudflare D1 บนหน้าเว็บ
1. เข้าสู่ระบบ [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. ในเมนูด้านซ้าย เลือก **Storage & Databases** ➔ **D1 SQL Database**
3. คลิกปุ่ม **Create database**
4. ตั้งชื่อ Database Name: `lawmemory-db`
5. คลิก **Create**

---

### ขั้นตอนที่ 3: สร้าง Cloudflare Pages Hosting
1. ในเมนูด้านซ้าย เลือก **Workers & Pages**
2. คลิกปุ่ม **Create application** ➔ เลือกแท็บ **Pages**
3. เลือก **Connect to Git** แล้วเลือก Repository `lawmemory` จาก GitHub ที่เพิ่ง Push ขึ้นไป
4. ในหน้าตั้งค่าโปรเจกต์ (Build Settings):
   * **Project name**: `lawmemory` (หรือชื่อตามต้องการ)
   * **Production branch**: `main`
   * **Framework preset**: `None`
   * **Build command**: (เว้นว่างไว้)
   * **Build output directory**: `.` (ใส่จุดเดี่ยว หรือเว้นว่าง)
5. คลิก **Save and Deploy** ➔ รอประมาณ 1 นาที เว็บจะออนไลน์พร้อม URL เช่น `https://lawmemory.pages.dev`

---

### ขั้นตอนที่ 4: ผูก D1 Database เข้ากับ Cloudflare Pages
1. ในหน้าโปรเจกต์ Pages ที่เพิ่งสร้าง ให้ไปที่แท็บ **Settings**
2. เมนูด้านซ้ายเลือก **Functions**
3. เลื่อนลงมาที่หัวข้อ **D1 database bindings** ➔ คลิก **Add binding**
4. กรอกข้อมูลดังนี้:
   * **Variable name**: `DB`  *(สำคัญมาก: ต้องพิมพ์เป็นตัวพิมพ์ใหญ่ `DB`)*
   * **D1 database**: เลือก `lawmemory-db` ที่สร้างไว้ในขั้นตอนที่ 2
5. คลิก **Save**
6. เลื่อนขึ้นไปที่แท็บ **Deployments** ➔ คลิกเมนูสามจุด `...` ที่การ Deploy ล่าสุด ➔ เลือก **Retry deployment** (เพื่อให้การผูก DB มีผลทันที)

---

### ขั้นตอนที่ 5: เริ่มต้นข้อมูลใน Database (Seed Data)
1. เปิดเข้าเว็บของคุณตามลิงก์ `https://<your-project>.pages.dev`
2. ไปที่แท็บ **⚙️ จัดการข้อมูล**
3. ที่กล่อง **☁️ Cloudflare Database (D1 Cloud Sync)**:
   * คุณจะเห็นสถานะแสดง **`🟢 เชื่อมต่อแล้ว`**
   * คลิกปุ่ม **`⚡ ตั้งค่าฐานข้อมูล D1 ครั้งแรก (Seed)`**
   * กดยืนยัน ระบบจะสร้างตารางทั้งหมดใน D1 พร้อมโหลดชุดมาตรากฎหมายเริ่มต้น (ป.อ. และ ป.พ.พ.) เข้าสู่ฐานข้อมูลคลาวด์ทันที!

---

## 💻 วิธีที่ 2: ติดตั้งผ่าน Cloudflare Wrangler CLI (สำหรับสาย Command Line)

หากเครื่องของคุณมี `node` และ `npx` ติดตั้งอยู่แล้ว สามารถ Deploy ผ่านคำสั่งได้ทันที:

1. **เข้าสู่ระบบ Cloudflare**:
   ```bash
   npx wrangler login
   ```
2. **สร้างฐานข้อมูล D1**:
   ```bash
   npx wrangler d1 create lawmemory-db
   ```
   *(คัดลอก `database_id` ที่ได้ไปแทนที่ในไฟล์ `wrangler.toml`)*

3. **รัน Schema SQL เพื่อสร้างตารางใน Cloudflare D1**:
   ```bash
   npx wrangler d1 execute lawmemory-db --remote --file=./schema.sql
   ```

4. **Deploy ขึ้น Cloudflare Pages**:
   ```bash
   npx wrangler pages deploy . --project-name lawmemory
   ```

หรือรันสคริปต์อัตโนมัติที่เตรียมไว้ให้:
```bash
./deploy_cloudflare.sh
```

---

## 🗄️ โครงสร้างฐานข้อมูล Cloudflare D1

ฐานข้อมูลประกอบด้วย 4 ตารางหลัก (ดูโค้ดเต็มได้ที่ [schema.sql](file:///Users/tor/Documents/APP%20LAW/schema.sql)):
1. **`sections`**: เก็บมาตรากฎหมาย (เลขมาตรา, ชื่อเรียก, ตัวบทเต็ม, การวางหลัก, คำอธิบาย, แท็ก)
2. **`user_progress`**: เก็บความคืบหน้าระบบ Spaced Repetition (SRS Level 1-5, รอบทบทวน, วันที่ต้องทบทวนถัดไป)
3. **`practice_logs`**: เก็บประวัติการพิมพ์แต่ละรอบ (วันที่, เลเวล, ความแม่นยำ) สามารถเลือกลบทีละแถวได้
4. **`user_stats`**: เก็บสถิติ Streak วันที่เข้าฝึกต่อเนื่อง และจำนวนรอบทั้งหมด

---

## 🔄 ระบบ Hybrid Offline-First & Cloud Sync

* แม้เน็ตหลุดหรือไม่ได้เชื่อมต่อ คลังมาตราและเกมพิมพ์ท่องจำยังคงทำงานได้อย่างรวดเร็ว 100% ผ่าน LocalStorage
* เมื่อเปิดใช้งานบน Cloudflare Pages ระบบจะซิงค์ข้อมูลกับ Cloudflare D1 ให้อัตโนมัติแบบ Real-time
