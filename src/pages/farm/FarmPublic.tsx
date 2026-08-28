import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, Loader2, MapPin, Package } from "lucide-react";

/* ---------- Types ---------- */
interface FarmProfile {
  id: string;
  farm_name: string;
  farm_location: string;
  farm_description: string | null;
  rating: number | null;
  total_reviews: number | null;
  profiles?: {
    last_seen?: string | null;
  } | any;
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
}

/* ---------- Helper: คำนวณเวลาออนไลน์ ---------- */
const getTimeAgo = (dateString: string | null | undefined) => {
  if (!dateString) return "ไม่ระบุสถานะ";
  const now = new Date();
  const lastSeen = new Date(dateString);
  if (isNaN(lastSeen.getTime())) return "ไม่ระบุสถานะ";

  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMin < 5) return "ออนไลน์ตอนนี้";
  if (diffMin < 60) return `ออนไลน์เมื่อ ${diffMin} นาทีที่แล้ว`;
  if (diffHour < 24) return `ออนไลน์เมื่อ ${diffHour} ชม. ที่แล้ว`;
  return `ออนไลน์เมื่อ ${Math.floor(diffHour / 24)} วันที่แล้ว`;
};

const FarmPublic = () => {
  const { farmId } = useParams();
  const navigate = useNavigate();

  const [farm, setFarm] = useState<FarmProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (farmId) loadFarmData();
  }, [farmId]);

  const loadFarmData = async () => {
    try {
      setLoading(true);

      // ดึงข้อมูลฟาร์มพร้อมเช็คเวลาออนไลน์
      const { data: farmData, error: farmError } = await supabase
        .from("farm_profiles")
        .select(`
          *,
          profiles: user_id (
            last_seen
          )
        `)
        .eq("id", farmId)
        .single();

      if (farmError) throw farmError;
      setFarm(farmData as any);

      // ดึงสินค้าของฟาร์มนี้
      const { data: productsData, error: prodError } = await supabase
        .from("products")
        .select("*")
        .eq("farm_id", farmId)
        .eq("is_active", true);

      if (prodError) throw prodError;
      
      setProducts(
        (productsData ?? []).filter(
          (p: Product) => Number(p.available_quantity ?? 0) > 0
        )
      );
    } catch (err) {
      console.error("Load farm error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // คำนวณสถานะออนไลน์
  const ls = Array.isArray(farm?.profiles) ? farm?.profiles[0]?.last_seen : farm?.profiles?.last_seen;
  const isOnline = ls && new Date().getTime() - new Date(ls).getTime() < 300000;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header - ตามสไตล์ที่ 2 */}
      <nav className="border-b bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            ย้อนกลับ
          </Button>
          <h1 className="text-lg font-bold truncate">{farm?.farm_name}</h1>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Farm Info Card - ตามสไตล์ที่ 2 */}
        <Card className="p-6 mb-8 border-none shadow-sm">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <h2 className="text-2xl font-bold">{farm?.farm_name}</h2>
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {farm?.farm_location}
              </p>
              
              {/* จุดเขียวออนไลน์ - แทรกเพิ่มแบบเนียนๆ */}
              <div className="flex items-center gap-2 mt-3">
                <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                <span className="text-xs text-muted-foreground">
                  {getTimeAgo(ls)}
                </span>
              </div>
            </div>

            {farm?.rating != null && (
              <div 
                className="flex items-center gap-1 text-yellow-500 cursor-pointer hover:underline"
                onClick={() => navigate(`/farm/reviews/${farm.id}`)}
              >
                <Star className="w-5 h-5 fill-current" />
                <span className="text-xl font-bold">{farm.rating.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground ml-1">
                  ({farm.total_reviews ?? 0} reviews)
                </span>
              </div>
            )}
          </div>

          {farm?.farm_description && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {farm.farm_description}
              </p>
            </div>
          )}
        </Card>

        {/* Products Section - ตามสไตล์ที่ 2 */}
        <h3 className="text-lg font-semibold mb-6">สินค้าในร้าน</h3>

        {products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed text-muted-foreground font-medium">
            ฟาร์มนี้ยังไม่มีสินค้าพร้อมจำหน่าย
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <Card
                key={p.id}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden border-none shadow-sm"
                onClick={() => navigate(`/market/product/${p.id}`)}
              >
                <div className="aspect-video bg-muted relative">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      className="w-full h-full object-cover"
                      alt={p.name}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                      <Package className="w-12 h-12 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="text-[10px] px-2 py-1 rounded-md bg-white/90 font-bold shadow-sm">
                      {p.product_type === "fruit" ? "ผล" : "หน่อ"}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-lg mb-1">{p.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
                    {p.description || "สดจากฟาร์ม คัดคุณภาพมาเพื่อคุณ"}
                  </p>

                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xl font-black text-primary">
                        ฿{p.price_per_unit.toLocaleString()}
                        <span className="text-sm font-normal text-muted-foreground ml-1">/{p.unit}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium mt-1">
                        สต็อก: {p.available_quantity} {p.unit}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FarmPublic;