import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

/* ---------- Types ---------- */

interface FarmProfile {
  id: string;
  farm_name: string;
  farm_location: string;
  farm_description: string | null;
  rating: number | null;
  total_reviews: number | null;
  total_sales: number | null;
  verified: boolean | null;
}

interface Stats {
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
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

/* ---------- Component ---------- */

const FarmDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [farm, setFarm] = useState<FarmProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<Stats>({
    activeProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
  });

  useEffect(() => {
    loadFarmData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFarmData = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth/login", { replace: true });
        return;
      }

      const userId = session.user.id;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const isFarm = roles?.some((r) => r.role === "farm");
      if (!isFarm) {
        toast.error("You are not a farm user");
        navigate("/dashboard", { replace: true });
        return;
      }

      const { data: farmData } = await supabase
        .from("farm_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!farmData) {
        toast.error("Farm profile not found");
        navigate("/dashboard", { replace: true });
        return;
      }

      setFarm(farmData);
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("farm_id", farmData.id)
        .order("created_at", { ascending: false });

      if (productError) throw productError;

      setProducts(productData || []);

      const { data: statsData, error: statsError } =
        await supabase.rpc("get_farm_dashboard_stats");

      if (statsError) throw statsError;

      setStats({
        activeProducts: statsData.activeProducts,
        totalOrders: statsData.totalOrders,
        pendingOrders: statsData.pendingOrders,
      });

      setFarm(prev => prev ? {
        ...prev,
        total_sales: statsData.totalSales
      } : prev);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load farm dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-bold">แดชบอร์ดฟาร์ม</h1>
          </div>

          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            ออกจากระบบ
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* FARM INFO (READ ONLY) */}
        <Card className="p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{farm?.farm_name}</h2>
              <p className="text-muted-foreground flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {farm?.farm_location}
              </p>
              {farm?.farm_description && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {farm.farm_description}
                </p>
              )}
            </div>

            <div className="text-right">
              <div className="flex items-center gap-1 text-yellow-500 justify-end">
                <Star className="w-5 h-5 fill-current" />
                <span className="font-semibold">
                  {farm?.rating?.toFixed(1) ?? "0.0"}
                </span>
              </div>
              <p
                className="text-xs text-muted-foreground cursor-pointer hover:underline"
                onClick={() => navigate(`/farm/reviews/${farm?.id}`)}>
                {farm?.total_reviews ?? 0} รีวิว
              </p>
            </div>
          </div>
        </Card>

        {/* KEY METRICS */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          <InfoCard
            icon={<Package className="w-5 h-5" />}
            label="สินค้าที่เปิดให้จอง"
            value={stats.activeProducts}
          />
          <InfoCard
            icon={<ShoppingCart className="w-5 h-5" />}
            label="ออเดอร์ทั้งหมด"
            value={stats.totalOrders}
          />
          <InfoCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="ยอดขายรวม"
            value={`฿${farm?.total_sales?.toLocaleString() ?? 0}`}
          />
        </div>

        {/* MANAGEMENT ACTIONS */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            การจัดการ
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <ActionRow
              icon={<Package className="w-5 h-5" />}
              title="จัดการสินค้า"
              subtitle="เพิ่ม,แก้ไข,หรือปิดการจองสินค้า"
              onClick={() => navigate("/farm/products")}
            />

            <ActionRow
              icon={<ShoppingCart className="w-5 h-5" />}
              title="ออเดอร์"
              subtitle={`${stats.pendingOrders} รอดำเนินการ`}
              onClick={() => navigate("/farm/orders")}
            />

            <ActionRow
              icon={<Settings className="w-5 h-5" />}
              title="ตั้งค่าฟาร์ม"
              subtitle="แก้ไขข้อมูลฟาร์มและการตั้งค่า"
              onClick={() => navigate("/profile")}
            />
          </div>
        </div>

        {/* ===== FARM PRODUCTS ===== */}
        <div className="mt-12">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">สินค้าในร้าน</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/farm/products")}
            >
              ดูทั้งหมด
            </Button>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground bg-white rounded-xl border border-dashed">
              ยังไม่มีสินค้าในร้าน
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p) => (
                <Card
                  key={p.id}
                  className="cursor-pointer hover:shadow-md transition overflow-hidden"
                  onClick={() => navigate(`/market/product/${p.id}`)}
                >
                  <div className="aspect-video bg-muted flex items-center justify-center relative">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        className="w-full h-full object-cover"
                        alt={p.name}
                      />
                    ) : (
                      <span className="text-5xl">🍌</span>
                    )}
                    {/* Badge ประเภทภาษาไทย */}
                    <div className="absolute top-2 right-2">
                      <span className="text-[10px] px-2 py-1 rounded-md bg-white/90 font-bold shadow-sm">
                        {p.product_type === "fruit" ? "ผล" : p.product_type === "shoot" ? "หน่อ" : p.product_type}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="font-semibold text-lg line-clamp-1">{p.name}</h3>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                      {p.description || "Fresh quality produce"}
                    </p>

                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xl font-bold text-primary">
                          ฿{p.price_per_unit.toLocaleString()}
                          <span className="text-sm text-muted-foreground font-normal">
                            /{p.unit}
                          </span>
                        </p>

                        <p className="text-xs text-muted-foreground">
                          คงเหลือ: {p.available_quantity} {p.unit}
                        </p>
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground mt-3 pt-3 border-t uppercase font-medium">
                      เก็บเกี่ยว: {new Date(p.harvest_date).toLocaleDateString("th-TH")}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- UI Blocks ---------- */

const InfoCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) => (
  <Card className="p-4 flex items-center gap-3 bg-muted/40 border-none shadow-sm">
    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
      {icon}
    </div>
    <div>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  </Card>
);

const ActionRow = ({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) => (
  <Card
    className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent transition border-none shadow-sm bg-white"
    onClick={onClick}
  >
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
    <ChevronRight className="w-4 h-4 text-muted-foreground" />
  </Card>
);

export default FarmDashboard;