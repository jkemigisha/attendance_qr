import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Calendar, MapPin, Users, Eye } from "lucide-react";
import { format } from "date-fns";
import QRCodeDisplay from "./QRCodeDisplay";
import AttendanceListDialog from "./AttendanceListDialog";

interface LectureCardProps {
  lecture: any;
  onUpdate: () => void;
}

const LectureCard = ({ lecture, onUpdate }: LectureCardProps) => {
  const [showQR, setShowQR] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);
  const attendanceCount = lecture.attendance?.[0]?.count || 0;

  return (
    <>
      <Card className="shadow-card hover:shadow-elevated transition-all">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <CardTitle className="text-lg">{lecture.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {lecture.course_code}
                </Badge>
                {lecture.is_active ? (
                  <Badge className="text-xs bg-secondary text-secondary-foreground">Active</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Inactive
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{format(new Date(lecture.scheduled_time), "PPp")}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{lecture.venue}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{attendanceCount} students attended</span>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQR(true)}
              className="flex-1 gap-2"
            >
              <QrCode className="w-4 h-4" />
              Show QR
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAttendance(true)}
              className="flex-1 gap-2"
            >
              <Eye className="w-4 h-4" />
              View List
            </Button>
          </div>
        </CardContent>
      </Card>

      <QRCodeDisplay
        open={showQR}
        onOpenChange={setShowQR}
        lecture={lecture}
      />

      <AttendanceListDialog
        open={showAttendance}
        onOpenChange={setShowAttendance}
        lectureId={lecture.id}
        lectureTitle={lecture.title}
      />
    </>
  );
};

export default LectureCard;
