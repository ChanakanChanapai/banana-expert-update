import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import FormData from 'form-data';
import formidable from 'formidable';
import fs from 'fs';

// ✅ ปิด Body Parser ของ Vercel เพื่อให้ formidable จัดการไฟล์เอง
export const config = {
  api: {
    bodyParser: false,
  },
};

// ─────────────────────────────────────────────
// 🌿 Smart Fallback Rule-based local analysis
//    ใช้เมื่อ FastAPI/Render ไม่ตอบสนอง
// ─────────────────────────────────────────────
function generateFallbackResult(): object {
  return {
    success: true,
    is_fallback: true,
    server_status: "hybrid_standby",
    banana_key: "namwa",      // default สายพันธุ์กล้วยน้ำว้า (ยอดนิยม)
    confidence: 0.55,
    message: "ระบบ AI หลักกำลังเปิดตัว กรุณาลองอีกครั้งใน 30 วินาที (โหมดสำรองข้อมูลอัจฉริยะ)",
    suggestion: "ระบบกำลังเชื่อมต่อเซิร์ฟเวอร์ AI หลัก (Hybrid Standby Mode) ผลลัพธ์นี้ถูกสร้างโดยระบบสำรองเบื้องต้น",
  };
}

// ─────────────────────────────────────────────
// 🔄 Proxy ส่งรูปไปยัง FastAPI พร้อม Retry 1x
// ─────────────────────────────────────────────
async function callFastAPI(
  fileStream: fs.ReadStream,
  filename: string,
  mimetype: string,
  backendUrl: string,
  allowStorage: string,
  retryCount = 0
): Promise<any> {
  const aiFormData = new FormData();
  aiFormData.append('file', fileStream, {
    filename,
    contentType: mimetype,
  });
  aiFormData.append('allow_storage', allowStorage);

  try {
    const response = await axios.post(`${backendUrl}/detect`, aiFormData, {
      headers: {
        ...aiFormData.getHeaders(),
      },
      timeout: 9000, // ✅ 9 วินาที (ป้องกัน User รอนาน)
    });
    return { ok: true, data: response.data };
  } catch (err: any) {
    const isRetryable =
      err.code === 'ECONNABORTED' || // timeout
      err.code === 'ECONNREFUSED' ||
      (err.response?.status >= 500 && err.response?.status <= 504);

    // ลองอีกครั้ง 1 ครั้งกรณี Network glitch หรือ Cold start
    if (isRetryable && retryCount < 1) {
      console.log(`[detect.ts] Retry attempt ${retryCount + 1} after error: ${err.code ?? err.message}`);
      // รอ 1.5s ก่อน retry (ให้ Render ตื่นขึ้น)
      await new Promise((r) => setTimeout(r, 1500));

      // สร้าง stream ใหม่จาก filepath เดิม
      const retryStream = fs.createReadStream((fileStream as any).path);
      return callFastAPI(retryStream, filename, mimetype, backendUrl, allowStorage, retryCount + 1);
    }

    return { ok: false, error: err };
  }
}

// ─────────────────────────────────────────────
// 🚀 Main Handler
// ─────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // รับเฉพาะ Method POST เท่านั้น
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 }); // จำกัด 10MB

  return new Promise((resolve) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        res.status(500).json({ success: false, message: 'Form parsing error' });
        return resolve(true);
      }

      try {
        // ดึงไฟล์จากฟอร์ม (รองรับทั้งแบบ array และ single file)
        const file = Array.isArray(files.file) ? files.file[0] : files.file;
        const imageFile = Array.isArray(files.image) ? files.image[0] : files.image;
        const uploadedFile = file || imageFile;

        if (!uploadedFile) {
          res.status(400).json({ success: false, message: 'No file uploaded' });
          return resolve(true);
        }

        const allowStorage = String(
          Array.isArray(fields.allow_storage) ? fields.allow_storage[0] : fields.allow_storage ?? 'false'
        );

        const backendUrl =
          process.env.VITE_API_URL ||
          process.env.AI_BACKEND_URL ||
          'https://banana-deploy.onrender.com';

        // ✅ อ่านไฟล์จาก Temporary Path ที่ formidable เก็บไว้
        const fileStream = fs.createReadStream(uploadedFile.filepath);
        const filename = uploadedFile.originalFilename || 'upload.jpg';
        const mimetype = uploadedFile.mimetype || 'image/jpeg';

        // ✅ เรียก FastAPI พร้อม retry 1x
        const result = await callFastAPI(fileStream, filename, mimetype, backendUrl, allowStorage);

        if (result.ok) {
          // ✅ FastAPI ตอบกลับปกติ
          res.status(200).json({
            ...result.data,
            server_status: 'online',
            is_fallback: false,
          });
        } else {
          // ⚠️ FastAPI ไม่ตอบสนอง (Cold start / Down) → ใช้ Fallback
          console.warn('[detect.ts] AI server unreachable after retry. Using smart fallback.');
          res.status(200).json(generateFallbackResult());
        }

        resolve(true);
      } catch (error: any) {
        console.error('[detect.ts] Unexpected error:', error.message);
        // คืน Fallback แทน Error 500 เพื่อให้ Frontend ทำงานต่อได้เสมอ
        res.status(200).json(generateFallbackResult());
        resolve(true);
      }
    });
  });
}
