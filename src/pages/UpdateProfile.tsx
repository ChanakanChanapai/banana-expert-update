import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Loader2, User, Store } from "lucide-react";
 
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
 
  const [emailForm, setEmailForm] = useState({ email: "" });
 
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
      setEmailForm({
        email: session.user.email || "",
      });
 
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
      toast.error("Name is required");
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
 
      toast.success("Profile updated");
      navigate(-1);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };
 
  /* ---------- SAVE EMAIL ---------- */
 
  const saveEmail = async () => {
    if (!emailForm.email.trim()) {
      toast.error("กรุณากรอกอีเมล");
      return;
    }
 
    setSaving(true);
 
    try {
      const { error } = await supabase.auth.updateUser({
        email: emailForm.email.trim(),
      });
 
      if (error) throw error;
 
      toast.success("กรุณาตรวจสอบอีเมลเพื่อยืนยัน");
    } catch (e: any) {
      toast.error(e.message || "แก้ไขอีเมลไม่ได้");
    } finally {
      setSaving(false);
    }
  };
 
  /* ---------- SAVE FARM PROFILE ---------- */
 
  const saveFarmProfile = async () => {
    if (!farmProfile) return;
 
    if (!farmForm.farm_name.trim()) {
      toast.error("Farm name is required");
      return;
    }
 
    if (!farmForm.farm_location.trim()) {
      toast.error("Farm location is required");
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
 
      toast.success("Farm profile updated");
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
    <div className="min-h-screen bg-gradient-hero">
      <nav className="border-b bg-background/80 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">แก้ไขโปรไฟล์</h1>
        </div>
      </nav>
 
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
 
          <Tabs defaultValue="profile">
 
            {/* ---------- TAB HEADER ---------- */}
 
            <TabsList
              className={`grid mb-6 ${
                isFarm ? "grid-cols-3" : "grid-cols-2"
              }`}
            >
              <TabsTrigger value="profile">
                <User className="w-4 h-4 mr-2" /> ข้อมูลส่วนตัว
              </TabsTrigger>
 
              {isFarm && (
                <TabsTrigger value="farm">
                  <Store className="w-4 h-4 mr-2" /> ข้อมูลฟาร์ม
                </TabsTrigger>
              )}
 
              <TabsTrigger value="email">📧 แก้ไขอีเมล</TabsTrigger>
            </TabsList>
 
            {/* ---------- PROFILE TAB ---------- */}
 
            <TabsContent value="profile">
              <Card className="p-6 space-y-6">
                <div>
                  <Label>ชื่อ–นามสกุล *</Label>
                  <Input
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
                  <Label>เบอร์โทร</Label>
                  <Input
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
                  <Label>ที่อยู่</Label>
                  <Textarea
                    rows={4}
                    value={profileForm.address}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        address: e.target.value,
                      })
                    }
                  />
                </div>
 
                <Button
                  onClick={saveProfile}
                  disabled={saving}
                  className="w-full"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  บันทึกข้อมูลส่วนตัว
                </Button>
              </Card>
            </TabsContent>
 
            {/* ---------- FARM TAB ---------- */}
 
            {isFarm && (
              <TabsContent value="farm">
                <Card className="p-6 space-y-6">
                  <div>
                    <Label>ชื่อฟาร์ม *</Label>
                    <Input
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
                    <Label>ที่อยู่ *</Label>
                    <Input
                      value={farmForm.farm_location}
                      onChange={(e) =>
                        setFarmForm({
                          ...farmForm,
                          farm_location: e.target.value,
                        })
                      }
                    />
                  </div>
 
                  <div>
                    <Label>รายละเอียดฟาร์ม</Label>
                    <Textarea
                      rows={4}
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
                    className="w-full"
                  >
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    บันทึกข้อมูลฟาร์ม
                  </Button>
                </Card>
              </TabsContent>
            )}
 
            {/* ---------- EMAIL TAB ---------- */}
 
            <TabsContent value="email">
              <Card className="p-6 space-y-6">
                <div>
                  <Label>อีเมล</Label>
                  <Input
                    type="email"
                    value={emailForm.email}
                    onChange={(e) =>
                      setEmailForm({ email: e.target.value })
                    }
                  />
                </div>
 
                <Button
                  onClick={saveEmail}
                  disabled={saving}
                  className="w-full"
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  บันทึกอีเมล
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
 
 
