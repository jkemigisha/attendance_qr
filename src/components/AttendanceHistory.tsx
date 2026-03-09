import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, MapPin, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface AttendanceHistoryProps {
  attendance: any[];
}

const AttendanceHistory = ({ attendance }: AttendanceHistoryProps) => {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Attendance History</CardTitle>
        <CardDescription>Your recent lecture attendance records</CardDescription>
      </CardHeader>
      <CardContent>
        {attendance.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No attendance records yet</h3>
            <p className="text-muted-foreground">
              Scan QR codes during lectures to build your attendance history
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {attendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-start gap-3 p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="p-2 rounded-full bg-secondary/10">
                    <CheckCircle2 className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold">{record.lectures.title}</h4>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {record.lectures.course_code}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(record.marked_at), "MMM d, HH:mm")}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(record.lectures.scheduled_time), "PPp")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        <span>{record.lectures.venue}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceHistory;
