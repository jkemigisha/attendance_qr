-- Create a simpler admin check function that uses text to avoid cast issues
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::app_role
  )
$$;

-- Drop existing UPDATE policy for admins on profiles if it exists
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Recreate the UPDATE policy using the new simplified function and explicit WITH CHECK
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
