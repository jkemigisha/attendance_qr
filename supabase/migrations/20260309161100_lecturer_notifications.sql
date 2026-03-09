-- Create lecturer_notifications table for attendance anomaly alerts
CREATE TABLE IF NOT EXISTS public.lecturer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecturer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lecture_id UUID REFERENCES public.lectures(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'low_turnout',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.lecturer_notifications ENABLE ROW LEVEL SECURITY;

-- Lecturers can view their own notifications
CREATE POLICY "Lecturers can view their own notifications"
  ON public.lecturer_notifications FOR SELECT
  TO authenticated
  USING (lecturer_id = auth.uid());

-- Lecturers can mark their own notifications as read
CREATE POLICY "Lecturers can mark their notifications as read"
  ON public.lecturer_notifications FOR UPDATE
  TO authenticated
  USING (lecturer_id = auth.uid())
  WITH CHECK (lecturer_id = auth.uid());

-- Any authenticated user can insert lecturer notifications
CREATE POLICY "Authenticated users can send lecturer notifications"
  ON public.lecturer_notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can do everything on lecturer_notifications
CREATE POLICY "Admins can manage lecturer notifications"
  ON public.lecturer_notifications FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Indexes for fast lookups
CREATE INDEX lecturer_notifications_lecturer_id_idx ON public.lecturer_notifications(lecturer_id);
CREATE INDEX lecturer_notifications_is_read_idx ON public.lecturer_notifications(lecturer_id, is_read);
CREATE INDEX lecturer_notifications_lecture_id_idx ON public.lecturer_notifications(lecture_id);
