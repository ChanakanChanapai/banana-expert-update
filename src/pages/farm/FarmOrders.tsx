import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Eye,
  Check,
  X,
  Truck,
  Printer,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ShippingLabelModal,
  ShippingLabelData,
} from "@/components/shipping/ShippingLabelModal";

/* ---------- Types ---------- */

type OrderStatus =
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "expired"
  | "reviewed";

interface Reservation {
  id: string;
  quantity: number;
  created_at: string;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  delivery_address?: string | null;
  products: { name: string; farm_id: string } | null;
  profiles: { full_name: string; phone?: string | null; address?: string | null } | null;
}

interface Order {
  id: string;
  status: OrderStatus;
  order_number: string;
  quantity: number;
  total_price?: number;
  tracking_number: string | null;
  carrier?: string | null;
  delivery_address?: string | null;
  receiver_name?: string | null;
  receiver_phone?: string | null;
  delivery_notes?: string | null;
  created_at: string;
  shipping_date?: string | null;
  products: { name: string; farm_id: string } | null;
  profiles: { full_name: string; phone?: string | null; address?: string | null } | null;
}

interface FarmProfileInfo {
  id: string;
  farm_name: string;
  farm_location: string;
  phone: string;
}

/* ---------- Component ---------- */

const FarmOrders = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<
    "pending" | "confirmed" | "shipping" | "done" | "expired"
  >("pending");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [farmInfo, setFarmInfo] = useState<FarmProfileInfo | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<ShippingLabelData | null>(null);
  const [shippingId, setShippingId] = useState<string | null>(null);
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [search, setSearch] = useState("");
  const today = new Date().toISOString().split("T")[0];
  const [cancelReason, setCancelReason] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);

  const todayShipping = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === "confirmed" &&
          (o as any).shipping_date === today
      ),
    [orders, today]
  );

  const otherConfirmed = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === "confirmed" &&
          (o as any).shipping_date !== today
      ),
    [orders, today]
  );

  useEffect(() => {
    loadData();
  }, []);

  /* ---------- Load ---------- */

  const loadData = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth/login");
        return;
      }

      // 1. ดึงข้อมูลฟาร์มของ User ปัจจุบันพร้อมเบอร์ติดต่อ
      const { data: farmProfile } = await supabase
        .from("farm_profiles")
        .select(`
          id,
          farm_name,
          farm_location,
          profiles:user_id ( phone )
        `)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!farmProfile) {
        setReservations([]);
        setOrders([]);
        return;
      }

      setFarmInfo({
        id: farmProfile.id,
        farm_name: farmProfile.farm_name || "ฟาร์มกล้วยคุณภาพ",
        farm_location: farmProfile.farm_location || "",
        phone: (farmProfile.profiles as any)?.phone || "",
      });

      // 2. ดึงข้อมูลและกรองเฉพาะ farm_id ของเรา
      const [{ data: r }, { data: o }] = await Promise.all([
        supabase
          .from("reservations")
          .select(`
            id,
            quantity,
            created_at,
            receiver_name,
            receiver_phone,
            delivery_address,
            products!inner ( name, farm_id ),
            profiles:user_id ( full_name, phone, address )
          `)
          .eq("products.farm_id", farmProfile.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),

        supabase
          .from("orders")
          .select(`
            id,
            order_number,
            status,
            quantity,
            total_price,
            tracking_number,
            carrier,
            delivery_address,
            receiver_name,
            receiver_phone,
            delivery_notes,
            created_at,
            shipping_date,
            products!inner ( name, farm_id ),
            profiles:user_id ( full_name, phone, address )
          `)
          .eq("products.farm_id", farmProfile.id)
          .order("created_at", { ascending: false }),
      ]);

      setReservations((r as any) || []);
      setOrders((o as any) || []);
    } catch (err: any) {
      console.error(err);
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Actions ---------- */

  const confirmReservation = async (r: Reservation) => {
  const { error } = await supabase.rpc("confirm_reservation", {
    p_reservation_id: r.id,
  });

  if (error) {
    toast.error(error.message);
    return;
  }

  toast.success("ยืนยันออเดอร์เรียบร้อย");
loadData(); // ✅ ใช้อันนี้
  }


  const cancelReservation = async (
  id: string,
  reason: string
) => {
  const { error } = await supabase.rpc("cancel_reservation", {
    p_reservation_id: id,
    p_reason: reason || "ไม่ระบุเหตุผล"
  });

  if (error) {
    toast.error(error.message);
    return;
  }

  toast.success("ยกเลิกการจองเรียบร้อย");
  loadData();
};

  const updateOrder = async (
    id: string,
    status: OrderStatus,
    extra?: any
  ) => {
    const { error } = await supabase
      .from("orders")
      .update({ status, ...extra })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    loadData();
  };

  /* ---------- Buckets ---------- */

  const confirmed = useMemo(
    () => orders.filter((o) => o.status === "confirmed"),
    [orders]
  );

  const shipping = useMemo(
    () => orders.filter((o) => o.status === "shipped"),
    [orders]
  );

  const done = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === "delivered" ||
          o.status === "reviewed"
      ),
    [orders]
  );

  const expired = useMemo(
  () => orders.filter((o) => o.status === "expired"),
  [orders]
);


  const filterData = (data: any[]) => {
  if (!search.trim()) return data;

  const keyword = search.toLowerCase();

  return data.filter((item) =>
    item.products?.name?.toLowerCase().includes(keyword) ||
    item.profiles?.full_name?.toLowerCase().includes(keyword) ||
    item.order_number?.toLowerCase().includes(keyword)

  );
};


  /* ---------- UI ---------- */

  const openLabelModal = (item: any) => {
    const labelData: ShippingLabelData = {
      order_number: item.order_number || item.id.slice(0, 8),
      created_at: item.created_at,
      shipping_date: item.shipping_date || item.expiry_date,
      product_name: item.products?.name || "กล้วยสดจากฟาร์ม",
      quantity: item.quantity || 1,
      total_price: item.total_price,
      tracking_number: item.tracking_number || null,
      carrier: item.carrier || null,
      delivery_notes: item.delivery_notes || item.note || null,
      receiver_name:
        item.receiver_name || item.profiles?.full_name || "ลูกค้าผู้รับ",
      receiver_phone: item.receiver_phone || item.profiles?.phone || "-",
      delivery_address:
        item.delivery_address ||
        item.profiles?.address ||
        "ไม่ได้ระบุที่อยู่จัดส่ง",
      farm_name: farmInfo?.farm_name || "ฟาร์มกล้วยคุณภาพ",
      farm_phone: farmInfo?.phone || "-",
      farm_location: farmInfo?.farm_location || "",
    };
    setSelectedLabel(labelData);
  };

  /* ---------- UI ---------- */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      {/* ---------- Header ---------- */}
      <nav className="border-b bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/farm/dashboard")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">การจองและคำสั่งซื้อ</h1>
        </div>
      </nav>

      {/* ---------- Tabs ---------- */}
      <div className="container mx-auto px-4 max-w-6xl space-y-6 py-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="pending">รอดำเนินการ</TabsTrigger>
            <TabsTrigger value="confirmed">ยืนยันแล้ว</TabsTrigger>
            <TabsTrigger value="shipping">กำลังจัดส่ง</TabsTrigger>
            <TabsTrigger value="done">เสร็จสิ้น</TabsTrigger>
            <TabsTrigger value="expired">หมดอายุ</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="mt-4">
          <Input
            placeholder="ค้นหาลูกค้า หรือ ชื่อสินค้า หรือเลขออเดอร์..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {tab === "pending" && (
          <OrderTable
            data={filterData(reservations)}
            onPrintLabel={openLabelModal}
            actions={(r) => (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  title="ยืนยันออเดอร์"
                  onClick={() => confirmReservation(r)}
                >
                  <Check className="w-4 h-4 text-green-600" />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="ยกเลิกการจอง"
                      onClick={() => setCancelId(r.id)}
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>ยกเลิกการจอง?</AlertDialogTitle>
                      <AlertDialogDescription>
                        ยกเลิกการจองนี้ใช่ไหม
                      </AlertDialogDescription>
                      <Input
                        placeholder="เหตุผลในการยกเลิก"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          if (!cancelId) return;
                          cancelReservation(cancelId, cancelReason);
                          setCancelId(null);
                          setCancelReason("");
                        }}
                      >
                        ยืนยัน
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          />
        )}

        {tab === "confirmed" && (
          <div className="space-y-8">
            {/* ---------- ส่งวันนี้ ---------- */}
            <div>
              <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <span>🚚 ต้องจัดส่งวันนี้</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  {todayShipping.length} รายการ
                </span>
              </h2>

              <OrderTable
                data={filterData(todayShipping)}
                onPrintLabel={openLabelModal}
                actions={(o) => (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => setShippingId(o.id)}
                  >
                    <Truck className="w-4 h-4 mr-1" />
                    จัดส่งสินค้า
                  </Button>
                )}
              />
            </div>

            {/* ---------- ออเดอร์อื่น ---------- */}
            <div>
              <h2 className="font-semibold text-lg mb-2">📦 ออเดอร์ที่รอจัดส่ง</h2>

              <OrderTable
                data={filterData(otherConfirmed)}
                onPrintLabel={openLabelModal}
                actions={(o) => (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShippingId(o.id)}
                  >
                    <Truck className="w-4 h-4 mr-1" />
                    จัดส่งสินค้า
                  </Button>
                )}
              />
            </div>
          </div>
        )}

        {tab === "shipping" && (
          <OrderTable
            data={filterData(shipping)}
            onPrintLabel={openLabelModal}
          />
        )}

        {tab === "done" && (
          <div className="space-y-8">
            <OrderTable
              data={filterData(done)}
              onPrintLabel={openLabelModal}
            />
          </div>
        )}

        {tab === "expired" && (
          <OrderTable
            data={filterData(expired)}
            onPrintLabel={openLabelModal}
          />
        )}
      </div>

      {/* ---------- Ship Modal ---------- */}
      {shippingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="p-6 space-y-4 w-full max-w-md shadow-2xl dropdown-panel rounded-2xl border bg-card">
            <h3 className="font-bold text-lg text-foreground">
              ข้อมูลการจัดส่งสินค้า
            </h3>

            {/* ชื่อขนส่ง */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">บริษัทขนส่ง</label>
              <Input
                placeholder="ชื่อขนส่ง (เช่น Kerry, Flash, ไปรษณีย์ไทย, J&T)"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="rounded-xl"
              />
            </div>

            {/* Tracking */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">หมายเลขติดตามพัสดุ (Tracking No.)</label>
              <Input
                placeholder="กรอกเลขพัสดุ"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => setShippingId(null)}
              >
                ยกเลิก
              </Button>
              <Button
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                disabled={!carrier.trim() || !tracking.trim()}
                onClick={() => {
                  updateOrder(shippingId, "shipped", {
                    carrier: carrier.trim(),
                    tracking_number: tracking.trim(),
                    shipped_at: new Date().toISOString(),
                  });

                  setShippingId(null);
                  setCarrier("");
                  setTracking("");
                }}
              >
                ยืนยันการจัดส่ง
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ---------- Shipping Label Modal ---------- */}
      <ShippingLabelModal
        open={Boolean(selectedLabel)}
        onOpenChange={(open) => {
          if (!open) setSelectedLabel(null);
        }}
        data={selectedLabel}
      />
    </div>
  );
};

