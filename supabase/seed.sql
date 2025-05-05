-- =================================================================
-- CHULALONGKORN ENGINEERING LIBRARY - SEED DATA SCRIPT
-- =================================================================
-- PURPOSE:
--   This script populates the database with initial room data for the
--   library reservation system. It provides a set of realistic study rooms
--   with varied capacities, equipment, and locations for testing and
--   demonstration purposes.
-- 
-- USAGE:
--   Run this script after creating the database tables but before using
--   the application. This creates a foundation of rooms that can be reserved.
-- =================================================================

-- First clear any existing data to prevent duplicates
-- This ensures a clean slate for our seed data
DELETE FROM reservations;
DELETE FROM rooms;

-- =================================================================
-- INSERT SAMPLE ROOMS
-- =================================================================
-- We're creating a variety of room types with different:
-- - Capacities (from individual pods to large conference rooms)
-- - Equipment options (some with projectors, some without)
-- - Locations (spread across different floors and wings)
-- This diversity allows testing all filtering and search capabilities.
-- =================================================================
INSERT INTO rooms (name, capacity, has_projector, photo_url, location)
VALUES
  -- Small rooms on the first floor
  ('Room 101', 4, true, 'https://images.unsplash.com/photo-1497366754035-f200968a6e72', 'Engineering Building, 1st Floor'),
  ('Room 102', 2, false, 'https://images.unsplash.com/photo-1497366811353-6870744d04b2', 'Engineering Building, 1st Floor'),
  
  -- Medium-sized rooms on the second floor
  ('Room 201', 6, true, 'https://images.unsplash.com/photo-1497215842964-222b430dc094', 'Engineering Building, 2nd Floor'),
  ('Room 202', 8, true, 'https://images.unsplash.com/photo-1497215728101-856f4ea42174', 'Engineering Building, 2nd Floor'),
  
  -- Room on the third floor
  ('Room 301', 4, false, 'https://images.unsplash.com/photo-1516156008625-3a9d6067fab5', 'Engineering Building, 3rd Floor'),
  
  -- Large conference room for bigger groups
  ('Conference Room A', 12, true, 'https://images.unsplash.com/photo-1517502884422-41eaead166d4', 'Engineering Building, Ground Floor'),
  
  -- Individual study pods for solo work
  ('Study Pod 1', 1, false, 'https://images.unsplash.com/photo-1535957998253-26ae1ef29506', 'Library, East Wing'),
  ('Study Pod 2', 1, false, 'https://images.unsplash.com/photo-1535957998253-26ae1ef29506', 'Library, East Wing'),
  
  -- Group study rooms in the library
  ('Group Study Room 1', 6, false, 'https://images.unsplash.com/photo-1517502884422-41eaead166d4', 'Library, West Wing'),
  ('Group Study Room 2', 8, true, 'https://images.unsplash.com/photo-1517502884422-41eaead166d4', 'Library, West Wing'); 