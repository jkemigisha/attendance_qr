-- Add missing role enum + role column to profiles
-- This migration is safe to run multiple times.

CREATE TYPE IF NOT EXISTS public.user_role AS ENUM ('student', 'lecturer');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN role public.user_role NOT NULL DEFAULT 'student';
  END IF;
END;
$$;

-- Ensure existing profiles have a valid role value.
UPDATE public.profiles
SET role = 'student'
WHERE role IS NULL;