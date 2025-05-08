-- Create library zones reference table
CREATE TABLE IF NOT EXISTS library_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  floor INTEGER NOT NULL,
  description TEXT
);

-- Main posts table with Supabase Auth user_id reference
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  zone_id UUID REFERENCES library_zones(id),
  occupancy_data JSONB,
  image_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- When the post will expire
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Reactions (likes, etc.) with Supabase Auth user_id reference
CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id, type)
);

-- Comments/replies with Supabase Auth user_id reference
CREATE TABLE replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hashtags/Topics
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL
);

-- Join table for posts and topics
CREATE TABLE post_topics (
  post_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, topic_id)
);

-- Enable RLS on all tables
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_zones ENABLE ROW LEVEL SECURITY;

-- Allow users to see all communications
CREATE POLICY "Anyone can view communications"
ON communications FOR SELECT
USING (true);

-- Allow authenticated users to insert their own communications
CREATE POLICY "Authenticated users can insert communications"
ON communications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update/delete only their own communications
CREATE POLICY "Users can update own communications"
ON communications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own communications"
ON communications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Reaction policies
CREATE POLICY "Anyone can view reactions"
ON reactions FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert reactions"
ON reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
ON reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Reply policies
CREATE POLICY "Anyone can view replies"
ON replies FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert replies"
ON replies FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies"
ON replies FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Topic policies
CREATE POLICY "Anyone can view topics"
ON topics FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert topics"
ON topics FOR INSERT
TO authenticated
WITH CHECK (true);

-- Post-topic policies
CREATE POLICY "Anyone can view post_topics"
ON post_topics FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert post_topics"
ON post_topics FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM communications
    WHERE id = post_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own post_topics"
ON post_topics FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM communications
    WHERE id = post_id AND user_id = auth.uid()
  )
);

-- Library zone policies
CREATE POLICY "Anyone can view library_zones"
ON library_zones FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify library_zones"
ON library_zones FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Only admins can update library_zones"
ON library_zones FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Only admins can delete library_zones"
ON library_zones FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Insert initial library zones
INSERT INTO library_zones (name, capacity, floor, description)
VALUES 
  ('Main Reading Area', 100, 1, 'Open space with tables and power outlets'),
  ('Quiet Study Zone', 50, 1, 'Silent study area with individual desks'),
  ('Group Study Rooms', 30, 2, 'Enclosed rooms for collaborative work'),
  ('Computer Lab', 40, 2, 'Workstations with specialized software'),
  ('Research Commons', 35, 3, 'Advanced research resources and meeting spaces')
ON CONFLICT (id) DO NOTHING;

-- Create scheduled function for cleanup (run this in Supabase dashboard)
COMMENT ON TABLE communications IS 'Posts in the library communications platform with automatic expiration'; 