-- Create a security definer function to check if user is a student
CREATE OR REPLACE FUNCTION public.is_student(_user_id uuid)
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
      AND role = 'student'::user_role
  )
$$;

-- Drop the existing policy that causes recursion
DROP POLICY IF EXISTS "Students can mark their own attendance" ON public.attendance;

-- Create new policy using the security definer function
CREATE POLICY "Students can mark their own attendance" 
ON public.attendance 
FOR INSERT 
TO authenticated
WITH CHECK (
  student_id = auth.uid() 
  AND public.is_student(auth.uid())
);