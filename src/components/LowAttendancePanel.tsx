import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface StudentAttendance {
  id: string;
  full_name: string;
  student_id: string | null;
  email: string;
  department: string | null;
  attended: number;
  total: number;
  percentage: number;
}

interface LowAttendancePanelProps {
  /** If provided, only shows students enrolled in this lecturer's lectures */
  lecturerId?: string;
}

const LowAttendancePanel = ({ lecturerId }: LowAttendancePanelProps) => {
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [threshold, setThreshold] = useState(75);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [lecturerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all students
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, student_id, email, department")
        .eq("role", "student")
        .order("full_name");

      if (profilesError) throw profilesError;

      // Fetch lectures (optionally filtered by lecturer)
      let lecturesQuery = supabase.from("lectures").select("id");
      if (lecturerId) {
        lecturesQuery = lecturesQuery.eq("lecturer_id", lecturerId);
      }
      const { data: lecturesData, error: lecturesError } = await lecturesQuery;
      if (lecturesError) throw lecturesError;

      const totalLectures = lecturesData?.length || 0;
      const lectureIds = lecturesData?.map((l) => l.id) || [];

      if (totalLectures === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Fetch attendance records
      let attQuery = supabase
        .from("attendance")
        .select("student_id, lecture_id");
      if (lecturerId) {
        attQuery = attQuery.in("lecture_id", lectureIds);
      }
      const { data: attData, error: attError } = await attQuery;
      if (attError) throw attError;

      if (attError) throw attError;

      // Count per student
      const countMap: Record<string, number> = {};
      (attData || []).forEach((a) => {
        if (a.student_id) {
          countMap[a.student_id] = (countMap[a.student_id] || 0) + 1;
        }
      });

      const result: StudentAttendance[] = (profilesData || []).map((p) => {
        const attended = countMap[p.id] || 0;
        const percentage = totalLectures > 0 ? Math.round((attended / totalLectures) * 100) : 0;
        return {
          id: p.id,
          full_name: p.full_name,
          student_id: p.student_id,
          email: p.email,
          department: p.department,
          attended,
          total: totalLectures,
          percentage,
        };
      });

      setStudents(result);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  const lowStudents = students.filter((s) => s.percentage < threshold);

  const getBadgeVariant = (pct: number) => {
    if (pct < 50) return "destructive";
    if (pct < threshold) return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Calculating attendance...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Threshold control */}
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <CardTitle className="text-base">Attendance Threshold</CardTitle>
          </div>
          <CardDescription>
            Students below this percentage will be flagged for alerts
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
            <Label className="text-2xl font-bold text-amber-600 w-16 text-right">
              {threshold}%
            </Label>
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
              {students.filter((s) => s.percentage < 50).length} critical (&lt;50%)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              {lowStudents.length} below threshold
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
              {students.length - lowStudents.length} on track
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Low attendance table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Students Below {threshold}% Attendance
              </CardTitle>
              <CardDescription>
                Detect students who have unusually low attendance
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {lowStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-secondary" />
              <p className="font-medium">All students are above {threshold}% attendance</p>
              <p className="text-sm mt-1">No alerts needed at this threshold</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Attended</TableHead>
                  <TableHead>Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStudents.map((s) => (
                  <TableRow key={s.id} className={s.percentage < 50 ? "bg-destructive/5" : "bg-amber-50/30 dark:bg-amber-950/10"}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.student_id || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{s.department || "—"}</TableCell>
                    <TableCell>
                      {s.attended}/{s.total}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(s.percentage)}>
                        {s.percentage}%
                      </Badge>
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

export default LowAttendancePanel;
