import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

/* ---------------- SCHEMA ---------------- */
const resetSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Validate รหัสผ่านว่าตรงกันไหม และยาวพอไหม
    const validation = resetSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      setLoading(false);
      return;
    }

    try {
      // 2. สั่ง Update รหัสใหม่ใน Supabase
      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) throw error;

      toast.success("เปลี่ยนรหัสผ่านสำเร็จ! เข้าสู่ระบบด้วยรหัสใหม่ได้เลย");
      
      // 3. พาเขากลับไปหน้า Login
      setTimeout(() => navigate("/auth/login"), 2000);

    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <Card className="w-full max-w-md p-8 shadow-xl rounded-3xl border-none bg-white/95">
        <h1 className="text-2xl font-black text-center mb-2 text-slate-800">ตั้งรหัสผ่านใหม่</h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          กรุณากำหนดรหัสผ่านใหม่สำหรับเข้าใช้งานบัญชีของคุณ
        </p>

        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="font-semibold text-slate-700">รหัสผ่านใหม่</Label>
            <Input
              id="password"
              type="password"
              placeholder="กรอกรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required
              className="rounded-xl h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="font-semibold text-slate-700">ยืนยันรหัสผ่านใหม่อีกครั้ง</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="พิมพ์รหัสผ่านใหม่อีกครั้งให้ตรงกัน"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              required
              className="rounded-xl h-11"
            />
          </div>

          <Button 
            className="w-full h-12 rounded-xl text-base font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md" 
            disabled={loading}
          >
            {loading ? "กำลังบันทึกข้อมูล..." : "บันทึกรหัสผ่านใหม่"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
