-- Setup scheduled cleanup of expired posts to run every 15 minutes
-- This is a SQL version of the cleanup function that can be run directly
-- in Supabase's SQL editor if Edge Functions are not available

-- First, make sure the pgcron extension is available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Add a comment to explain what we're doing
COMMENT ON EXTENSION pg_cron IS 'Scheduled job management for PostgreSQL';

-- Schedule the cleanup job
SELECT cron.schedule(
  'cleanup-expired-posts',     -- job name
  '*/15 * * * *',              -- run every 15 minutes (cron expression)
  $$
  -- Delete expired posts and get the count
  WITH deleted AS (
    DELETE FROM communications
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) FROM deleted;
  $$
);

-- Add comment to explain what the job does
COMMENT ON TABLE cron.job IS 'Scheduled jobs managed by pg_cron';
COMMENT ON TABLE communications IS 'Contains posts that automatically expire based on expires_at timestamp'; 