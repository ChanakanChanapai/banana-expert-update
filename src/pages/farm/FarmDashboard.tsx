import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  Loader2,
  TrendingUp,
  Star,
  ArrowLeft,
  ChevronRight,
  MapPin,
  PlusCircle,
  Clock,
  CheckCircle2,
  Truck,
  Eye,
  Store,
  AlertTriangle,
  Calendar,
  Layers,
  Sparkles,
  Users,
  ShieldCheck,
  Banana,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";

/* ---------- Types ---------- */

interface FarmProfile {
  id: string;
  user_id: string;
  farm_name: string;
  farm_location: string;
  farm_description: string | null;
  rating: number | null;
  total_reviews: number | null;
  total_sales: number | null;
  verified: boolean | null;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price_per_unit: number;
  available_quantity: number;
  unit: string;
  product_type: string;
  harvest_date: string;
  image_url: string | null;
  is_active?: boolean;
}

interface PendingReservation {
  id: string;
  quantity: number;
  total_price: number;
  created_at: string;
  customer_name?: string;
  product_name?: string;
  image_url?: string | null;
}

interface FarmStats {
  activeProducts: number;
  totalProducts: number;
  pendingReservations: number;
  confirmedOrders: number;
  shippingOrders: number;
  totalSales: number;
}

/* ---------- Main Component ---------- */

