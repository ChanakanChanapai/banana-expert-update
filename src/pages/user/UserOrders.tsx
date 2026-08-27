import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Truck,
  Package,
  Clock,
  CheckCircle2,
  Calendar,
  MapPin,
  Phone,
  User,
  Copy,
  Star,
  ShoppingBag,
  Store,
  XCircle,
  Sparkles,
  ExternalLink,
  Info,
  Layers,
  Banana,
  RefreshCw,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/layout/Navbar";

/* ---------- Types ---------- */

interface ProductInfo {
  name: string;
  product_type: string;
  price_per_unit?: number;
  unit?: string;
  image_url?: string | null;
  harvest_date?: string | null;
  expiry_date?: string | null;
  farm_profiles?: {
    id?: string;
    farm_name: string;
  } | null;
}

interface ShippingOrder {
  id: string;
  order_number: string;
  user_id: string;
  farm_id: string;
  product_id: string;
  quantity: number;
  total_price: number;
  created_at: string;
  shipped_at: string;
  carrier: string | null;
  tracking_number: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;
  products: ProductInfo;
}

interface ConfirmedOrder {
  id: string;
  quantity: number;
  created_at: string;
  total_price: number;
  order_number: string;
  shipped_at?: string;
  receiver_name: string | null;
  receiver_phone: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;
  products: ProductInfo;
}

interface Reservation {
  id: string;
  quantity: number;
  created_at: string;
  total_price: number;
  receiver_name: string | null;
  receiver_phone: string | null;
  delivery_address: string | null;
  note?: string | null;
  delivery_notes?: string | null;
  products: ProductInfo;
}

interface ReviewedOrder {
  id: string;
  quantity: number;
  created_at: string;
  total_price?: number;
  products: ProductInfo;
  reviews:
    | {
        rating: number;
        comment: string | null;
      }
    | Array<{
        rating: number;
        comment: string | null;
      }>
    | null;
}

interface ToReviewOrder {
  id: string;
  user_id: string;
  farm_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  shipped_at: string | null;
  carrier: string | null;
  tracking_number: string | null;
  total_price: number;
  order_number: string;
  receiver_name: string | null;
  receiver_phone: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;
  products: ProductInfo;
}

interface CancelledReservation {
  id: string;
  quantity: number;
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  total_price?: number;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  delivery_address?: string | null;
  note?: string | null;
  products: ProductInfo;
}

/* ---------- Component ---------- */

