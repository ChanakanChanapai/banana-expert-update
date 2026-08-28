import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, BookOpen, Droplets, Lightbulb, Info, 
  Sprout, Scissors, Sun, Scaling, Bug, Timer, Heart, Star, Store, Leaf
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";

interface Cultivar {
  id: string;
  name: string;
  thai_name: string;
  description: string;
  characteristics: string;
  image_url?: string; 
  fun_fact?: string;
  shape?: string;
  peel?: string;
  flesh?: string;
  taste?: string;
  propagation?: string;
  soil?: string;
  sunlight?: string;
  spacing?: string;
  watering?: string;
  fertilizer?: string;
  pruning?: string;
  pests?: string;
  harvest_time?: string;
  uses?: string;
  suitable_for?: string;
}

const CultivarDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [cultivar, setCultivar] = useState<Cultivar | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchCultivar();
    }
  }, [slug]);

  const fetchCultivar = async () => {
    try {
      const { data, error } = await supabase
        .from("cultivars")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error) throw error;
      setCultivar(data);
    } catch (error: any) {
      toast.error("ไม่สามารถโหลดข้อมูลสายพันธุ์ได้");
      navigate("/knowledge");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Leaf className="w-14 h-14 text-amber-500 mb-4 animate-bounce mx-auto" />
          <p className="text-primary font-medium italic">กำลังรวบรวมข้อมูลสายพันธุ์...</p>
        </div>
      </div>
    );
  }

  if (!cultivar) return null;

  return (
    <div className="min-h-screen bg-gradient-hero pb-16">
      <Navbar />

      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="hover:bg-primary/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> 
            ย้อนกลับ
          </Button>

          <Card className="overflow-hidden shadow-2xl border-none bg-white">
            
            <div className="max-w-2xl mx-auto w-full aspect-square relative overflow-hidden">
              {cultivar.image_url ? (
                <img
                  src={cultivar.image_url}
                  alt={cultivar.thai_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).parentElement!.innerHTML = `
                      <div class="w-full h-full bg-gradient-primary flex items-center justify-center">
                        <svg class="w-24 h-24 text-amber-900/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
                      </div>
                    `;
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-primary flex items-center justify-center">
                  <Leaf className="w-24 h-24 text-amber-900/30" />
                </div>
              )}
              
              {cultivar.fun_fact && (
                <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur px-5 py-3 rounded-2xl shadow-lg flex items-center gap-3 border border-orange-100 max-w-[80%]">
                  <Star className="w-5 h-5 text-orange-400 fill-orange-400 shrink-0" />
                  <span className="text-sm font-bold text-orange-800 leading-tight">{cultivar.fun_fact}</span>
                </div>
              )}
            </div>

            <div className="p-8 md:p-12">
              <div className="mb-12">
                <h1 className="text-4xl md:text-5xl font-bold mb-2 text-slate-800 tracking-tight">
                  {cultivar.thai_name}
                </h1>
                <p className="text-2xl text-primary font-medium mb-6 opacity-80">
                  {cultivar.name}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-8">
                  {cultivar.characteristics.split(",").map((char, idx) => (
                    <span key={idx} className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full border border-primary/20">
                      #{char.trim()}
                    </span>
                  ))}
                </div>

                <div className="flex items-start gap-3 bg-primary/5 p-6 rounded-2xl border border-primary/10">
                  <span className="shrink-0 mt-1">
                    <Info className="w-6 h-6 text-primary" />
                  </span>
                  <p className="text-lg text-slate-700 leading-relaxed max-w-prose">
                    {cultivar.description}
                  </p>
                </div>
              </div>

              <div className="grid gap-16">
                <section>
                  <div className="flex items-center gap-2 mb-6 text-primary">
                    <Lightbulb className="w-7 h-7" />
                    <h2 className="text-2xl font-bold text-slate-800">เอกลักษณ์และรสชาติ</h2>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "ทรงผล", value: cultivar.shape },
                      { label: "เปลือก", value: cultivar.peel },
                      { label: "เนื้อ", value: cultivar.flesh },
                      { label: "รสชาติ", value: cultivar.taste }
                    ].map((item, i) => item.value && (
                      <div key={i} className="flex flex-col p-4 bg-slate-50 rounded-xl border border-slate-100 transition-colors hover:bg-slate-100/50">
                        <span className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-wider">{item.label}</span>
                        <span className="text-slate-700 font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-green-50/40 p-8 rounded-3xl border border-green-100">
                  <div className="flex items-center gap-2 mb-8 text-green-700">
                    <Sprout className="w-7 h-7" />
                    <h2 className="text-2xl font-bold">การปลูกและการดูแล</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
                    <div className="flex gap-4">
                      <Sun className="w-5 h-5 text-orange-500 shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-slate-800">แสงแดด</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">{cultivar.sunlight || "กลางแจ้ง/แดดจัด"}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Droplets className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-slate-800">การให้น้ำ</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">{cultivar.watering || "รดน้ำสม่ำเสมอ"}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Scaling className="w-5 h-5 text-green-600 shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-slate-800">ระยะปลูก</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">{cultivar.spacing || "2 x 2 เมตร"}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <Scissors className="w-5 h-5 text-slate-500 shrink-0 mt-1" />
                      <div>
                        <h4 className="font-bold text-slate-800">การดูแลรักษา</h4>
                        <p className="text-slate-600 text-sm leading-relaxed">{cultivar.pruning || "ตัดแต่งหน่อและใบแห้ง"}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="grid md:grid-cols-2 gap-8">
                  <section className="p-6 border rounded-2xl bg-white/50">
                    <div className="flex items-center gap-2 mb-4 text-blue-600">
                      <Timer className="w-6 h-6" />
                      <h3 className="text-xl font-bold text-slate-800">การเก็บเกี่ยว</h3>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-sm">
                      {cultivar.harvest_time || "ประมาณ 8-10 เดือนหลังปลูก"}
                    </p>
                  </section>
                  <section className="p-6 border rounded-2xl bg-white/50">
                    <div className="flex items-center gap-2 mb-4 text-red-500">
                      <Bug className="w-6 h-6" />
                      <h3 className="text-xl font-bold text-slate-800">ข้อควรระวัง</h3>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-sm">
                      {cultivar.pests || "ระวังโรคตายพรายและด้วงงวง"}
                    </p>
                  </section>
                </div>

                <section className="pt-8 border-t">
                  <div className="grid md:grid-cols-2 gap-12">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-primary">
                        <BookOpen className="w-6 h-6" />
                        <h3 className="text-xl font-bold text-slate-800">การนำไปใช้</h3>
                      </div>
                      <p className="text-slate-600 leading-relaxed pl-8 text-sm md:text-base">
                        {cultivar.uses}
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-rose-500">
                        <Heart className="w-6 h-6" />
                        <h3 className="text-xl font-bold text-slate-800">เหมาะสำหรับใคร</h3>
                      </div>
                      <p className="text-slate-600 leading-relaxed pl-8 text-sm md:text-base">
                        {cultivar.suitable_for}
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              {/* ✅ แก้ไขปุ่มแนะนำฟาร์มให้ส่งค่าค้นหาไปด้วยเหมือนหน้า Detect */}
              <div className="mt-20 pt-8 border-t border-border flex flex-col items-center gap-4">
                <Button 
                  onClick={() => {
                    navigate(`/market?search=${encodeURIComponent(cultivar.thai_name)}`);
                  }} 
                  size="lg" 
                  className="w-full md:w-auto px-12 py-7 text-lg rounded-2xl shadow-xl hover:scale-105 transition-all bg-secondary hover:bg-secondary/90 text-white gap-2"
                >
                  <Store className="w-6 h-6" />
                  แนะนำฟาร์มที่ขาย {cultivar.thai_name}
                </Button>
                <p className="text-sm text-muted-foreground italic">
                  สนับสนุนสินค้าจากเกษตรท้องถิ่น
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CultivarDetail;