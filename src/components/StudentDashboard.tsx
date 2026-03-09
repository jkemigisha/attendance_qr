import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, QrCode, CheckCircle2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import QRScanner from "./QRScanner";
import AttendanceHistory from "./AttendanceHistory";

interface StudentDashboardProps {
  profile: any;
}

const StudentDashboard = ({ profile }: StudentDashboardProps) => {
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);
  const [stats, setStats] = useState({ total: 0, thisWeek: 0, percentage: 0 });
  const [attendance, setAttendance] = useState<any[]>([]);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          lectures(
            title,
            course_code,
            course_name,
            scheduled_time,
            venue
          )
        `)
        .eq("student_id", profile.id)
        .order("marked_at", { ascending: false });

      if (error) throw error;

      setAttendance(data || []);

      // Calculate stats
      const total = data?.length || 0;
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const thisWeek = data?.filter(a => 
        new Date(a.marked_at) >= oneWeekAgo
      ).length || 0;

      // Get total lectures to calculate percentage
      const { data: lecturesData } = await supabase
        .from("lectures")
        .select("id");
      
      const totalLectures = lecturesData?.length || 1;
      const percentage = Math.round((total / totalLectures) * 100);

      setStats({ total, thisWeek, percentage });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance");
    }
  };

  const handleScan = async (qrData: string) => {
    try {
      // Verify the QR code corresponds to an active lecture
      const { data: lecture, error: lectureError } = await supabase
        .from("lectures")
        .select("*")
        .eq("qr_code_data", qrData)
        .eq("is_active", true)
        .single();

      if (lectureError || !lecture) {
        toast.error("Invalid or inactive lecture QR code");
        return;
      }

      // Check if already marked
      const { data: existing } = await supabase
        .from("attendance")
        .select("*")
        .eq("lecture_id", lecture.id)
        .eq("student_id", profile.id)
        .maybeSingle();

      if (existing) {
        toast.info("You've already marked attendance for this lecture");
        setShowScanner(false);
        return;
      }

      // Mark attendance
      const { error: insertError } = await supabase
        .from("attendance")
        .insert({
          lecture_id: lecture.id,
          student_id: profile.id,
        });

      if (insertError) throw insertError;

      toast.success(`Attendance marked for ${lecture.course_code}`);
      setShowScanner(false);
      fetchAttendance();
    } catch (error) {
      console.error("Error marking attendance:", error);
      toast.error("Failed to mark attendance");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Student Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome, {profile.full_name}</p>
            {profile.student_id && (
              <p className="text-xs text-muted-foreground">ID: {profile.student_id}</p>
            )}
          </div>
          <Button variant="outline" onClick={handleSignOut} className="gap-2">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Attendance</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">lectures attended</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">{stats.thisWeek}</div>
              <p className="text-xs text-muted-foreground mt-1">lectures this week</p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <QrCode className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent-foreground">{stats.percentage}%</div>
              <p className="text-xs text-muted-foreground mt-1">overall rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Scanner Section */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Mark Attendance</CardTitle>
            <CardDescription>Scan the QR code displayed by your lecturer to mark your attendance</CardDescription>
          </CardHeader>
          <CardContent>
            {!showScanner ? (
              <div className="text-center py-8">
                <QrCode className="w-16 h-16 text-primary mx-auto mb-4" />
                <Button onClick={() => setShowScanner(true)} size="lg" className="gap-2">
                  <QrCode className="w-5 h-5" />
                  Scan QR Code
                </Button>
              </div>
            ) : (
              <QRScanner
                onScan={handleScan}
                onClose={() => setShowScanner(false)}
              />
            )}
          </CardContent>
        </Card>

        {/* Attendance History */}
        <AttendanceHistory attendance={attendance} />
      </main>
    </div>
  );
};

export default StudentDashboard;
