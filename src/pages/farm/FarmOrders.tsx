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
  products: { name: string; farm_id: string } | null;
  profiles: { full_name: string } | null;
}

interface Order {
  id: string;
  status: OrderStatus;
  order_number: string;
  quantity: number;
  tracking_number: string | null;
  created_at: string;
  products: { name: string; farm_id: string } | null;
  profiles: { full_name: string } | null;
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
  [orders]
);

const otherConfirmed = useMemo(
  () =>
    orders.filter(
      (o) =>
        o.status === "confirmed" &&
        (o as any).shipping_date !== today
    ),
  [orders]
);

  useEffect(() => {
    loadData();
  }, []);

  /* ---------- Load ---------- */

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth/login");
        return;
      }

      // 1. ดึงข้อมูลฟาร์มของ User ปัจจุบันก่อน
      const { data: farmProfile } = await supabase
        .from("farm_profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!farmProfile) {
        // ถ้าไม่มีฟาร์ม ให้เซ็ตค่าว่างแล้วจบการทำงาน
        setReservations([]);
        setOrders([]);
        return;
      }

      // 2. ดึงข้อมูลและกรองเฉพาะ farm_id ของเรา (ใช้ !inner เพื่อกรองความสัมพันธ์)
      const [{ data: r }, { data: o }] = await Promise.all([
        supabase
          .from("reservations")
          .select(`
            id,
            quantity,
            created_at,
            products!inner ( name, farm_id ),
            profiles:user_id ( full_name )
          `)
          .eq("products.farm_id", farmProfile.id)
          .eq("status", "pending")
          .order("created_at"),

        supabase
          .from("orders")
          .select(`
            id,
            order_number,
            status,
            quantity,
            tracking_number,
            created_at,
            shipping_date,
            products!inner ( name, farm_id ),
            profiles:user_id ( full_name )
          `)
          .eq("products.farm_id", farmProfile.id)
          .order("created_at"),
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
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
          <h1 className="text-2xl font-bold">การจองจากลูกค้า</h1>
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
        placeholder="ค้นหาลูกค้า หรือ ชื่อสินค้า..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      </div>


        {tab === "pending" && (
  <OrderTable
    data={filterData(reservations)}
    actions={(r) => (
      <>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => confirmReservation(r)}
        >
          <Check className="w-4 h-4 text-green-600" />
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCancelId(r.id)}
            >
              <X className="w-4 h-4 text-red-600" />
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Cancel reservation?
              </AlertDialogTitle>
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
      <h2 className="font-semibold text-lg mb-2">
        🚚 ต้องจัดส่งวันนี้
      </h2>

      <OrderTable
        data={filterData(todayShipping)}
        actions={(o) => (
          <Button onClick={() => setShippingId(o.id)}>
            <Truck className="w-4 h-4 mr-1" />
            จัดส่งสินค้า
          </Button>
        )}
      />
    </div>




    {/* ---------- ออเดอร์อื่น ---------- */}
    <div>
      <h2 className="font-semibold text-lg mb-2">
        📦 ออเดอร์ที่รอจัดส่ง
      </h2>

      <OrderTable
        data={filterData(otherConfirmed)}
        actions={(o) => (
          <Button onClick={() => setShippingId(o.id)}>
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
                />
              )}
      
      {tab === "done" && (
          <div className="space-y-8">
            <OrderTable data={filterData(done)} />
          </div>
        )}

      {tab === "expired" && (
        <OrderTable
          data={filterData(expired)}
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
          placeholder="ชื่อขนส่ง (เช่น Kerry, Flash, ไปรษณีย์ไทย)"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value)}
          className="rounded-xl"
        />
      </div>

      {/* Tracking */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">หมายเลขติดตามพัสดุ (Tracking No.)</label>
        <Input
          placeholder="เลขที่ติดตามพัสดุ"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          className="rounded-xl"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="w-full rounded-xl" onClick={() => setShippingId(null)}>
          ยกเลิก
        </Button>
        <Button
          className="w-full rounded-xl"
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
      </div>  
        );       
      }; 



/* ---------- Table ---------- */

const OrderTable = ({
  data,
  actions,
}: {
  data: any[];
  actions?: (o: any) => React.ReactNode;
}) => {
  const navigate = useNavigate(); 

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No data
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>หมายเลขรายการ</TableHead>
          <TableHead>ลูกค้า</TableHead>
          <TableHead>สินค้า</TableHead>
          <TableHead>จำนวน</TableHead>
          <TableHead>วันที่จอง</TableHead>
          <TableHead className="text-right">
            การดำเนินการ
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((o) => (
          <TableRow key={o.id}>
            <TableCell className="font-medium">{o.order_number ?? o.id.slice(0, 8)}</TableCell>
            <TableCell>{o.profiles?.full_name}</TableCell>
            <TableCell>{o.products?.name}</TableCell>
            <TableCell>{o.quantity}</TableCell>
            <TableCell>
              {new Date(o.created_at).toLocaleDateString("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </TableCell>

            <TableCell className="text-right space-x-2">
              {o.status === "expired" && (
                <span className="px-2 py-1 text-xs rounded bg-muted text-muted-foreground">
                  ⏱ หมดอายุ
                </span>
              )}

              <Button
                size="icon"
                variant="ghost"
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

  );
};

export default FarmOrders;
