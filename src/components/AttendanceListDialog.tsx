import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { CheckCircle2, Printer } from "lucide-react";

interface AttendanceListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lectureId: string;
  lectureTitle: string;
}

const AttendanceListDialog = ({ open, onOpenChange, lectureId, lectureTitle }: AttendanceListDialogProps) => {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAttendance();
    }
  }, [open, lectureId]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select(`
          *,
          profiles:student_id (
            full_name,
            student_id,
            email,
            department
          )
        `)
        .eq("lecture_id", lectureId)
        .order("marked_at", { ascending: false });

      if (error) throw error;
      setAttendance(data || []);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendance Report - ${lectureTitle}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #000;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #3b82f6;
              margin: 0 0 10px 0;
            }
            .header h2 {
              color: #666;
              margin: 0;
              font-weight: normal;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #3b82f6;
              color: white;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #666;
              font-size: 12px;
            }
            .summary {
              margin: 20px 0;
              padding: 15px;
              background-color: #f0f9ff;
              border-left: 4px solid #3b82f6;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>UCU-BBUC Attendance Report</h1>
            <h2>${lectureTitle}</h2>
            <p>Generated on: ${format(new Date(), "PPpp")}</p>
          </div>
          
          <div class="summary">
            <strong>Total Students Present: ${attendance.length}</strong>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Student Name</th>
                <th>Student ID</th>
                <th>Department</th>
                <th>Time Marked</th>
              </tr>
            </thead>
            <tbody>
              ${attendance.map((record, index) => {
                const profile = record.profiles;
                return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${profile?.full_name || 'Unknown Student'}</td>
                  <td>${profile?.student_id || 'N/A'}</td>
                  <td>${profile?.department || 'N/A'}</td>
                  <td>${format(new Date(record.marked_at), "HH:mm:ss")}</td>
                </tr>
              `}).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>UCU-BBUC QR Code Lecture Attendance Monitoring System</p>
            <p>Printed on: ${format(new Date(), "PPpp")}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Attendance List</DialogTitle>
              <DialogDescription>{lectureTitle}</DialogDescription>
            </div>
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={attendance.length === 0}
            >
              <Printer className="w-4 h-4" />
              Print Report
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : attendance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No students have marked attendance yet
            </div>
          ) : (
            <div className="space-y-2">
          {attendance.map((record) => {
                const profile = record.profiles;
                const fullName = profile?.full_name || "Unknown Student";
                const studentId = profile?.student_id || "N/A";
                const department = profile?.department || "N/A";
                
                return (
                  <div
                    key={record.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{fullName}</div>
                      <div className="text-sm text-muted-foreground">
                        {studentId} • {department}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-secondary">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Present</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(record.marked_at), "HH:mm")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="border-t pt-4">
          <div className="text-sm text-muted-foreground text-center">
            Total: <span className="font-medium text-foreground">{attendance.length}</span> students
            present
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttendanceListDialog;
