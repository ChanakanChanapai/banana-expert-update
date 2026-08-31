import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  ShoppingBag,
  Minus,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Store,
  PackageCheck,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import ThaiAddressSelector from "@/components/address/ThaiAddressSelector";

/* ---------- Types ---------- */

interface FarmProfile {
  id: string;
  farm_name: string;
  farm_location: string;
  user_id?: string;
}

export interface ReserveStatusInfo {
  status: "success" | "error";
  productName: string;
  quantity: number;
  unit: string;
  totalPrice: number;
  farmName: string;
  receiverName: string;
  deliveryAddress: string;
  errorMessage?: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  product_type: "fruit" | "shoot";
  price_per_unit: number;
  available_quantity: number;
  unit: string;
  harvest_date: string;
  image_url: string | null;
  farm: FarmProfile | null;
}

/* ---------- Component ---------- */

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [imageError, setImageError] = useState(false);

  const [openReserve, setOpenReserve] = useState(false);
  const [reserveStatus, setReserveStatus] = useState<ReserveStatusInfo | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  const [addressType, setAddressType] = useState<"saved" | "new">("saved");
  const [savedAddress, setSavedAddress] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");

  const [savedFullName, setSavedFullName] = useState<string | null>(null);
  const [savedPhone, setSavedPhone] = useState<string | null>(null);

  /* ---------- Load Product ---------- */

  useEffect(() => {
    if (!id) {
      navigate("/market");
      return;
    }

    window.scrollTo(0, 0);
    loadProduct(id);
  }, [id, navigate]);

  const loadProduct = async (productId: string) => {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        product_type,
        price_per_unit,
        available_quantity,
        unit,
        harvest_date,
        image_url,
        farm: farm_profiles (
          id,
          farm_name,
          farm_location,
          user_id
        )
      `)
      .eq("id", productId)
      .maybeSingle();

    if (error || !data) {
      toast.error("ไม่พบสินค้า");
      navigate("/market");
      return;
    }

    setProduct(data as Product);
    setLoading(false);
  };

  /* ---------- Load User Address ---------- */

  const loadUserAddress = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session || !session.user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนทำการสั่งจอง");
      navigate("/auth/login");
      return false;
    }

    const user = session.user;

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone, address")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      toast.error("โหลดที่อยู่ไม่สำเร็จ");
      return false;
    }

    if (data?.address) {
      setSavedFullName(data.full_name || null);
      setSavedPhone(data.phone || null);
      setSavedAddress(data.address);
      setAddressType("saved");
    } else {
      setSavedAddress(null);
      setAddressType("new");
    }

    return true;
  };

  /* ---------- Reserve ---------- */

  const handleOpenReserve = async () => {
    const ok = await loadUserAddress();
    if (ok) setOpenReserve(true);
  };

  const handleReserve = async () => {
    if (!product) return;

    if (quantity > product.available_quantity) {
      toast.error("จำนวนเกินสต็อกที่มีอยู่");
      return;
    }

    if (quantity <= 0) {
      toast.error("จำนวนต้องมากกว่า 0");
      return;
    }

    if (addressType === "new") {
      if (!receiverName.trim()) {
        toast.error("กรุณากรอกชื่อผู้รับ");
        return;
      }

      if (!receiverPhone.trim()) {
        toast.error("กรุณากรอกเบอร์โทรศัพท์ผู้รับ");
        return;
      }

      if (!newAddress.trim()) {
        toast.error("กรุณาระบุที่อยู่จัดส่ง");
        return;
      }
    }

    setSubmitting(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session || !session.user) {
      toast.error("กรุณาเข้าสู่ระบบ");
      setSubmitting(false);
      navigate("/auth/login");
      return;
    }

    const useProfile = addressType === "saved";
    const finalReceiverName = useProfile ? (savedFullName || null) : receiverName.trim();
    const finalReceiverPhone = useProfile ? (savedPhone || null) : receiverPhone.trim();
    const deliveryAddress = useProfile ? (savedAddress || null) : newAddress.trim();
    const calculatedTotal = quantity * product.price_per_unit;

    const { error } = await supabase.rpc("reserve_v5", {
      p_product_id: product.id,
      p_quantity: quantity,
      p_note: note.trim() || null,
      p_use_profile: useProfile,
      p_receiver_name: finalReceiverName,
      p_receiver_phone: finalReceiverPhone,
      p_delivery_address: deliveryAddress,
    });

    if (error) {
      const isStockError = error.message?.includes("สินค้าในสต็อกไม่เพียงพอ");
      const errorMsg = isStockError
        ? "ขออภัย สินค้าในสต็อกไม่เพียงพอสำหรับจำนวนที่คุณต้องการสั่งจอง (มีผู้สั่งจองในเวลาเดียวกัน)"
        : (error.message || "เกิดข้อผิดพลาดในการบันทึกคำสั่งจอง กรุณาลองใหม่อีกครั้ง");

      setOpenReserve(false);
      setReserveStatus({
        status: "error",
        productName: product.name,
        quantity,
        unit: product.unit,
        totalPrice: calculatedTotal,
        farmName: product.farm?.farm_name || "ฟาร์มกล้วย",
        receiverName: finalReceiverName || "ลูกค้า",
        deliveryAddress: deliveryAddress || "-",
        errorMessage: errorMsg,
      });
      toast.error("ไม่สามารถทำรายการสั่งจองได้");
    } else {
      setOpenReserve(false);
      setReserveStatus({
        status: "success",
        productName: product.name,
        quantity,
        unit: product.unit,
        totalPrice: calculatedTotal,
        farmName: product.farm?.farm_name || "ฟาร์มกล้วย",
        receiverName: finalReceiverName || "ลูกค้า",
        deliveryAddress: deliveryAddress || "-",
      });
      toast.success("สั่งจองผลผลิตเรียบร้อยแล้ว!");

      // 🔔 1. ส่งการแจ้งเตือน Real-time ไปยังเจ้าของฟาร์ม (Farmer)
      if (product.farm?.user_id) {
        try {
          const clientName = finalReceiverName || "ลูกค้า";
          await supabase.from("notifications").insert({
            user_id: product.farm.user_id,
            title: "มีคำขอสั่งจองผลผลิตใหม่! 🍌",
            message: `คุณ ${clientName} ได้สั่งจอง "${product.name}" จำนวน ${quantity} ${product.unit} (ยอดรวม ฿${calculatedTotal.toLocaleString()})`,
            type: "new_order",
            read: false,
            link: "/farm/orders",
          });
        } catch (notifErr) {
          console.error("Failed to send farmer notification:", notifErr);
        }
      }

      // 🔔 2. ส่งการแจ้งเตือนยืนยันคำสั่งจองไปยังผู้ซื้อ (Buyer)
      const buyerNotifItem = {
        id: crypto.randomUUID(),
        title: "ส่งคำขอสั่งจองผลผลิตสำเร็จ! 🍌",
        message: `คุณได้สั่งจอง "${product.name}" จำนวน ${quantity} ${product.unit} จาก ${product.farm?.farm_name || "ฟาร์ม"} (ยอดรวม ฿${calculatedTotal.toLocaleString()}) สถานะ: รอดำเนินการ`,
        type: "reservation_created",
        read: false,
        link: "/dashboard/orders",
        created_at: new Date().toISOString(),
      };

      // 🚀 ส่งสัญญาณอัปเดตไอคอนกระดิ่งทันที 0ms (Optimistic UI)
      window.dispatchEvent(
        new CustomEvent("refresh-notifications", { detail: buyerNotifItem })
      );

      try {
        await supabase.from("notifications").insert({
          id: buyerNotifItem.id,
          user_id: user.id,
          title: buyerNotifItem.title,
          message: buyerNotifItem.message,
          type: buyerNotifItem.type,
          read: false,
          link: buyerNotifItem.link,
        });
      } catch (buyerNotifErr) {
        console.error("Failed to send buyer notification:", buyerNotifErr);
      }

      loadProduct(product.id);
    }

    setSubmitting(false);
  };


  /* ---------- UI ---------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!product) return null;

  const totalPrice = quantity * product.price_per_unit;

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <Navbar />
      <div className="container max-w-5xl mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> ย้อนกลับ
        </Button>

        <div className="grid md:grid-cols-2 gap-8 mt-6">
          <div className="aspect-square bg-white rounded-3xl flex items-center justify-center overflow-hidden border border-amber-200/80 shadow-md relative group">
            {product.image_url && !imageError ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-amber-50/80 via-yellow-50/40 to-slate-50 p-6 text-center">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-amber-100/90 border border-amber-300/80 flex items-center justify-center mb-4 shadow-sm">
                  <ShoppingBag className="w-12 h-12 sm:w-14 sm:h-14 text-amber-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg sm:text-xl">{product.name}</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">ผลผลิตคุณภาพส่งตรงจากฟาร์ม</p>
                <span className="mt-3 text-[11px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {product.product_type === "fruit" ? "🍌 กล้วยผลสด" : "🌱 หน่อพันธุ์กล้วย"}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Badge>{product.product_type === "fruit" ? "ผล" : "หน่อ"}</Badge>
            <h1 className="text-3xl font-bold">{product.name}</h1>

            <div className="text-4xl font-bold text-primary">
              ฿{product.price_per_unit} / {product.unit}
            </div>

            <Separator />

            <Card className="p-4 space-y-2 text-sm">
              <div>
                คงเหลือ: {product.available_quantity} {product.unit}
              </div>
              <div>
                รอบวันเก็บเกี่ยว:{" "}
                <span className="font-semibold text-slate-800">
                  {new Date(product.harvest_date).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </Card>

            {product.description && (
              <Card className="p-4">
                <h3 className="font-semibold mb-1">รายละเอียดสินค้า</h3>
                <p className="text-muted-foreground whitespace-pre-line">
                  {product.description}
                </p>
              </Card>
            )}

            {product.farm && (
              <Card
                className="p-4 cursor-pointer hover:bg-amber-50/70 border border-amber-200/80 rounded-2xl transition-all shadow-xs flex items-center justify-between group"
                onClick={() => navigate(`/farm/${product.farm?.id}`)}
              >
                <div>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5 group-hover:text-amber-800 transition-colors">
                    <Store className="w-4 h-4 text-amber-600" />
                    {product.farm.farm_name}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {product.farm.farm_location}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-semibold shrink-0"
                >
                  ดูหน้าร้านค้า &rarr;
                </Button>
              </Card>
            )}

            <Button
              size="lg"
              className="w-full"
              disabled={
                product.available_quantity <= 0 ||
                quantity > product.available_quantity
              }
              onClick={handleOpenReserve}
            >
              จองสินค้า
            </Button>
          </div>
        </div>
      </div>

      {/* ---------- Reserve Modal ---------- */}

      <Dialog open={openReserve} onOpenChange={setOpenReserve}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ยืนยันการจองสินค้า</DialogTitle>
          </DialogHeader>

          <Card className="p-4 space-y-3">
            <div className="font-semibold">{product.name}</div>
            <div className="text-sm text-muted-foreground">
              ฟาร์ม: {product.farm?.farm_name}
            </div>

            <Separator />

            <div className="flex justify-between text-sm">
              <span>ราคาต่อหน่วย</span>
              <span>
                ฿{product.price_per_unit} / {product.unit}
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold text-slate-800">จำนวนสั่งจอง</Label>
                <p className="text-xs text-muted-foreground">
                  สูงสุด {product.available_quantity} {product.unit}
                </p>
              </div>

              <div className="flex items-center border border-amber-200/90 rounded-2xl bg-amber-50/40 p-1 shadow-xs">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl bg-white text-slate-700 hover:bg-amber-100 hover:text-amber-900 border border-slate-200/80 shadow-2xs active:scale-95 transition-all disabled:opacity-40"
                  disabled={quantity <= 1}
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  aria-label="ลดจำนวน"
                >
                  <Minus className="w-3.5 h-3.5" />
                </Button>

                <input
                  type="number"
                  min={1}
                  max={product.available_quantity}
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (isNaN(val) || val < 1) {
                      setQuantity(1);
                    } else if (val > product.available_quantity) {
                      setQuantity(product.available_quantity);
                    } else {
                      setQuantity(val);
                    }
                  }}
                  className="w-14 text-center font-bold text-base text-slate-900 bg-transparent border-none focus:outline-hidden focus:ring-0 select-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl bg-white text-slate-700 hover:bg-amber-100 hover:text-amber-900 border border-slate-200/80 shadow-2xs active:scale-95 transition-all disabled:opacity-40"
                  disabled={quantity >= product.available_quantity}
                  onClick={() =>
                    setQuantity((prev) =>
                      Math.min(product.available_quantity, prev + 1)
                    )
                  }
                  aria-label="เพิ่มจำนวน"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between font-semibold text-lg">
              <span>ราคารวม</span>
              <span>฿{totalPrice.toLocaleString()}</span>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <div className="font-semibold">ที่อยู่จัดส่ง</div>

            <RadioGroup
              value={addressType}
              onValueChange={(v) =>
                setAddressType(v as "saved" | "new")
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="saved"
                  id="saved"
                  disabled={!savedAddress}
                />
                <Label htmlFor="saved">ใช้ที่อยู่ที่บันทึกไว้</Label>
              </div>

              {addressType === "saved" && savedAddress && (
                <Card className="p-3 text-sm bg-muted space-y-1">
                  <p>ชื่อผู้รับ : {savedFullName || "-"}</p>
                  <p>เบอร์โทร : {savedPhone || "-"}</p>
                  <p>ที่อยู่ : {savedAddress}</p>
                </Card>
              )}


              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new">ใช้ที่อยู่ใหม่</Label>
              </div>
            </RadioGroup>

            {addressType === "new" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="ชื่อผู้รับ *"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                  />

                  <Input
                    placeholder="เบอร์โทร *"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">ระบุที่อยู่จัดส่ง</Label>
                  <ThaiAddressSelector
                    value={newAddress}
                    onChange={(fullAddress) => setNewAddress(fullAddress)}
                  />
                </div>
              </div>
            )}

          </Card>

          <Textarea
            placeholder="หมายเหตุถึงฟาร์ม (ถ้ามี)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <DialogFooter>
            <Button
              onClick={handleReserve}
              disabled={submitting}
              className="w-full h-11 text-base font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md rounded-xl"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> กำลังส่งคำสั่งจอง...
                </>
              ) : (
                `ยืนยันการจอง ฿${totalPrice.toLocaleString()}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- 🟢 Reservation Status Result Modal (สำเร็จ / ไม่สำเร็จ) ---------- */}
      <Dialog
        open={Boolean(reserveStatus)}
        onOpenChange={(open) => {
          if (!open) setReserveStatus(null);
        }}
      >
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl bg-white animate-in zoom-in-95 duration-200">
          {reserveStatus?.status === "success" ? (
            <div>
              {/* 🟢 Success Header */}
              <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 p-6 text-white text-center relative">
                <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <CheckCircle2 className="w-10 h-10 text-white animate-in zoom-in-50 duration-300" />
                </div>
                <h3 className="text-2xl font-black tracking-tight">สั่งจองผลผลิตสำเร็จ!</h3>
                <p className="text-xs sm:text-sm text-emerald-100 mt-1">
                  ระบบได้บันทึกคำสั่งจองและแจ้งเตือนไปยังเจ้าของสวนแล้ว
                </p>

                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full mt-3 shadow-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>สถานะ: รอดำเนินการ (Pending)</span>
                </div>
              </div>

              {/* Order Summary Details */}
              <div className="p-6 space-y-4">
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-xs sm:text-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                    <span className="text-muted-foreground">ผลผลิตที่จอง</span>
                    <span className="font-bold text-slate-800">{reserveStatus.productName}</span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                    <span className="text-muted-foreground">จำนวน</span>
                    <span className="font-bold text-slate-800">
                      {reserveStatus.quantity} {reserveStatus.unit}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                    <span className="text-muted-foreground">ราคารวมทั้งสิ้น</span>
                    <span className="font-extrabold text-base text-emerald-600">
                      ฿{reserveStatus.totalPrice.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-slate-400" /> ฟาร์ม
                    </span>
                    <span className="font-medium text-slate-700">{reserveStatus.farmName}</span>
                  </div>

                  <div className="pt-1 text-slate-600 space-y-1">
                    <div className="font-semibold text-slate-700 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> จัดส่งถึง: {reserveStatus.receiverName}
                    </div>
                    <p className="text-[11px] sm:text-xs text-muted-foreground pl-4.5 line-clamp-2">
                      {reserveStatus.deliveryAddress}
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200/70 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-800">
                  <PackageCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    คุณสามารถติดตามความคืบหน้าการจัดเตรียม และตรวจสอบเลขพัสดุได้ตลอด 24 ชม. ที่หน้ารายการสั่งซื้อ
                  </p>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <Button
                    className="w-full h-12 rounded-xl text-sm sm:text-base font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md flex items-center justify-center gap-2"
                    onClick={() => {
                      setReserveStatus(null);
                      navigate("/dashboard/orders");
                    }}
                  >
                    <span>ดูคำสั่งซื้อของฉัน</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-11 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 border-slate-200"
                    onClick={() => {
                      setReserveStatus(null);
                      navigate("/market");
                    }}
                  >
                    เลือกดูสินค้าอื่นในตลาดต่อ
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* 🔴 Failed Header */}
              <div className="bg-gradient-to-r from-rose-500 to-red-600 p-6 text-white text-center relative">
                <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <XCircle className="w-10 h-10 text-white animate-in zoom-in-50 duration-300" />
                </div>
                <h3 className="text-2xl font-black tracking-tight">การสั่งจองไม่สำเร็จ</h3>
                <p className="text-xs sm:text-sm text-rose-100 mt-1">
                  ไม่สามารถบันทึกรายการสั่งจองได้ในขณะนี้
                </p>
              </div>

              {/* Error Explanation */}
              <div className="p-6 space-y-4">
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-800">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">สาเหตุข้อผิดพลาด</h4>
                    <p className="text-xs mt-1 leading-relaxed text-rose-700">
                      {reserveStatus?.errorMessage || "เกิดข้อผิดพลาดจากระบบ กรุณาตรวจสอบและลองใหม่อีกครั้ง"}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  <Button
                    className="w-full h-12 rounded-xl text-sm sm:text-base font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md"
                    onClick={() => {
                      setReserveStatus(null);
                      setOpenReserve(true);
                    }}
                  >
                    ลองทำรายการใหม่อีกครั้ง
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-11 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 border-slate-200"
                    onClick={() => {
                      setReserveStatus(null);
                      navigate("/market");
                    }}
                  >
                    กลับไปยังตลาดผลผลิต
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductDetail;
