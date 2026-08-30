/**
 * @vitest-environment node
 *
 * Unit Tests สำหรับ chatbot-knowledge.ts
 * ──────────────────────────────────────
 * Module C (Task 3.1) - ตรวจสอบ Intent Matching ทั้ง 3 เสาหลัก:
 *   1. คู่มือการใช้งานเว็บ (Platform Guide)
 *   2. สารานุกรมความรู้กล้วย (Knowledge Hub)
 *   3. ข้อมูลฟาร์มและวิธีเปิดร้าน (Farm Directory)
 */

import { describe, it, expect } from "vitest";
import { getBotResponse, QUICK_PILLARS } from "../chatbot-knowledge";

// ─────────────────────────────────────────────────────────────────────────────
// 📘 หมวดที่ 1: คู่มือการใช้งานเว็บ (Platform Guide)
// ─────────────────────────────────────────────────────────────────────────────
describe("🖥️ Platform Guide — AI Scan & Marketplace", () => {
  it("ตอบคำถามวิธีสแกนรูปภาพด้วย AI ได้ถูกต้อง", () => {
    const reply = getBotResponse("วิธีสแกนกล้วยด้วย AI ทำยังไง");
    expect(reply.text).toContain("AI");
    expect(reply.actionUrl).toBe("/");
  });

  it("ตอบคำถามวิธีสั่งจอง Pre-order ใน Marketplace ได้ถูกต้อง", () => {
    const reply = getBotResponse("วิธีจองกล้วยในตลาดทำยังไง");
    expect(reply.text.toLowerCase()).toMatch(/จอง|pre-order|สั่งจอง/i);
    expect(reply.actionUrl).toBe("/market");
  });

  it("ตอบคำถามติดตามพัสดุและสถานะออเดอร์ได้", () => {
    const reply = getBotResponse("เช็คเลขพัสดุได้ที่ไหน");
    expect(reply.text).toContain("Tracking");
    expect(reply.actionUrl).toBe("/dashboard/orders");
  });

  it("ตอบคำถามเกี่ยวกับการแก้ไขโปรไฟล์และที่อยู่ได้", () => {
    const reply = getBotResponse("เปลี่ยนที่อยู่จัดส่งทำยังไง");
    expect(reply.text).toBeTruthy();
    expect(reply.actionUrl).toBe("/profile");
  });

  it("แสดง Quick Pillars เมื่อรับ input ว่างเปล่า", () => {
    const reply = getBotResponse("");
    expect(reply.showQuickPillars).toBe(true);
  });

  it("แสดง Quick Pillars เมื่อทักทาย", () => {
    const reply = getBotResponse("สวัสดีครับ");
    expect(reply.showQuickPillars).toBe(true);
  });

  it("ตอบขอบคุณได้นุ่มนวล โดยไม่แสดง Quick Pillars", () => {
    const reply = getBotResponse("ขอบคุณครับ");
    expect(reply.text).toBeTruthy();
    expect(reply.showQuickPillars).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 🍌 หมวดที่ 2: ความรู้กล้วยในฐานข้อมูล (Knowledge Hub)
// ─────────────────────────────────────────────────────────────────────────────
describe("🍌 Knowledge Hub — Cultivars & Farming Tips", () => {
  it("ตอบข้อมูลสายพันธุ์กล้วยน้ำว้าได้", () => {
    const reply = getBotResponse("กล้วยน้ำว้ามีลักษณะยังไง");
    expect(reply.text).toContain("กล้วยน้ำว้า");
    expect(reply.actionUrl).toBe("/knowledge");
  });

  it("ตอบข้อมูลสายพันธุ์กล้วยหอมทองได้", () => {
    const reply = getBotResponse("อยากรู้เรื่องกล้วยหอมทอง");
    expect(reply.text).toContain("กล้วยหอมทอง");
  });

  it("ตอบสูตรใส่ปุ๋ยกล้วยได้ถูกต้อง", () => {
    const reply = getBotResponse("สูตรปุ๋ยกล้วยมีอะไรบ้าง");
    expect(reply.text).toMatch(/ปุ๋ย|ไนโตรเจน|โพแทสเซียม/);
    expect(reply.actionUrl).toBe("/knowledge");
  });

  it("ตอบเรื่องการตัดแต่งหน่อกล้วยได้", () => {
    const reply = getBotResponse("วิธีไว้หน่อกล้วยทำยังไง");
    expect(reply.text).toMatch(/หน่อ|กอ/);
    expect(reply.actionUrl).toBe("/knowledge");
  });

  it("ตอบภาพรวมคลังความรู้กล้วยทั้งหมดได้", () => {
    const reply = getBotResponse("ความรู้กล้วยในฐานข้อมูล");
    expect(reply.text).toBeTruthy();
    expect(reply.actionUrl).toBe("/knowledge");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 🚜 หมวดที่ 3: ข้อมูลฟาร์มในเว็บ (Farm Directory)
// ─────────────────────────────────────────────────────────────────────────────
describe("🚜 Farm Directory — Find Farms & Open Shop", () => {
  it("ตอบวิธีค้นหาฟาร์มและดูพิกัดแปลงได้", () => {
    const reply = getBotResponse("อยากดูพิกัดฟาร์มกล้วยทำยังไง");
    expect(reply.text).toMatch(/ฟาร์ม|พิกัด|ที่ตั้ง/);
    expect(reply.actionUrl).toBe("/market");
  });

  it("ตอบวิธีเปิดร้านและลงขายสินค้าสำหรับเกษตรกรได้", () => {
    const reply = getBotResponse("วิธีเปิดร้านฟาร์มขายกล้วยทำอย่างไร");
    expect(reply.text).toMatch(/ฟาร์ม|ขาย|ลงทะเบียน/);
    expect(reply.actionUrl).toBe("/profile");
  });

  it("ตอบระบบรีวิวและให้คะแนนดาวฟาร์มได้", () => {
    const reply = getBotResponse("วิธีให้คะแนนรีวิวร้านค้า");
    expect(reply.text).toMatch(/รีวิว|คะแนน|ดาว/);
  });

  it("ตอบภาพรวมข้อมูลฟาร์มในเว็บทั้งหมดได้", () => {
    const reply = getBotResponse("ข้อมูลฟาร์มในเว็บ");
    expect(reply.text).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 ทั่วไป — Fallback & QUICK_PILLARS
// ─────────────────────────────────────────────────────────────────────────────
describe("🔧 General — Fallback & Quick Pillars Config", () => {
  it("QUICK_PILLARS มีครบ 3 หมวดหลัก", () => {
    expect(QUICK_PILLARS).toHaveLength(3);
    const types = QUICK_PILLARS.map((p) => p.iconType);
    expect(types).toContain("guide");
    expect(types).toContain("knowledge");
    expect(types).toContain("farm");
  });

  it("QUICK_PILLARS แต่ละรายการมี id, title, description, query และ iconType", () => {
    for (const pillar of QUICK_PILLARS) {
      expect(pillar.id).toBeTruthy();
      expect(pillar.title).toBeTruthy();
      expect(pillar.description).toBeTruthy();
      expect(pillar.query).toBeTruthy();
      expect(["guide", "knowledge", "farm"]).toContain(pillar.iconType);
    }
  });

  it("คำถามที่ไม่ตรงหมวดใด ควรตอบแบบ Fallback พร้อม showQuickPillars", () => {
    const reply = getBotResponse("อยากรู้เรื่องสภาพอากาศกรุงเทพ");
    expect(reply.showQuickPillars).toBe(true);
  });

  it("ผลลัพธ์มี text เสมอทุกกรณี ไม่ undefined/null", () => {
    const inputs = ["", "สวัสดี", "ขอบคุณ", "ปลูกกล้วยยังไง", "ราคาเท่าไหร่"];
    for (const input of inputs) {
      const reply = getBotResponse(input);
      expect(reply.text).toBeTruthy();
    }
  });
});
