-- =================================================================
-- FIX FOREIGN KEY CONSTRAINT FOR RESERVATIONS TABLE
-- =================================================================
-- This migration adds the foreign key constraint between reservations.room_id 
-- and rooms.id if it's missing. It's intended to fix the database schema 
-- without losing any data.
-- =================================================================

-- First check if the constraint already exists
DO $$
DECLARE
  constraint_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name LIKE 'reservations_room_id_fkey%' 
    AND table_name = 'reservations'
  ) INTO constraint_exists;
  
  -- Only add the constraint if it doesn't exist
  IF NOT constraint_exists THEN
    -- Add the foreign key constraint
    ALTER TABLE reservations 
    ADD CONSTRAINT reservations_room_id_fkey 
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint: reservations_room_id_fkey';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists.';
  END IF;
END $$; 