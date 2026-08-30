# 📋 แผนงานการพัฒนาสำหรับทีม (Banana Expert Team Development Plan)

> **Branch:** `develop`  
> **Repository:** [ChanakanChanapai/banana-expert-update](https://github.com/ChanakanChanapai/banana-expert-update)  
> **อัปเดตล่าสุด:** สิงหาคม 2026

---

## 🎯 1. ภาพรวมโปรเจกต์และเป้าหมาย (Project Objectives)
พัฒนาเว็บแอปพลิเคชัน **Banana Expert** ให้เป็นแพลตฟอร์มแบบ All-in-One สำหรับเกษตรกรผู้ปลูกกล้วยและผู้บริโภค ประกอบด้วย:
1. **AI Detection**: ตรวจจับสายพันธุ์และวิเคราะห์โรคกล้วยจากภาพถ่าย
2. **Knowledge Hub**: คลังความรู้โรคพืช, การใส่ปุ๋ย, และสายพันธุ์กล้วยไทย
3. **Smart Marketplace**: ตลาดซื้อขายและระบบจองผลผลิตล่วงหน้า (Pre-order) ตรงจากฟาร์ม
4. **Banana Assistant**: แชทบอทตอบคำถามการเกษตรและแนะนำการใช้งานเว็บไซต์

---

## 👥 2. การแบ่งโมดูลงานสำหรับทีม (Task Breakdown by Modules)

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Banana Expert Platform                          │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ 🗄️ Backend & DB   │ 🤖 AI & Model     │ 💻 Frontend & Features         │
│ (Supabase & Auth) │ (FastAPI & Docker)│ (React, UI & Chatbot)          │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

---

### 🗄️ Module A: งานระบบฐานข้อมูลและยืนยันตัวตน (Database & Supabase)
* **ผู้รับผิดชอบหลัก:** Database / Backend Lead
* **Branch ที่แนะนำ:** `feature/database-and-auth`
* **รายการงาน (Tasks):**
  - [ ] **1.1 Apply SQL Migration**: นำไฟล์ `supabase/migrations/20260825000000_fix_database_schema_and_rpcs.sql` ไปรันใน SQL Editor ของ Supabase
  - [ ] **1.2 Setup Storage Bucket**: สร้าง Bucket ชื่อ `product-images` และตั้งค่าเป็น Public เพื่อให้อัปโหลดและแสดงรูปสินค้าได้
  - [ ] **1.3 ปรับการตั้งค่า Auth**: ปิดสวิตช์ *"Confirm email"* ใน Supabase Dashboard (`Authentication` ➔ `Providers` ➔ `Email`) เพื่อป้องกันปัญหา Rate Limit
  - [ ] **1.4 Seed Data**: เตรียมข้อมูลตัวอย่างสายพันธุ์กล้วย 10 สายพันธุ์ และฟาร์มตัวอย่างลงฐานข้อมูล

---

### 🤖 Module B: งานเชื่อมต่อโมเดล AI & FastAPI (AI & Model Deployment)
* **ผู้รับผิดชอบหลัก:** AI / Machine Learning Engineer
* **Branch ที่แนะนำ:** `feature/ai-backend-docker`
* **รายการงาน (Tasks):**
  - [ ] **2.1 รัน FastAPI ด้วย Docker**: บรรจุโมเดล AI และ FastAPI ลง Docker Container (จำกัด RAM ไม่ให้เครื่องค้าง)
  - [x] **2.2 ปรับปรุง Endpoint `/detect`** (Hybrid Proxy): ปรับ Timeout 9s + Retry 1x + Smart Fallback Engine (`api/detect.ts`) คืนค่า `is_fallback: true` + `server_status: hybrid_standby` กรณี Render Server ไม่ตอบสนอง
  - [x] **2.3 เชื่อมต่อกับ Frontend**: `Index.tsx` แสดง Server Status Badge (🟢/🟡), รองรับ Fallback Warning Banner และ Error Recovery อย่างนุ่มนวล

---

### 💬 Module C: งานยกระดับ Banana Chatbot Assistant
* **ผู้รับผิดชอบหลัก:** Frontend Engineer
* **Branch ที่แนะนำ:** `feature/chatbot-assistant`
* **รายการงาน (Tasks):**
  - [x] **3.1 ขยายฐานความรู้**: เพิ่มหมวดหมู่ความรู้ครบ 3 เสาหลักใน `src/lib/chatbot-knowledge.ts`:
    - 🖥️ **วิธีใช้งานเว็บ**: วิธีสแกนรูป, วิธีจองกล้วยใน Market, วิธีเปิดร้านฟาร์ม, การแก้ไขโปรไฟล์
    - 🚜 **ข้อมูลฟาร์ม**: วิธีเช็คโปรไฟล์ฟาร์ม, เรตติ้งรีวิว, พิกัดฟาร์ม
  - [x] **3.2 เพิ่ม Suggested Question Chips**: Quick Pillar Cards 3 หมวดใน `BananaChatbot.tsx` พร้อม In-Message Action Buttons นำทางได้จริง
  - [x] **3.3 รักษาคุณสมบัติ Stateless**: Stateless Session สมบูรณ์ รีเฟรชแล้วเริ่มต้นใหม่อย่างสะอาด

---

### 🛒 Module D: งานตลาด Marketplace & จัดการออเดอร์ (Market & Orders)
* **ผู้รับผิดชอบหลัก:** Fullstack / Frontend Lead
* **Branch ที่แนะนำ:** `feature/marketplace-orders`
* **รายการงาน (Tasks):**
  - [ ] **4.1 ทดสอบระบบจอง Pre-order**: ทดสอบการกดจองสินค้า (`reserve_v5`), การหักสต็อก, และการแจ้งเตือน
  - [ ] **4.2 แดชบอร์ดฟาร์ม (Farm Dashboard)**: ตรวจสอบหน้าจัดการออเดอร์ (`FarmOrders.tsx`) และการใส่เลขพัสดุ (Tracking Number)
  - [ ] **4.3 ระบบรีวิวและให้คะแนน**: ทดสอบการส่งรีวิวหลังได้รับสินค้าสำเร็จ (`insert_review` RPC)
  - [ ] **4.4 Data Fallbacks**: เพิ่ม Mock Data ป้องกันหน้าจอว่างเปล่ากรณีเน็ตช้าหรือเซิร์ฟเวอร์ตอบสนองช้า

---

### 🧪 Module E: งานทดสอบระบบและควบคุมคุณภาพ (Testing & QA)
* **ผู้รับผิดชอบหลัก:** QA / Testing Engineer
* **Branch ที่แนะนำ:** `feature/automated-tests`
* **รายการงาน (Tasks):**
  - [x] **5.1 Unit Tests**: สร้าง Unit Tests ด้วย Vitest (`src/lib/__tests__/chatbot-knowledge.test.ts`) ครอบคลุม 3 เสาหลัก 17 Test Cases พร้อมตั้งค่า Vitest ใน `vite.config.ts`
  - [ ] **5.2 Component Tests**: ทดสอบการทำงานของ `BananaChatbot.tsx` และ `Navbar.tsx`
  - [x] **5.3 Build Verification**: `npm run build` ผ่าน 100% ไม่มี Error (ยืนยันแล้ว สิงหาคม 2026)

---

## 🌿 3. กฎการทำงานร่วมกันผ่าน Git (Git Collaboration Rules)

### ขั้นตอนการทำงานประจำวัน (Daily Workflow):
1. **ก่อนเริ่มงานทุกครั้ง ให้ดึงโค้ดล่าสุดจาก `develop`**:
   ```bash
   git checkout develop
   git pull origin develop
   ```
2. **แตก Branch ใหม่สำหรับงานของตัวเอง**:
   ```bash
   git checkout -b feature/<ชื่อโมดูลงาน>
   # ตัวอย่าง: git checkout -b feature/database-and-auth
   ```
3. **เมื่อทำงานเสร็จและเทสผ่านแล้ว ให้ Commit และ Push**:
   ```bash
   git add .
   git commit -m "feat: <คำอธิบายงานที่ทำ>"
   git push origin feature/<ชื่อโมดูลงาน>
   ```
4. **เปิด Pull Request (PR) เข้าหา `develop`**:
   - ให้เพื่อนร่วมทีมช่วยตรวจดูโค้ด (Review) อย่างน้อย 1 คน
   - เมื่อ Approve แล้ว ให้รวมโค้ดเข้า `develop`

---

## 🏁 4. Definition of Done (เกณฑ์การตรวจรับงาน)
โค้ดที่จะถูกรวมเข้า `develop` และ `main` ต้องผ่านเกณฑ์ต่อไปนี้:
- [x] รัน `npm run build` ผ่าน 100% ไม่มี Error
- [x] ไม่มี Code ติดแดง / Broken Imports
- [x] ฟังก์ชันทำงานได้ถูกต้องตาม Use Case
- [x] หน้าตา UI ไม่กระตุก ไม่เลื่อนไปมา (Stable Layout)
