-- Allow lecturers to view profiles of students who attended their lectures
CREATE POLICY "Lecturers can view student profiles for their lectures"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM attendance a
    JOIN lectures l ON l.id = a.lecture_id
    WHERE a.student_id = profiles.id 
    AND l.lecturer_id = auth.uid()
  )
);