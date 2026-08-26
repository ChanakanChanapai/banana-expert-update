# 👥 เอกสารการทำงานของทีม (Team Documentation & Operations)

ยินดีต้อนรับสู่โฟลเดอร์ **`team/`** โฟลเดอร์นี้จัดทำขึ้นเพื่อรวบรวมเอกสาร แผนงาน กฎเกณฑ์ และแนวทางการทำงานร่วมกันของทีมพัฒนาโปรเจกต์ **Banana Expert** โดยไม่ปะปนกับโค้ดหลักของระบบ

---

## 📑 สารบัญเอกสาร (Table of Contents)

| เอกสาร | รายละเอียด |
| :--- | :--- |
| 📅 **[IMPLEMENTATION_PLAN_3DAYS.md](./IMPLEMENTATION_PLAN_3DAYS.md)** | แผนการพัฒนาเร่งด่วน 3 วัน แบ่งเป็น 3 Phase (Backend Hybrid 24/7, Chatbot Assistant, System Logic & QA) |
| 📋 **[TEAM_PLAN.md](./TEAM_PLAN.md)** | แผนงานพัฒนาตามโมดูล (DB/Auth, AI Model, Chatbot, Market, QA) และข้อตกลงในการทำงานร่วมกัน |
| 🌿 **[WORKFLOW_GUIDELINES.md](./WORKFLOW_GUIDELINES.md)** | กฎระเบียบการใช้ Git, การตั้งชื่อ Branch, Commit Message และเกณฑ์การตรวจรับงาน (Definition of Done) |

---

## 🚀 สรุปขั้นตอนการทำงานประจำวัน (Daily Quick Guide)

1. **ดึงโค้ดล่าสุดก่อนเริ่มงาน:**
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **สร้าง Branch แยกตาม Feature:**
   ```bash
   git checkout -b feature/<module-name>
   ```

3. **ทดสอบ Build ก่อนเปิด PR ทุกครั้ง:**
   ```bash
   npm run build
   ```

4. **เปิด PR เข้าหา `develop` และขอ Review อย่างน้อย 1 คน**
