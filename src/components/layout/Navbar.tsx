import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Store, 
  User, 
  LogOut, 
  ScanLine, 
  Menu, 
  X,
  AlertTriangle,
  Tractor,
  ChevronDown,
  Settings,
  Package,
  Check,
  Sparkles
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NavLink } from "./NavLink"; 

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const [session, setSession] = useState<any>(null);
  const [isFarmRole, setIsFarmRole] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

  const checkFarmRole = async (userId: string) => {
    try {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      setIsFarmRole(roles?.some((r) => r.role === "farm") ?? false);
    } catch (e) {
      console.error("Error checking farm role:", e);
    }
  };

  useEffect(() => {
    // 1. ดึง Session ครั้งแรก และอัปเดตสถานะทันทีถ้า Login อยู่
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        updateLastSeen(session.user.id);
        checkFarmRole(session.user.id);
      }
    });

    // 2. ตรวจสอบการเปลี่ยนแปลงสถานะ Login/Logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        updateLastSeen(session.user.id);
        checkFarmRole(session.user.id);
      } else {
        setIsFarmRole(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ปิด mobile menu เมื่อเปลี่ยน path
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
    <nav className="border-b border-amber-100/80 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-2">
          <h1
            className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 bg-clip-text text-transparent cursor-pointer select-none"
            onClick={() => navigate("/")}
          >
            Banana Expert
          </h1>
        </div>

        {/* 🧭 Desktop & Tablet Navigation Menu */}
        <div className="hidden lg:flex items-center gap-2">
          {/* 1. AI Detection */}
          <button
            onClick={() => {
              if (location.pathname === "/") {
                document.getElementById("detection")?.scrollIntoView({ behavior: "smooth" });
              } else {
                navigate("/?scrollTo=detection");
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold text-slate-900 transition-all hover:bg-amber-100 active:scale-95"
            title="ระบบจำแนกสายพันธุ์กล้วยด้วย AI"
          >
            <ScanLine className="w-4 h-4 text-amber-500" />
            AI Detection
          </button>

          {/* 2. Knowledge Hub */}
          <NavLink 
            to="/knowledge" 
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold text-slate-900 transition-all hover:bg-amber-100 active:scale-95"
            activeClassName="bg-amber-400 text-slate-950 shadow-sm" 
            title="คลังความรู้และสารานุกรมกล้วยไทย ทุกเรื่องโรคพืช สายพันธุ์ และวิธีดูแลรักษา"
          >
            <BookOpen className="w-4 h-4 text-emerald-600" />
            Knowledge Hub
          </NavLink>

          {/* 3. Smart Marketplace */}
          <NavLink 
            to="/market" 
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold text-slate-900 transition-all hover:bg-amber-100 active:scale-95"
            activeClassName="bg-amber-400 text-slate-950 shadow-sm"
            title="ตลาดซื้อขายและสั่งจองผลผลิตกล้วยสด หน่อพันธุ์จากฟาร์มโดยตรง"
          >
            <Store className="w-4 h-4 text-blue-600" />
            Smart Marketplace
          </NavLink>

          {session ? (
            <div className="flex items-center gap-2 border-l border-amber-200/80 pl-3 ml-2">
              {/* 🌟 SMART PROFILE & MODE CAPSULE DROPDOWN */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="group flex items-center gap-2 pl-3.5 pr-2 py-1.5 rounded-full border border-amber-300 bg-amber-100/90 hover:bg-amber-200/90 text-slate-950 shadow-sm transition-all duration-200 cursor-pointer active:scale-95 select-none"
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs">
                      {isFarmRole ? (
                        location.pathname.startsWith("/farm") ? (
                          <>
                            <Tractor className="w-4 h-4 text-amber-800" />
                            <span>โหมดชาวสวน</span>
                          </>
                        ) : (
                          <>
                            <User className="w-4 h-4 text-amber-800" />
                            <span>โหมดผู้ซื้อ</span>
                          </>
                        )
                      ) : (
                        <>
                          <User className="w-4 h-4 text-amber-800" />
                          <span>โปรไฟล์</span>
                        </>
                      )}
                    </div>

                    <div className="w-5 h-5 rounded-full bg-amber-200/60 flex items-center justify-center group-hover:bg-amber-300/60 transition-colors">
                      <ChevronDown className="w-3.5 h-3.5 text-amber-900 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </div>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl bg-card border border-amber-200/80 shadow-xl animate-in fade-in-50 zoom-in-95">
                  {/* User Info Header */}
                  <DropdownMenuLabel className="p-2 font-normal">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-sm border border-amber-300">
                        {session?.user?.email?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">
                          {session?.user?.user_metadata?.full_name || session?.user?.email?.split("@")[0] || "ผู้ใช้งาน"}
                        </p>
                        <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                          {isFarmRole ? "🌾 บัญชีฟาร์มเกษตรกร" : "🍌 สมาชิกทั่วไป"}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator className="my-1" />

                  {/* Switch Modes Section (If Farm Owner) */}
                  {isFarmRole && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        สลับโหมดการทำงาน
                      </div>
                      <DropdownMenuItem
                        onClick={() => navigate("/dashboard")}
                        className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          !location.pathname.startsWith("/farm")
                            ? "bg-amber-100 border border-amber-300 text-amber-950 font-black shadow-xs"
                            : "text-foreground hover:bg-amber-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-amber-800" />
                          <span>โหมดผู้ซื้อ (User Dashboard)</span>
                        </div>
                        {!location.pathname.startsWith("/farm") && <Check className="w-3.5 h-3.5 text-amber-800 stroke-[3]" />}
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onClick={() => navigate("/farm/dashboard")}
                        className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                          location.pathname.startsWith("/farm")
                            ? "bg-amber-100 border border-amber-300 text-amber-950 font-black shadow-xs"
                            : "text-foreground hover:bg-amber-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Tractor className="w-4 h-4 text-amber-800" />
                          <span>โหมดชาวสวน (Farm Dashboard)</span>
                        </div>
                        {location.pathname.startsWith("/farm") && <Check className="w-3.5 h-3.5 text-amber-800 stroke-[3]" />}
                      </DropdownMenuItem>

                      <DropdownMenuSeparator className="my-1" />
                    </>
                  )}

                  {/* Logout Action */}
                  <DropdownMenuItem
                    onClick={() => setShowLogoutConfirm(true)}
                    className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold cursor-pointer text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>ออกจากระบบ</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 🚪 ปุ่มออกจากระบบข้างๆ แคปซูลโหมด */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowLogoutConfirm(true)} 
                title="ออกจากระบบ"
                className="rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200 h-8 w-8"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button 
              onClick={() => navigate("/auth/login")}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl px-5 shadow-sm transition-all active:scale-95 ml-2 text-xs sm:text-sm border border-amber-500/30"
            >
              Sign In
            </Button>
          )}
        </div>

        {/* 📱 Mobile & Tablet Hamburger Toggle */}
        <div className="flex lg:hidden items-center gap-2">
          {session ? (
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-xs ${
                isFarmRole && location.pathname.startsWith("/farm")
                  ? "bg-amber-400 text-slate-950 border-amber-500/40"
                  : "bg-amber-100 text-slate-950 border-amber-300"
              }`}
            >
              {isFarmRole && location.pathname.startsWith("/farm") ? (
                <>
                  <Tractor className="w-3.5 h-3.5 text-slate-950" />
                  <span>ชาวสวน</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-amber-700" />
                  <span>{isFarmRole ? "ผู้ซื้อ" : "โปรไฟล์"}</span>
                </>
              )}
            </button>
          ) : (
            <Button 
              size="sm"
              onClick={() => navigate("/auth/login")}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs px-3 h-8 shadow-sm border border-amber-500/30"
            >
              Sign In
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="rounded-xl text-slate-700 hover:bg-amber-50 h-9 w-9 p-0"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* 📱 Mobile & Tablet Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-amber-100 bg-white/98 backdrop-blur-xl px-4 py-4 space-y-2 animate-in slide-in-from-top-2 duration-200 shadow-xl">
          {/* Mobile Role Mode Switcher */}
          {session && isFarmRole && (
            <div className="p-1 mb-3 rounded-2xl bg-amber-100/90 border border-amber-300/80 flex items-center">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/dashboard");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs transition-all ${
                  !location.pathname.startsWith("/farm")
                    ? "bg-amber-400 text-slate-950 shadow-sm font-black border border-amber-500/30"
                    : "text-amber-900/80 font-bold hover:bg-amber-200/50"
                }`}
              >
                <User className="w-4 h-4" />
                <span>โหมดผู้ซื้อ (ทั่วไป)</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/farm/dashboard");
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs transition-all ${
                  location.pathname.startsWith("/farm")
                    ? "bg-amber-400 text-slate-950 shadow-sm font-black border border-amber-500/30"
                    : "text-amber-900/80 font-bold hover:bg-amber-200/50"
                }`}
              >
                <Tractor className="w-4 h-4" />
                <span>โหมดชาวสวน (ฟาร์ม)</span>
              </button>
            </div>
          )}
          {/* 1. AI Detection */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              if (location.pathname === "/") {
                document.getElementById("detection")?.scrollIntoView({ behavior: "smooth" });
              } else {
                navigate("/?scrollTo=detection");
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 hover:bg-amber-50 active:bg-amber-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <ScanLine className="w-4 h-4" />
            </div>
            <span>AI Detection (สแกนสายพันธุ์)</span>
          </button>

          {/* 2. Knowledge Hub */}
          <NavLink 
            to="/knowledge" 
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 hover:bg-amber-50 active:bg-amber-100 transition-colors"
            activeClassName="bg-amber-100 text-slate-950 font-black"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <span>Knowledge Hub (คลังความรู้)</span>
          </NavLink>

          {/* 3. Smart Marketplace */}
          <NavLink 
            to="/market" 
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-800 hover:bg-amber-50 active:bg-amber-100 transition-colors"
            activeClassName="bg-amber-100 text-slate-950 font-black"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <span>Smart Marketplace (ตลาดซื้อขาย)</span>
          </NavLink>

          {session && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowLogoutConfirm(true);
                }} 
                className="w-full text-slate-600 hover:text-destructive hover:bg-destructive/10 rounded-xl justify-center font-bold text-xs"
              >
                <LogOut className="w-4 h-4 mr-2" />
                ออกจากระบบ (Sign Out)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 🛑 Confirmation Dialog for Sign Out */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-md p-6 bg-card border shadow-2xl">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-2 mx-auto sm:mx-0">
              <LogOut className="w-6 h-6" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-foreground">
              ยืนยันการออกจากระบบ
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              คุณต้องการออกจากระบบ Banana Expert ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl font-medium">
              ยกเลิก
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              className="bg-destructive hover:bg-destructive/90 text-white rounded-xl font-bold"
            >
              ออกจากระบบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
};

export default Navbar;
