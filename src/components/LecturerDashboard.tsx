import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Plus, Calendar, Users, QrCode } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import CreateLectureDialog from "./CreateLectureDialog";
import LectureCard from "./LectureCard";

interface LecturerDashboardProps {
  profile: any;
}

const LecturerDashboard = ({ profile }: LecturerDashboardProps) => {
  const navigate = useNavigate();
  const [lectures, setLectures] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, totalAttendance: 0 });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchLectures();
  }, []);

  const fetchLectures = async () => {
    try {
      const { data, error } = await supabase
        .from("lectures")
        .select(`
          *,
          attendance(count)
        `)
        .eq("lecturer_id", profile.id)
        .order("scheduled_time", { ascending: false });

      if (error) throw error;

      setLectures(data || []);
      
      const totalAttendance = data?.reduce((sum, lecture) => 
        sum + (lecture.attendance?.[0]?.count || 0), 0) || 0;
      
      setStats({
        total: data?.length || 0,
        active: data?.filter(l => l.is_active).length || 0,
        totalAttendance
      });
    } catch (error) {
      console.error("Error fetching lectures:", error);
      toast.error("Failed to load lectures");
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
            <h1 className="text-2xl font-bold text-foreground">Lecturer Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {profile.full_name}</p>
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
              <CardTitle className="text-sm font-medium">Total Lectures</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <QrCode className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">{stats.active}</div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-elevated transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Attendance</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent-foreground">{stats.totalAttendance}</div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Lectures</CardTitle>
                <CardDescription>Manage your lecture sessions and track attendance</CardDescription>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Lecture
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {lectures.length === 0 ? (
              <div className="text-center py-12">
                <QrCode className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No lectures yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first lecture to start tracking attendance
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create First Lecture
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {lectures.map((lecture) => (
                  <LectureCard
                    key={lecture.id}
                    lecture={lecture}
                    onUpdate={fetchLectures}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <CreateLectureDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        lecturerId={profile.id}
        onSuccess={fetchLectures}
      />
    </div>
  );
};

export default LecturerDashboard;
