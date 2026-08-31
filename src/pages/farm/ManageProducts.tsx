import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Plus,
  Loader2,
  Edit,
  Trash2,
} from "lucide-react";

const PRODUCT_TYPE_DISPLAY = {
  fruit: "ผล",
  shoot: "หน่อ",
};

interface Product {
  id: string;
  name: string;
  product_type: "fruit" | "shoot"; 
  price_per_unit: number;
  available_quantity: number;
  unit: string;
  harvest_date: string;
  is_active: boolean;
}

const ManageProducts = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [farmId, setFarmId] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // ✨ แก้จุดที่ 1: ใช้ replace เพื่อไม่ให้ประวัติการ Login มาขวางทาง Back
      if (!session) return navigate("/auth/login", { replace: true });

      const { data: farm, error: farmError } = await supabase
        .from("farm_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (farmError || !farm) {
        toast.error("Farm profile not found");
        // ✨ แก้จุดที่ 2: ใช้ replace เพื่อให้ย้อนกลับจากหน้า Dashboard ไปหน้าก่อนหน้า Manage ได้เลย
        return navigate("/dashboard", { replace: true });
      }

      setFarmId(farm.id);
      await fetchProducts(farm.id);
    } catch (e: any) {
      toast.error(e.message || "Failed to initialize");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (farmId: string) => {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        product_type,
        price_per_unit,
        available_quantity,
        unit,
        harvest_date,
        is_active
      `)
      .eq("farm_id", farmId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    setProducts(data || []);
  };

  const handleToggleActive = async (productId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, is_active: newStatus } : p))
    );

    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq("id", productId);

      if (error) {
        // Rollback on error
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, is_active: currentStatus } : p))
        );
        toast.error("ไม่สามารถเปลี่ยนสถานะสินค้าได้");
      } else {
        toast.success(
          newStatus ? "เปิดรับจองสินค้าแล้ว (Active)" : "ปิดรับจองสินค้าชั่วคราวแล้ว (Inactive)"
        );
      }
    } catch {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_active: currentStatus } : p))
      );
      toast.error("เกิดข้อผิดพลาดในการเปลี่ยนสถานะ");
    }
  };

  const handleDelete = async (productId: string) => {
  if (!confirm("ยืนยันการลบสินค้าหรือไม่?")) return;

  try {
    setLoading(true);

    // 1. ดึง image path ไว้ก่อน
    const { data: images } = await supabase
      .from("product_images")
      .select("image_path")
      .eq("product_id", productId);

    // 2. ลบใน DB ผ่าน RPC
    const { error } = await supabase.rpc(
      "delete_product_owned",
      { p_product_id: productId }
    );

    if (error) throw error;

    // 3. ลบ storage หลัง DB สำเร็จ
    if (images && images.length > 0) {
      const pathsToDelete = images.map(i => i.image_path);

      await supabase.storage
        .from("product-images")
        .remove(pathsToDelete);
    }

    setProducts(prev => prev.filter(p => p.id !== productId));

    toast.success("ลบสินค้าเรียบร้อย");

  } catch (e: any) {
    toast.error(e.message || "ลบสินค้าไม่สำเร็จ");
  } finally {
    setLoading(false);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <nav className="border-b bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {/* ปุ่ม Back ที่น้องต้องการ ย้อนกลับไปหน้าก่อนหน้าจริงๆ (-1) */}
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}> 
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">จัดการสินค้า</h1>
          </div>
          <Button onClick={() => navigate("/farm/products/add")}>
            <Plus className="w-4 h-4 mr-2" /> เพิ่มสินค้าใหม่
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 overflow-x-auto">
          {products.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">ยังไม่มีสินค้าในฟาร์มของคุณ</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">ชื่อสินค้า</TableHead>
                  <TableHead className="w-[100px] text-center">ประเภท</TableHead>
                  <TableHead className="w-[150px] text-center">ราคา</TableHead>
                  <TableHead className="w-[100px] text-center">จำนวน</TableHead>
                  <TableHead className="w-[150px] text-center">วันเก็บเกี่ยว</TableHead>
                  <TableHead className="w-[120px] text-center">สถานะ</TableHead>
                  <TableHead className="w-[150px] text-right">จัดการ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium whitespace-nowrap truncate max-w-[200px]">
                      {p.name}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="mx-auto" variant="secondary">
                        {PRODUCT_TYPE_DISPLAY[p.product_type] || p.product_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      ฿{p.price_per_unit}/{p.unit}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.available_quantity}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {new Date(p.harvest_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={p.is_active}
                          onCheckedChange={() => handleToggleActive(p.id, p.is_active)}
                          className="data-[state=checked]:bg-emerald-600 cursor-pointer"
                          aria-label="สลับสถานะเปิด-ปิดรับจอง"
                        />
                        <span
                          className={`text-xs select-none min-w-[50px] font-semibold ${
                            p.is_active
                              ? "text-emerald-700 font-bold"
                              : "text-slate-400"
                          }`}
                        >
                          {p.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => navigate(`/farm/products/edit/${p.id}`)} title="แก้ไขข้อมูลสินค้า">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)} title="ลบสินค้า">
                          <Trash2 className="text-destructive w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ManageProducts;