import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import { ArrowLeft, Loader2, ShoppingBag } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import ThaiAddressSelector from "@/components/address/ThaiAddressSelector";

/* ---------- Types ---------- */

interface FarmProfile {
  id: string;
  farm_name: string;
  farm_location: string;
  user_id?: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  product_type: "fruit" | "shoot";
  price_per_unit: number;
  available_quantity: number;
  unit: string;
  harvest_date: string;
  image_url: string | null;
  farm: FarmProfile | null;
}

/* ---------- Component ---------- */

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);

  const [openReserve, setOpenReserve] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");

  const [addressType, setAddressType] = useState<"saved" | "new">("saved");
  const [savedAddress, setSavedAddress] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");

  const [savedFullName, setSavedFullName] = useState<string | null>(null);
  const [savedPhone, setSavedPhone] = useState<string | null>(null);




  /* ---------- Load Product ---------- */

  useEffect(() => {
    if (!id) {
      navigate("/market");
      return;
    }

    window.scrollTo(0, 0);
    loadProduct(id);
  }, [id, navigate]);

  const loadProduct = async (productId: string) => {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        description,
        product_type,
        price_per_unit,
        available_quantity,
        unit,
        harvest_date,
        image_url,
        farm: farm_profiles (
          id,
          farm_name,
          farm_location,
          user_id
        )
      `)
      .eq("id", productId)
      .maybeSingle();

    if (error || !data) {
      toast.error("ไม่พบสินค้า");
      navigate("/market");
      return;
    }

    setProduct(data as Product);
    setLoading(false);
  };

  /* ---------- Load User Address ---------- */

  const loadUserAddress = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบ");
      return false;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone, address")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      toast.error("โหลดที่อยู่ไม่สำเร็จ");
      return false;
    }

    if (data?.address) {
      setSavedFullName(data.full_name || null);
      setSavedPhone(data.phone || null);
      setSavedAddress(data.address);
      setAddressType("saved");
    } else {
      setSavedAddress(null);
      setAddressType("new");
    }

    return true;
  };


  /* ---------- Reserve ---------- */

  const handleOpenReserve = async () => {
    const ok = await loadUserAddress();
    if (ok) setOpenReserve(true);
  };

  const handleReserve = async () => {
    if (!product) return;

    if (quantity > product.available_quantity) {
      toast.error("จำนวนเกินสต็อกที่มีอยู่");
      return;
    }

    if (quantity <= 0) {
      toast.error("จำนวนต้องมากกว่า 0");
      return;
    }

    if (addressType === "new") {
      if (!receiverName.trim()) {
        toast.error("กรุณากรอกชื่อผู้รับ");
        return;
      }

      if (!receiverPhone.trim()) {
        toast.error("กรุณากรอกเบอร์โทร");
        return;
      }

      if (!newAddress.trim()) {
        toast.error("กรุณากรอกที่อยู่ใหม่");
        return;
      }
    }

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบ");
      setSubmitting(false);
      return;
    }

    const useProfile = addressType === "saved";
    const finalReceiverName = useProfile ? (savedFullName || null) : receiverName.trim();
    const finalReceiverPhone = useProfile ? (savedPhone || null) : receiverPhone.trim();
    const deliveryAddress = useProfile ? (savedAddress || null) : newAddress.trim();

    const { error } = await supabase.rpc("reserve_v5", {
      p_product_id: product.id,
      p_quantity: quantity,
      p_note: note.trim() || null,
      p_use_profile: useProfile,
      p_receiver_name: finalReceiverName,
      p_receiver_phone: finalReceiverPhone,
      p_delivery_address: deliveryAddress,
    });


    if (error) {
      toast.error(
        error.message?.includes("สินค้าในสต็อกไม่เพียงพอ")
          ? "สินค้าในสต็อกไม่เพียงพอ"
          : "จองสินค้าไม่สำเร็จ");
    } else {
      toast.success("ส่งคำขอสั่งจองผลผลิตเรียบร้อยแล้ว");
      setOpenReserve(false);

      // 🔔 ส่งการแจ้งเตือน Real-time ไปยังเจ้าของฟาร์ม (User 2)
      if (product.farm?.user_id) {
        try {
          const clientName = finalReceiverName || "ลูกค้า";
          const subtotal = Number(product.price_per_unit) * Number(quantity);
          await supabase.from("notifications").insert({
            user_id: product.farm.user_id,
            title: "มีคำขอสั่งจองผลผลิตใหม่!",
            message: `คุณ ${clientName} ได้สั่งจอง "${product.name}" จำนวน ${quantity} ${product.unit} (ยอดรวม ฿${subtotal.toLocaleString()})`,
            type: "new_order",
            read: false,
            link: "/farm/orders",
          });
        } catch (notifErr) {
          console.error("Failed to send farmer notification:", notifErr);
        }
      }

      loadProduct(product.id);
    }

    setSubmitting(false);
  };


  /* ---------- UI ---------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!product) return null;

  const totalPrice = quantity * product.price_per_unit;

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <Navbar />
      <div className="container max-w-5xl mx-auto px-4 py-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> ย้อนกลับ
        </Button>

        <div className="grid md:grid-cols-2 gap-8 mt-6">
          <div className="aspect-square bg-muted rounded-xl flex items-center justify-center overflow-hidden">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <ShoppingBag className="w-20 h-20 text-slate-300" />
            )}
          </div>

          <div className="space-y-4">
            <Badge>{product.product_type === "fruit" ? "ผล" : "หน่อ"}</Badge>
            <h1 className="text-3xl font-bold">{product.name}</h1>

            <div className="text-4xl font-bold text-primary">
              ฿{product.price_per_unit} / {product.unit}
            </div>

            <Separator />

            <Card className="p-4 space-y-2 text-sm">
              <div>
                คงเหลือ: {product.available_quantity} {product.unit}
              </div>
              <div>
                รอบวันเก็บเกี่ยว:{" "}
                <span className="font-semibold text-slate-800">
                  {new Date(product.harvest_date).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </Card>

            {product.description && (
              <Card className="p-4">
                <h3 className="font-semibold mb-1">รายละเอียดสินค้า</h3>
                <p className="text-muted-foreground whitespace-pre-line">
                  {product.description}
                </p>
              </Card>
            )}

            {product.farm && (
              <Card
                className="p-4 cursor-pointer hover:bg-accent transition"
                onClick={() => navigate(`/farm/${product.farm?.id}`)}
              >
                <div className="font-semibold">
                  {product.farm.farm_name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {product.farm.farm_location}
                </div>
              </Card>
            )}

            <Button
              size="lg"
              className="w-full"
              disabled={
                product.available_quantity <= 0 ||
                quantity > product.available_quantity
              }
              onClick={handleOpenReserve}
            >
              จองสินค้า
            </Button>
          </div>
        </div>
      </div>

      {/* ---------- Reserve Modal ---------- */}

      <Dialog open={openReserve} onOpenChange={setOpenReserve}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ยืนยันการจองสินค้า</DialogTitle>
          </DialogHeader>

          <Card className="p-4 space-y-3">
            <div className="font-semibold">{product.name}</div>
            <div className="text-sm text-muted-foreground">
              ฟาร์ม: {product.farm?.farm_name}
            </div>

            <Separator />

            <div className="flex justify-between text-sm">
              <span>ราคาต่อหน่วย</span>
              <span>
                ฿{product.price_per_unit} / {product.unit}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Label>จำนวน</Label>
              <Input
                type="number"
                min={1}
                max={product.available_quantity}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-24"
              />
            </div>

            <Separator />

            <div className="flex justify-between font-semibold text-lg">
              <span>ราคารวม</span>
              <span>฿{totalPrice.toLocaleString()}</span>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <div className="font-semibold">ที่อยู่จัดส่ง</div>

            <RadioGroup
              value={addressType}
              onValueChange={(v) =>
                setAddressType(v as "saved" | "new")
              }
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="saved"
                  id="saved"
                  disabled={!savedAddress}
                />
                <Label htmlFor="saved">ใช้ที่อยู่ที่บันทึกไว้</Label>
              </div>

              {addressType === "saved" && savedAddress && (
                <Card className="p-3 text-sm bg-muted space-y-1">
                  <p>ชื่อผู้รับ : {savedFullName || "-"}</p>
                  <p>เบอร์โทร : {savedPhone || "-"}</p>
                  <p>ที่อยู่ : {savedAddress}</p>
                </Card>
              )}


              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new">ใช้ที่อยู่ใหม่</Label>
              </div>
            </RadioGroup>

            {addressType === "new" && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="ชื่อผู้รับ *"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                  />

                  <Input
                    placeholder="เบอร์โทร *"
                    value={receiverPhone}
                    onChange={(e) => setReceiverPhone(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">ระบุที่อยู่จัดส่ง</Label>
                  <ThaiAddressSelector
                    value={newAddress}
                    onChange={(fullAddress) => setNewAddress(fullAddress)}
                  />
                </div>
              </div>
            )}

          </Card>

          <Textarea
            placeholder="หมายเหตุถึงฟาร์ม (ถ้ามี)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <DialogFooter>
            <Button
              onClick={handleReserve}
              disabled={submitting}
              className="w-full"
            >
              ยืนยันการจอง ฿{totalPrice.toLocaleString()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductDetail;
