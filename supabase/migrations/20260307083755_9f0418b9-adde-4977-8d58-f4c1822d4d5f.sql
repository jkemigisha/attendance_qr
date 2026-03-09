
-- Create app_role enum for admin roles
CREATE TYPE public.app_role AS ENUM ('admin');

-- Create user_roles table (separate from profiles as per security best practice)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check admin role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
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
      AND role = _role
  )
$$;

-- RLS: Only admins can view user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create courses table
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code TEXT NOT NULL UNIQUE,
    course_name TEXT NOT NULL,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Admins can do everything on courses
CREATE POLICY "Admins can manage courses"
ON public.courses FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Everyone can view courses
CREATE POLICY "Authenticated users can view courses"
ON public.courses FOR SELECT
TO authenticated
USING (true);

-- Admin policies for profiles (view all)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin policies for lectures (view all)
CREATE POLICY "Admins can view all lectures"
ON public.lectures FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin policies for attendance (view all)
CREATE POLICY "Admins can view all attendance"
ON public.attendance FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete profiles
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update any profile
CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete lectures
CREATE POLICY "Admins can delete lectures"
ON public.lectures FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can delete attendance
CREATE POLICY "Admins can delete attendance"
ON public.attendance FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
