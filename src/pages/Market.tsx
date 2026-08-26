import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom"; 
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Star, MapPin, X } from "lucide-react"; 
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ---------- Types / Interfaces ---------- */
interface FarmProfile {
  id: string;
  farm_name: string;
  farm_location: string;
  rating: number | null;
  profiles?: {
    last_seen: string | null;
  } | any; 
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  product_type: string; 
  price_per_unit: number;
  available_quantity: number;
  unit: string;
  harvest_date: string;
  image_url: string | null;
  farm_id: string;
  farm: FarmProfile | null;
}

/* ---------- Helper Function: คำนวณเวลาออนไลน์ ---------- */
const getTimeAgo = (dateString: string | null | undefined) => {
  if (!dateString) return "ไม่ระบุสถานะ";
  const now = new Date();
  const lastSeen = new Date(dateString);
  
  if (isNaN(lastSeen.getTime())) return "ไม่ระบุสถานะ";

  const diffInMs = now.getTime() - lastSeen.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

  if (diffInMinutes < 5) return "ออนไลน์ตอนนี้";
  if (diffInMinutes < 60) return `ออนไลน์เมื่อ ${diffInMinutes} นาทีที่แล้ว`;
  if (diffInHours < 24) return `ออนไลน์เมื่อ ${diffInHours} ชม. ที่แล้ว`;
  return `ออนไลน์เมื่อ ${Math.floor(diffInHours / 24)} วันที่แล้ว`;
};