/* ---------- Table ---------- */

const OrderTable = ({
  data,
  actions,
  onPrintLabel,
}: {
  data: any[];
  actions?: (o: any) => React.ReactNode;
  onPrintLabel?: (o: any) => void;
}) => {
  const navigate = useNavigate();

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground bg-card rounded-xl border border-dashed">
        ไม่มีรายการคำสั่งซื้อในหมวดนี้
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead>หมายเลขรายการ</TableHead>
            <TableHead>ลูกค้า</TableHead>
            <TableHead>สินค้า</TableHead>
            <TableHead>จำนวน</TableHead>
            <TableHead>วันที่จอง</TableHead>
            <TableHead className="text-right">การดำเนินการ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((o) => (
            <TableRow key={o.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-mono font-medium">
                {o.order_number ?? o.id.slice(0, 8)}
              </TableCell>
              <TableCell>
                <div className="font-medium">
                  {o.receiver_name || o.profiles?.full_name || "ลูกค้า"}
                </div>
                {(o.receiver_phone || o.profiles?.phone) && (
                  <div className="text-xs text-muted-foreground">
                    {o.receiver_phone || o.profiles?.phone}
                  </div>
                )}
              </TableCell>
              <TableCell>{o.products?.name || "-"}</TableCell>
              <TableCell className="font-semibold">{o.quantity}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {new Date(o.created_at).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>

              <TableCell className="text-right space-x-1 whitespace-nowrap">
                {o.status === "expired" && (
                  <span className="px-2 py-1 text-xs rounded bg-muted text-muted-foreground mr-2">
                    ⏱ หมดอายุ
                  </span>
                )}

                {/* ปุ่มพิมพ์ใบปะหน้าพัสดุ */}
                {onPrintLabel && (
                  <Button
                    size="sm"
                    variant="outline"
                    title="ดู / พิมพ์ใบปะหน้าพัสดุ"
                    className="border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 h-8 gap-1 px-2.5"
                    onClick={() => onPrintLabel(o)}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-xs">ใบปะหน้า</span>
                  </Button>
                )}

                {/* ปุ่มดูรายละเอียด */}
                <Button
                  size="icon"
                  variant="ghost"
                  title="ดูรายละเอียด"
                  className="h-8 w-8"
                  onClick={() => navigate(`/farm/orders/${o.id}`)}
                >
                  <Eye className="w-4 h-4" />
                </Button>

                {actions && actions(o)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default FarmOrders;
