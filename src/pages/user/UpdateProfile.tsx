import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Loader2, User, Store, Mail, Info, CheckCircle2, ShieldCheck } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import ThaiAddressSelector from "@/components/address/ThaiAddressSelector";

/* ---------- Types ---------- */

interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
}

interface FarmProfile {
  id: string;
  farm_name: string;
  farm_location: string;
  farm_description: string | null;
  farm_image_url: string | null;
}

/* ---------- Component ---------- */

const UpdateProfile = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [farmProfile, setFarmProfile] = useState<FarmProfile | null>(null);
  const [isFarm, setIsFarm] = useState(false);

  const [currentEmail, setCurrentEmail] = useState("");
  const [emailForm, setEmailForm] = useState({ email: "" });
  const [emailUpdatedSuccess, setEmailUpdatedSuccess] = useState(false);

  const [profileForm, setProfileForm] = useState({
    full_name: "",
    phone: "",
    address: "",
  });

  const [farmForm, setFarmForm] = useState({
    farm_name: "",
    farm_location: "",
    farm_description: "",
  });

  /* ---------- Load Profiles ---------- */

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth/login", { replace: true });
        return;
      }
      
      const userMail = session.user.email || "";
      setCurrentEmail(userMail);

      /* ---------- USER PROFILE ---------- */

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: session.user.id,
            full_name: "",
          });

        if (insertError) throw insertError;

        const { data: newProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        setProfile(newProfile);
      } else {
        setProfile(profileData);
        setProfileForm({
          full_name: profileData.full_name || "",
          phone: profileData.phone || "",
          address: profileData.address || "",
        });
      }
      
      /* ---------- FARM PROFILE ---------- */

      const { data: farmData, error: farmError } = await supabase
        .from("farm_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (farmError) throw farmError;

      if (farmData) {
        setFarmProfile(farmData);
        setIsFarm(true);

        setFarmForm({
          farm_name: farmData.farm_name || "",
          farm_location: farmData.farm_location || "",
          farm_description: farmData.farm_description || "",
        });
      }
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load profile"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------- SAVE USER PROFILE ---------- */

  const saveProfile = async () => {
    if (!profile) return;

    if (!profileForm.full_name.trim()) {
      toast.error("กรุณากรอกชื่อ–นามสกุล");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileForm.full_name.trim(),
          phone: profileForm.phone.trim() || null,
          address: profileForm.address.trim() || null,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("บันทึกข้อมูลโปรไฟล์เรียบร้อย");
      navigate(-1);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- SAVE EMAIL ---------- */

  const saveEmail = async () => {
    const newMail = emailForm.email.trim();
    if (!newMail) {
      toast.error("กรุณากรอกอีเมลใหม่ที่ต้องการเปลี่ยน");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMail)) {
      toast.error("รูปแบบอีเมลไม่ถูกต้อง");
      return;
    }

    if (newMail.toLowerCase() === currentEmail.toLowerCase()) {
      toast.error("อีเมลใหม่ต้องไม่ซ้ำกับอีเมลปัจจุบัน");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        email: newMail,
      });

      if (error) throw error;

      setEmailUpdatedSuccess(true);
      toast.success("ส่งลิงก์ยืนยันไปยังอีเมลใหม่เรียบร้อยแล้ว");
    } catch (e: any) {
      toast.error(e.message || "ไม่สามารถแก้ไขอีเมลได้");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- SAVE FARM PROFILE ---------- */

  const saveFarmProfile = async () => {
    if (!farmProfile) return;

    if (!farmForm.farm_name.trim()) {
      toast.error("กรุณากรอกชื่อฟาร์ม");
      return;
    }

    if (!farmForm.farm_location.trim()) {
      toast.error("กรุณากรอกที่ตั้งฟาร์ม");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("farm_profiles")
        .update({
          farm_name: farmForm.farm_name.trim(),
          farm_location: farmForm.farm_location.trim(),
          farm_description: farmForm.farm_description.trim() || null,
        })
        .eq("id", farmProfile.id);

      if (error) throw error;

      toast.success("บันทึกข้อมูลฟาร์มเรียบร้อย");
      navigate(-1);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Loading ---------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ---------- UI ---------- */

  return (
    <div className="min-h-screen bg-gradient-hero pb-12">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* In-page Back Button */}
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(-1)} 
              className="rounded-xl hover:bg-slate-200/60 dark:hover:bg-slate-800/60"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">แก้ไขโปรไฟล์</h1>
              <p className="text-xs text-muted-foreground">จัดการข้อมูลส่วนตัว ฟาร์ม และบัญชีผู้ใช้</p>
            </div>
          </div>

          <Tabs defaultValue="profile">

            {/* ---------- TAB HEADER ---------- */}

            <TabsList
              className={`grid mb-6 rounded-2xl p-1 bg-muted/70 ${
                isFarm ? "grid-cols-3" : "grid-cols-2"
              }`}
            >
              <TabsTrigger value="profile" className="rounded-xl font-bold text-xs sm:text-sm">
                <User className="w-4 h-4 mr-2 text-orange-500" /> ข้อมูลส่วนตัว
              </TabsTrigger>

              {isFarm && (
                <TabsTrigger value="farm" className="rounded-xl font-bold text-xs sm:text-sm">
                  <Store className="w-4 h-4 mr-2 text-emerald-500" /> ข้อมูลฟาร์ม
                </TabsTrigger>
              )}

              <TabsTrigger value="email" className="rounded-xl font-bold text-xs sm:text-sm">
                <Mail className="w-4 h-4 mr-2 text-blue-500" /> แก้ไขอีเมล
              </TabsTrigger>
            </TabsList>

            {/* ---------- PROFILE TAB ---------- */}

            <TabsContent value="profile">
              <Card className="p-6 space-y-6 rounded-2xl border-border/80 shadow-sm bg-card/90 backdrop-blur-sm">
                <div>
                  <Label className="font-semibold text-sm">ชื่อ–นามสกุล <span className="text-destructive">*</span></Label>
                  <Input
                    className="mt-1.5 h-10 rounded-xl"
                    placeholder="เช่น สมชาย ใจดี"
                    value={profileForm.full_name}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        full_name: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label className="font-semibold text-sm">เบอร์โทรศัพท์</Label>
                  <Input
                    className="mt-1.5 h-10 rounded-xl"
                    placeholder="เช่น 081-234-5678"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label className="mb-2 block font-semibold text-sm">ที่อยู่จัดส่งสินค้า</Label>
                  <ThaiAddressSelector
                    value={profileForm.address}
                    onChange={(fullAddress) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        address: fullAddress,
                      }))
                    }
                  />
                </div>

                <Button
                  onClick={saveProfile}
                  disabled={saving}
                  className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black h-11 rounded-xl shadow-sm transition-all active:scale-98 border border-amber-500/30"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  บันทึกข้อมูลส่วนตัว
                </Button>
              </Card>
            </TabsContent>

            {/* ---------- FARM TAB ---------- */}

            {isFarm && (
              <TabsContent value="farm">
                <Card className="p-6 space-y-6 rounded-2xl border-border/80 shadow-sm bg-card/90 backdrop-blur-sm">
                  <div>
                    <Label className="font-semibold text-sm">ชื่อฟาร์ม <span className="text-destructive">*</span></Label>
                    <Input
                      className="mt-1.5 h-10 rounded-xl"
                      placeholder="เช่น สวนกล้วยทองคำเกษตรอินทรีย์"
                      value={farmForm.farm_name}
                      onChange={(e) =>
                        setFarmForm({
                          ...farmForm,
                          farm_name: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label className="mb-2 block font-semibold text-sm">ที่ตั้งฟาร์ม <span className="text-destructive">*</span></Label>
                    <ThaiAddressSelector
                      value={farmForm.farm_location}
                      onChange={(fullAddress) =>
                        setFarmForm((prev) => ({
                          ...prev,
                          farm_location: fullAddress,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label className="font-semibold text-sm">รายละเอียดฟาร์ม / เรื่องราว</Label>
                    <Textarea
                      rows={4}
                      className="mt-1.5 rounded-xl resize-none"
                      placeholder="เล่าจุดเด่นของสวน วิธีการปลูก หรือมาตรฐานผลผลิต..."
                      value={farmForm.farm_description}
                      onChange={(e) =>
                        setFarmForm({
                          ...farmForm,
                          farm_description: e.target.value,
                        })
                      }
                    />
                  </div>

                  <Button
                    onClick={saveFarmProfile}
                    disabled={saving}
                    className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-black h-11 rounded-xl shadow-sm transition-all active:scale-98 border border-amber-500/30"
                  >
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    บันทึกข้อมูลฟาร์ม
                  </Button>
                </Card>
              </TabsContent>
            )}

            {/* ---------- EMAIL TAB ---------- */}

            <TabsContent value="email">
              <Card className="p-6 space-y-6 rounded-2xl border-border/80 shadow-sm bg-card/90 backdrop-blur-sm">
                {/* 1. Current Active Email */}
                <div className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">อีเมลปัจจุบันของบัญชีนี้</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs px-2.5 py-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" /> ยืนยันแล้ว
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 pt-1 font-mono text-sm sm:text-base font-bold text-foreground">
                    <Mail className="w-4 h-4 text-primary shrink-0" />
                    <span className="break-all">{currentEmail || "ไม่ระบุ"}</span>
                  </div>
                </div>

                {/* 2. New Email Input Form */}
                <div className="space-y-2">
                  <Label className="font-semibold text-sm text-foreground">
                    อีเมลใหม่ที่ต้องการเปลี่ยน <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="ระบุอีเมลใหม่ เช่น yourname@example.com"
                      value={emailForm.email}
                      className="h-11 rounded-xl pl-10 text-sm"
                      onChange={(e) => {
                        setEmailForm({ email: e.target.value });
                        if (emailUpdatedSuccess) setEmailUpdatedSuccess(false);
                      }}
                    />
                    <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5" />
                  </div>
                </div>

                {/* Success Notice if sent */}
                {emailUpdatedSuccess && (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-3.5 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-200 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>ระบบส่งลิงก์ยืนยันไปยัง <strong>{emailForm.email}</strong> เรียบร้อยแล้ว กรุณาตรวจสอบอีเมลของคุณ</span>
                  </div>
                )}

                {/* 4. Action Button */}
                <Button
                  onClick={saveEmail}
                  disabled={saving || !emailForm.email.trim() || emailForm.email.trim() === currentEmail}
                  className="w-full bg-amber-400 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-black h-11 rounded-xl shadow-sm transition-all active:scale-98 border border-amber-500/30"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  ส่งคำขอยืนยันการเปลี่ยนอีเมล
                </Button>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default UpdateProfile;
 
 