/* ---------- Main Component ---------- */
const Market = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || "";

  const [products, setProducts] = useState<Product[]>([]);
  const [topFarms, setTopFarms] = useState<FarmProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState<"all" | "fruit" | "shoot">("all");

  /* Function แปลประเภทสินค้า */
  const translateType = (type: string) => {
    const types: Record<string, string> = {
      fruit: "ผล",
      shoot: "หน่อ",
      "ผล": "ผล",
      "หน่อ": "หน่อ"
    };
    return types[type] || type;
  };

  useEffect(() => {
    loadProducts();
    loadTopFarms();
  }, []);

  useEffect(() => {
    if (initialSearch) {
      setSearch(initialSearch);
    }
  }, [initialSearch]);

  /* ดึงข้อมูลสินค้าทั้งหมด */
  const loadProducts = async () => {
    try {
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
          farm_id,
          farm: farm_profiles (
            farm_name,
            farm_location,
            rating,
            profiles: user_id (
              last_seen
            )
          )
        `)
        .eq("is_active", true);

      if (error) throw error;
      setProducts(data as any ?? []);
    } catch (err) {
      console.error("Load products error:", err);
      toast.error("โหลดข้อมูลสินค้าไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  /* ดึงข้อมูล 3 ฟาร์มที่เรตติ้งดีที่สุด */
  const loadTopFarms = async () => {
    try {
      const { data, error } = await supabase
        .from("farm_profiles")
        .select(`
          id,
          farm_name,
          farm_location,
          rating,
          profiles: user_id (
            last_seen
          )
        `)
        .not("rating", "is", null)
        .order("rating", { ascending: false })
        .limit(3);

      if (error) throw error;
      setTopFarms(data as any ?? []);
    } catch (err) {
      console.error("Load top farms error:", err);
    }
  };

  /* Logic กรองสินค้า (ค้นหา + ประเภท + สต็อกต้องมี) */
  const filteredProducts = products.filter((p) => {
    const keyword = search.toLowerCase();
    const matchName = p.name?.toLowerCase().includes(keyword);
    const matchFarm = p.farm?.farm_name?.toLowerCase().includes(keyword) ?? false;
    const matchType = typeFilter === "all" || p.product_type === typeFilter;
    const hasStock = Number(p.available_quantity) > 0;
    return (matchName || matchFarm) && matchType && hasStock;
  });

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <Navbar />

      <div className="container mx-auto px-4 py-10">
        {/* Header Section */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-3 text-gray-800 tracking-tight">ค้นหาผลผลิตกล้วยจากฟาร์ม</h2>
          <p className="text-muted-foreground text-lg">เชื่อมต่อการจองผลผลิตกล้วยกับฟาร์มโดยตรงทั่วประเทศไทย</p>
        </div>

        {/* ⭐ Top 3 Farms Section */}
        {topFarms.length > 0 && (
          <div className="max-w-4xl mx-auto mb-10">
             <h3 className="text-2xl font-bold mb-4 text-gray-800">
                ⭐ ฟาร์มยอดนิยม
              </h3>

            <div className="grid md:grid-cols-3 gap-6">
              {topFarms.map((farm, index) => {
                const ls = Array.isArray(farm.profiles) ? farm.profiles[0]?.last_seen : farm.profiles?.last_seen;
                const isOnline = ls && (new Date().getTime() - new Date(ls).getTime()) < 300000;
                
                return (
                  <Card
                    key={farm.id}
                    className="p-6 cursor-pointer hover:shadow-xl transition-all duration-300 border-none bg-white shadow-sm relative overflow-hidden rounded-2xl group"
                    onClick={() => navigate(`/farm/${farm.id}`)}
                  >
                    {/* Status Dot */}
                    <div className="absolute top-5 right-5">
                      <div className={`w-3 h-3 rounded-full border-2 border-white ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                    </div>

                    <h4 className="font-bold text-xl text-gray-800 pr-6 group-hover:text-primary transition-colors">{farm.farm_name}</h4>
                    
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> {farm.farm_location}
                    </p>

                    <div className="flex items-center gap-1.5 mt-4 bg-yellow-50 w-fit px-3 py-1 rounded-lg border border-yellow-100">
                      <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                      <span className="font-bold text-yellow-700 text-sm">{farm.rating?.toFixed(1)}</span>
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-[11px] text-primary font-black uppercase tracking-widest bg-primary/10 px-2 py-1 rounded">
                        อันดับที่ {index + 1}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {isOnline ? "กำลังออนไลน์" : "ออฟไลน์"}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        <hr className="max-w-5xl mx-auto mb-10 border-gray-200" />

        {/* Search & Filtering Bars */}
        <div className="max-w-5xl mx-auto mb-10 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="ค้นหาสินค้าหรือชื่อฟาร์ม..."
              value={search}
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-12 pr-12 h-14 bg-white rounded-2xl shadow-sm border-none focus-visible:ring-2 focus-visible:ring-primary text-base"
            />
            {search && (
              <button 
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <Select
            value={typeFilter}
            onValueChange={(v: "all" | "fruit" | "shoot") => setTypeFilter(v)}
          >
            <SelectTrigger className="w-full sm:w-[200px] h-14 bg-white rounded-2xl shadow-sm border-none text-base font-medium">
              <SelectValue placeholder="เลือกประเภท" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-none shadow-xl">
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="fruit">🍌 กล้วย (ผล)</SelectItem>
              <SelectItem value="shoot">🌱 หน่อกล้วย</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Products Display Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-muted-foreground font-medium italic">กำลังค้นหาผลผลิตคุณภาพให้คุณ...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[2rem] shadow-sm border-2 border-dashed border-slate-100 max-w-5xl mx-auto">
            <div className="text-7xl mb-6">📦</div>
            <h3 className="text-2xl font-bold text-gray-700">ไม่พบสินค้าในขณะนี้</h3>
            <p className="text-muted-foreground mt-2">ลองเปลี่ยนคำค้นหา หรือเลือกดูประเภทอื่นนะจ๊ะ</p>
            <button 
              onClick={() => {setSearch(""); setTypeFilter("all");}}
              className="mt-6 text-primary font-bold hover:underline"
            >
              ล้างตัวกรองทั้งหมด
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((p) => {
              /* ดึงค่า last_seen จากความสัมพันธ์ที่ Nested อยู่ */
              const farmProfiles = p.farm?.profiles;
              const lastSeenVal = Array.isArray(farmProfiles) 
                ? farmProfiles[0]?.last_seen 
                : farmProfiles?.last_seen;

              const isOnline = lastSeenVal && 
                (new Date().getTime() - new Date(lastSeenVal).getTime()) < 300000;

              return (
                <Card
                  key={p.id}
                  className="group cursor-pointer hover:shadow-2xl transition-all duration-500 border-none rounded-[1.5rem] overflow-hidden bg-white shadow-md flex flex-col"
                  onClick={() => navigate(`/market/product/${p.id}`)}
                >
                  {/* Image Container */}
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    {p.image_url ? (
                      <img 
                        src={p.image_url} 
                        alt={p.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">🍌</div>
                    )}
                    
                    {/* Product Type Label */}
                    <div className="absolute top-4 left-4">
                      <span className="px-4 py-1.5 rounded-full bg-white/95 backdrop-blur-sm text-[11px] font-black text-primary shadow-sm uppercase tracking-wider">
                        {translateType(p.product_type)}
                      </span>
                    </div>
                  </div>

                  {/* Details Container */}
                  <div className="p-6 flex flex-1 flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-xl text-gray-800 line-clamp-1 group-hover:text-primary transition-colors">
                          {p.name}
                        </h3>
                        <div 
                          className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1.5 hover:text-primary transition-colors cursor-pointer w-fit"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/farm/${p.farm_id}`);
                          }}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="hover:underline font-medium">{p.farm?.farm_name ?? "ฟาร์มไม่ระบุชื่อ"}</span>
                        </div>
                      </div>

                      {p.farm?.rating != null && (
                        <div className="flex items-center gap-1 bg-yellow-50 px-2.5 py-1 rounded-xl border border-yellow-100 shadow-sm">
                          <Star className="w-3.5 h-3.5 text-yellow-600 fill-yellow-600" />
                          <span className="text-xs font-black text-yellow-700">
                            {p.farm.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-5 h-10 leading-relaxed italic">
                      {p.description || "ผลผลิตคุณภาพจากเกษตรกรไทย คัดสรรเพื่อคุณ"}
                    </p>

                    {/* Online Status Section */}
                    <div className="flex items-center gap-2 mb-5 bg-slate-50 w-fit px-3 py-1.5 rounded-full border border-slate-100">
                      <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {getTimeAgo(lastSeenVal)}
                      </span>
                    </div>

                    {/* Pricing & Stock Section */}
                    <div className="mt-auto flex justify-between items-end border-t border-slate-50 pt-5">
                      <div>
                        <p className="text-2xl font-black text-primary">
                          ฿{p.price_per_unit.toLocaleString()}
                          <span className="text-sm font-medium text-muted-foreground ml-1">/{p.unit}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-70">
                          สต็อกคงเหลือ: {p.available_quantity} {p.unit}
                        </p>
                      </div>
                      
                      <div className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-primary/20 transform transition-all group-hover:scale-105 active:scale-95">
                        ดูรายละเอียด
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <footer className="container mx-auto px-4 py-16 text-center text-muted-foreground text-sm border-t border-slate-100 mt-20">
        <div className="mb-4 text-primary font-black tracking-tighter text-xl">BANANA EXPERT</div>
        <p className="font-medium">© 2026 Banana Expert Thailand. All Rights Reserved.</p>
        <p className="mt-1 opacity-60 italic">"สนับสนุนเกษตรกรไทย เพื่อผลผลิตที่ยั่งยืน"</p>
      </footer>
    </div>
  );
};

export default Market;