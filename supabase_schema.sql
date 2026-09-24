-- Copy and paste this into the Supabase SQL Editor and click "Run"

-- 1. Create Profiles Table (for roles)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user'
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Create Years Table (e.g. "Year 1", "Year 2", "Biology")
CREATE TABLE years (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Years are viewable by everyone." ON years FOR SELECT USING (true);
CREATE POLICY "Only admins can insert years." ON years FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 3. Create Modules Table (e.g. "Neurons")
CREATE TABLE modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  year_id UUID REFERENCES years(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Modules are viewable by everyone." ON modules FOR SELECT USING (true);
CREATE POLICY "Only admins can insert modules." ON modules FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 4. Create Notes Table (for files within modules)
CREATE TABLE notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  preview_file_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notes are viewable by everyone." ON notes FOR SELECT USING (true);
CREATE POLICY "Only admins can insert notes." ON notes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 5. Create Storage Buckets for files and thumbnails
INSERT INTO storage.buckets (id, name, public) VALUES ('modules', 'modules', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('notes', 'notes', true);

-- Storage Policies (Public view)
CREATE POLICY "Modules materials are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'modules');
CREATE POLICY "Notes materials are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'notes');

-- Storage Policies (Admin insertion)
CREATE POLICY "Admins can upload to modules." ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'modules' AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
CREATE POLICY "Admins can upload to notes." ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'notes' AND EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- For testing, automatically make the first user an admin
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  SELECT NOT EXISTS(SELECT 1 FROM public.profiles) INTO is_first_user;
  
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, CASE WHEN is_first_user THEN 'admin' ELSE 'user' END);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Create Purchases Table (for unlocking documents permanently)
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  payment_status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_note UNIQUE (user_id, note_id)
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own purchases
CREATE POLICY "Users can view their own purchases." 
  ON purchases FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow users to insert their own purchases upon completing checkout
CREATE POLICY "Users can insert their own purchases." 
  ON purchases FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow admins full access
CREATE POLICY "Admins have full access to purchases." 
  ON purchases FOR ALL 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

