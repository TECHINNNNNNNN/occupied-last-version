-- =================================================================
-- CHULALONGKORN ENGINEERING LIBRARY RESERVATION SYSTEM DATABASE
-- =================================================================
-- This migration file sets up the complete database structure for the
-- library reservation system, including tables, functions, and security
-- policies. The system is designed to handle same-day room bookings with
-- built-in concurrency control and reservation holds.
-- =================================================================

-- =================================================================
-- TABLE DEFINITIONS
-- =================================================================

-- User profiles table
-- Stores extended user information beyond what auth.users provides
-- Links to Supabase Auth system via the id foreign key
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY, -- Links to Supabase auth
  role text NOT NULL DEFAULT 'student', -- User role (student, faculty, admin, etc.)
  created_at timestamptz NOT NULL DEFAULT now(), -- When the profile was created
  updated_at timestamptz NOT NULL DEFAULT now(), -- When the profile was last updated
  name text, -- User's full name
  avatar_url text -- URL to the user's profile image
);

-- Study rooms table
-- Stores information about available rooms in the library
-- Each room has properties like capacity and available equipment
CREATE TABLE IF NOT EXISTS rooms (
  id serial PRIMARY KEY, -- Auto-incrementing room identifier
  name text NOT NULL, -- Room name/number (e.g., "Room 101")
  capacity int NOT NULL, -- Maximum number of people allowed in the room
  has_projector boolean NOT NULL DEFAULT false, -- Whether the room has a projector
  photo_url text, -- URL to a photo of the room
  location text, -- Physical location description (e.g., "2nd Floor, East Wing")
  created_at timestamptz NOT NULL DEFAULT now() -- When the room was added to the system
);

-- Room reservations table
-- Tracks all reservation data including status and time periods
-- Implements a soft-hold system to prevent double bookings during form submission
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), -- Unique reservation identifier
  room_id int REFERENCES rooms(id) ON DELETE CASCADE NOT NULL, -- Which room is being reserved
  user_email text NOT NULL, -- Email of the user making the reservation (for easier querying)
  start_time timestamptz NOT NULL, -- When the reservation starts
  end_time timestamptz NOT NULL, -- When the reservation ends
  agenda text, -- Purpose of the reservation
  num_people int, -- Expected number of attendees
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')), -- Reservation status
  hold_expiry timestamptz, -- When a temporary hold expires (for concurrency control)
  created_at timestamptz NOT NULL DEFAULT now() -- When the reservation was created
);

-- =================================================================
-- INDEX CREATION
-- =================================================================
-- Indexes improve query performance for common access patterns
-- These are carefully selected based on expected query patterns

-- Index on room_id for quick lookup of all reservations for a room
CREATE INDEX IF NOT EXISTS reservations_room_id_idx ON reservations(room_id);

-- Index on user_email for quick lookup of all reservations by a user
CREATE INDEX IF NOT EXISTS reservations_user_email_idx ON reservations(user_email);

-- Index on status for filtering reservations by their status
CREATE INDEX IF NOT EXISTS reservations_status_idx ON reservations(status);

-- Index on start_time for filtering reservations by date/time
CREATE INDEX IF NOT EXISTS reservations_start_time_idx ON reservations(start_time);

-- =================================================================
-- DATABASE FUNCTIONS
-- =================================================================