const UserOrders = () => {
  const navigate = useNavigate();

  const [shipping, setShipping] = useState<ShippingOrder[]>([]);
  const [confirmed, setConfirmed] = useState<ConfirmedOrder[]>([]);
  const [pending, setPending] = useState<Reservation[]>([]);
  const [toReview, setToReview] = useState<ToReviewOrder[]>([]);
  const [history, setHistory] = useState<ReviewedOrder[]>([]);
  const [cancelledReservations, setCancelledReservations] = useState<
    CancelledReservation[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");

  /* REVIEW MODAL */
  const [openReview, setOpenReview] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ToReviewOrder | null>(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  /* CANCEL MODAL */
  const [openCancel, setOpenCancel] = useState(false);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const formatDate = (d?: string | null) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  const copyToClipboard = (text: string, label = "คัดลอกแล้ว") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}: ${text}`);
  };

  /* ---------- LOAD DATA ---------- */

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate("/auth/login");
        return;
      }

      const [
        shippingRes,
        confirmedRes,
        pendingRes,
        toReviewRes,
        historyRes,
        cancelledRes,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select(
            `
            id,
            user_id,
            farm_id,
            product_id,
            quantity,
            created_at,
            shipped_at,
            carrier,
            tracking_number,
            order_number,
            receiver_name,
            receiver_phone,
            delivery_address,
            delivery_notes,
            total_price,
            products (
              name,
              product_type,
              harvest_date,
              expiry_date,
              price_per_unit,
              unit,
              image_url,
              farm_profiles (
                id,
                farm_name
              )
            )
          `
          )
          .eq("user_id", user.id)
          .eq("status", "shipped")
          .order("shipped_at", { ascending: false }),

        supabase
          .from("orders")
          .select(
            `
            id,
            quantity,
            created_at,
            total_price,
            order_number,
            receiver_name,
            receiver_phone,
            delivery_address,
            delivery_notes,
            products (
              name,
              product_type,
              harvest_date,
              expiry_date,
              price_per_unit,
              unit,
              image_url,
              farm_profiles (
                id,
                farm_name
              )
            )
          `
          )
          .eq("user_id", user.id)
          .eq("status", "confirmed")
          .order("confirmed_at", { ascending: false }),

        supabase
          .from("reservations")
          .select(
            `
            id,
            quantity,
            total_price,
            created_at,
            receiver_name,
            receiver_phone,
            delivery_address,
            note,
            products (
              name,
              product_type,
              harvest_date,
              expiry_date,
              price_per_unit,
              unit,
              image_url,
              farm_profiles (
                id,
                farm_name
              )
            )
          `
          )
          .eq("user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),

        supabase
          .from("orders")
          .select(
            `
              id,
              quantity,
              created_at,
              product_id,
              farm_id,
              user_id,
              shipped_at,
              carrier,
              tracking_number,
              total_price,
              order_number,
              receiver_name,
              receiver_phone,
              delivery_address,
              delivery_notes,
              products (
                name,
                product_type,
                harvest_date,
                price_per_unit,
                unit,
                image_url,
                farm_profiles (
                  id,
                  farm_name
                )
              )
            `
          )
          .eq("user_id", user.id)
          .eq("status", "delivered")
          .order("delivered_at", { ascending: false }),

        supabase
          .from("orders")
          .select(
            `
              id,
              quantity,
              created_at,
              total_price,
              products (
                name,
                product_type,
                price_per_unit,
                unit,
                image_url,
                farm_profiles (
                  farm_name
                )
              ),
              reviews (
                rating,
                comment
              )
            `
          )
          .eq("user_id", user.id)
          .eq("status", "reviewed")
          .order("created_at", { ascending: false }),

        supabase
          .from("reservations")
          .select(
            `
                id,
                quantity,
                created_at,
                cancelled_at,
                cancelled_by,
                cancel_reason,
                total_price,
                receiver_name,
                receiver_phone,
                delivery_address,
                note,
                products (
                  name,
                  product_type,
                  price_per_unit,
                  unit,
                  image_url,
                  farm_profiles (
                    farm_name
                  )
                )
              `
          )
          .eq("user_id", user.id)
          .eq("status", "cancelled")
          .order("cancelled_at", { ascending: false }),
      ]);

      if (pendingRes.error) console.error("Pending reservations error:", pendingRes.error);
      if (confirmedRes.error) console.error("Confirmed orders error:", confirmedRes.error);
      if (shippingRes.error) console.error("Shipping orders error:", shippingRes.error);
      if (toReviewRes.error) console.error("ToReview error:", toReviewRes.error);
      if (historyRes.error) console.error("History error:", historyRes.error);
      if (cancelledRes.error) console.error("Cancelled error:", cancelledRes.error);

      setShipping((shippingRes.data as any) || []);
      setConfirmed((confirmedRes.data as any) || []);
      setPending(
        ((pendingRes.data as any) || []).map((r: any) => ({
          ...r,
          delivery_notes: r.note || r.delivery_notes || null,
        }))
      );
      setToReview((toReviewRes.data as any) || []);
      setHistory((historyRes.data as any) || []);
      setCancelledReservations((cancelledRes.data as any) || []);
    } catch (err) {
      console.error("loadAll error:", err);
      toast.error("โหลดข้อมูลรายการสั่งซื้อไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- CONFIRM RECEIVED ---------- */

  const confirmReceived = async (order: ShippingOrder) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (error) throw error;

      toast.success("ยืนยันรับสินค้าเรียบร้อยแล้ว ขอบคุณครับ");

      setSelectedOrder(order as any);
      setOpenReview(true);
      await loadAll();
    } catch {
      toast.error("เกิดข้อผิดพลาดในการยืนยันรับสินค้า");
    }
  };

  /* ---------- CANCEL RESERVATION ---------- */

  const cancelReservation = async (reservationId: string, reason: string) => {
    if (!reason.trim()) {
      toast.error("กรุณาระบุเหตุผลในการยกเลิก");
      return;
    }
    setSubmittingCancel(true);
    try {
      const { error } = await supabase.rpc("cancel_reservation", {
        p_reservation_id: reservationId,
        p_reason: reason.trim(),
      });

      if (error) throw error;

      toast.success("ยกเลิกรายการจองเรียบร้อยแล้ว");
      setOpenCancel(false);
      setSelectedReservation(null);
      setCancelReason("");
      await loadAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "ไม่สามารถยกเลิกรายการจองได้");
    } finally {
      setSubmittingCancel(false);
    }
  };

  /* ---------- SUBMIT REVIEW ---------- */

  const submitReview = async () => {
    if (!selectedOrder) return;
    setSubmittingReview(true);
    try {
      const { error } = await supabase.rpc("insert_review", {
        p_order_id: selectedOrder.id,
        p_rating: rating,
        p_comment: comment.trim() || null,
      });

      if (error) throw error;

      toast.success("ขอบคุณสำหรับคะแนนและรีวิวสินค้า 🌟");
      setOpenReview(false);
      setSelectedOrder(null);
      setRating(5);
      setComment("");
      await loadAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "ส่งรีวิวไม่สำเร็จ");
    } finally {
      setSubmittingReview(false);
    }
  };

  /* ---------- EMPTY STATE COMPONENT ---------- */

  const EmptyState = ({ message, sub }: { message: string; sub?: string }) => (
    <div className="py-16 px-4 text-center rounded-2xl border border-dashed border-border/80 bg-card/40 flex flex-col items-center justify-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        <ShoppingBag className="w-8 h-8 opacity-80" />
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{message}</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {sub || "คุณสามารถเลือกชมผลผลิตกล้วยสดและหน่อพันธุ์คุณภาพจากฟาร์มได้ที่ตลาดสินค้า"}
        </p>
      </div>
      <Button
        onClick={() => navigate("/market")}
        className="rounded-xl shadow-sm gap-2 mt-2"
      >
        <Store className="w-4 h-4" />
        ไปยังตลาดสินค้ากล้วย
      </Button>
    </div>
  );

  /* ---------- ORDER CARD HEADER ---------- */

  const CardHeaderInfo = ({
    farmName,
    orderNumber,
    createdAt,
    statusText,
    statusVariant = "default",
    statusIcon: StatusIcon,
  }: {
    farmName?: string;
    orderNumber?: string;
    createdAt?: string;
    statusText: string;
    statusVariant?: "default" | "success" | "warning" | "info" | "destructive";
    statusIcon?: any;
  }) => {
    const badgeColors = {
      default: "bg-muted text-muted-foreground border-border",
      success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      destructive: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    };

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/40 border-b border-border/70">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm sm:text-base text-foreground">
                {farmName || "ฟาร์มกล้วยคุณภาพ"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {orderNumber && (
                <>
                  <span>เลขออเดอร์: {orderNumber}</span>
                  <span>•</span>
                </>
              )}
              <span>วันที่จอง: {formatDate(createdAt)}</span>
            </div>
          </div>
        </div>

        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badgeColors[statusVariant]}`}
        >
          {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
          <span>{statusText}</span>
        </div>
      </div>
    );
  };

  /* ---------- PRODUCT ROW ITEM ---------- */

  const ProductRow = ({
    product,
    quantity,
    totalPrice,
  }: {
    product: ProductInfo;
    quantity: number;
    totalPrice?: number;
  }) => {
    const isFruit = product?.product_type === "fruit";

    return (
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {/* Product Thumbnail */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-muted border border-border/80 flex-shrink-0 flex items-center justify-center">
            {product?.image_url ? (
              <img
                src={product.image_url}
                alt={product?.name || "สินค้า"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground/60">
                <Banana className="w-8 h-8 text-primary/40" />
                <span className="text-[10px] mt-1">ไม่มีรูปภาพ</span>
              </div>
            )}
            <Badge
              variant="secondary"
              className="absolute bottom-1 right-1 text-[9px] px-1.5 py-0 h-4 bg-background/90 backdrop-blur-sm"
            >
              {isFruit ? "ผลสด" : "หน่อพันธุ์"}
            </Badge>
          </div>

          {/* Product Details */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <h4 className="font-bold text-base sm:text-lg text-foreground truncate">
              {product?.name || "กล้วยหอมทองพรีเมียม"}
            </h4>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="px-2 py-0.5 rounded bg-muted font-medium">
                ประเภท: {isFruit ? "🍌 กล้วยผลสด" : "🌱 หน่อพันธุ์/กล้า"}
              </span>
              <span>•</span>
              <span>จำนวน: <strong className="text-foreground">{quantity}</strong> {product?.unit || "ชิ้น"}</span>
            </div>

            {product?.harvest_date && (
              <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                <span>กำหนดเก็บเกี่ยว: {formatDate(product.harvest_date)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pricing Column */}
        <div className="w-full sm:w-auto text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60">
          <div className="text-xs text-muted-foreground">ยอดรวมคำสั่งซื้อ</div>
          <div className="text-xl sm:text-2xl font-black text-primary">
            ฿{totalPrice ? Number(totalPrice).toLocaleString() : "-"}
          </div>
        </div>
      </div>
    );
  };

  /* ---------- DELIVERY & TRACKING INFO BOX ---------- */

  const ShippingDetailsBox = ({
    carrier,
    trackingNumber,
    shippedAt,
    receiverName,
    receiverPhone,
    deliveryAddress,
    deliveryNotes,
  }: {
    carrier?: string | null;
    trackingNumber?: string | null;
    shippedAt?: string | null;
    receiverName?: string | null;
    receiverPhone?: string | null;
    deliveryAddress?: string | null;
    deliveryNotes?: string | null;
  }) => (
    <div className="px-4 pb-4 sm:px-5 sm:pb-5">
      <div className="rounded-xl bg-muted/40 border border-border/70 p-4 space-y-3 text-xs sm:text-sm">
        {/* Tracking info if available */}
        {(carrier || trackingNumber || shippedAt) && (
          <div className="pb-3 border-b border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {carrier && (
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-500 shrink-0" />
                <span>ขนส่ง: <strong>{carrier}</strong></span>
              </div>
            )}

            {trackingNumber && (
              <div className="flex items-center gap-1.5 sm:col-span-2">
                <Package className="w-4 h-4 text-blue-500 shrink-0" />
                <span>เลขพัสดุ: <strong className="font-mono bg-background px-2 py-0.5 rounded border">{trackingNumber}</strong></span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md hover:bg-background"
                  onClick={() => copyToClipboard(trackingNumber, "คัดลอกเลขพัสดุ")}
                  title="คัดลอกเลขพัสดุ"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {shippedAt && (
              <div className="text-muted-foreground flex items-center gap-1.5 sm:col-span-3">
                <Clock className="w-3.5 h-3.5" />
                <span>จัดส่งเมื่อ: {formatDate(shippedAt)}</span>
              </div>
            )}
          </div>
        )}

        {/* Receiver details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <span className="text-foreground font-medium">{receiverName || "ไม่ระบุชื่อ"}</span>
              {receiverPhone && <span className="ml-2 font-mono">({receiverPhone})</span>}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className="text-foreground leading-relaxed">
              {deliveryAddress || "ไม่มีข้อมูลที่อยู่"}
            </span>
          </div>
        </div>

        {deliveryNotes && (
          <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span>หมายเหตุ: {deliveryNotes}</span>
          </div>
        )}
      </div>
    </div>
  );

  /* ---------- STAR RATING HELPER ---------- */

  const RatingStars = ({
    value,
    size = "md",
  }: {
    value: number;
    size?: "sm" | "md" | "lg";
  }) => {
    const starSizes = {
      sm: "w-3.5 h-3.5",
      md: "w-4 h-4",
      lg: "w-6 h-6",
    };

    return (
      <div className="flex items-center gap-1 text-amber-400">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`${starSizes[size]} ${
              s <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  /* ---------- RATING LABELS ---------- */
  const ratingLabels: Record<number, string> = {
    1: "ต้องปรับปรุง (1 ดาว)",
    2: "พอใช้ได้ (2 ดาว)",
    3: "ปานกลาง (3 ดาว)",
    4: "ดีมาก (4 ดาว)",
    5: "ยอดเยี่ยม ประทับใจมาก (5 ดาว)",
  };

  return (
    <div className="min-h-screen bg-gradient-hero pb-16">
      <Navbar />

      <div className="container mx-auto px-4 max-w-5xl space-y-6 py-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-xl bg-card/60 backdrop-blur-sm border shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                การสั่งจองและคำสั่งซื้อของฉัน
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                ติดตามสถานะผลผลิตกล้วย การจัดส่ง และประวัติการสั่งซื้อของคุณ
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadAll}
            disabled={loading}
            className="self-start sm:self-auto rounded-xl gap-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary ${loading ? "animate-spin" : ""}`} />
            รีเฟรชข้อมูล
          </Button>
        </div>

        {/* ---------- TABS WITH COUNTERS ---------- */}
        <div className="overflow-x-auto pb-1">
          <Tabs value={tab} onValueChange={(v) => setTab(v)}>
            <TabsList className="grid grid-cols-6 min-w-[700px] h-12 p-1 bg-card/80 backdrop-blur-md border rounded-2xl shadow-sm">
              <TabsTrigger
                value="pending"
                className="rounded-xl gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span>รอยืนยัน</span>
                {pending.length > 0 && (
                  <Badge className="h-5 px-1.5 text-[10px] bg-amber-500 text-white rounded-full">
                    {pending.length}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="confirmed"
                className="rounded-xl gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span>ยืนยันแล้ว</span>
                {confirmed.length > 0 && (
                  <Badge className="h-5 px-1.5 text-[10px] bg-emerald-500 text-white rounded-full">
                    {confirmed.length}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="shipping"
                className="rounded-xl gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span>กำลังจัดส่ง</span>
                {shipping.length > 0 && (
                  <Badge className="h-5 px-1.5 text-[10px] bg-blue-500 text-white rounded-full animate-pulse">
                    {shipping.length}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="review"
                className="rounded-xl gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span>รอรีวิว</span>
                {toReview.length > 0 && (
                  <Badge className="h-5 px-1.5 text-[10px] bg-red-500 text-white rounded-full">
                    {toReview.length}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="history"
                className="rounded-xl gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span>ประวัติ</span>
                {history.length > 0 && (
                  <span className="text-[11px] opacity-70">({history.length})</span>
                )}
              </TabsTrigger>

              <TabsTrigger
                value="cancelled"
                className="rounded-xl gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <span>ยกเลิกแล้ว</span>
                {cancelledReservations.length > 0 && (
                  <span className="text-[11px] opacity-70">
                    ({cancelledReservations.length})
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* ---------- TAB 1: PENDING (รอฟาร์มยืนยัน) ---------- */}
        {tab === "pending" && (
          <div className="space-y-4">
            {pending.length === 0 ? (
              <EmptyState message="ไม่มีรายการที่รอยืนยันในขณะนี้" />
            ) : (
              pending.map((r) => (
                <Card
                  key={r.id}
                  className="rounded-2xl border border-border/80 overflow-hidden shadow-sm hover:shadow-md transition-all bg-card/90 backdrop-blur-sm"
                >
                  <CardHeaderInfo
                    farmName={r.products?.farm_profiles?.farm_name}
                    orderNumber={r.id}
                    createdAt={r.created_at}
                    statusText="รอฟาร์มตรวจสอบและยืนยัน"
                    statusVariant="warning"
                    statusIcon={Clock}
                  />

                  <ProductRow
                    product={r.products}
                    quantity={r.quantity}
                    totalPrice={r.total_price}
                  />

                  <ShippingDetailsBox
                    receiverName={r.receiver_name}
                    receiverPhone={r.receiver_phone}
                    deliveryAddress={r.delivery_address}
                    deliveryNotes={r.delivery_notes}
                  />

                  {/* Actions */}
                  <div className="flex items-center justify-between p-4 bg-muted/20 border-t border-border/60">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>ฟาร์มจะตรวจสอบสต็อกและยืนยันรอบการจัดส่ง</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                      onClick={() => {
                        setSelectedReservation(r);
                        setOpenCancel(true);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1.5" />
                      ยกเลิกการจอง
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ---------- TAB 2: CONFIRMED (ฟาร์มยืนยันแล้ว) ---------- */}
        {tab === "confirmed" && (
          <div className="space-y-4">
            {confirmed.length === 0 ? (
              <EmptyState message="ไม่มีรายการที่ฟาร์มยืนยันแล้วในขณะนี้" />
            ) : (
              confirmed.map((o) => (
                <Card
                  key={o.id}
                  className="rounded-2xl border border-border/80 overflow-hidden shadow-sm hover:shadow-md transition-all bg-card/90 backdrop-blur-sm"
                >
                  <CardHeaderInfo
                    farmName={o.products?.farm_profiles?.farm_name}
                    orderNumber={o.order_number}
                    createdAt={o.created_at}
                    statusText="ฟาร์มรับคำสั่งซื้อแล้ว เตรียมจัดส่ง"
                    statusVariant="success"
                    statusIcon={CheckCircle2}
                  />

                  <ProductRow
                    product={o.products}
                    quantity={o.quantity}
                    totalPrice={o.total_price}
                  />

                  <ShippingDetailsBox
                    receiverName={o.receiver_name}
                    receiverPhone={o.receiver_phone}
                    deliveryAddress={o.delivery_address}
                    deliveryNotes={o.delivery_notes}
                  />

                  <div className="flex items-center justify-between p-4 bg-emerald-500/5 border-t border-emerald-500/10">
                    <div className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>
                        ฟาร์มกำลังดูแลผลผลิตและจะจัดส่งตามรอบเก็บเกี่ยว
                      </span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ---------- TAB 3: SHIPPING (กำลังจัดส่ง) ---------- */}
        {tab === "shipping" && (
          <div className="space-y-4">
            {shipping.length === 0 ? (
              <EmptyState message="ไม่มีรายการที่กำลังจัดส่งในขณะนี้" />
            ) : (
              shipping.map((o) => (
                <Card
                  key={o.id}
                  className="rounded-2xl border border-border/80 overflow-hidden shadow-sm hover:shadow-md transition-all bg-card/90 backdrop-blur-sm"
                >
                  <CardHeaderInfo
                    farmName={o.products?.farm_profiles?.farm_name}
                    orderNumber={o.order_number}
                    createdAt={o.created_at}
                    statusText="สินค้าอยู่ระหว่างการจัดส่ง"
                    statusVariant="info"
                    statusIcon={Truck}
                  />

                  <ProductRow
                    product={o.products}
                    quantity={o.quantity}
                    totalPrice={o.total_price}
                  />

                  <ShippingDetailsBox
                    carrier={o.carrier}
                    trackingNumber={o.tracking_number}
                    shippedAt={o.shipped_at}
                    receiverName={o.receiver_name}
                    receiverPhone={o.receiver_phone}
                    deliveryAddress={o.delivery_address}
                    deliveryNotes={o.delivery_notes}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-blue-500/5 border-t border-blue-500/10">
                    <div className="text-xs text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 shrink-0" />
                      <span>เมื่อได้รับพัสดุและตรวจสอบเรียบร้อยแล้ว กรุณากดปุ่มยืนยัน</span>
                    </div>

                    <Button
                      className="rounded-xl shadow-md bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
                      onClick={() => confirmReceived(o)}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      ได้รับสินค้าแล้ว
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ---------- TAB 4: TO REVIEW (ยังไม่ได้รีวิว) ---------- */}
        {tab === "review" && (
          <div className="space-y-4">
            {toReview.length === 0 ? (
              <EmptyState
                message="ไม่มีรายการที่รอรีวิว"
                sub="คำสั่งซื้อที่คุณยืนยันรับสินค้าแล้วทั้งหมดได้รับการรีวิวเรียบร้อยแล้วครับ"
              />
            ) : (
              toReview.map((o) => (
                <Card
                  key={o.id}
                  className="rounded-2xl border border-border/80 overflow-hidden shadow-sm hover:shadow-md transition-all bg-card/90 backdrop-blur-sm"
                >
                  <CardHeaderInfo
                    farmName={o.products?.farm_profiles?.farm_name}
                    orderNumber={o.order_number}
                    createdAt={o.created_at}
                    statusText="ได้รับสินค้าแล้ว • รอให้คะแนนรีวิว"
                    statusVariant="warning"
                    statusIcon={Star}
                  />

                  <ProductRow
                    product={o.products}
                    quantity={o.quantity}
                    totalPrice={o.total_price}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/30 border-t border-border/60">
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>แชร์ความพึงพอใจเพื่อเป็นกำลังใจและข้อมูลแก่เกษตรกร</span>
                    </div>

                    <Button
                      className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white gap-2 shadow-sm font-medium"
                      onClick={() => {
                        setSelectedOrder(o);
                        setOpenReview(true);
                      }}
                    >
                      <Star className="w-4 h-4 fill-white" />
                      เขียนรีวิวและให้คะแนน
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ---------- TAB 5: HISTORY (ประวัติคำสั่งซื้อที่เสร็จสมบูรณ์) ---------- */}
        {tab === "history" && (
          <div className="space-y-4">
            {history.length === 0 ? (
              <EmptyState message="ยังไม่มีประวัติคำสั่งซื้อที่เสร็จสมบูรณ์" />
            ) : (
              history.map((o) => {
                const review = Array.isArray(o.reviews)
                  ? o.reviews[0]
                  : o.reviews;

                return (
                  <Card
                    key={o.id}
                    className="rounded-2xl border border-border/80 overflow-hidden shadow-sm bg-card/90 backdrop-blur-sm"
                  >
                    <CardHeaderInfo
                      farmName={o.products?.farm_profiles?.farm_name}
                      createdAt={o.created_at}
                      statusText="คำสั่งซื้อเสร็จสมบูรณ์"
                      statusVariant="success"
                      statusIcon={CheckCircle2}
                    />

                    <ProductRow
                      product={o.products}
                      quantity={o.quantity}
                      totalPrice={o.total_price}
                    />

                    {/* Review card summary */}
                    {review && (
                      <div className="mx-4 mb-4 sm:mx-5 sm:mb-5 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                              รีวิวของคุณ:
                            </span>
                            <RatingStars value={review.rating || 5} size="sm" />
                          </div>
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                            {review.rating} / 5 คะแนน
                          </span>
                        </div>

                        {review.comment && (
                          <p className="text-xs sm:text-sm text-foreground/90 italic bg-background/60 p-2.5 rounded-lg border border-border/40">
                            &ldquo;{review.comment}&rdquo;
                          </p>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* ---------- TAB 6: CANCELLED (รายการที่ยกเลิก) ---------- */}
        {tab === "cancelled" && (
          <div className="space-y-4">
            {cancelledReservations.length === 0 ? (
              <EmptyState message="ไม่มีรายการที่ถูกยกเลิก" />
            ) : (
              cancelledReservations.map((r) => (
                <Card
                  key={r.id}
                  className="rounded-2xl border border-destructive/20 overflow-hidden shadow-sm bg-card/80 opacity-90"
                >
                  <CardHeaderInfo
                    farmName={r.products?.farm_profiles?.farm_name}
                    orderNumber={r.id}
                    createdAt={r.created_at}
                    statusText="ยกเลิกรายการแล้ว"
                    statusVariant="destructive"
                    statusIcon={XCircle}
                  />

                  <ProductRow
                    product={r.products}
                    quantity={r.quantity}
                    totalPrice={r.total_price}
                  />

                  <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                    <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3.5 space-y-1.5 text-xs text-destructive">
                      <div className="flex items-center justify-between font-medium">
                        <span>
                          ยกเลิกโดย:{" "}
                          <strong>
                            {r.cancelled_by === "user"
                              ? "คุณ (ผู้ซื้อ)"
                              : r.cancelled_by === "farm"
                              ? "ฟาร์ม (ผู้ขาย)"
                              : "-"}
                          </strong>
                        </span>
                        <span>วันที่ยกเลิก: {formatDate(r.cancelled_at)}</span>
                      </div>
                      {r.cancel_reason && (
                        <p className="text-foreground/80">
                          เหตุผล: <em>{r.cancel_reason}</em>
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* ---------- REVIEW DIALOG ---------- */}
      <Dialog open={openReview} onOpenChange={setOpenReview}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader className="space-y-2 text-center sm:text-left">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              ให้คะแนนและรีวิวสินค้า
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedOrder?.products?.name} จากฟาร์ม{" "}
              {selectedOrder?.products?.farm_profiles?.farm_name || "กล้วยคุณภาพ"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Interactive Stars */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="p-1 transition-transform hover:scale-125 focus:outline-none"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    <Star
                      className={`w-8 h-8 ${
                        n <= (hoverRating || rating)
                          ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {ratingLabels[hoverRating || rating]}
              </span>
            </div>

            {/* Comment Area */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                ความคิดเห็นและคำติชม (ไม่บังคับ)
              </label>
              <Textarea
                placeholder="รสชาติ ความสด การแพ็คเกจ และการให้บริการของฟาร์ม..."
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="rounded-xl text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setOpenReview(false)}
              className="rounded-xl"
            >
              ไว้คราวหลัง
            </Button>
            <Button
              onClick={submitReview}
              disabled={submittingReview}
              className="rounded-xl bg-primary text-primary-foreground font-semibold shadow-md"
            >
              {submittingReview ? "กำลังบันทึก..." : "ส่งคะแนนรีวิว"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- CANCEL RESERVATION DIALOG ---------- */}
      <Dialog open={openCancel} onOpenChange={setOpenCancel}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              ยืนยันการยกเลิกการจอง
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              คุณต้องการยกเลิกการจอง &ldquo;{selectedReservation?.products?.name}&rdquo; หรือไม่?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                เลือกหรือระบุเหตุผลในการยกเลิก *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "เปลี่ยนใจไม่ต้องการสินค้าแล้ว",
                  "สั่งซื้อผิดจำนวน / ชนิด",
                  "ต้องการเปลี่ยนที่อยู่จัดส่ง",
                  "ระยะเวลาเก็บเกี่ยวนานเกินไป",
                ].map((reason) => (
                  <Button
                    key={reason}
                    type="button"
                    variant={cancelReason === reason ? "default" : "outline"}
                    size="sm"
                    className="h-auto py-2 px-2.5 text-xs text-left justify-start rounded-xl font-normal"
                    onClick={() => setCancelReason(reason)}
                  >
                    {reason}
                  </Button>
                ))}
              </div>
            </div>

            <Textarea
              placeholder="ระบุรายละเอียดเหตุผลเพิ่มเติม..."
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="rounded-xl text-sm"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setOpenCancel(false);
                setSelectedReservation(null);
                setCancelReason("");
              }}
              className="rounded-xl"
            >
              ไม่ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!selectedReservation) return;
                await cancelReservation(
                  selectedReservation.id,
                  cancelReason
                );
              }}
              disabled={submittingCancel || !cancelReason.trim()}
              className="rounded-xl shadow-md font-semibold"
            >
              {submittingCancel ? "กำลังยกเลิก..." : "ยืนยันการยกเลิก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserOrders;
