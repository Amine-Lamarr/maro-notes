-- Run this entire script in the Supabase SQL Editor

-- 1. Create table `profiles` if it doesn't exist, and ensure `role` exists.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add column if the table was created previously without it
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

-- Turn off RLS for profiles temporarily so the app works easily during preview
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Create table `years`
CREATE TABLE IF NOT EXISTS public.years (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.years DISABLE ROW LEVEL SECURITY;

-- 3. Create table `modules`
CREATE TABLE IF NOT EXISTS public.modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year_id UUID,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Force the year_id to reference years (fixes issues if table existed before)
ALTER TABLE public.modules DROP CONSTRAINT IF EXISTS modules_year_id_fkey;
DELETE FROM public.modules WHERE year_id NOT IN (SELECT id FROM public.years);
ALTER TABLE public.modules ADD CONSTRAINT modules_year_id_fkey FOREIGN KEY (year_id) REFERENCES public.years(id) ON DELETE CASCADE;

ALTER TABLE public.modules DISABLE ROW LEVEL SECURITY;

-- 4. Create table `notes`
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  thumbnail_url TEXT,
  file_path TEXT,
  type TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_module_id_fkey;
DELETE FROM public.notes WHERE module_id IS NOT NULL AND module_id NOT IN (SELECT id FROM public.modules);
ALTER TABLE public.notes ADD CONSTRAINT notes_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;

-- Safely add columns if columns didn't exist
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS preview_file_path TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

ALTER TABLE public.notes DISABLE ROW LEVEL SECURITY;

-- 5. Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('modules', 'modules', true) ON CONFLICT (id) DO NOTHING;
UPDATE storage.buckets SET public = true WHERE id = 'modules';

-- Storage policies (allow all for simplicity in dev)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'modules');

DROP POLICY IF EXISTS "Auth Insert" ON storage.objects;
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'modules' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING (bucket_id = 'modules' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING (bucket_id = 'modules' AND auth.role() = 'authenticated');

-- 6. Insert default years if they don't exist
INSERT INTO public.years (name)
SELECT '1st Year' WHERE NOT EXISTS (SELECT 1 FROM public.years WHERE name = '1st Year');
INSERT INTO public.years (name)
SELECT '2nd Year' WHERE NOT EXISTS (SELECT 1 FROM public.years WHERE name = '2nd Year');
INSERT INTO public.years (name)
SELECT '3rd Year' WHERE NOT EXISTS (SELECT 1 FROM public.years WHERE name = '3rd Year');

-- 8. Create purchases table for tracking access
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE,
  stripe_session_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.purchases DISABLE ROW LEVEL SECURITY;