-- =================================================================
-- Function: check_reservation_overlap
-- =================================================================
-- PURPOSE: Checks if a new/updated reservation overlaps with existing ones
-- INPUTS:
--   p_room_id: The room ID to check
--   p_start_time: The proposed reservation start time
--   p_end_time: The proposed reservation end time
--   p_exclude_reservation_id: Optional ID to exclude (for updates)
-- RETURNS: Boolean indicating whether an overlap exists
-- USAGE: Used by reservation creation and update operations
-- =================================================================
CREATE OR REPLACE FUNCTION check_reservation_overlap(
  p_room_id int,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_exclude_reservation_id uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  overlap_exists boolean;
BEGIN
  -- Check for any overlapping reservations with 'confirmed' or 'pending' status
  -- Three overlap cases:
  -- 1. Existing reservation starts before new one and ends during it
  -- 2. Existing reservation starts during new one and ends after it
  -- 3. Existing reservation is completely contained within new one
  SELECT EXISTS (
    SELECT 1
    FROM reservations
    WHERE room_id = p_room_id
      AND status IN ('confirmed', 'pending')
      AND (p_exclude_reservation_id IS NULL OR id != p_exclude_reservation_id)
      AND (
        (start_time <= p_start_time AND end_time > p_start_time) OR
        (start_time < p_end_time AND end_time >= p_end_time) OR
        (start_time >= p_start_time AND end_time <= p_end_time)
      )
  ) INTO overlap_exists;
  
  RETURN overlap_exists;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- Function: create_reservation_with_hold
-- =================================================================
-- PURPOSE: Creates a reservation with a temporary hold to prevent race conditions
-- INPUTS:
--   p_room_id: Which room to reserve
--   p_start_time: When the reservation starts
--   p_end_time: When the reservation ends
--   p_agenda: Purpose of the reservation
--   p_num_people: How many people will be using the room
-- RETURNS: UUID of the created reservation
-- SECURITY: Uses SECURITY DEFINER to run with privileges of the creator
-- BUSINESS LOGIC:
--   1. Checks for overlapping reservations
--   2. Creates a new reservation with 'pending' status
--   3. Sets a 30-second hold expiry for concurrency control
-- =================================================================
CREATE OR REPLACE FUNCTION create_reservation_with_hold(
  p_room_id int,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_agenda text,
  p_num_people int
)
RETURNS uuid AS $$
DECLARE
  v_reservation_id uuid;
  v_user_email text;
  v_overlap boolean;
BEGIN
  -- Get the current user's email from the auth context
  v_user_email := auth.email();
  
  -- Check if the requested time slot overlaps with existing reservations
  SELECT check_reservation_overlap(p_room_id, p_start_time, p_end_time) INTO v_overlap;
  
  -- If overlap exists, throw an exception to prevent the booking
  IF v_overlap THEN
    RAISE EXCEPTION 'Reservation overlaps with an existing booking';
  END IF;
  
  -- Create the reservation with a 30-second hold
  -- This temporary hold prevents other users from booking the same slot
  -- while the current user completes their form submission
  INSERT INTO reservations (
    room_id,
    user_email,
    start_time,
    end_time,
    agenda,
    num_people,
    status,
    hold_expiry
  ) VALUES (
    p_room_id,
    v_user_email,
    p_start_time,
    p_end_time,
    p_agenda,
    p_num_people,
    'pending', -- Initial status is pending until confirmed
    now() + interval '30 seconds' -- Hold expires after 30 seconds
  ) RETURNING id INTO v_reservation_id;
  
  RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- Function: confirm_reservation
-- =================================================================
-- PURPOSE: Confirms a previously held reservation
-- INPUTS:
--   p_reservation_id: UUID of the reservation to confirm
-- RETURNS: Boolean indicating success
-- SECURITY: Uses SECURITY DEFINER to run with privileges of the creator
-- BUSINESS LOGIC:
--   1. Verifies the reservation exists and belongs to the current user
--   2. Checks that the hold hasn't expired
--   3. Double-checks for any new overlaps that might have occurred
--   4. Updates the reservation to 'confirmed' status
-- EDGE CASES:
--   - Handles cases where the hold expired
--   - Handles race conditions where another booking was made simultaneously
-- =================================================================
CREATE OR REPLACE FUNCTION confirm_reservation(
  p_reservation_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_user_email text;
  v_reservation reservations;
  v_overlap boolean;
BEGIN
  -- Get the current user's email from the auth context
  v_user_email := auth.email();
  
  -- Retrieve the reservation, ensuring it belongs to the current user
  SELECT * FROM reservations 
  WHERE id = p_reservation_id 
  AND user_email = v_user_email
  INTO v_reservation;
  
  -- Verify the reservation exists and belongs to the user
  IF v_reservation IS NULL THEN
    RAISE EXCEPTION 'Reservation not found or not yours';
  END IF;
  
  -- Check if the reservation is still in pending state
  IF v_reservation.status != 'pending' THEN
    RAISE EXCEPTION 'Reservation is not in pending state';
  END IF;
  
  -- Check if the hold has expired
  IF v_reservation.hold_expiry < now() THEN
    RAISE EXCEPTION 'Reservation hold has expired';
  END IF;
  
  -- Double-check for overlap in case another booking was made simultaneously
  -- This is a critical concurrency control to prevent double bookings
  SELECT check_reservation_overlap(
    v_reservation.room_id, 
    v_reservation.start_time, 
    v_reservation.end_time,
    v_reservation.id
  ) INTO v_overlap;
  
  -- If an overlap was detected during confirmation, reject the booking
  IF v_overlap THEN
    RAISE EXCEPTION 'Reservation overlaps with a booking that was just made';
  END IF;
  
  -- Confirm the reservation by setting status to confirmed and clearing hold_expiry
  UPDATE reservations
  SET status = 'confirmed', hold_expiry = NULL
  WHERE id = p_reservation_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- Function: cleanup_expired_holds
-- =================================================================
-- PURPOSE: Automatically cancels reservations where the hold has expired
-- RETURNS: void
-- USAGE: Should be run periodically (e.g., every minute) using a scheduled job
-- BUSINESS LOGIC: Any 'pending' reservation with an expired hold gets cancelled
-- =================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_holds()
RETURNS void AS $$
BEGIN
  -- Find all pending reservations with expired holds and mark them as cancelled
  UPDATE reservations
  SET status = 'cancelled'
  WHERE status = 'pending'
  AND hold_expiry < now();
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =================================================================
-- RLS ensures data access is properly restricted based on user identity
-- These policies work alongside the application logic to provide defense in depth

-- Enable RLS on all tables (requires explicit policies for access)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- Policies for profiles table
-- =================================================================

-- Allow users to view only their own profile information
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update only their own profile information
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- =================================================================
-- Policies for rooms table
-- =================================================================

-- Allow all authenticated users to view room information
-- This is public information needed for making reservations
CREATE POLICY "Anyone can view rooms"
  ON rooms FOR SELECT
  TO authenticated
  USING (true);

-- =================================================================
-- Policies for reservations table
-- =================================================================

-- Allow users to view only their own reservations for privacy
CREATE POLICY "Users can view their own reservations"
  ON reservations FOR SELECT
  TO authenticated
  USING (user_email = auth.email());

-- Allow users to view confirmed reservations for all rooms
-- This is needed so users can see which time slots are unavailable
CREATE POLICY "Users can view all reservations for rooms they want to book"
  ON reservations FOR SELECT
  TO authenticated
  USING (status = 'confirmed');

-- Allow users to create reservations, but only for themselves
CREATE POLICY "Users can create reservations"
  ON reservations FOR INSERT
  TO authenticated
  WITH CHECK (user_email = auth.email());

-- Allow users to update only their own reservations (e.g., cancel)
CREATE POLICY "Users can update their own reservations"
  ON reservations FOR UPDATE
  TO authenticated
  USING (user_email = auth.email());

-- =================================================================
-- TRIGGERS
-- =================================================================

-- =================================================================
-- Trigger: update_profile_updated_at
-- =================================================================
-- PURPOSE: Automatically updates the updated_at timestamp when a profile is modified
-- TRIGGER: Fires BEFORE UPDATE on the profiles table for each row
-- =================================================================
CREATE OR REPLACE FUNCTION update_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Set the updated_at field to the current timestamp
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger linking the function to the profiles table
CREATE TRIGGER trigger_update_profile_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_profile_updated_at(); 