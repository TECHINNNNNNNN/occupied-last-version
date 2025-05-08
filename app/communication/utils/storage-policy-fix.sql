-- =============================================
-- STORAGE BUCKET POLICIES FOR COMMUNICATION IMAGES
-- =============================================
-- Purpose: This script sets up the proper Row Level Security (RLS)
-- policies for the 'communication-images' storage bucket to ensure
-- images can be uploaded and viewed properly.
--
-- Execution: Run this in the Supabase SQL Editor
-- =============================================

-- First, create the bucket if it doesn't exist (OPTIONAL - usually created via UI)
-- Uncomment if you need to create the bucket programmatically
/*
INSERT INTO storage.buckets (id, name, public)
VALUES ('communication-images', 'communication-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;
*/

-- =============================================
-- POLICY 1: Allow authenticated users to upload images
-- =============================================
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'communication-images' AND
  -- Optional size limit check
  (octet_length(storage.foldername(name)) = 0 AND octet_length(name) < 200)
);

-- =============================================
-- POLICY 2: Allow public access to view all images
-- =============================================
-- This is critical for displaying images in posts
CREATE POLICY "Allow public read access to all images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'communication-images');

-- =============================================
-- POLICY 3: Allow users to update their own images
-- =============================================
CREATE POLICY "Allow users to update their own images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'communication-images' AND (auth.uid() = owner))
WITH CHECK (bucket_id = 'communication-images');

-- =============================================
-- POLICY 4: Allow users to delete their own images
-- =============================================
CREATE POLICY "Allow users to delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'communication-images' AND (auth.uid() = owner));

-- =============================================
-- Enable CORS for the storage API
-- =============================================
-- Note: CORS cannot be configured via SQL directly.
-- You need to do this in the Supabase Dashboard:
--
-- 1. Go to Storage > Configuration
-- 2. Under CORS configuration, ensure you have:
--    {
--      "allow_origins": ["*"],
--      "expose_headers": ["Content-Length", "Content-Range"],
--      "max_age": 3600
--    }
--
-- Or use the Supabase Management API to set these values 