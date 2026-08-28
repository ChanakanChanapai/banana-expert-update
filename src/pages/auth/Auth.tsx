import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useEffect } from "react";

/* ---------------- SCHEMA ---------------- */

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
});

/* ---------------- COMPONENT ---------------- */

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate("/dashboard", { replace: true });
      }
    });
  }, [navigate]);

  /* ---------------- SUBMIT (จุดที่แก้ไข) ---------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // 1. ตรวจสอบรูปแบบ Email/Password ก่อนส่ง
        const validation = loginSchema.safeParse({
          email: formData.email,
          password: formData.password,
        });

        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        // 2. พยายาม Login
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        // 3. ดักจับ Error เพื่อแจ้งเตือนให้ตรงจุด
        if (error) {
          console.error("Auth Error:", error);
          
          if (error.message.includes("Invalid login credentials")) {
            toast.error("อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบใหม่อีกครั้ง");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("อีเมลนี้ยังไม่ได้รับการยืนยัน กรุณาตรวจสอบกล่องข้อความในอีเมลของคุณ");
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }

        toast.success("เข้าสู่ระบบเรียบร้อยแล้ว");
        navigate("/dashboard", { replace: true });

      } else {
        // ส่วนของ Sign Up
        const validation = signupSchema.safeParse(formData);

        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
            },
          },
        });

        if (error) {
          if (error.message.includes("User already registered")) {
            toast.error("อีเมลนี้ถูกลงทะเบียนไว้แล้ว สามารถกดเข้าสู่ระบบได้ทันที");
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }

        toast.success("สมัครสมาชิกสำเร็จเรียบร้อยแล้ว! กรุณาเข้าสู่ระบบ");
        setIsLogin(true);
      }
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- FORGOT PASSWORD ---------------- */

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error("กรุณากรอกที่อยู่อีเมลก่อน");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      formData.email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (error) toast.error(error.message);
    else toast.success("ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณเรียบร้อยแล้ว");
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md p-8 shadow-xl rounded-3xl border-none bg-white/95">
        <h1 className="text-2xl font-black text-center mb-6 text-slate-800">
          {isLogin ? "เข้าสู่ระบบ Banana Expert" : "สมัครสมาชิกใหม่"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <Label className="text-slate-700 font-semibold mb-1 block">ชื่อ - นามสกุล</Label>
              <Input
                placeholder="ระบุชื่อและนามสกุลของคุณ"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
                className="rounded-xl h-11"
              />
            </div>
          )}

          <div>
            <Label className="text-slate-700 font-semibold mb-1 block">ที่อยู่อีเมล</Label>
            <Input
              type="email"
              placeholder="example@email.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              className="rounded-xl h-11"
            />
          </div>

          <div>
            <Label className="text-slate-700 font-semibold mb-1 block">รหัสผ่าน</Label>
            <Input
              type="password"
              placeholder="กรอกรหัสผ่านของคุณ"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              className="rounded-xl h-11"
            />
          </div>

          <Button className="w-full h-12 rounded-xl text-base font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md" disabled={loading}>
            {loading ? "กำลังดำเนินการ..." : isLogin ? "เข้าสู่ระบบ" : "ยืนยันการสมัครสมาชิก"}
          </Button>

          {isLogin && (
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm font-medium text-amber-700 hover:underline"
              >
                ลืมรหัสผ่านใช่หรือไม่?
              </button>
            </div>
          )}
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-medium text-slate-600 hover:text-amber-800 hover:underline"
          >
            {isLogin
              ? "ยังไม่มีบัญชีผู้ใช้งาน? กดเพื่อสมัครสมาชิก"
              : "มีบัญชีผู้ใช้งานอยู่แล้ว? กดเพื่อเข้าสู่ระบบ"}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
