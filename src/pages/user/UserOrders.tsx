import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/layout/Navbar";

/* ---------- Types ---------- */

interface ShippingOrder {
  id: string;
  order_number: string;
  user_id: string;
  farm_id: string;
  product_id: string;
  quantity: number;
  total_price: number;
  created_at: string;
  shipped_at: string;
  carrier: string | null;
  tracking_number: string | null;
  receiver_name: string | null;
  receiver_phone: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;

  products: {
  name: string;
  product_type: string;
  harvest_date: string;
  expiry_date: string | null;

  farm_profiles?: {
    farm_name: string;
  } | null;
};
}

interface ConfirmedOrder {
  id: string;
  quantity: number;
  created_at: string;
  total_price: number;
  order_number: string;
  shipped_at: string;
  receiver_name: string | null;
  receiver_phone: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;

  products: {
    name: string;
    product_type: string;
    harvest_date: string | null;
    expiry_date: string | null;

    farm_profiles?: {
      farm_name: string;
    } | null;
  };
}

interface Reservation {
  id: string;
  quantity: number;
  created_at: string;
  total_price: number;
  receiver_name: string | null;
  receiver_phone: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;

  products: {
    name: string;
    product_type: string;
    harvest_date: string;
    expiry_date: string | null;

    farm_profiles?: {
      farm_name: string;
    } | null;
  };
}

interface ReviewedOrder {
  id: string;
  quantity: number;
  created_at: string;

  products: {
    name: string;
    product_type: string;

    farm_profiles?: {
      farm_name: string;
    } | null;
  };

  reviews: {
    rating: number;
    comment: string | null;
  } | null;
}


interface ToReviewOrder {
  id: string;
  user_id: string;
  farm_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  shipped_at: string | null;
  carrier: string | null;
  tracking_number: string | null;

  total_price: number;
  order_number: string;
  receiver_name: string | null;
  receiver_phone: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;

  products: {
    name: string;
    product_type: string;
    harvest_date: string | null;

    farm_profiles?: {
      farm_name: string;
    } | null;
  };
}

interface CancelledReservation {
  id: string;
  quantity: number;
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;

  products: {
    name: string;
    product_type: string;
    farm_profiles?: {
      farm_name: string;
    } | null;
  };
}


/* ---------- Component ---------- */

