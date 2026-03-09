import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { AlertTriangle, Bell, BellOff, CheckCircle2, Loader2, Users, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

// Cast supabase to any to support the lecturer_notifications table before types are regenerated
const db = supabase as any;

interface LectureWithTurnout {
  id: string;
  title: string;
  course_code: string;
  course_name: string;
  venue: string;
  scheduled_time: string;
  attendees: number;
  totalStudents: number;
  turnoutPct: number;
  alreadyNotified: boolean;
}

interface TurnoutAnomalyPanelProps {
  lecturerId: string;
}

const TurnoutAnomalyPanel = ({ lecturerId }: TurnoutAnomalyPanelProps) => {
  const [lectures, setLectures] = useState<LectureWithTurnout[]>([]);
  const [threshold, setThreshold] = useState(50);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);

  useEffect(() => {
    fetchData();
  }, [lecturerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get all lectures for this lecturer with attendance counts
      const { data: lecturesData, error: lecturesError } = await supabase
        .from("lectures")
        .select(`
          id, title, course_code, course_name, venue, scheduled_time,
          attendance(count)
        `)
        .eq("lecturer_id", lecturerId)
        .order("scheduled_time", { ascending: false });

      if (lecturesError) throw lecturesError;

      // 2. Get total number of students in the system
      const { count: totalStudents, error: studentsError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "student");

      if (studentsError) throw studentsError;

      const studentCount = totalStudents || 0;

      // 3. Get already-notified lecture IDs
      const { data: notifData } = await db
        .from("lecturer_notifications")
        .select("lecture_id")
        .eq("lecturer_id", lecturerId)
        .eq("type", "low_turnout");

      const notifiedSet = new Set(
        (notifData || []).map((n: any) => n.lecture_id)
      );

      // 4. Build turnout data
      const result: LectureWithTurnout[] = (lecturesData || []).map((l: any) => {
        const attendees = l.attendance?.[0]?.count || 0;
        const turnoutPct =
          studentCount > 0 ? Math.round((attendees / studentCount) * 100) : 0;
        return {
          id: l.id,
          title: l.title,
          course_code: l.course_code,
          course_name: l.course_name,
          venue: l.venue,
          scheduled_time: l.scheduled_time,
          attendees,
          totalStudents: studentCount,
          turnoutPct,
          alreadyNotified: notifiedSet.has(l.id),
        };
      });

      setLectures(result);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load turnout data");
    } finally {
      setLoading(false);
    }
  };

  const flaggedLectures = lectures.filter((l) => l.turnoutPct < threshold);

  const sendNotification = async (lecture: LectureWithTurnout) => {
    setSending(lecture.id);
    try {
      const { error } = await db.from("lecturer_notifications").insert({
        lecturer_id: lecturerId,
        lecture_id: lecture.id,
        title: "⚠️ Low Turnout Alert",
        message: `Your lecture "${lecture.title}" (${lecture.course_code}) on ${format(new Date(lecture.scheduled_time), "MMM d, yyyy 'at' h:mm a")} had only ${lecture.attendees} out of ${lecture.totalStudents} students (${lecture.turnoutPct}% turnout). This is below the ${threshold}% threshold.`,
        type: "low_turnout",
      });
      if (error) throw error;
      toast.success(`Anomaly notification created for "${lecture.title}"`);
      setLectures((prev) =>
        prev.map((l) =>
          l.id === lecture.id ? { ...l, alreadyNotified: true } : l
        )
      );
    } catch (err: any) {
      toast.error("Failed to send notification: " + err.message);
    } finally {
      setSending(null);
    }
  };

  const sendAllNotifications = async () => {
    const unnotified = flaggedLectures.filter((l) => !l.alreadyNotified);
    if (unnotified.length === 0) {
      toast.info("All flagged lectures have already been notified");
      return;
    }
    setSendingAll(true);
    try {
      const inserts = unnotified.map((l) => ({
        lecturer_id: lecturerId,
        lecture_id: l.id,
        title: "⚠️ Low Turnout Alert",
        message: `Your lecture "${l.title}" (${l.course_code}) on ${format(new Date(l.scheduled_time), "MMM d, yyyy 'at' h:mm a")} had only ${l.attendees} out of ${l.totalStudents} students (${l.turnoutPct}% turnout). This is below the ${threshold}% threshold.`,
        type: "low_turnout",
      }));
      const { error } = await db.from("lecturer_notifications").insert(inserts);
      if (error) throw error;
      toast.success(`Notifications created for ${unnotified.length} lecture(s)`);
      setLectures((prev) =>
        prev.map((l) =>
          unnotified.find((u) => u.id === l.id) ? { ...l, alreadyNotified: true } : l
        )
      );
    } catch (err: any) {
      toast.error("Failed to send notifications: " + err.message);
    } finally {
      setSendingAll(false);
    }
  };

  const getBadgeVariant = (pct: number) => {
    if (pct < 25) return "destructive";
    if (pct < threshold) return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Analyzing lecture turnout...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Threshold control */}
      <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-orange-500" />
            <CardTitle className="text-base">Turnout Threshold</CardTitle>
          </div>
          <CardDescription>
            Lectures with turnout below this percentage will be flagged as anomalies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Slider
              value={[threshold]}
              onValueChange={([v]) => setThreshold(v)}
              min={10}
              max={100}
              step={5}
              className="flex-1"
            />
            <Label className="text-2xl font-bold text-orange-600 w-16 text-right">
              {threshold}%
            </Label>
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
              {lectures.filter((l) => l.turnoutPct < 25).length} critical (&lt;25%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
              {flaggedLectures.length} below threshold
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
              {lectures.length - flaggedLectures.length} normal
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Flagged lectures table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Lectures Below {threshold}% Turnout
                {flaggedLectures.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {flaggedLectures.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Detect and get notified about sessions with unusually low student turnout
              </CardDescription>
            </div>
            {flaggedLectures.length > 0 && (
              <Button
                onClick={sendAllNotifications}
                disabled={sendingAll}
                variant="destructive"
                className="gap-2"
              >
                {sendingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                Notify All ({flaggedLectures.filter((l) => !l.alreadyNotified).length} pending)
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {flaggedLectures.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-secondary" />
              <p className="font-medium">All lectures are above {threshold}% turnout</p>
              <p className="text-sm mt-1">No anomalies detected at this threshold</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lecture</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Turnout</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-36">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flaggedLectures.map((l) => (
                  <TableRow
                    key={l.id}
                    className={
                      l.turnoutPct < 25
                        ? "bg-destructive/5"
                        : "bg-orange-50/30 dark:bg-orange-950/10"
                    }
                  >
                    <TableCell className="font-medium">{l.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {l.course_code}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(l.scheduled_time), "MMM d, HH:mm")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.venue}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={getBadgeVariant(l.turnoutPct)}>
                          {l.turnoutPct}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {l.attendees}/{l.totalStudents}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {l.alreadyNotified ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <BellOff className="w-3 h-3" /> Notified
                        </span>
                      ) : (
                        <span className="text-xs text-orange-600 flex items-center gap-1">
                          <Bell className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={l.alreadyNotified ? "outline" : "default"}
                        onClick={() => sendNotification(l)}
                        disabled={sending === l.id}
                        className="gap-1 h-8"
                      >
                        {sending === l.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Bell className="w-3 h-3" />
                        )}
                        {l.alreadyNotified ? "Re-notify" : "Notify"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TurnoutAnomalyPanel;
