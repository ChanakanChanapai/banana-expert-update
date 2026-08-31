import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Loader2, X, Image as ImageIcon } from "lucide-react";
import { getProductImageUrl } from "@/lib/image-utils";

type ProductType = "fruit" | "shoot";

const EditProduct = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [farmId, setFarmId] = useState<string | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    product_type: "fruit" as ProductType,
    price_per_unit: "",
    available_quantity: "",
    unit: "kg",
    harvest_date: "",
    expiry_date: "",
    image_url: "",
    is_active: true,
  });

  /* ================= 1. LOAD DATA ================= */
  useEffect(() => {
    const loadProduct = async () => {
      if (!id) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return navigate("/auth/login");

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        toast.error("ไม่พบข้อมูลสินค้า");
        navigate(-1);
        return;
      }

      setFarmId(data.farm_id);
      setForm({
        name: data.name || "",
        description: data.description || "",
        product_type: (data.product_type as ProductType) || "fruit",
        price_per_unit: data.price_per_unit?.toString() || "",
        available_quantity: data.available_quantity?.toString() || "",
        unit: data.unit || "kg",
        harvest_date: data.harvest_date || "",
        expiry_date: data.expiry_date || "",
        image_url: data.image_url || "",
        is_active: data.is_active ?? true,
      });

      if (data.image_url) {
        const resolvedUrl = getProductImageUrl(data.image_url);
        if (resolvedUrl) {
          setPreviewUrls([resolvedUrl]);
        }
      }

      setLoading(false);
    };

    loadProduct();
  }, [id, navigate]);

  /* ================= 2. SUBMIT DATA ================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSubmitting(true);

    try {
      let finalImageUrl: string | null = form.image_url || null;

      // 1️⃣ upload ถ้ามีไฟล์ใหม่
      if (files.length > 0 && farmId) {
        const file = files[0];
        const fileExt = file.name.split('.').pop() || 'jpg';
        const imagePath = `${farmId}/${id}/${crypto.randomUUID()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(imagePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(imagePath);

        finalImageUrl = publicUrlData.publicUrl;
      }

      // 2️⃣ เรียก RPC หรือ Update สินค้า
      const { error } = await supabase.rpc("update_product_secure", {
        p_product_id: id,
        p_name: form.name,
        p_description: form.description || null,
        p_product_type: form.product_type as any, 
        p_price: Number(form.price_per_unit),
        p_quantity: Number(form.available_quantity),
        p_unit: form.unit,
        p_harvest_date: form.harvest_date,
        p_expiry_date: form.expiry_date || null,
        p_image_path: finalImageUrl,
      });

      if (error) {
        console.warn("RPC update warning, running direct table update fallback:", error);
      }

      // Direct fallback update to guarantee image_url and is_active are saved
      await supabase
        .from("products")
        .update({
          name: form.name,
          description: form.description || null,
          product_type: form.product_type,
          price_per_unit: Number(form.price_per_unit),
          available_quantity: Number(form.available_quantity),
          unit: form.unit,
          harvest_date: form.harvest_date,
          expiry_date: form.expiry_date || null,
          image_url: finalImageUrl,
          is_active: form.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      toast.success("แก้ไขข้อมูลสินค้าเรียบร้อยแล้ว");
      navigate("/farm/products", { replace: true });

    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ================= 3. RENDER UI ================= */
  return (
    <div className="container mx-auto max-w-xl py-10 px-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" /> ย้อนกลับ
      </Button>
      
      <Card className="p-6 space-y-6">
        <h1 className="text-xl font-bold">แก้ไขสินค้า</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>สถานะสินค้า</Label>
            <Select
              value={form.is_active ? "active" : "inactive"}
              onValueChange={(v) => setForm({ ...form, is_active: v === "active" })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="font-semibold text-emerald-700">Active (เปิดขาย/รับจอง)</span>
                  </div>
                </SelectItem>
                <SelectItem value="inactive">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                    <span className="font-semibold text-slate-600">Inactive (ปิดขายชั่วคราว)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>ชื่อสินค้า</Label>
            <Input
              value={form.name}
              onChange={(e) => {
                e.target.setCustomValidity("");
                setForm({ ...form, name: e.target.value });
              }}
              placeholder="ห้ามใส่ตัวเลขอย่างเดียว เช่น กล้วยนาก"
              required
              pattern="^(?!\d+$).+"
              onInvalid={(e) => {
                (e.target as HTMLInputElement).setCustomValidity("กรุณาระบุชื่อสินค้าให้ถูกต้อง เช่น กล้วยนาก");
              }}
            />
          </div>

          <div>
            <Label>รายละเอียด</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ประเภท</Label>
              <Select
                value={form.product_type}
                onValueChange={(v: ProductType) => setForm({ ...form, product_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fruit">ผล</SelectItem>
                  <SelectItem value="shoot">หน่อ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>หน่วย(หวี เครือ ต้น กิโล)</Label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>ราคา (บาท)</Label>
              <Input
                type="number"
                value={form.price_per_unit}
                onChange={(e) => {
                  e.target.setCustomValidity("");
                  setForm({ ...form, price_per_unit: e.target.value });
                }}
                onInvalid={(e) => {
                  (e.target as HTMLInputElement).setCustomValidity("กรุณาระบุราคาเป็นตัวเลขนะคะ");
                }}
                required
              />
            </div>
            <div>
              <Label>จำนวนที่มี</Label>
              <Input
                type="number"
                value={form.available_quantity}
                onChange={(e) => {
                  e.target.setCustomValidity("");
                  setForm({ ...form, available_quantity: e.target.value });
                }}
                onInvalid={(e) => {
                  (e.target as HTMLInputElement).setCustomValidity("กรุณาระบุจำนวนเป็นตัวเลขนะคะ");
                }}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>วันเก็บเกี่ยว</Label>
              <Input
                type="date"
                value={form.harvest_date}
                onChange={(e) => setForm({ ...form, harvest_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>วันที่จัดส่ง (ถ้ามี)</Label>
              <Input
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>รูปสินค้า</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (!e.target.files || e.target.files.length === 0) return;
                const selectedFile = e.target.files[0];
                setFiles([selectedFile]);
                setPreviewUrls([URL.createObjectURL(selectedFile)]);
              }}
            />

            <div className="flex gap-2 flex-wrap mt-2">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative group">
                  <img
                    src={url}
                    className="w-32 h-32 object-cover rounded-xl border border-amber-200 shadow-sm"
                    alt="Product preview"
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.style.display = "none";
                      const fb = el.nextElementSibling as HTMLElement;
                      if (fb) fb.style.display = "flex";
                    }}
                  />
                  <div className="w-32 h-32 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 hidden flex-col items-center justify-center text-center p-2">
                    <ImageIcon className="w-8 h-8 text-amber-500 mb-1" />
                    <span className="text-[11px] text-amber-800 font-medium">ยังไม่มีรูปภาพ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFiles([]);
                      setPreviewUrls([]);
                      setForm({ ...form, image_url: "" });
                    }}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                    title="ลบรูปภาพ"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Button disabled={submitting} type="submit" className="w-full">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              "บันทึกการแก้ไข"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default EditProduct;