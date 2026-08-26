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
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        navigate("/dashboard", { replace: true });
      }
    };

    checkSession();
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
            toast.error("อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาเช็คใหม่อีกครั้งน้าบ");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("อีเมลนี้ยังไม่ได้ยืนยัน! อย่าลืมเช็คในเมลหรือปิด Confirm Email ใน Supabase นะ");
          } else {
            toast.error(error.message); // กรณี Error อื่นๆ เช่น Network หรือ Server
          }
          setLoading(false);
          return;
        }

        toast.success("Welcome back!");
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
            toast.error("อีเมลนี้ถูกใช้ไปแล้วพี่ชาย ลองเปลี่ยนเมลหรือกด Login ดูนะ");
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }

        toast.success("Account created! Please sign in.");
        setIsLogin(true);
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- FORGOT PASSWORD ---------------- */

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error("Please enter your email first");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      formData.email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (error) toast.error(error.message);
    else toast.success("Password reset email sent!");
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">
          {isLogin ? "Sign In" : "Create Account"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <Label>Full Name</Label>
              <Input
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({ ...formData, fullName: e.target.value })
                }
              />
            </div>
          )}

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
            />
          </div>

          <Button className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
          </Button>

          {isLogin && (
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-primary hover:underline"
              >
                ลืมรหัสผ่าน?
              </button>
            </div>
          )}
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;
