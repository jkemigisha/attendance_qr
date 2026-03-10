-- Function to check if a user is a lecturer securely without triggering recursion on profiles
CREATE OR REPLACE FUNCTION public.is_lecturer(_user_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id
      AND role = 'lecturer'
  )
$$;

-- Allow lecturers to view all students
CREATE POLICY "Lecturers can view all students"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_lecturer(auth.uid()) AND role = 'student');

-- Allow lecturers to update students
CREATE POLICY "Lecturers can update students"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_lecturer(auth.uid()) AND role = 'student');