const UserOrders = () => {
  const navigate = useNavigate();
  const [shipping, setShipping] = useState<ShippingOrder[]>([]);
  const [confirmed, setConfirmed] = useState<ConfirmedOrder[]>([]);
  const [pending, setPending] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  /* REVIEW */
  const [openReview, setOpenReview] = useState(false);
  const [selectedOrder, setSelectedOrder] =
    useState<ToReviewOrder | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("th-TH") : "-";
  const [history, setHistory] = useState<ReviewedOrder[]>([]);
  const [toReview, setToReview] = useState<ToReviewOrder[]>([]);
  const [tab, setTab] = useState("pending");
  const [cancelledReservations, setCancelledReservations] = useState<CancelledReservation[]>([]);
  const [openCancel, setOpenCancel] = useState(false);
  const [selectedReservation, setSelectedReservation] =
  useState<Reservation | null>(null);
  const [cancelReason, setCancelReason] = useState("");


  /* ---------- LOAD DATA ---------- */

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [shippingRes, confirmedRes, pendingRes, toReviewRes, historyRes,cancelledRes] = await Promise.all([
        supabase
          .from("orders")
          .select(`
            id,
            user_id,
            farm_id,
            product_id,
            quantity,
            created_at,
            shipped_at,
            carrier,
            tracking_number,
            order_number,
            receiver_name,
            receiver_phone,
            delivery_address,
            delivery_notes,
            total_price,
            products (
              name,
              product_type,
              harvest_date,
              expiry_date,
              farm_profiles (
                farm_name
              )
            )

          `)
          .eq("user_id", user.id)
          .eq("status", "shipped")
          .order("shipped_at", { ascending: false }),


        supabase
          .from("orders")
          .select(`
            id,
            quantity,
            created_at,
            total_price,
            order_number,
            receiver_name,
            receiver_phone,
            delivery_address,
            delivery_notes,
            products (
              name,
              product_type,
              harvest_date,
              expiry_date,
              farm_profiles (
                farm_name
              )
            )
          `)


          .eq("user_id", user.id)
          .eq("status", "confirmed")
          .order("confirmed_at", { ascending: false }),

        supabase
          .from("reservations")
          .select(`
            id,
            quantity,
            total_price,
            created_at,
            receiver_name,
            receiver_phone,
            delivery_address,
            products (
              name,
              product_type,
              harvest_date,
              expiry_date,
              farm_profiles (
                farm_name
              )
            )

          `)
          .eq("user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        
          supabase
            .from("orders")
            .select(`
              id,
              quantity,
              created_at,
              product_id,
              farm_id,
              user_id,
              shipped_at,
              carrier,
              tracking_number,
              products (
                name,
                product_type,
                farm_profiles (
                  id,
                  farm_name
                )
              )
            `)
            .eq("user_id", user.id)
            .eq("status", "delivered"),

          supabase
            .from("orders")
            .select(`
              id,
              quantity,
              created_at,
              products (
                name,
                product_type,
                farm_profiles (
                  farm_name
                    )
              ),
              reviews (
                rating,
                comment
              )
            `)
            .eq("user_id", user.id)
            .eq("status", "reviewed"),
            
            supabase
              .from("reservations")
              .select(`
                id,
                quantity,
                created_at,
                cancelled_at,
                cancelled_by,
                cancel_reason,
                products (
                  name,
                  product_type,
                  farm_profiles (
                    farm_name
                  )
                )
              `)
              .eq("user_id", user.id)
              .eq("status", "cancelled"),


      ]);

      setShipping(shippingRes.data || []);
      setConfirmed(confirmedRes.data || []);
      setPending(pendingRes.data || []);
      setToReview(toReviewRes.data || []);
      setHistory(historyRes.data || []);
      setCancelledReservations(cancelledRes.data || []);
    } catch {
      toast.error("โหลดออเดอร์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- CONFIRM RECEIVED ---------- */

  const confirmReceived = async (order: ShippingOrder) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (error) throw error;

      toast.success("ยืนยันรับสินค้าแล้ว");

      setSelectedOrder(order);
      setOpenReview(true);

      setShipping((prev) => prev.filter((o) => o.id !== order.id));}
      catch {
      toast.error("ยืนยันรับสินค้าไม่ได้");
    }
  };

  const cancelReservation = async (
  reservationId: string,
  reason: string
) => {
  try {
    const { error } = await supabase.rpc("cancel_reservation", {
      p_reservation_id: reservationId,
      p_reason: reason,
    });

    if (error) throw error;

    toast.success("ยกเลิกการจองแล้ว");

    await loadAll();
  } catch (e: any) {
    console.error(e);
    toast.error(e.message || "ยกเลิกการจองไม่ได้");
  }
};


  const submitReview = async () => {
  if (!selectedOrder) return;

  try {
    const { error } = await supabase.rpc("insert_review", {
      p_order_id: selectedOrder.id,
      p_rating: rating,
      p_comment: comment,
    });

    if (error) throw error;

    toast.success("ขอบคุณสำหรับรีวิว 🌟");

    setOpenReview(false);
    setSelectedOrder(null);
    setRating(5);
    setComment("");

    await loadAll();
  } catch (e: any) {
    console.error(e);
    toast.error(e.message || "รีวิวไม่สำเร็จ");
  }
};
  
  

  /* ---------- LOADING ---------- */

  if (loading)
    return <div className="p-10 text-center">Loading...</div>;

  /* ---------- UI ---------- */

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      <Navbar />

      <div className="container mx-auto px-4 max-w-6xl space-y-6 py-6">
        {/* HEADER */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">การจองของฉัน</h1>
        </div>

        {/* ---------- Tabs ---------- */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="pending">รอยืนยัน</TabsTrigger>
            <TabsTrigger value="confirmed">ฟาร์มยืนยันแล้ว</TabsTrigger>
            <TabsTrigger value="shipping">กำลังจัดส่ง</TabsTrigger>
            <TabsTrigger value="review">ยังไม่ได้รีวิว</TabsTrigger>
            <TabsTrigger value="history">ประวัติ</TabsTrigger>
            <TabsTrigger value="cancelled">ยกเลิกแล้ว</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* ---------- SHIPPING ---------- */}
        {tab === "shipping" && (
          <Card className="p-6 space-y-4">
            {shipping.length === 0 && <p>ไม่มีรายการ</p>}
            {shipping.map((o) => (
              <Card
                key={o.id}
                className="p-0 overflow-hidden hover:shadow-md transition-shadow" >
                {/* STATUS BAR */}
                <div className="flex justify-between items-center bg-orange-50 px-4 py-2 border-b">
                  <p className="text-sm font-medium text-orange-600">🚚 กำลังจัดส่ง</p> </div>

                {/* MAIN CONTENT */}
                <div className="p-4 space-y-3">

                      {/* PRODUCT + FARM */}
                      <div className="space-y-1">
                        <p className="font-semibold text-lg">{o.products.name}</p>
                        <p className="text-sm text-muted-foreground">{o.products.product_type} • {o.quantity} ชิ้น</p>
                        <p className="text-sm"> ราคารวม : <span className="font-medium ml-1"> {o.total_price || "-"}</span></p>
                        <p className="text-sm"> ฟาร์ม : <span className="font-medium ml-1"> {o.products.farm_profiles?.farm_name || "-"}</span></p>
                        <p className="text-sm"> เลขออเดอร์ : <span className="font-medium ml-1"> {o.order_number || "-"}
                          </span>
                        </p>
                      </div>

                      {/* DIVIDER */}
                      <div className="border-t" />

                      {/* SHIPPING INFO */}
                      <div className="grid grid-cols-2 gap-2 text-sm">

                        <p> 🚚 ขนส่ง : <span className="font-medium ml-1"> {o.carrier || "-"}</span></p>
                        <p> 📦 หมายเลขติดตามพัสดุ : <span className="font-medium ml-1"> {o.tracking_number || "-"} </span> </p>
                        <p>📅 วันที่จอง : {formatDate(o.created_at)}</p>
                        <p>🌾 เก็บเกี่ยว : {formatDate(o.products?.harvest_date)}</p>
                        <p className="col-span-2"> 🚛 วันจัดส่ง : {formatDate(o.shipped_at)} </p> 
                        </div>
                        <div className="border-t" />
                   
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold">ข้อมูลการจัดส่ง</p>
                          <p> ผู้รับ : <span className="font-medium ml-1"> {o.receiver_name || "-"} </span> </p>
                          <p> เบอร์โทร : <span className="font-medium ml-1"> {o.receiver_phone || "-"} </span> </p>
                          <p> ที่อยู่ : <span className="font-medium ml-1"> {o.delivery_address || "-"} </span> </p>
                          {o.delivery_notes && (
                          <p> หมายเหตุ : <span className="font-medium ml-1"> {o.delivery_notes} </span></p>)} </div>

                        {/* ACTION */}
                        <div className="flex justify-end pt-2"><Button
                            className="bg-orange-500 hover:bg-orange-600"
                            onClick={() => confirmReceived(o)} > ได้รับสินค้าแล้ว </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  </Card>
                  )}

      {/* ---------- CONFIRMED ---------- */}
          {tab === "confirmed" && (
            <Card className="p-6 space-y-4">
              {confirmed.length === 0 && <p>ไม่มีรายการ</p>}
              {confirmed.map((o) => (
                <Card key={o.id} className="p-0 overflow-hidden hover:shadow-md transition-shadow" >
                  {/* STATUS BAR */}
                  <div className="flex justify-between items-center bg-green-50 px-4 py-2 border-b">
                    <p className="text-sm font-medium text-green-600"> 🌾 ฟาร์มยืนยันแล้ว </p> </div>

                  {/* MAIN CONTENT */}
                  <div className="p-4 space-y-3">

                    {/* PRODUCT + FARM */}
                     <div className="space-y-1">
                        <p className="font-semibold text-lg">{o.products.name}</p>
                        <p className="text-sm text-muted-foreground">{o.products.product_type} • {o.quantity} ชิ้น</p>
                        <p className="text-sm"> ราคารวม : <span className="font-medium ml-1"> {o.total_price || "-"}</span></p>
                        <p className="text-sm"> ฟาร์ม : <span className="font-medium ml-1"> {o.products.farm_profiles?.farm_name || "-"}</span></p>
                        <p className="text-sm"> เลขออเดอร์ : <span className="font-medium ml-1"> {o.order_number || "-"}</span></p>
                      </div>

                    {/* DIVIDER */}
                    <div className="border-t" />

                    {/* PRODUCT INFO */}
                    <div className="space-y-1 text-sm"> <p className="font-semibold">เกี่ยวกับสินค้า</p>
                      <p> 📅 วันที่จอง : {formatDate(o.created_at)}</p>
                      <p> 🌾 ฟาร์มเก็บเกี่ยว : {" "} {formatDate(o.products?.harvest_date)} </p>
                      <p> 🚚 วันที่ฟาร์มคาดว่าจะจัดส่ง : {" "} {formatDate(o.products?.expiry_date)} </p>
                    </div>

                    <div className="border-t" /> 
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold">ข้อมูลการจัดส่ง</p>
                          <p> ผู้รับ : <span className="font-medium ml-1"> {o.receiver_name || "-"} </span> </p>
                          <p> เบอร์โทร : <span className="font-medium ml-1"> {o.receiver_phone || "-"} </span> </p>
                          <p> ที่อยู่ : <span className="font-medium ml-1"> {o.delivery_address || "-"} </span> </p>
                          {o.delivery_notes && (
                          <p> หมายเหตุ : <span className="font-medium ml-1"> {o.delivery_notes} </span></p>)} </div>
                  </div>
                </Card>
              ))}
            </Card>
          )}

         {/* ---------- PENDING ---------- */}
          {tab === "pending" && (
            <Card className="p-6 space-y-4">
              {pending.length === 0 && <p>ไม่มีรายการ</p>}
              {pending.map((r) => (
                <Card key={r.id} className="p-0 overflow-hidden hover:shadow-md transition-shadow" >
                  {/* STATUS BAR */}
                  <div className="flex justify-between items-center bg-yellow-50 px-4 py-2 border-b">
                    <p className="text-sm font-medium text-yellow-600"> ⏳ รอฟาร์มยืนยัน </p> </div>

                  {/* MAIN CONTENT */}
                  <div className="p-4 space-y-3">

                    {/* PRODUCT + FARM */}
                   <div className="space-y-1">
                        <p className="font-semibold text-lg">{r.products.name}</p>
                        <p className="text-sm text-muted-foreground">{r.products.product_type} • {r.quantity} ชิ้น</p>
                        <p className="text-sm"> ราคารวม : <span className="font-medium ml-1"> {r.total_price || "-"}</span></p>
                        <p className="text-sm"> ฟาร์ม : <span className="font-medium ml-1"> {r.products.farm_profiles?.farm_name || "-"}</span></p>
                        <p className="text-sm"> เลขการจอง : <span className="font-medium ml-1"> {r.id || "-"}</span></p>
                      </div>
                    {/* DIVIDER */}
                    <div className="border-t" />

                    {/* PRODUCT INFO */}
                    <div className="space-y-1 text-sm"> <p className="font-semibold">เกี่ยวกับสินค้า</p>
                      <p> 📅 วันที่จอง : {formatDate(r.created_at)}</p>
                      <p> 🌾 ฟาร์มเก็บเกี่ยว : {" "} {formatDate(r.products?.harvest_date)} </p>
                      <p> 🚚 วันที่ฟาร์มคาดว่าจะจัดส่ง :{" "} {formatDate(r.products?.expiry_date)}</p>
                    </div>
                    <div className="border-t" /> 
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold">ข้อมูลการจัดส่ง</p>
                          <p> ผู้รับ : <span className="font-medium ml-1"> {r.receiver_name || "-"} </span> </p>
                          <p> เบอร์โทร : <span className="font-medium ml-1"> {r.receiver_phone || "-"} </span> </p>
                          <p> ที่อยู่ : <span className="font-medium ml-1"> {r.delivery_address || "-"} </span> </p>
                          {r.delivery_notes && (
                          <p> หมายเหตุ : <span className="font-medium ml-1"> {r.delivery_notes} </span></p>)} </div>
                  </div>
                      
                    {/* ACTION */}
                      <div className="flex justify-end pt-2"><Button
                            className="bg-orange-500 hover:bg-orange-600"
                        onClick={() => {
                          setSelectedReservation(r);
                          setOpenCancel(true);
                        }} > ยกเลิกออเดอร์ </Button> </div>
                </Card>
              ))}
            </Card>
          )}



          {/* ---------- TO REVIEW ---------- */}
          {tab === "review" && (
            <Card className="p-6 space-y-4">
              {toReview.length === 0 && <p>ไม่มีรายการ</p>}
              {toReview.map((o) => (
                <Card key={o.id} className="p-0 overflow-hidden hover:shadow-md transition-shadow" >
                  {/* STATUS BAR */}
                  <div className="flex justify-between items-center bg-green-50 px-4 py-2 border-b">
                    <p className="text-sm font-medium text-green-600"> รายการที่ยังไม่ได้รีวิว </p> </div>

                  {/* MAIN CONTENT */}
                  <div className="p-4 space-y-3">

                    {/* PRODUCT + FARM */}
                     <div className="space-y-1">
                        <p className="font-semibold text-lg">{o.products.name}</p>
                        <p className="text-sm text-muted-foreground">{o.products.product_type} • {o.quantity} ชิ้น</p>
                        <p className="text-sm"> ราคารวม : <span className="font-medium ml-1"> {o.total_price || "-"}</span></p>
                        <p className="text-sm"> ฟาร์ม : <span className="font-medium ml-1"> {o.products.farm_profiles?.farm_name || "-"}</span></p>
                        <p className="text-sm"> เลขออเดอร์ : <span className="font-medium ml-1"> {o.order_number || "-"}</span></p>
                      </div>

                    {/* DIVIDER */}
                    <div className="border-t" />

                    {/* PRODUCT INFO */}
                    <div className="space-y-1 text-sm"> <p className="font-semibold">เกี่ยวกับสินค้า</p>
                      <p> 📅 วันที่จอง : {formatDate(o.created_at)}</p>
                      <p> 🌾 ฟาร์มเก็บเกี่ยว : {" "} {formatDate(o.products?.harvest_date)} </p>
                      <p className="col-span-2"> 🚛 วันจัดส่ง : {formatDate(o.shipped_at)} </p> 
                    </div>

                    <div className="border-t" /> 
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold">ข้อมูลการจัดส่ง</p>
                          <p> ผู้รับ : <span className="font-medium ml-1"> {o.receiver_name || "-"} </span> </p>
                          <p> เบอร์โทร : <span className="font-medium ml-1"> {o.receiver_phone || "-"} </span> </p>
                          <p> ที่อยู่ : <span className="font-medium ml-1"> {o.delivery_address || "-"} </span> </p>
                          {o.delivery_notes && (
                          <p> หมายเหตุ : <span className="font-medium ml-1"> {o.delivery_notes} </span></p>)} </div>
                  </div>

                  <div className="flex justify-end pt-2">
                      <Button
                        variant="destructive"
                        onClick={() => { setSelectedOrder(o);
                              setOpenReview(true);
                            }} > รีวิวสินค้า </Button> </div>
                </Card>
              ))}
            </Card>
          )}


        {/* ---------- HISTORY ---------- */}
{tab === "history" && (
  <Card className="p-6 space-y-4">
    {history.length === 0 && <p>ไม่มีรายการ</p>}
    {history.map((o) => {
      const review = Array.isArray(o.reviews) ? o.reviews[0] : o.reviews;

      return (
        <Card
          key={o.id}
          className="p-4 space-y-2 hover:shadow-md transition-shadow">
          <p className="font-semibold text-lg">{o.products.name}</p>
          <p className="text-sm text-muted-foreground">{o.products.product_type} • {o.quantity} ชิ้น </p>
          <p className="text-sm">ฟาร์ม :{" "}
            <span className="font-medium ml-1">{o.products.farm_profiles?.farm_name || "-"}</span>
          </p>
          <p className="text-sm">วันที่จอง : {formatDate(o.created_at)}</p>
          <div className="border-t pt-2 space-y-1 text-sm">
            <p>⭐ คะแนน : {review?.rating ?? "-"} / 5</p>
            <p>รีวิว : {review?.comment || "-"}</p>
          </div>
        </Card>
      );
    })}
  </Card>
)}


{/* ---------- CANCELLED ---------- */}
{tab === "cancelled" && (
  <Card className="p-6 space-y-4">
    {cancelledReservations.length === 0 && <p>ไม่มีรายการ</p>}

    {cancelledReservations.map((r) => (
      <Card
        key={r.id} className="p-4 space-y-2 hover:shadow-md transition-shadow">
        <p className="font-semibold text-lg">{r.products.name} </p>
        <p className="text-sm text-muted-foreground">{r.products.product_type} • {r.quantity} ชิ้น </p>
        <p className="text-sm">ฟาร์ม :{" "}<span className="font-medium ml-1">
            {r.products.farm_profiles?.farm_name || "-"}</span></p>
        <p className="text-sm">วันที่จอง : {formatDate(r.created_at)}</p>
        <p className="text-sm">วันที่ยกเลิก : {formatDate(r.cancelled_at)}</p>
      <p className="text-sm">ยกเลิกโดย :{" "} <span className="font-medium ml-1">
          {r.cancelled_by === "user"
            ? "คุณ"
            : r.cancelled_by === "farm"
            ? "ฟาร์ม"
            : "-"}
        </span>
        <p className="text-sm"> เหตุผล : {r.cancel_reason || "-"} </p> </p>
        <Badge variant="destructive">Cancelled</Badge>
      </Card>
    ))}
  </Card>
)}

      </div>

      {/* REVIEW MODAL */}
      <Dialog open={openReview} onOpenChange={setOpenReview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              รีวิว {selectedOrder?.products?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <Button
                  key={n}
                  variant={rating >= n ? "default" : "outline"}
                  onClick={() => setRating(n)}
                >
                  ⭐ {n}
                </Button>
              ))}
            </div>
            
            <Textarea
              placeholder="เขียนรีวิว..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button onClick={submitReview} className="w-full">
              ส่งรีวิว
            </Button>
          </div>
        </DialogContent>
      </Dialog>



      <Dialog open={openCancel} onOpenChange={setOpenCancel}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>เหตุผลในการยกเลิก</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <Textarea
        placeholder="กรอกเหตุผล..."
        value={cancelReason}
        onChange={(e) => setCancelReason(e.target.value)}
      />

      <Button
        variant="destructive"
        onClick={async () => {
          if (!selectedReservation) return;

          await cancelReservation(
            selectedReservation.id,
            cancelReason
          );

          setCancelReason("");
          setSelectedReservation(null);
          setOpenCancel(false);
        }}
        className="w-full"
      >
        ยืนยันการยกเลิก
      </Button>
    </div>
  </DialogContent>
</Dialog>
    </div>
  );
};

export default UserOrders;