const FarmDashboard = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [farm, setFarm] = useState<FarmProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [pendingReservations, setPendingReservations] = useState<
    PendingReservation[]
  >([]);

  const [stats, setStats] = useState<FarmStats>({
    activeProducts: 0,
    totalProducts: 0,
    pendingReservations: 0,
    confirmedOrders: 0,
    shippingOrders: 0,
    totalSales: 0,
  });

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  useEffect(() => {
    loadFarmData();
  }, []);

  const loadFarmData = async () => {
    try {
      setLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        navigate("/auth/login", { replace: true });
        return;
      }

      const userId = session.user.id;

      // 1. Verify Farm Role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const isFarm = roles?.some((r) => r.role === "farm");
      if (!isFarm) {
        toast.error("คุณยังไม่ได้เปิดบัญชีฟาร์ม");
        navigate("/dashboard", { replace: true });
        return;
      }

      // 2. Load Farm Profile
      const { data: farmData, error: farmError } = await supabase
        .from("farm_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (farmError || !farmData) {
        toast.error("ไม่พบข้อมูลฟาร์ม");
        navigate("/dashboard", { replace: true });
        return;
      }

      setFarm(farmData);

      // 3. Load Farm Products
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("farm_id", farmData.id)
        .order("created_at", { ascending: false });

      if (productError) throw productError;
      setProducts(productData || []);

      // 4. Load Pending Reservations for this farm
      const { data: pendingRes } = await supabase
        .from("reservations")
        .select(
          `
          id,
          quantity,
          total_price,
          created_at,
          products!inner (
            name,
            image_url,
            farm_id
          ),
          profiles:user_id (
            full_name
          )
        `
        )
        .eq("products.farm_id", farmData.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      const mappedPending: PendingReservation[] = (pendingRes || []).map(
        (r: any) => ({
          id: r.id,
          quantity: r.quantity,
          total_price: r.total_price || 0,
          created_at: r.created_at,
          customer_name: r.profiles?.full_name || "ลูกค้า",
          product_name: r.products?.name || "กล้วยผลสด",
          image_url: r.products?.image_url || null,
        })
      );

      setPendingReservations(mappedPending);

      // 5. Load Confirmed & Shipping counts
      const [{ data: confirmedOrders }, { data: shippingOrders }] =
        await Promise.all([
          supabase
            .from("orders")
            .select("id, total_price")
            .eq("products.farm_id", farmData.id)
            .eq("status", "confirmed"),

          supabase
            .from("orders")
            .select("id")
            .eq("products.farm_id", farmData.id)
            .eq("status", "shipped"),
        ]);

      // Calculate stats
      const activeCount = (productData || []).filter((p) => p.is_active).length;
      const totalCount = productData?.length || 0;

      setStats({
        activeProducts: activeCount,
        totalProducts: totalCount,
        pendingReservations: mappedPending.length,
        confirmedOrders: confirmedOrders?.length || 0,
        shippingOrders: shippingOrders?.length || 0,
        totalSales: farmData.total_sales || 0,
      });
    } catch (err) {
      console.error("loadFarmData error:", err);
      toast.error("โหลดข้อมูลแดชบอร์ดฟาร์มไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  /* Quick confirm reservation from dashboard */
  const handleQuickConfirm = async (reservationId: string) => {
    setConfirmingId(reservationId);
    try {
      const { error } = await supabase.rpc("confirm_reservation", {
        p_reservation_id: reservationId,
      });

      if (error) throw error;

      toast.success("ยืนยันการจองเรียบร้อยแล้ว ย้ายไปแท็บรอจัดส่ง");
      await loadFarmData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "ยืนยันไม่สำเร็จ");
    } finally {
      setConfirmingId(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          กำลังเตรียมข้อมูลแดชบอร์ดฟาร์ม...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero pb-16">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        {/* =========================================================================
            1. HEADER & FARM PROFILE BANNER
        ========================================================================= */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/85 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
          {/* Decorative background gradients */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 -mb-10 w-60 h-60 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* Farm Branding */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-primary to-emerald-600 border-2 border-primary/40 flex items-center justify-center text-primary-foreground font-black text-2xl sm:text-3xl shadow-md">
                  <Store className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>
                {farm?.verified && (
                  <div
                    className="absolute -bottom-1 -right-1 bg-blue-500 text-white w-5 h-5 rounded-full border-2 border-background flex items-center justify-center"
                    title="ฟาร์มผ่านการรับรอง"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    {farm?.farm_name || "ฟาร์มกล้วยคุณภาพ"}
                  </h1>
                  <Badge className="rounded-full text-xs font-semibold px-2.5 py-0.5 bg-primary text-primary-foreground">
                    🌾 บัญชีฟาร์มเกษตรกร
                  </Badge>
                </div>

                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span>{farm?.farm_location || "ไม่ได้ระบุที่ตั้ง"}</span>
                </p>

                {farm?.farm_description && (
                  <p className="text-xs text-muted-foreground/90 line-clamp-1 max-w-xl">
                    &ldquo;{farm.farm_description}&rdquo;
                  </p>
                )}

                {/* Rating & Reviews */}
                <div className="flex items-center gap-3 pt-1 text-xs">
                  <div className="flex items-center gap-1 text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    <span>{farm?.rating ? farm.rating.toFixed(1) : "5.0"}</span>
                  </div>
                  <button
                    onClick={() => navigate(`/farm/reviews/${farm?.id}`)}
                    className="text-muted-foreground hover:text-primary hover:underline"
                  >
                    ({farm?.total_reviews ?? 0} รีวิวจากลูกค้า)
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <Button
                onClick={() => navigate("/farm/products/add")}
                className="rounded-xl shadow-md gap-2 font-semibold bg-primary text-primary-foreground flex-1 md:flex-initial"
              >
                <PlusCircle className="w-4 h-4" />
                ลงขายสินค้าใหม่
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate(`/farm/${farm?.id}`)}
                className="rounded-xl gap-1.5 shadow-sm hover:bg-background flex-1 md:flex-initial text-xs sm:text-sm"
              >
                <Eye className="w-4 h-4 text-primary" />
                ดูหน้าร้านของคุณ
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/profile")}
                className="rounded-xl hover:bg-muted"
                title="ตั้งค่าข้อมูลฟาร์ม"
              >
                <Settings className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. KEY METRICS TILES (4 CARDS)
        ========================================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Sales */}
          <div className="rounded-2xl border border-border/80 bg-card/85 p-5 shadow-sm space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                ยอดขายรวมทั้งหมด
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              ฿{Number(stats.totalSales || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-muted-foreground">
              ยอดจำหน่ายผลผลิตผ่านระบบ
            </p>
          </div>

          {/* Pending Reservations */}
          <div
            onClick={() => navigate("/farm/orders")}
            className="cursor-pointer group rounded-2xl border border-border/80 bg-card/85 p-5 shadow-sm hover:border-amber-500/50 hover:shadow-md transition-all space-y-2 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                รายการจองรอยืนยัน
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-foreground group-hover:text-amber-600 transition-colors">
                {stats.pendingReservations}
              </span>
              <span className="text-xs text-muted-foreground">รายการ</span>
            </div>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              {stats.pendingReservations > 0
                ? "มีคำสั่งซื้อรอตรวจสอบสต็อก"
                : "ไม่มีรายการค้างตรวจสอบ"}
            </p>
          </div>

          {/* Confirmed / To Ship */}
          <div
            onClick={() => navigate("/farm/orders")}
            className="cursor-pointer group rounded-2xl border border-border/80 bg-card/85 p-5 shadow-sm hover:border-blue-500/50 hover:shadow-md transition-all space-y-2 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                ออเดอร์เตรียมจัดส่ง
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-foreground group-hover:text-blue-600 transition-colors">
                {stats.confirmedOrders}
              </span>
              <span className="text-xs text-muted-foreground">ออเดอร์</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              รอเก็บเกี่ยวและส่งพัสดุ
            </p>
          </div>

          {/* Active Products */}
          <div
            onClick={() => navigate("/farm/products")}
            className="cursor-pointer group rounded-2xl border border-border/80 bg-card/85 p-5 shadow-sm hover:border-primary/50 hover:shadow-md transition-all space-y-2 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">
                สินค้าที่เปิดขาย
              </span>
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-foreground group-hover:text-primary transition-colors">
                {stats.activeProducts}
              </span>
              <span className="text-xs text-muted-foreground">
                / {stats.totalProducts} รายการ
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              ผลผลิตพร้อมให้ลูกค้าสั่งจอง
            </p>
          </div>
        </div>

        {/* =========================================================================
            3. MANAGEMENT SHORTCUT LIST BAR (SINGLE CONTAINER)
        ========================================================================= */}
        <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-sm shadow-sm overflow-hidden divide-y divide-border/60">
          {/* Manage Orders */}
          <div
            onClick={() => navigate("/farm/orders")}
            className="group cursor-pointer p-4 sm:p-5 hover:bg-muted/40 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                  จัดการคำสั่งซื้อและจัดส่ง
                </h3>
                <p className="text-xs text-muted-foreground">
                  ตรวจสอบการจอง จัดการสถานะออเดอร์ และกรอกเลขพัสดุ
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {stats.pendingReservations > 0 && (
                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs px-2 py-0.5">
                  รอตรวจสอบ {stats.pendingReservations}
                </Badge>
              )}
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>

          {/* Manage Products */}
          <div
            onClick={() => navigate("/farm/products")}
            className="group cursor-pointer p-4 sm:p-5 hover:bg-muted/40 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                  คลังสินค้าและสต็อก
                </h3>
                <p className="text-xs text-muted-foreground">
                  แก้ไขราคา จำนวน และสถานะเปิด/ปิดขายสินค้า
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {stats.activeProducts} สินค้าพร้อมขาย
              </Badge>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>

          {/* Reviews & Farm Settings */}
          <div
            onClick={() => navigate(`/farm/reviews/${farm?.id}`)}
            className="group cursor-pointer p-4 sm:p-5 hover:bg-muted/40 transition-colors flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                  รีวิวและความคิดเห็น
                </h3>
                <p className="text-xs text-muted-foreground">
                  ดูคะแนนความพึงพอใจและคำติชมจากผู้ซื้อ
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-500" />
                <span>{farm?.rating ? farm.rating.toFixed(1) : "5.0"}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </div>

        {/* =========================================================================
            4. PENDING RESERVATIONS QUICK ACTION FEED
        ========================================================================= */}
        {pendingReservations.length > 0 && (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-lg text-foreground">
                  รายการจองใหม่ที่รอยืนยัน ({pendingReservations.length})
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/farm/orders")}
                className="text-xs rounded-xl border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 self-start sm:self-auto"
              >
                จัดการทั้งหมดในหน้าออเดอร์
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>

            <div className="divide-y divide-amber-500/20">
              {pendingReservations.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-background border border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {r.image_url ? (
                        <img
                          src={r.image_url}
                          alt={r.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Banana className="w-6 h-6 text-primary/40" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">
                        {r.product_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ผู้จอง: <strong>{r.customer_name}</strong> • {r.quantity} ชิ้น •{" "}
                        {formatDate(r.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    <span className="font-bold text-base text-primary">
                      ฿{Number(r.total_price).toLocaleString()}
                    </span>

                    <Button
                      size="sm"
                      onClick={() => handleQuickConfirm(r.id)}
                      disabled={confirmingId === r.id}
                      className="rounded-xl shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                    >
                      {confirmingId === r.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      ยืนยันออเดอร์
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            5. INVENTORY OVERVIEW (PRODUCTS IN STORE)
        ========================================================================= */}
        <div className="rounded-3xl border border-border/80 bg-card/85 backdrop-blur-sm p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
            <div>
              <h3 className="font-bold text-lg text-foreground">
                สินค้าทั้งหมดในฟาร์มของคุณ
              </h3>
              <p className="text-xs text-muted-foreground">
                รายการผลผลิตที่วางจำหน่ายและสต็อกคงเหลือ
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/farm/products")}
                className="rounded-xl text-xs gap-1"
              >
                จัดการสินค้าทั้งหมด
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>

              <Button
                size="sm"
                onClick={() => navigate("/farm/products/add")}
                className="rounded-xl text-xs gap-1.5 shadow-sm"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                เพิ่มสินค้า
              </Button>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <Package className="w-7 h-7 opacity-70" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  ยังไม่มีสินค้าในร้านของคุณ
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  เริ่มลงขายผลผลิตกล้วยสดหรือหน่อพันธุ์เพื่อเปิดรับการจองจากลูกค้า
                </p>
              </div>
              <Button
                onClick={() => navigate("/farm/products/add")}
                className="rounded-xl shadow-sm gap-1.5 mt-2"
                size="sm"
              >
                <PlusCircle className="w-4 h-4" />
                เพิ่มผลผลิตรายการแรก
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.map((p) => {
                const isFruit = p.product_type === "fruit";
                const isLowStock = p.available_quantity <= 5;

                return (
                  <Card
                    key={p.id}
                    className="rounded-2xl border border-border/80 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between bg-card/90"
                  >
                    <div>
                      {/* Product Thumbnail */}
                      <div className="aspect-video bg-muted relative overflow-hidden flex items-center justify-center">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        ) : (
                          <Banana className="w-12 h-12 text-primary/30" />
                        )}

                        {/* Product type badge */}
                        <div className="absolute top-2 left-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-2 py-0.5 bg-background/90 backdrop-blur-sm shadow-sm"
                          >
                            {isFruit ? "🍌 กล้วยผลสด" : "🌱 หน่อพันธุ์"}
                          </Badge>
                        </div>

                        {/* Status Badge */}
                        <div className="absolute top-2 right-2">
                          <Badge
                            className={`text-[10px] px-2 py-0.5 ${
                              p.is_active
                                ? "bg-emerald-500 text-white"
                                : "bg-muted text-muted-foreground border"
                            }`}
                          >
                            {p.is_active ? "เปิดรับจอง" : "ปิดชั่วคราว"}
                          </Badge>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-base text-foreground line-clamp-1">
                            {p.name}
                          </h4>
                          <span className="font-black text-lg text-primary shrink-0">
                            ฿{p.price_per_unit.toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground">
                              /{p.unit}
                            </span>
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                          {p.description || "ผลผลิตกล้วยคุณภาพจากฟาร์ม"}
                        </p>

                        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            {formatDate(p.harvest_date)}
                          </span>

                          <span
                            className={`font-semibold ${
                              isLowStock
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-foreground"
                            }`}
                          >
                            คงเหลือ: {p.available_quantity} {p.unit}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="p-3 bg-muted/30 border-t border-border/50 grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/farm/products/edit/${p.id}`)}
                        className="rounded-xl text-xs h-8"
                      >
                        แก้ไขสินค้า
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/market/product/${p.id}`)}
                        className="rounded-xl text-xs h-8 text-primary hover:bg-primary/10"
                      >
                        ดูหน้าร้าน
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmDashboard;