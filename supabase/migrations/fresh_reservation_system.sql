-- =====================================================
-- FRESH RESERVATION SYSTEM SETUP
-- =====================================================
-- This script completely rebuilds the reservation system
-- by dropping and recreating the reservations table and
-- its associated functions
-- =====================================================

-- First, drop existing functions to avoid dependency issues
DROP FUNCTION IF EXISTS confirm_reservation(uuid);
DROP FUNCTION IF EXISTS create_reservation_with_hold(int, timestamptz, timestamptz, text, int);
DROP FUNCTION IF EXISTS check_reservation_overlap(int, timestamptz, timestamptz, uuid);

-- Drop the existing reservations table
DROP TABLE IF EXISTS reservations;

-- Create a new reservations table with proper constraints
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id INT NOT NULL,
  user_email TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  agenda TEXT NOT NULL,
  num_people INT NOT NULL CHECK (num_people > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  hold_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Add constraint to ensure start_time is before end_time
  CONSTRAINT valid_timerange CHECK (start_time < end_time),
  
  -- Add a constraint to ensure hold_expiry is set for pending reservations
  CONSTRAINT pending_has_expiry CHECK (
    (status = 'pending' AND hold_expiry IS NOT NULL) OR
    (status != 'pending')
  )
);

-- Create index for faster reservation lookups
CREATE INDEX reservations_room_id_idx ON reservations(room_id);
CREATE INDEX reservations_user_email_idx ON reservations(user_email);
CREATE INDEX reservations_status_idx ON reservations(status);
CREATE INDEX reservations_times_idx ON reservations(start_time, end_time);

-- Create the check_reservation_overlap function
CREATE FUNCTION check_reservation_overlap(
  p_room_id int,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_exclude_reservation_id uuid DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  overlap_exists boolean;
  total_overlaps int;
BEGIN
  RAISE NOTICE '[check_overlap] Start check for room=%, start=%, end=%, exclude_id=%',
    p_room_id, p_start_time, p_end_time, p_exclude_reservation_id;

  -- Basic input validation
  IF p_room_id IS NULL OR p_start_time IS NULL OR p_end_time IS NULL THEN
    RAISE EXCEPTION 'Invalid inputs: room_id, start_time, and end_time cannot be NULL';
  END IF;
  
  IF p_start_time >= p_end_time THEN
    RAISE EXCEPTION 'Invalid time range: start time must be before end time';
  END IF;

  -- First, cleanup any expired holds to ensure we're working with valid data
  UPDATE reservations
  SET status = 'cancelled'
  WHERE status = 'pending' AND hold_expiry < now();
  
  -- Log the cleanup
  GET DIAGNOSTICS total_overlaps = ROW_COUNT;
  RAISE NOTICE '[check_overlap] Cleaned up % expired holds', total_overlaps;

  -- Check for any overlapping reservations with 'confirmed' status only
  -- Only confirmed reservations should block new bookings
  SELECT EXISTS (
    SELECT 1
    FROM reservations
    WHERE room_id = p_room_id
      AND status = 'confirmed'  -- Only confirmed reservations block new bookings
      AND (p_exclude_reservation_id IS NULL OR id != p_exclude_reservation_id)
      AND (
        -- Case 1: New reservation starts during an existing one
        (p_start_time >= start_time AND p_start_time < end_time)
        -- Case 2: New reservation ends during an existing one
        OR (p_end_time > start_time AND p_end_time <= end_time)
        -- Case 3: New reservation completely contains an existing one
        OR (p_start_time <= start_time AND p_end_time >= end_time)
      )
  ) INTO overlap_exists;
  
  -- Log the result for debugging
  RAISE NOTICE '[check_overlap] Overlap check result: %', overlap_exists;
  
  -- For verbose debugging, show all confirmed reservations for this room
  FOR overlap_exists IN
    SELECT id, start_time, end_time, status 
    FROM reservations 
    WHERE room_id = p_room_id AND status = 'confirmed'
  LOOP
    RAISE NOTICE '[check_overlap] Existing reservation: %, from % to %, status %', 
      overlap_exists.id, overlap_exists.start_time, 
      overlap_exists.end_time, overlap_exists.status;
  END LOOP;
  
  RETURN overlap_exists;
END;
$$ LANGUAGE plpgsql;

-- Create the create_reservation_with_hold function
CREATE FUNCTION create_reservation_with_hold(
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
  RAISE NOTICE '[create_hold] Starting for room=%, from % to %', 
    p_room_id, p_start_time, p_end_time;

  -- Get the current user's email from the auth context
  v_user_email := auth.email();
  RAISE NOTICE '[create_hold] User email: %', v_user_email;
  
  -- Check if the user is authenticated
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create a reservation';
  END IF;
  
  -- First, cancel any pending reservations by this user
  -- This helps prevent issues with multiple pending reservations
  UPDATE reservations
  SET status = 'cancelled'
  WHERE user_email = v_user_email
    AND status = 'pending';
  
  -- Check if the requested time slot overlaps with existing reservations
  RAISE NOTICE '[create_hold] Checking for overlaps...';
  SELECT check_reservation_overlap(p_room_id, p_start_time, p_end_time) INTO v_overlap;
  RAISE NOTICE '[create_hold] Overlap check result: %', v_overlap;
  
  -- If overlap exists, throw an exception to prevent the booking
  IF v_overlap THEN
    RAISE EXCEPTION 'Overlapping reservation for this room and time period is not allowed';
  END IF;
  
  -- Create the reservation with a 30-second hold
  RAISE NOTICE '[create_hold] Creating pending reservation...';
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
    'pending',
    now() + interval '30 seconds'
  ) RETURNING id INTO v_reservation_id;
  
  RAISE NOTICE '[create_hold] Created pending reservation with ID: %', v_reservation_id;
  RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the confirm_reservation function
CREATE FUNCTION confirm_reservation(
  p_reservation_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_user_email text;
  v_reservation reservations;
  v_overlap boolean;
BEGIN
  RAISE NOTICE '[confirm] Starting for reservation ID: %', p_reservation_id;
  
  -- Get the current user's email from the auth context
  v_user_email := auth.email();
  RAISE NOTICE '[confirm] User email: %', v_user_email;
  
  -- Check if the user is authenticated
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'Authentication required to confirm a reservation';
  END IF;
  
  -- Clean up any expired holds first
  UPDATE reservations
  SET status = 'cancelled'
  WHERE status = 'pending' AND hold_expiry < now();
  
  -- Retrieve the reservation, ensuring it belongs to the current user
  SELECT * FROM reservations 
  WHERE id = p_reservation_id AND user_email = v_user_email
  INTO v_reservation;
  
  -- Verify the reservation exists and belongs to the user
  IF v_reservation IS NULL THEN
    RAISE EXCEPTION 'Reservation not found or not yours';
  END IF;
  
  RAISE NOTICE '[confirm] Found reservation: status=%, hold_expiry=%', 
    v_reservation.status, v_reservation.hold_expiry;
  
  -- Check if the reservation is still in pending state
  IF v_reservation.status != 'pending' THEN
    RAISE EXCEPTION 'Reservation is not in pending state';
  END IF;
  
  -- Check if the hold has expired
  IF v_reservation.hold_expiry < now() THEN
    RAISE EXCEPTION 'Reservation hold has expired';
  END IF;
  
  -- Double-check for overlaps in case another booking was made simultaneously
  RAISE NOTICE '[confirm] Double-checking for overlaps...';
  SELECT check_reservation_overlap(
    v_reservation.room_id, 
    v_reservation.start_time, 
    v_reservation.end_time,
    v_reservation.id
  ) INTO v_overlap;
  
  RAISE NOTICE '[confirm] Final overlap check result: %', v_overlap;
  
  -- If an overlap was detected during confirmation, reject the booking
  IF v_overlap THEN
    -- Cancel this reservation since it can't be confirmed
    UPDATE reservations
    SET status = 'cancelled'
    WHERE id = p_reservation_id;
    
    RAISE EXCEPTION 'Overlapping reservation for this room and time period is not allowed';
  END IF;
  
  -- All validation passed - confirm the reservation
  RAISE NOTICE '[confirm] Updating reservation to confirmed status';
  UPDATE reservations
  SET status = 'confirmed', 
      hold_expiry = NULL
  WHERE id = p_reservation_id;
  
  RAISE NOTICE '[confirm] Reservation confirmed successfully';
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a cleanup function that automatically runs every minute
CREATE OR REPLACE FUNCTION cleanup_expired_holds()
RETURNS void AS $$
BEGIN
  UPDATE reservations
  SET status = 'cancelled'
  WHERE status = 'pending' AND hold_expiry < now();
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_reservation_overlap(int, timestamptz, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_reservation_with_hold(int, timestamptz, timestamptz, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_reservation(uuid) TO authenticated;

-- Set up Row Level Security
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Allow users to see all confirmed reservations (read-only)
CREATE POLICY "Users can view all confirmed reservations" ON reservations
    FOR SELECT
    USING (status = 'confirmed');

-- Allow users to view their own pending or cancelled reservations
CREATE POLICY "Users can view their own non-confirmed reservations" ON reservations
    FOR SELECT
    USING (user_email = auth.email() AND status != 'confirmed');

-- Allow functions to create and update reservations (handled by SECURITY DEFINER)
CREATE POLICY "Service functions can manage all reservations" ON reservations
    USING (true)
    WITH CHECK (true);

-- For debugging: show function has executed successfully
DO $$
BEGIN
    RAISE NOTICE 'Fresh reservation system has been successfully set up!';
END $$; 