import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  User,
  LogOut,
  ArrowLeft,
  Store,
  Clock,
  CheckCircle2,
  Truck,
  Star,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  Sparkles,
  BookOpen,
  Banana,
  AlertCircle,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  Package,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/* ---------- Types ---------- */

interface RecentItem {
  id: string;
  type: "reservation" | "order";
  status: string;
  created_at: string;
  total_price: number;
  quantity: number;
  product_name: string;
  product_type: string;
  image_url: string | null;
  farm_name: string;
}

type Role = "user" | "farm";

/* ---------- Main Component ---------- */

const Dashboard = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role>("user");

  const [profile, setProfile] = useState<{
    id?: string;
    full_name: string;
    phone: string | null;
    address: string | null;
  } | null>(null);

  // Status breakdown counts
  const [counts, setCounts] = useState({
    pending: 0,
    confirmed: 0,
    shipping: 0,
    review: 0,
    total: 0,
  });

  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && event === "SIGNED_OUT") {
        navigate("/auth/login", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const init = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const currentUser = session?.user;

      if (!currentUser) {
        navigate("/auth/login", { replace: true });
        return;
      }

      setUser(currentUser);

      const [roles, profileData] = await Promise.all([
        fetchUserRoles(currentUser.id),
        loadProfile(currentUser.id),
      ]);

      const isFarm = roles.includes("farm");
      setRole(isFarm ? "farm" : "user");

      await loadDashboardData(currentUser.id);
    } catch (err) {
      console.error("Dashboard init error:", err);
      toast.error("ไม่สามารถโหลดข้อมูลแดชบอร์ดได้");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRoles = async (userId: string): Promise<Role[]> => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    return data?.map((r) => r.role as Role) || [];
  };

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, address")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("loadProfile error:", error);
    }

    if (data) {
      setProfile(data);
    }
    return data;
  };

  const loadDashboardData = async (userId: string) => {
    try {
      const [pendingRes, confirmedRes, shippingRes, deliveredRes, allOrdersRes] =
        await Promise.all([
          // 1. Pending reservations
          supabase
            .from("reservations")
            .select(
              `
              id,
              status,
              quantity,
              total_price,
              created_at,
              products (
                name,
                product_type,
                image_url,
                farm_profiles (
                  farm_name
                )
              )
            `
            )
            .eq("user_id", userId)
            .eq("status", "pending")
            .order("created_at", { ascending: false }),

          // 2. Confirmed orders
          supabase
            .from("orders")
            .select("id")
            .eq("user_id", userId)
            .eq("status", "confirmed"),

          // 3. Shipping orders
          supabase
            .from("orders")
            .select("id")
            .eq("user_id", userId)
            .eq("status", "shipped"),

          // 4. Delivered / To review orders
          supabase
            .from("orders")
            .select("id")
            .eq("user_id", userId)
            .eq("status", "delivered"),

          // 5. Recent orders for display
          supabase
            .from("orders")
            .select(
              `
              id,
              status,
              quantity,
              total_price,
              created_at,
              products (
                name,
                product_type,
                image_url,
                farm_profiles (
                  farm_name
                )
              )
            `
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

      const pendingCount = pendingRes.data?.length || 0;
      const confirmedCount = confirmedRes.data?.length || 0;
      const shippingCount = shippingRes.data?.length || 0;
      const reviewCount = deliveredRes.data?.length || 0;

      setCounts({
        pending: pendingCount,
        confirmed: confirmedCount,
        shipping: shippingCount,
        review: reviewCount,
        total: pendingCount + confirmedCount + shippingCount + reviewCount,
      });

      // Combine recent items
      const recents: RecentItem[] = [];

      (pendingRes.data || []).forEach((r: any) => {
        recents.push({
          id: r.id,
          type: "reservation",
          status: "pending",
          created_at: r.created_at,
          total_price: r.total_price || 0,
          quantity: r.quantity || 1,
          product_name: r.products?.name || "กล้วยพรีเมียม",
          product_type: r.products?.product_type || "fruit",
          image_url: r.products?.image_url || null,
          farm_name: r.products?.farm_profiles?.farm_name || "ฟาร์มคุณภาพ",
        });
      });

      (allOrdersRes.data || []).forEach((o: any) => {
        recents.push({
          id: o.id,
          type: "order",
          status: o.status,
          created_at: o.created_at,
          total_price: o.total_price || 0,
          quantity: o.quantity || 1,
          product_name: o.products?.name || "กล้วยพรีเมียม",
          product_type: o.products?.product_type || "fruit",
          image_url: o.products?.image_url || null,
          farm_name: o.products?.farm_profiles?.farm_name || "ฟาร์มคุณภาพ",
        });
      });

      // Sort combined recents by created_at desc
      recents.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setRecentItems(recents.slice(0, 5));
    } catch (err) {
      console.error("Dashboard data load error:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("ออกจากระบบเรียบร้อย");
    navigate("/");
  };

  const handleUpgradeToFarm = async () => {
    try {
      const { error } = await supabase.rpc("upgrade_to_farm");

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("ยินดีต้อนรับ! อัปเกรดเป็นบัญชีฟาร์มเรียบร้อยแล้ว");
      navigate("/farm/dashboard");
    } catch {
      toast.error("การอัปเกรดล้มเหลว");
    }
  };

  const statusConfig: Record<
    string,
    { label: string; bg: string; text: string; icon: any }
  > = {
    pending: {
      label: "รอการยืนยัน",
      bg: "bg-amber-500/10 border-amber-500/20",
      text: "text-amber-600 dark:text-amber-400",
      icon: Clock,
    },
    confirmed: {
      label: "ฟาร์มรับออเดอร์แล้ว",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      text: "text-emerald-600 dark:text-emerald-400",
      icon: CheckCircle2,
    },
    shipped: {
      label: "กำลังจัดส่ง",
      bg: "bg-blue-500/10 border-blue-500/20",
      text: "text-blue-600 dark:text-blue-400",
      icon: Truck,
    },
    delivered: {
      label: "ได้รับสินค้าแล้ว",
      bg: "bg-purple-500/10 border-purple-500/20",
      text: "text-purple-600 dark:text-purple-400",
      icon: Package,
    },
    reviewed: {
      label: "รีวิวเรียบร้อย",
      bg: "bg-teal-500/10 border-teal-500/20",
      text: "text-teal-600 dark:text-teal-400",
      icon: Star,
    },
    cancelled: {
      label: "ยกเลิกแล้ว",
      bg: "bg-red-500/10 border-red-500/20",
      text: "text-red-600 dark:text-red-400",
      icon: AlertCircle,
    },
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
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">
          กำลังเตรียมข้อมูลแดชบอร์ดของคุณ...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero pb-16">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
        {/* =========================================================================
            1. HERO USER PROFILE CARD
        ========================================================================= */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/80 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
          {/* Decorative background glow */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* User Info & Avatar */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-primary/30 to-amber-400/20 border-2 border-primary/30 flex items-center justify-center text-primary font-bold text-2xl sm:text-3xl shadow-inner">
                  {profile?.full_name ? (
                    profile.full_name.charAt(0).toUpperCase()
                  ) : user?.user_metadata?.full_name ? (
                    user.user_metadata.full_name.charAt(0).toUpperCase()
                  ) : (
                    <User className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-background" />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                    {profile?.full_name ||
                      user?.user_metadata?.full_name ||
                      user?.user_metadata?.name ||
                      (user?.email ? user.email.split("@")[0] : "ผู้ใช้งาน")}
                  </h2>
                  <Badge
                    variant={role === "farm" ? "default" : "secondary"}
                    className="rounded-full text-xs font-semibold px-2.5 py-0.5"
                  >
                    {role === "farm" ? "เกษตรกร / เจ้าของฟาร์ม" : "สมาชิกทั่วไป"}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span>{user?.email}</span>
                </p>
                <p className="text-xs text-muted-foreground/80 flex items-center gap-1.5 pt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>บัญชีได้รับการยืนยันความถูกต้อง</span>
                </p>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/profile")}
                className="rounded-xl flex-1 md:flex-initial gap-1.5 shadow-sm hover:bg-background"
              >
                <User className="w-4 h-4 text-primary" />
                แก้ไขโปรไฟล์ & ที่อยู่
              </Button>
            </div>
          </div>

          {/* Quick address snapshot */}
          <div className="mt-6 pt-5 border-t border-border/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-muted/30 border border-border/50">
              <Phone className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-muted-foreground block text-[11px]">เบอร์โทรศัพท์ติดต่อ:</span>
                <span className="font-semibold text-foreground text-sm">
                  {profile?.phone || (
                    <button
                      onClick={() => navigate("/profile")}
                      className="text-primary hover:underline text-xs"
                    >
                      + เพิ่มเบอร์โทรศัพท์
                    </button>
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-muted/30 border border-border/50">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0 space-y-0.5">
                <span className="text-muted-foreground block text-[11px]">ที่อยู่จัดส่งเริ่มต้น:</span>
                <span className="font-medium text-foreground text-xs sm:text-sm leading-relaxed block">
                  {profile?.address || (
                    <button
                      onClick={() => navigate("/profile")}
                      className="text-primary hover:underline text-xs"
                    >
                      + เพิ่มที่อยู่จัดส่งสินค้า
                    </button>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. ORDER STATUS METRICS BAR (E-Commerce Style Hub)
        ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-base sm:text-lg text-foreground">
                สถานะการสั่งจองและคำสั่งซื้อ
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard/orders")}
              className="text-xs text-primary font-medium hover:bg-primary/5 rounded-xl gap-1"
            >
              ดูทั้งหมด
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Pending */}
            <div
              onClick={() => navigate("/dashboard/orders")}
              className="group cursor-pointer rounded-2xl border border-border/80 bg-card/80 p-4 sm:p-5 hover:border-amber-500/50 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black text-foreground group-hover:text-amber-600 transition-colors">
                  {counts.pending}
                </span>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  รอยืนยัน
                </p>
                <p className="text-[11px] text-muted-foreground">
                  รอฟาร์มยืนยันการจอง
                </p>
              </div>
            </div>

            {/* 2. Confirmed */}
            <div
              onClick={() => navigate("/dashboard/orders")}
              className="group cursor-pointer rounded-2xl border border-border/80 bg-card/80 p-4 sm:p-5 hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black text-foreground group-hover:text-emerald-600 transition-colors">
                  {counts.confirmed}
                </span>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  ยืนยันแล้ว
                </p>
                <p className="text-[11px] text-muted-foreground">
                  เตรียมเก็บเกี่ยว/จัดส่ง
                </p>
              </div>
            </div>

            {/* 3. Shipping */}
            <div
              onClick={() => navigate("/dashboard/orders")}
              className="group cursor-pointer rounded-2xl border border-border/80 bg-card/80 p-4 sm:p-5 hover:border-blue-500/50 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black text-foreground group-hover:text-blue-600 transition-colors">
                  {counts.shipping}
                </span>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  กำลังจัดส่ง
                </p>
                <p className="text-[11px] text-muted-foreground">
                  พัสดุอยู่ระหว่างนำส่ง
                </p>
              </div>
            </div>

            {/* 4. To Review */}
            <div
              onClick={() => navigate("/dashboard/orders")}
              className="group cursor-pointer rounded-2xl border border-border/80 bg-card/80 p-4 sm:p-5 hover:border-purple-500/50 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Star className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black text-foreground group-hover:text-purple-600 transition-colors">
                  {counts.review}
                </span>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  รอรีวิว
                </p>
                <p className="text-[11px] text-muted-foreground">
                  ให้คะแนนผลผลิต
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            3. QUICK NAVIGATION TILES
        ========================================================================= */}
        <div className="space-y-3">
          <h3 className="font-bold text-base sm:text-lg text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            บริการและเมนูด่วน
          </h3>

          <div className={`grid grid-cols-1 ${role !== "farm" ? "md:grid-cols-3" : "md:grid-cols-2"} gap-4`}>
            {/* Marketplace Card */}
            <div
              onClick={() => navigate("/market")}
              className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-5 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                    ตลาดซื้อขายกล้วย
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    ค้นหากล้วยสดและหน่อพันธุ์แท้
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>

            {/* Knowledge Card */}
            <div
              onClick={() => navigate("/knowledge")}
              className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-5 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors">
                    คลังความรู้กล้วยไทย
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    รวบรวมข้อมูลสารานุกรมสายพันธุ์กล้วย การดูแลรักษา และเทคนิคการปลูก
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>

            {/* Upgrade to Farm Card (Only for non-farm users) */}
            {role !== "farm" && (
              <div
                onClick={handleUpgradeToFarm}
                className="group relative overflow-hidden rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 cursor-pointer hover:border-amber-500 hover:shadow-md transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold group-hover:scale-110 transition-transform shadow-md">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm sm:text-base text-foreground group-hover:text-amber-600 transition-colors">
                      เปิดร้านค้าเกษตรกร
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      อัปเกรดเพื่อลงขายผลผลิตกล้วย
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-amber-500 group-hover:translate-x-1 transition-all" />
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            4. RECENT ORDERS & RESERVATIONS FEED
        ========================================================================= */}
        <div className="rounded-3xl border border-border/80 bg-card/80 backdrop-blur-sm p-6 sm:p-7 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <h3 className="font-bold text-lg text-foreground">
                รายการสั่งจองล่าสุด
              </h3>
              <p className="text-xs text-muted-foreground">
                รายการคำสั่งซื้อและผลผลิตที่คุณจองไว้เมื่อเร็วๆ นี้
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/dashboard/orders")}
              className="rounded-xl text-xs gap-1"
            >
              ดูประวัติทั้งหมด
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {recentItems.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                <ShoppingBag className="w-7 h-7 opacity-70" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">ยังไม่มีรายการสั่งซื้อในขณะนี้</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  เลือกซื้อกล้วยสดส่งตรงจากสวน หรือหน่อพันธุ์กล้วยแท้คุณภาพสูงได้เลย
                </p>
              </div>
              <Button
                onClick={() => navigate("/market")}
                className="rounded-xl shadow-sm gap-1.5 mt-2"
                size="sm"
              >
                <Store className="w-4 h-4" />
                เริ่มช้อปปิ้งที่ตลาดสินค้า
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {recentItems.map((item) => {
                const conf = statusConfig[item.status] || {
                  label: item.status,
                  bg: "bg-muted text-muted-foreground",
                  text: "text-muted-foreground",
                  icon: Info,
                };
                const StatusIcon = conf.icon;

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => navigate("/dashboard/orders")}
                    className="py-3.5 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 hover:bg-muted/30 px-3 rounded-2xl transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 w-full sm:w-auto">
                      {/* Thumbnail */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-muted border border-border/80 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Banana className="w-6 h-6 text-primary/40" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <p className="font-bold text-sm sm:text-base text-foreground truncate">
                          {item.product_name}
                        </p>
                        <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                          <span>ฟาร์ม: <strong>{item.farm_name}</strong></span>
                          <span>•</span>
                          <span>{item.quantity} ชิ้น</span>
                          <span>•</span>
                          <span>{formatDate(item.created_at)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Status & Price */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-muted-foreground block">
                          ยอดสุทธิ
                        </span>
                        <span className="font-bold text-base text-primary">
                          ฿{Number(item.total_price || 0).toLocaleString()}
                        </span>
                      </div>

                      <div
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${conf.bg} ${conf.text}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        <span>{conf.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
