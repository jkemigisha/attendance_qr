import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface CreateLectureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lecturerId: string;
  onSuccess: () => void;
}

const CreateLectureDialog = ({ open, onOpenChange, lecturerId, onSuccess }: CreateLectureDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const courseCode = formData.get("course-code") as string;
    const courseName = formData.get("course-name") as string;
    const venue = formData.get("venue") as string;
    const scheduledTime = formData.get("scheduled-time") as string;
    const duration = parseInt(formData.get("duration") as string);

    try {
      // Generate unique QR code data
      const qrCodeData = `UCU-BBUC-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const { error } = await supabase.from("lectures").insert({
        lecturer_id: lecturerId,
        title,
        course_code: courseCode,
        course_name: courseName,
        venue,
        scheduled_time: scheduledTime,
        duration_minutes: duration,
        qr_code_data: qrCodeData,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Lecture created successfully!");
      onOpenChange(false);
      onSuccess();
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to create lecture");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Lecture</DialogTitle>
          <DialogDescription>Add a new lecture session with QR code for attendance tracking</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Lecture Title</Label>
            <Input id="title" name="title" placeholder="Introduction to Databases" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="course-code">Course Code</Label>
              <Input id="course-code" name="course-code" placeholder="CS301" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                name="duration"
                type="number"
                defaultValue="90"
                min="30"
                max="240"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-name">Course Name</Label>
            <Input id="course-name" name="course-name" placeholder="Database Systems" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="venue">Venue</Label>
            <Input id="venue" name="venue" placeholder="Room 101, Main Building" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduled-time">Scheduled Time</Label>
            <Input id="scheduled-time" name="scheduled-time" type="datetime-local" required />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Creating..." : "Create Lecture"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLectureDialog;
