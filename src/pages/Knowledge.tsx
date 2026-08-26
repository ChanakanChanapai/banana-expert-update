import { useEffect, useState } from "react";
import { useNavigate, useNavigationType } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";

interface Cultivar {
  id: string;
  name: string;
  thai_name: string;
  slug: string;
  description: string;
  characteristics: string;
  image_url: string | null;
}

const Knowledge = () => {
  const navigate = useNavigate();
  const navType = useNavigationType(); 

  const [cultivars, setCultivars] = useState<Cultivar[]>([]);
  const [filteredCultivars, setFilteredCultivars] = useState<Cultivar[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // ✨ Logic: รีเฟรชหน้าจอ (F5) ข้อมูลต้องล้างใหม่หมด
  useEffect(() => {
    const isReload = (
      window.performance.navigation.type === 1 || 
      performance.getEntriesByType("navigation").some((nav: any) => nav.type === "reload")
    );

    if (isReload) {
      setSearch(""); 
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    fetchCultivars();
  }, []);

  // ระบบ Filter ข้อมูล
  useEffect(() => {
    if (search) {
      const lowerSearch = search.toLowerCase();
      setFilteredCultivars(
        cultivars.filter(
          (c) =>
            c.name.toLowerCase().includes(lowerSearch) ||
            c.thai_name.includes(search) ||
            c.description.toLowerCase().includes(lowerSearch)
        )
      );
    } else {
      setFilteredCultivars(cultivars);
    }
  }, [search, cultivars]);

  const fetchCultivars = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("cultivars")
        .select("*")
        .order("name");

      if (error) throw error;
      setCultivars(data || []);
      setFilteredCultivars(data || []);
    } catch (error: any) {
      toast.error("Failed to load cultivars");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* ✅ เปลี่ยนมาใช้ Navbar ตัวกลาง (ซึ่งสไตล์เดียวกับ nav เดิมของแอ๋ม) */}
      <Navbar />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-5xl font-bold mb-4 text-gray-800">คลังความรู้เรื่องกล้วยๆ</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            รวบรวมข้อมูลกล้วยกว่า 10 สายพันธุ์ ยอดนิยมและหายากในประเทศไทย
          </p>
        </header>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-16 px-2">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="ค้นหาสายพันธุ์กล้วย..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-14 rounded-2xl shadow-sm border-2 focus-visible:ring-primary focus-visible:border-primary transition-all text-lg"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">กำลังโหลดข้อมูลกล้วย...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {filteredCultivars.length > 0 ? (
              filteredCultivars.map((cultivar) => (
                <Card
                  key={cultivar.id}
                  className="group overflow-hidden hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col border-none rounded-3xl bg-white/50 backdrop-blur-sm"
                  onClick={() => navigate(`/cultivar/${cultivar.slug}`)} // ✅ ลิงก์ไปหน้ารายละเอียด
                >
                  {/* 🛠️ ส่วนแสดงรูปภาพ: 1:1 (Square) */}
                  <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {cultivar.image_url ? (
                      <img 
                        src={cultivar.image_url} 
                        alt={cultivar.thai_name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-7xl group-hover:scale-110 transition-transform duration-300">🍌</span>
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No Image</span>
                      </div>
                    )}
                    {/* Overlay ตอน Hover */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                       <div className="bg-white/90 text-black px-4 py-2 rounded-full font-bold text-sm shadow-sm">อ่านเพิ่มเติม</div>
                    </div>
                  </div>

                  {/* รายละเอียดด้านล่าง */}
                  <div className="p-8 flex-grow flex flex-col">
                    <h3 className="text-2xl font-bold mb-1 text-gray-800 group-hover:text-primary transition-colors">
                      {cultivar.thai_name}
                    </h3>
                    <p className="text-sm font-semibold text-primary/60 mb-4 italic">
                      {cultivar.name}
                    </p>
                    <p className="text-gray-600 line-clamp-3 mb-6 leading-relaxed">
                      {cultivar.description}
                    </p>
                    
                    {/* Tags ลักษณะเด่น */}
                    {cultivar.characteristics && (
                      <div className="mt-auto flex flex-wrap gap-2">
                        {cultivar.characteristics
                          .split(",")
                          .slice(0, 3)
                          .map((char, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-primary/5 text-primary border border-primary/10 rounded-lg text-[10px] font-bold uppercase"
                            >
                              {char.trim()}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-20">
                <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                <p className="text-xl text-muted-foreground italic">ไม่พบข้อมูลกล้วยที่น้องค้นหาน๊า...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-background/80 backdrop-blur-sm mt-20">
        <div className="container mx-auto px-4 py-8 text-center text-muted-foreground">
          <p className="text-sm">© 2026 Banana Expert Knowledge Base. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Knowledge;
