-- Create notifications table for low attendance alerts
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'low_attendance',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Students can SELECT their own notifications
CREATE POLICY "Students can view their own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (student_id = auth.uid());

-- Students can mark their own notifications as read (UPDATE is_read only)
CREATE POLICY "Students can mark their notifications as read"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Lecturers can insert notifications
CREATE POLICY "Lecturers can send notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'lecturer'
    )
  );

-- Admins can do everything on notifications
CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups by student
CREATE INDEX notifications_student_id_idx ON public.notifications(student_id);
CREATE INDEX notifications_is_read_idx ON public.notifications(student_id, is_read);
