import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell,
  CheckCircle2,
  Truck,
  Star,
  Package,
  Check,
  ChevronRight,
  Sparkles,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  related_order_id?: string | null;
  created_at: string;
  link?: string;
}

export const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUserAndNotifications();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        fetchNotifications(session.user.id);
      } else {
        setUserId(null);
        setNotifications([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // 🔔 Real-time Listener & Event-based Sync: ดักจับแจ้งเตือนใหม่ทันที
  useEffect(() => {
    if (!userId) return;

    // 1. Supabase Realtime Channel
    const channel = supabase
      .channel(`realtime-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationItem;
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });

          // เด้ง Toast แจ้งเตือนแบบทันท่วงทีบนหน้าจอ
          toast.info(newNotif.title, {
            description: newNotif.message,
            duration: 6000,
            action: newNotif.link
              ? {
                  label: "ดูข้อมูล",
                  onClick: () => navigate(newNotif.link!),
                }
              : undefined,
          });
        }
      )
      .subscribe();

    // 2. Custom Event Listener สำหรับการ Trigger ภายในหน้าเว็บเดียวกัน (0ms latency)
    const handleSync = () => {
      fetchNotifications(userId);
    };
    window.addEventListener("refresh-notifications", handleSync);
    window.addEventListener("focus", handleSync);

    // 3. Polling สำรองทุก 15 วินาที เพื่อให้แน่ใจว่าได้ข้อมูลสดใหม่เสมอ
    const pollInterval = setInterval(() => {
      fetchNotifications(userId);
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("refresh-notifications", handleSync);
      window.removeEventListener("focus", handleSync);
      clearInterval(pollInterval);
    };
  }, [userId, navigate]);

  const fetchNotifications = async (currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && data) {
        setNotifications(data as NotificationItem[]);
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    }
  };

  const loadUserAndNotifications = async () => {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setNotifications([]);
        setUserId(null);
        return;
      }

      setUserId(session.user.id);
      await fetchNotifications(session.user.id);
    } catch (err) {
      console.error("Load notifications error:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    if (userId) {
      try {
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("user_id", userId)
          .eq("read", false);
      } catch (e) {
        console.error("Mark read error:", e);
      }
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    // Mark this one as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );

    if (userId && notif.id) {
      try {
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", notif.id);
      } catch (e) {
        console.error("Mark individual read error:", e);
      }
    }

    setOpen(false);

    if (notif.link) {
      navigate(notif.link);
    } else if (notif.related_order_id) {
      navigate("/dashboard/orders");
    } else {
      navigate("/dashboard/orders");
    }
  };

  const formatThaiTime = (dateStr: string) => {
    try {
      const now = new Date();
      const d = new Date(dateStr);
      const diffInMins = Math.floor((now.getTime() - d.getTime()) / (1000 * 60));

      if (diffInMins < 1) return "เมื่อสักครู่";
      if (diffInMins < 60) return `${diffInMins} นาทีที่แล้ว`;
      const diffInHours = Math.floor(diffInMins / 60);
      if (diffInHours < 24) return `${diffInHours} ชั่วโมงที่แล้ว`;
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays} วันที่แล้ว`;

      return d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return "เมื่อเร็วๆ นี้";
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case "confirmed":
      case "order_confirmed":
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case "shipped":
      case "order_shipped":
        return (
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Truck className="w-4 h-4" />
          </div>
        );
      case "review":
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Star className="w-4 h-4 fill-amber-500" />
          </div>
        );
      case "pending":
      case "new_order":
      case "reservation_created":
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 border border-amber-500/20">
            <Package className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <Sparkles className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2.5 rounded-2xl text-slate-700 hover:text-slate-900 hover:bg-amber-100/80 active:scale-95 transition-all outline-none group"
          title="ศูนย์แจ้งเตือนผลผลิต"
          aria-label="แจ้งเตือน"
        >
          <Bell className="w-5 h-5 text-slate-700 group-hover:text-amber-700 transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-[11px] font-black text-white shadow-md border-2 border-white animate-in zoom-in-50 duration-200">
              <span className="absolute -inset-0.5 rounded-full bg-red-400 opacity-50 animate-ping" />
              <span className="relative">{unreadCount > 9 ? "9+" : unreadCount}</span>
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[calc(100vw-24px)] max-w-[390px] sm:w-[380px] p-0 rounded-2xl shadow-2xl border border-amber-200/80 bg-white overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 mr-2 sm:mr-0"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-4 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white leading-tight">
                ศูนย์แจ้งเตือนผลผลิต
              </h4>
              <p className="text-[10px] sm:text-[11px] text-white/90 font-medium">
                ติดตามสถานะรอบเก็บเกี่ยวและคำสั่งจอง
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] font-semibold bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded-lg transition-colors flex items-center gap-1 shrink-0"
            >
              <Check className="w-3 h-3" />
              อ่านทั้งหมด
            </button>
          )}
        </div>

        {/* Status subhead */}
        <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span className="text-[11px]">
            {unreadCount > 0
              ? `มี ${unreadCount} รายการที่ยังไม่ได้อ่าน`
              : "ไม่มีการแจ้งเตือนใหม่"}
          </span>
          <span className="text-[11px] text-amber-700 font-semibold">
            Banana Expert
          </span>
        </div>

        {/* Notifications List */}
        <div className="max-h-[360px] sm:max-h-[380px] overflow-y-auto divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-2 text-slate-400">
              <Inbox className="w-10 h-10 stroke-1 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">
                ยังไม่มีการแจ้งเตือนในขณะนี้
              </p>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                เมื่อคุณทำการสั่งจองผลผลิต หรือฟาร์มเริ่มจัดส่ง จะมีการแจ้งเตือนแสดงที่นี่
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-3 sm:p-3.5 hover:bg-amber-50/50 active:bg-amber-100/50 transition-colors cursor-pointer flex items-start gap-3 text-left relative group ${
                  !notif.read ? "bg-amber-50/30" : "bg-white"
                }`}
              >
                {!notif.read && (
                  <span className="absolute top-3.5 right-3 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
                )}

                {renderIcon(notif.type)}

                <div className="flex-1 min-w-0 pr-2">
                  <h5
                    className={`text-xs sm:text-sm font-bold truncate leading-tight ${
                      !notif.read ? "text-slate-900" : "text-slate-700"
                    }`}
                  >
                    {notif.title}
                  </h5>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                    {notif.message}
                  </p>
                  <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-400">
                    <span>{formatThaiTime(notif.created_at)}</span>
                    <span className="text-amber-700 font-semibold flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      ดูข้อมูล
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              navigate("/dashboard/orders");
            }}
            className="w-full text-xs font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-100/60 rounded-xl h-8"
          >
            ไปยังหน้ารายการสั่งซื้อของฉัน
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
