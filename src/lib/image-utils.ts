import { supabase } from "@/integrations/supabase/client";

/**
 * แปลง URL หรือ Storage Path ของรูปภาพสินค้าให้เป็น Public URL ที่ถูกต้องเสมอ
 * รองรับทั้ง full URL (https://...), Blob URL (blob:...), Data URL (data:...) และ Storage Path (farmId/productId/...)
 */
export const getProductImageUrl = (
  urlOrPath: string | null | undefined
): string | null => {
  if (!urlOrPath || typeof urlOrPath !== "string" || !urlOrPath.trim()) {
    return null;
  }

  const trimmed = urlOrPath.trim();

  // หากเป็น URL เต็ม หรือ blob preview ให้ใช้ได้ทันที
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // หากเป็น Supabase Storage Path ให้สร้าง Public URL
  try {
    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(trimmed);
    return data?.publicUrl || trimmed;
  } catch {
    return trimmed;
  }
};
