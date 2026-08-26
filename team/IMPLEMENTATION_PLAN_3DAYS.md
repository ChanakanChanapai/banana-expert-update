# 📋 แผนการดำเนินงาน 3 วัน (3-Day Implementation Plan)
## โครงการ: Banana Expert Platform
> **โฟกัสหลัก:** Chatbot ผู้ช่วย | Backend Hybrid 24/7 | ปรับปรุง Logic ระบบ  
> **Repository:** [ChanakanChanapai/banana-expert-update](https://github.com/ChanakanChanapai/banana-expert-update)  
> **อัปเดตล่าสุด:** สิงหาคม 2026

---

## 🗺️ ภาพรวมระยะเวลาและ Phase (High-Level Roadmap)

```text
┌──────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
│            DAY 1             │            DAY 2             │            DAY 3             │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ 🚀 Phase 1: Backend Hybrid   │ 💬 Phase 2: Banana Chatbot   │ ⚙️ Phase 3: System Logic,    │
│    24/7 & AI Fallback        │    Smart Assistant & UI      │    Marketplace & Final QA    │
├──────────────────────────────┼──────────────────────────────┼──────────────────────────────┤
│ • Proxy Timeout & Retries    │ • Extended Knowledge Base    │ • Pre-order & Stock Logic    │
│ • Smart Fallback Engine      │ • Suggested Question Chips   │ • Farm Dashboard & Orders    │
│ • Client Detection Status UX │ • In-Chat Action Navigation  │ • E2E Integration & Build    │
└──────────────────────────────┴──────────────────────────────┴──────────────────────────────┘
```

---

## 🚀 DAY 1 — Phase 1: วางรากฐาน Backend Hybrid 24/7 & AI Fallback System
> **เป้าหมาย:** แก้ปัญหาเซิร์ฟเวอร์ AI หลับ (Cold Start) บน Free Tier และรับประกันว่าระบบสแกนโรค/สายพันธุ์กล้วยจะทำงานได้ตลอด 24 ชั่วโมง 100%

### 🌿 Branch แนะนำ: `feature/backend-hybrid-24-7`

### ⏱️ ช่วงเช้า (09:00 - 12:00) : สถาปัตยกรรม Hybrid Proxy & Fallback Engine
- [ ] **1.1 ปรับปรุง Serverless Proxy (`api/detect.ts`):**
  - กำหนด **Timeout Control** ที่เหมาะสม (ปรับจาก 30s เป็น 8–10s เพื่อป้องกัน User รอนานเกินไป)
  - เพิ่ม **Retry Mechanism** (ยิงซ้ำ 1 ครั้งกรณีเกิด Network Glitch หรือ Timeout ก่อนสลับโหมด)
  - เพิ่มการดักจับ HTTP Status Codes (เช่น `502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout`)
- [ ] **1.2 Smart Fallback Engine:**
  - สร้าง Rule-based / Smart Local Analysis ที่ฝั่ง Proxy / Frontend เพื่อคืนผลลัพธ์การประเมินเบื้องต้นหาก Render Backend ไม่ตอบสนอง
  - แนบ Response Flag `"is_fallback": true` และ `"server_status": "hybrid_standby"` เพื่อให้ Frontend รับทราบ

### ⏱️ ช่วงบ่าย (13:00 - 18:00) : Client-Side Detection UX & Resilience
- [ ] **1.3 ปรับปรุง Frontend AI Detection (`src/pages/Index.tsx`):**
  - เพิ่ม **Server Status Badge** (เช่น 🟢 *ระบบ AI ทำงานปกติ*, 🟡 *ระบบสำรองข้อมูลพร้อมใช้งาน*)
  - ปรับปรุง Loading State ให้มีคำอธิบายกระบวนการสแกนที่น่าสนใจ (เช่น *"กำลังเชื่อมต่อเซิร์ฟเวอร์..."*, *"กำลังวิเคราะห์ภาพ..."*)
  - รองรับ Error Recovery นุ่มนวล ไม่แสดงหน้าจอว่างเปล่า (Empty State)
- [ ] **1.4 Chaos Testing (ทดสอบกรณี Server ล่ม):**
  - จำลองการปิดหรือตัดการเชื่อมต่อ Render แล้วตรวจสอบว่าหน้าเว็บยังคงวิเคราะห์ภาพและแสดงคำแนะนำการดูแลรักษาได้ 100%

### 📦 สิ่งที่ส่งมอบเมื่อสิ้นสุด Day 1:
1. ไฟล์ `api/detect.ts` ที่รองรับ Timeout, Fallback และ Error Handling ครบถ้วน
2. หน้าตรวจจับ AI (`Index.tsx`) สแกนได้ตลอด 24 ชั่วโมง ไม่มีสะดุดแม้เซิร์ฟเวอร์หลักจะหลับ

---

## 💬 DAY 2 — Phase 2: ยกระดับ Banana Chatbot Assistant & คลังความรู้
> **เป้าหมาย:** สร้างแชทบอทตอบคำถามเกษตรกรที่แม่นยำ ครอบคลุมการใช้งานเว็บ และมี UI ที่โต้ตอบได้สะดวก

### 🌿 Branch แนะนำ: `feature/chatbot-assistant`

### ⏱️ ช่วงเช้า (09:00 - 12:00) : ขยายคลังความรู้ (Knowledge Hub) & Intent Matching
- [ ] **2.1 เพิ่มชุดข้อมูลในคลังความรู้ (`src/lib/chatbot-knowledge.ts`):**
  - 🖥️ **หมวดการใช้งานเว็บไซต์ (Platform Guide):**
    - วิธีสแกนรูปภาพเพื่อตรวจโรคกล้วย
    - วิธีการสั่งจองผลผลิตล่วงหน้า (Pre-order) ใน Marketplace
    - วิธีการสมัครเปิดร้านค้าฟาร์ม และตรวจสอบสถานะอนุมัติ
  - 🌿 **หมวดโรคพืชและการรักษา (Disease Management):**
    - โรคตายพราย (Panama Disease), โรคใบจุดซิกาโตก้า, หนอนกอ, ไวรัสใบด่าง
    - แนวทางการป้องกันและการใช้สารชีวภัณฑ์ / เคมีปลอดภัย
  - 🍌 **หมวดสายพันธุ์กล้วยและการปลูก (Banana Varieties & Cultivation):**
    - กล้วยหอมทอง, กล้วยน้ำว้า, กล้วยไข่, กล้วยเล็บมือนาง, กล้วยหิน
    - สูตรการใส่ปุ๋ยตามระยะเวลา และการจัดการระบบน้ำ
- [ ] **2.2 ปรับปรุง Token / Keyword Matching Logic:**
  - เพิ่มระบบตรวจจับคีย์เวิร์ดภาษาไทยแบบยืดหยุ่น (รองรับคำพ้องความหมาย เช่น "จองยังไง", "ซื้อกล้วย", "ขายของ")
  - ระบบ Fallback เมื่อไม่พบคีย์เวิร์ด พร้อมแสดงตัวเลือกคำถามใกล้เคียง

### ⏱️ ช่วงบ่าย (13:00 - 18:00) : Interactive Chat UI & Quick Action Chips
- [ ] **2.3 ปรับปรุงหน้าต่างแชท (`src/components/chat/BananaChatbot.tsx`):**
  - เพิ่ม **Suggested Quick Chips** (ปุ่มลัดคำถามยอดนิยม เช่น *"🌿 กล้วยใบเหลืองเกิดจากอะไร"*, *"🛒 วิธีจองผลผลิต"*, *"🍌 10 พันธุ์กล้วยยอดนิยม"*)
  - เพิ่ม **In-Message Action Buttons** (ปุ่มลิงก์นำทางในกล่องข้อความ เช่น *"👉 ไปที่หน้าตลาดซื้อขาย"*, *"📷 ไปที่หน้าสแกนโรค"*)
  - ปรับปรุง Auto Scroll และ Animation การพิมพ์ (Typing indicator)
- [ ] **2.4 ประสิทธิภาพและการจัดเก็บ (Stateless & Cleanup):**
  - เคลียร์ State อย่างเหมาะสม ไม่เกิด Memory Leak เมื่อเปิดแชททิ้งไว้

### 📦 สิ่งที่ส่งมอบเมื่อสิ้นสุด Day 2:
1. ไฟล์ `src/lib/chatbot-knowledge.ts` ที่ครอบคลุมโรคพืช สายพันธุ์ และวิธีใช้เว็บครบถ้วน
2. แชทบอท `BananaChatbot.tsx` มีปุ่ม Suggested Questions และ Action Buttons นำทางได้จริง

---

## ⚙️ DAY 3 — Phase 3: ปรับปรุง Business Logic, การเชื่อมโยงระบบ & QA
> **เป้าหมาย:** ตรวจสอบความถูกต้องของระบบ Marketplace, จัดการคำสั่งซื้อ, ปรับปรุงโปรไฟล์ผู้ใช้ และทดสอบ End-to-End

### 🌿 Branch แนะนำ: `feature/system-logic-and-qa`

### ⏱️ ช่วงเช้า (09:00 - 12:00) : ปรับปรุง Logic ตลาดซื้อขาย & คำสั่งซื้อ
- [ ] **3.1 ระบบจอง Pre-order และหักสต็อก:**
  - ตรวจสอบ RPC Function (`reserve_v5` หรือเทียบเท่า) กรณีสต็อกไม่พอหรือมีคำสั่งซื้อชนกัน (Concurrency)
  - เพิ่มแจ้งเตือน Toast แจ้งสถานะการทำรายการชัดเจน
- [ ] **3.2 แดชบอร์ดจัดการคำสั่งซื้อของฟาร์ม (`FarmOrders.tsx`):**
  - ตรวจสอบการเปลี่ยนสถานะออเดอร์ (รอยืนยัน ➔ กำลังจัดเตรียม ➔ จัดส่งแล้ว ➔ สำเร็จ)
  - การกรอกและแสดงเลขพัสดุ (Tracking Number)
- [ ] **3.3 ข้อมูลโปรไฟล์และฟาร์ม (`UpdateProfile.tsx`):**
  - ตรวจสอบการบันทึกข้อมูลส่วนตัว, ที่อยู่จัดส่ง, และข้อมูลการยืนยันตัวตนฟาร์ม
  - เพิ่ม Fallback UI ป้องกันหน้าค้างหรือ Error กรณี Supabase ตอบสนองช้า

### ⏱️ ช่วงบ่าย (13:00 - 18:00) : End-to-End Integration & Build Verification
- [ ] **3.4 ทดสอบ User Journey แบบบูรณาการ (End-to-End):**
  - `User ถาม Chatbot` ➔ `บอทแนะนำลิงก์` ➔ `ทดสอบสแกนโรคกล้วย (Hybrid 24/7)` ➔ `เข้า Marketplace สั่งจอง` ➔ `ฟาร์มจัดการออเดอร์ใน Dashboard`
- [ ] **3.5 ทดสอบความเสถียรและ Build Test:**
  - ตรวจสอบ Responsive บนหน้าจอมือถือและเดสก์ท็อป
  - รันคำสั่งตรวจสอบ:
    ```bash
    npm run build
    ```
  - แก้ไข Type errors, Broken imports หรือ Lint issues ทั้งหมด

### 📦 สิ่งที่ส่งมอบเมื่อสิ้นสุด Day 3:
1. ระบบ Marketplace, Farm Orders และ Profile ทำงานถูกต้องสมบูรณ์
2. โปรเจกต์ผ่านการ Build 100% ไม่มี Error พร้อม Deploy ขึ้น Production

---

## 📊 ตารางสรุปการดำเนินงาน (Summary Matrix)

| วัน | Phase | ผู้รับผิดชอบหลัก | ผลลัพธ์ที่ตรวจรับได้ (Acceptance Criteria) |
| :---: | :--- | :--- | :--- |
| **Day 1** | **Backend Hybrid 24/7** | Backend / Fullstack | • สแกน AI สำเร็จตลอด 24 ชม. แม้ปิด Server Render<br>• Proxy ตอบสนองภายใน < 10 วินาที |
| **Day 2** | **Chatbot Assistant** | Frontend / UI | • บอทตอบคำถามการใช้เว็บและโรคพืชได้ตรงประเด็น<br>• มี Quick Reply Chips และปุ่มลัดพานำทางในเว็บ |
| **Day 3** | **Logic & QA** | Fullstack / QA | • การสั่งจอง, จัดการออเดอร์ และโปรไฟล์ทำงานถูกต้อง<br>• `npm run build` ผ่าน 100% ไม่มี Error |

---

## ✅ Definition of Done (DoD)
- [x] โค้ดคอมมิตผ่าน Branch ที่กำหนดและเปิด Pull Request เข้าหา `develop`
- [x] รัน `npm run build` ผ่านโดยไม่มีข้อผิดพลาด
- [x] ทดสอบการทำงานครบทุก Use Case บน Browser
- [x] ไม่มี Hardcoded sensitive keys ในโค้ด (ใช้ Environment Variables)
