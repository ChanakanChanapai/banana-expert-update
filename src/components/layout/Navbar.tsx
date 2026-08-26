import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Book, Store, User, LogOut, ArrowLeft, ScanLine } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NavLink } from "./NavLink"; 

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const [session, setSession] = useState<any>(null);

  // ✨ ฟังก์ชันอัปเดตสถานะออนไลน์ (last_seen)
  const updateLastSeen = async (userId: string) => {
    try {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error("Error updating last seen:", error);
    }
  };

  useEffect(() => {
    // 1. ดึง Session ครั้งแรก และอัปเดตสถานะทันทีถ้า Login อยู่
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        updateLastSeen(session.user.id);
      }
    });

    // 2. ตรวจสอบการเปลี่ยนแปลงสถานะ Login/Logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        updateLastSeen(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ✨ ตั้งเวลาอัปเดตทุก 4 นาที เพื่อรักษาสถานะ "ออนไลน์ตอนนี้" ในหน้า Market
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (session?.user) {
      // อัปเดตทันทีเมื่อเปลี่ยนหน้า
      updateLastSeen(session.user.id);

      interval = setInterval(() => {
        updateLastSeen(session.user.id);
      }, 4 * 60 * 1000); // ทุก 4 นาที
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session, location.pathname]); 

  // ✨ จุดที่แก้ไข: บันทึกเวลาวินาทีสุดท้ายก่อน Logout
  const handleSignOut = async () => {
    try {
      if (session?.user) {
        // อัปเดตเวลาครั้งสุดท้ายก่อนออกจากระบบจริงๆ
        await updateLastSeen(session.user.id);
      }
    } catch (error) {
      console.error("Error updating status before signout:", error);
    } finally {
      await supabase.auth.signOut();
      toast.success("ออกจากระบบเรียบร้อย");
      navigate("/");
    }
  };

  return (
    <nav className="border-b border-slate-100 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        
        <div className="flex items-center gap-2">
          <h1
            className="text-2xl font-black tracking-tight bg-gradient-to-r from-yellow-500 to-orange-600 bg-clip-text text-transparent cursor-pointer select-none"
            onClick={() => navigate("/")}
          >
            Banana Expert
          </h1>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={() => {
              if (location.pathname === "/") {
                document.getElementById("detection")?.scrollIntoView({ behavior: "smooth" });
              } else {
                navigate("/?scrollTo=detection");
              }
            }}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-900 transition-all hover:bg-orange-600 hover:text-white"
          >
            <ScanLine className="w-4 h-4" />
            Detection
          </button>

          <NavLink 
            to="/knowledge" 
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-900 transition-all hover:bg-orange-600 hover:text-white"
            activeClassName="bg-orange-600 text-white shadow-md" 
          >
            <Book className="w-4 h-4" />
            Knowledge
          </NavLink>

          <NavLink 
            to="/market" 
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-900 transition-all hover:bg-orange-600 hover:text-white"
            activeClassName="bg-orange-600 text-white shadow-md"
          >
            <Store className="w-4 h-4" />
            Marketplace
          </NavLink>

          {session ? (
            <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
              <Button 
                variant="outline" 
                onClick={() => navigate("/dashboard")} 
                className="group gap-2 rounded-xl border-slate-300 bg-white text-slate-900 hover:bg-orange-600 hover:text-white font-bold shadow-sm transition-all"
              >
                <User className="w-4 h-4 text-orange-500 group-hover:text-white transition-colors" /> 
                Profile
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSignOut} 
                className="rounded-xl text-slate-500 hover:bg-orange-600 hover:text-white transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button 
              onClick={() => navigate("/auth/login")}
              className="bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl px-6 shadow-md transition-all active:scale-95"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
