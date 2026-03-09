import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Bell, CheckCheck, X, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface LecturerNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface LecturerNotificationsPanelProps {
  lecturerId: string;
  onUnreadCountChange?: (count: number) => void;
}

// Cast supabase to any to support the lecturer_notifications table before types are regenerated
const db = supabase as any;

const LecturerNotificationsPanel = ({
  lecturerId,
  onUnreadCountChange,
}: LecturerNotificationsPanelProps) => {
  const [notifications, setNotifications] = useState<LecturerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [lecturerId]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from("lecturer_notifications")
        .select("*")
        .eq("lecturer_id", lecturerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const notifs: LecturerNotification[] = data || [];
      setNotifications(notifs);
      const unread = notifs.filter((n) => !n.is_read).length;
      onUnreadCountChange?.(unread);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    const { error } = await db
      .from("lecturer_notifications")
      .update({ is_read: true })
      .eq("id", id);
    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      const unread = notifications.filter(
        (n) => n.id !== id && !n.is_read
      ).length;
      onUnreadCountChange?.(unread);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;
    setMarkingAll(true);
    try {
      const { error } = await db
        .from("lecturer_notifications")
        .update({ is_read: true })
        .eq("lecturer_id", lecturerId)
        .eq("is_read", false);
      if (error) throw error;
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      onUnreadCountChange?.(0);
      toast.success("All notifications marked as read");
    } catch (err: any) {
      toast.error("Failed to update: " + err.message);
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <Card className="shadow-card">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) return null;

  return (
    <Card className="shadow-card border-orange-200 dark:border-orange-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="relative">
              <Bell className="w-5 h-5 text-orange-500" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            Turnout Alerts
            {unreadCount > 0 && (
              <span className="text-sm font-normal text-orange-600">
                ({unreadCount} unread)
              </span>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={markingAll}
              className="gap-1 text-xs h-8"
            >
              {markingAll ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCheck className="w-3 h-3" />
              )}
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-3">
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`relative flex gap-3 p-4 rounded-lg border transition-colors ${
                  n.is_read
                    ? "bg-card border-border opacity-60"
                    : "bg-orange-50/60 border-orange-200 dark:bg-orange-950/30 dark:border-orange-700"
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  <AlertTriangle
                    className={`w-5 h-5 ${
                      n.is_read ? "text-muted-foreground" : "text-orange-500"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`font-semibold text-sm ${
                        n.is_read
                          ? "text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {n.title}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      {format(new Date(n.created_at), "MMM d, HH:mm")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    {n.message}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors"
                    title="Mark as read"
                  >
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LecturerNotificationsPanel;
