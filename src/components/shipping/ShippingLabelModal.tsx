import React, { useRef, useEffect, useState } from "react";
import JsBarcode from "jsbarcode";
import { toPng } from "html-to-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Printer,
  Download,
  Copy,
  Check,
  Package,
  MapPin,
  Phone,
  User,
  Store,
} from "lucide-react";
import { toast } from "sonner";

export interface ShippingLabelData {
  order_number: string;
  created_at: string;
  shipping_date?: string | null;
  product_name: string;
  quantity: number;
  total_price?: number;
  tracking_number?: string | null;
  carrier?: string | null;
  delivery_notes?: string | null;
  receiver_name: string;
  receiver_phone: string;
  delivery_address: string;
  farm_name: string;
  farm_phone: string;
  farm_location: string;
}

interface ShippingLabelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ShippingLabelData | null;
}

export const ShippingLabelModal: React.FC<ShippingLabelModalProps> = ({
  open,
  onOpenChange,
  data,
}) => {
  const labelRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const trackingBarcodeRef = useRef<SVGSVGElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const extractZipCode = (address: string): string[] => {
    if (!address) return ["", "", "", "", ""];
    const match = address.match(/\b\d{5}\b/);
    return match ? match[0].split("") : ["", "", "", "", ""];
  };

  const zipDigits = data ? extractZipCode(data.delivery_address) : ["", "", "", "", ""];

  useEffect(() => {
    if (open && data) {
      setTimeout(() => {
        if (barcodeRef.current && data.order_number) {
          try {
            JsBarcode(barcodeRef.current, data.order_number, {
              format: "CODE128",
              lineColor: "#000",
              width: 1.6,
              height: 38,
              displayValue: true,
              fontSize: 12,
              font: "monospace",
              margin: 4,
            });
          } catch (e) {
            console.error("Barcode gen error:", e);
          }
        }
        if (trackingBarcodeRef.current && data.tracking_number) {
          try {
            JsBarcode(trackingBarcodeRef.current, data.tracking_number, {
              format: "CODE128",
              lineColor: "#000",
              width: 1.8,
              height: 40,
              displayValue: true,
              fontSize: 13,
              font: "monospace",
              margin: 4,
            });
          } catch (e) {
            console.error("Tracking barcode error:", e);
          }
        }
      }, 120);
    }
  }, [open, data]);

  const handlePrint = () => {
    if (!labelRef.current || !data) return;
    const printContents = labelRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (!printWindow) {
      toast.error("กรุณาอนุญาตป๊อปอัปเพื่อสั่งพิมพ์");
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ใบปะหน้าพัสดุ_${data.order_number}</title>
          <meta charset="utf-8" />
          <style>
            @page { size: 100mm 150mm; margin: 0; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #fff; color: #000; margin: 0; padding: 10px; display: flex; justify-content: center; }
            * { box-sizing: border-box; }
            .shipping-label-container { width: 100mm; max-width: 100mm; min-height: 145mm; border: 2px solid #000; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; background: #fff; }
            .border-b { border-bottom: 1px solid #000; }
            .border-b-2 { border-bottom: 2px solid #000; }
            .border-t { border-top: 1px solid #000; }
            .border-2 { border: 2px solid #000; }
            .border { border: 1px solid #000; }
            .flex { display: flex; }
            .flex-col { flex-direction: column; }
            .items-center { align-items: center; }
            .justify-between { justify-content: space-between; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .font-black { font-weight: 900; }
            .text-xs { font-size: 11px; }
            .text-sm { font-size: 13px; }
            .text-base { font-size: 15px; }
            .bg-black { background-color: #000 !important; color: #fff !important; }
            .bg-gray-200 { background-color: #e5e7eb !important; }
            .bg-yellow-200 { background-color: #fef08a !important; }
            .bg-red-50 { background-color: #fef2f2 !important; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="shipping-label-container">
            ${printContents}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadImage = async () => {
    if (!labelRef.current || !data) return;
    try {
      setDownloading(true);
      const dataUrl = await toPng(labelRef.current, { quality: 1, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `shipping-label-${data.order_number || "order"}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("บันทึกรูปภาพใบปะหน้าเรียบร้อยแล้ว");
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถสร้างรูปภาพได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyText = () => {
    if (!data) return;
    const text = `[ผู้รับ]
คุณ ${data.receiver_name} (${data.receiver_phone})
${data.delivery_address}

[ผู้ส่ง]
${data.farm_name} (${data.farm_phone})
${data.farm_location}

[สินค้า]: ${data.product_name} x ${data.quantity}
[ออเดอร์]: ${data.order_number}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("คัดลอกข้อมูลที่อยู่จัดส่งแล้ว");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border-0">

        {/* ── Header ── */}
        <DialogHeader className="flex flex-row items-center justify-between px-6 pt-5 pb-4 border-b dark:border-zinc-700 space-y-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white leading-none">
                ใบปะหน้าพัสดุ
              </DialogTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-normal">
                Shipping Label — พร้อมพิมพ์และบันทึก
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyText}
              disabled={!data}
              className="text-xs h-9 gap-1.5 text-gray-600 dark:text-gray-300"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">คัดลอก</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={downloading || !data}
              onClick={handleDownloadImage}
              className="text-xs h-9 gap-1.5 border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">
                {downloading ? "กำลังสร้าง..." : "บันทึก PNG"}
              </span>
            </Button>

            <Button
              size="sm"
              onClick={handlePrint}
              disabled={!data}
              className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">พิมพ์</span>
            </Button>
          </div>
        </DialogHeader>

        {/* ── Body ── */}
        {!data ? (
          <div className="flex items-center justify-center h-64 text-gray-400">
            ไม่มีข้อมูลใบปะหน้า
          </div>
        ) : (
          <div className="p-5 space-y-4">

            {/* Info Cards: ผู้รับ + ผู้ส่ง */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* ผู้รับ */}
              <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                    📍 ผู้รับสินค้า (TO)
                  </span>
                </div>
                <p className="font-black text-base text-gray-900 dark:text-white">
                  คุณ {data.receiver_name || "—"}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                    {data.receiver_phone || "—"}
                  </span>
                </div>
                <div className="flex items-start gap-1.5 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                    {data.delivery_address || "ไม่ได้ระบุที่อยู่"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] font-bold text-gray-500">รหัสไปรษณีย์:</span>
                  <div className="flex gap-0.5">
                    {zipDigits.map((d, i) => (
                      <div
                        key={i}
                        className="w-[20px] h-[24px] border-2 border-gray-400 dark:border-gray-600 flex items-center justify-center font-black text-xs font-mono bg-white dark:bg-zinc-800 text-gray-900 dark:text-white rounded-sm"
                      >
                        {d || "—"}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ผู้ส่ง */}
              <div className="rounded-xl border-2 border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-md bg-gray-700 dark:bg-gray-600 flex items-center justify-center shrink-0">
                    <Store className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    📦 ผู้ส่ง (FROM)
                  </span>
                </div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">
                  {data.farm_name || "ฟาร์มผู้ปลูก"}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {data.farm_phone || "—"}
                  </span>
                </div>
                <div className="flex items-start gap-1.5 mt-1.5">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {data.farm_location || "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* รายละเอียดคำสั่งซื้อ */}
            <div className="rounded-xl border dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-100 dark:bg-zinc-700/60 border-b dark:border-zinc-700">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                  รายละเอียดคำสั่งซื้อ
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x dark:divide-zinc-700">
                <InfoCell label="เลขออเดอร์" value={data.order_number || "—"} mono />
                <InfoCell label="สินค้า" value={data.product_name} />
                <InfoCell label="จำนวน" value={`${data.quantity} หน่วย`} />
                <InfoCell
                  label="ยอดรวม"
                  value={
                    data.total_price != null
                      ? `฿${data.total_price.toLocaleString()}`
                      : "—"
                  }
                />
              </div>

              {(data.carrier || data.tracking_number) && (
                <div className="px-4 py-3 border-t dark:border-zinc-700 flex flex-wrap gap-4">
                  {data.carrier && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">บริษัทขนส่ง:</span>
                      <span className="font-bold text-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-2 py-0.5 rounded-md uppercase tracking-wide">
                        {data.carrier}
                      </span>
                    </div>
                  )}
                  {data.tracking_number && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">เลขติดตาม:</span>
                      <span className="font-mono font-bold text-sm text-gray-900 dark:text-white bg-yellow-100 dark:bg-yellow-900/40 px-2 py-0.5 rounded-md">
                        {data.tracking_number}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {data.delivery_notes && (
                <div className="px-4 py-2 border-t dark:border-zinc-700 bg-yellow-50 dark:bg-yellow-900/20 text-xs text-yellow-800 dark:text-yellow-300">
                  <span className="font-bold">หมายเหตุ:</span> {data.delivery_notes}
                </div>
              )}

              <div className="px-4 py-2 border-t dark:border-zinc-700 flex gap-4 text-xs text-gray-500">
                <span>
                  วันที่สั่ง:{" "}
                  {new Date(data.created_at).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {data.shipping_date && (
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    กำหนดส่ง:{" "}
                    {new Date(data.shipping_date).toLocaleDateString("th-TH", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* ตัวอย่างใบปะหน้าพัสดุ (Preview สำหรับ Print) */}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5" />
                ตัวอย่างใบปะหน้าพัสดุ (100×150 mm)
              </p>
              <div className="flex justify-center p-4 bg-gray-200/70 dark:bg-zinc-950 rounded-xl overflow-x-auto">
                <div
                  ref={labelRef}
                  className="w-[100mm] min-h-[148mm] bg-white text-black p-4 font-sans border-2 border-black rounded-sm shadow-xl flex flex-col justify-between select-none"
                  style={{ boxSizing: "border-box" }}
                >
                  {/* 1. หัว */}
                  <div className="border-b-2 border-black pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-base font-black tracking-tight text-emerald-800">
                          BANANA MARKET
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">
                          Express Fruit Delivery
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] font-bold bg-black text-white px-2 py-0.5 rounded-sm">
                          {data.carrier ? data.carrier.toUpperCase() : "STANDARD DELIVERY"}
                        </span>
                        <div className="text-[11px] font-mono font-bold mt-1">
                          #{data.order_number || "NO-ORDER"}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center my-1">
                      <svg ref={barcodeRef} className="max-h-[38px] max-w-full"></svg>
                    </div>
                    {data.tracking_number && (
                      <div className="mt-1 pt-1 border-t border-dashed border-gray-400 flex flex-col items-center">
                        <span className="text-[10px] font-bold text-gray-600">
                          เลขติดตามพัสดุ: {data.tracking_number}
                        </span>
                        <svg ref={trackingBarcodeRef} className="max-h-[40px] max-w-full"></svg>
                      </div>
                    )}
                  </div>

                  {/* 2. ผู้ส่ง */}
                  <div className="border-b border-gray-400 py-2 text-xs">
                    <div className="flex justify-between text-[10px] font-bold text-gray-600 mb-0.5">
                      <span>ผู้ส่ง (FROM / SENDER):</span>
                      <span>ต้นทาง</span>
                    </div>
                    <p className="font-bold text-sm text-black">{data.farm_name || "ฟาร์มผู้ปลูกกล้วย"}</p>
                    <p className="text-[11px] text-gray-800 leading-snug mt-0.5 line-clamp-2">
                      {data.farm_location || "ไม่ได้ระบุที่อยู่ฟาร์ม"}
                    </p>
                    <p className="font-semibold text-[11px] mt-1 text-black">
                      โทร: <span className="font-bold">{data.farm_phone || "-"}</span>
                    </p>
                  </div>

                  {/* 3. ผู้รับ */}
                  <div className="border-b-2 border-black py-2.5 bg-slate-50/90 -mx-1 px-2 rounded-sm my-1">
                    <div className="flex justify-between items-center text-xs font-bold text-black mb-1">
                      <span className="bg-black text-white px-1.5 py-0.5 rounded text-[11px]">
                        📍 ผู้รับ (TO / RECIPIENT)
                      </span>
                      <span className="text-[11px] font-bold text-emerald-800">ปลายทาง</span>
                    </div>
                    <p className="text-base font-black text-black">
                      คุณ {data.receiver_name || "ลูกค้าผู้รับสินค้า"}
                    </p>
                    <p className="text-xs text-gray-900 leading-relaxed font-medium mt-1">
                      {data.delivery_address || "ไม่มีข้อมูลที่อยู่จัดส่ง"}
                    </p>
                    <div className="mt-2 flex flex-wrap justify-between items-center gap-2">
                      <div className="inline-flex items-center gap-1 bg-yellow-200 border border-yellow-400 px-2 py-0.5 rounded text-xs font-bold text-black">
                        <span>📞 โทร:</span>
                        <span className="text-sm font-black">{data.receiver_phone || "-"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-gray-600">รหัส ปณ.:</span>
                        <div className="flex gap-0.5">
                          {zipDigits.map((d, i) => (
                            <div
                              key={i}
                              className="w-[18px] h-[22px] border-2 border-black flex items-center justify-center font-black text-xs font-mono bg-white"
                            >
                              {d || "-"}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. สินค้า */}
                  <div className="py-1.5 text-xs border-b border-gray-400">
                    <div className="flex justify-between items-center font-bold text-[11px]">
                      <span className="truncate max-w-[70%]">
                        📦 สินค้า: <span className="font-semibold">{data.product_name}</span>
                      </span>
                      <span className="bg-gray-200 px-1.5 py-0.5 rounded text-[11px]">
                        จำนวน: <strong>{data.quantity}</strong> หน่วย
                      </span>
                    </div>
                    {data.delivery_notes && (
                      <p className="text-[10px] text-gray-600 mt-1 italic line-clamp-1">
                        หมายเหตุ: {data.delivery_notes}
                      </p>
                    )}
                  </div>

                  {/* 5. ป้ายเตือน */}
                  <div className="my-1 py-1 px-2 border-2 border-red-600 bg-red-50 text-red-700 rounded-sm flex items-center justify-between text-[10px] font-bold">
                    <span>⚠️ ผลไม้สด ห้ามโยน ระวังกระแทก</span>
                    <span className="uppercase text-[9px] tracking-wider font-black">
                      FRAGILE / DO NOT DROP
                    </span>
                  </div>

                  {/* 6. ท้าย */}
                  <div className="pt-1 flex justify-between items-end text-[9px] text-gray-500">
                    <div>
                      <span>วันที่สั่งซื้อ: {new Date(data.created_at).toLocaleDateString("th-TH")}</span>
                      {data.shipping_date && (
                        <span className="block text-gray-700 font-semibold">
                          กำหนดส่ง: {new Date(data.shipping_date).toLocaleDateString("th-TH")}
                        </span>
                      )}
                    </div>
                    <div className="border border-dashed border-gray-400 p-1 text-center w-24">
                      <span className="text-[8px] block text-gray-400">ลายเซ็นผู้รับสินค้า</span>
                      <div className="h-4"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

/* ── Helper Sub-component ── */
const InfoCell = ({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) => (
  <div className="px-4 py-3">
    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-0.5">
      {label}
    </p>
    <p
      className={`text-sm font-bold text-gray-900 dark:text-white truncate ${
        mono ? "font-mono" : ""
      }`}
    >
      {value}
    </p>
  </div>
);
