-- =================================================================
-- FIX RPC FUNCTIONS
-- =================================================================
-- This migration recreates the reservation-related functions to ensure
-- they have the correct parameter types and behavior. This fixes the
-- "invalid input syntax for type boolean" error.
-- =================================================================

-- First, drop the existing functions (if they exist)
DROP FUNCTION IF EXISTS confirm_reservation(uuid);
DROP FUNCTION IF EXISTS create_reservation_with_hold(int, timestamptz, timestamptz, text, int);
DROP FUNCTION IF EXISTS check_reservation_overlap(int, timestamptz, timestamptz, uuid);

-- Recreate the check_reservation_overlap function
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

  -- Check for any overlapping reservations with 'confirmed' status only
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
  
  RETURN overlap_exists;
END;
$$ LANGUAGE plpgsql;

-- Recreate the create_reservation_with_hold function
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
  
  -- Check if the user is authenticated
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create a reservation';
  END IF;
  
  -- Check if the requested time slot overlaps with existing reservations
  SELECT check_reservation_overlap(p_room_id, p_start_time, p_end_time) INTO v_overlap;
  
  -- If overlap exists, throw an exception to prevent the booking
  IF v_overlap THEN
    RAISE EXCEPTION 'Overlapping reservation for this room and time period is not allowed';
  END IF;
  
  -- Create the reservation with a 30-second hold
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
  
  RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the confirm_reservation function
CREATE OR REPLACE FUNCTION confirm_reservation(
  p_reservation_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_user_email text;
  v_reservation reservations;
  v_overlap boolean;
  result jsonb;
BEGIN
  -- Get the current user's email from the auth context
  v_user_email := auth.email();
  
  -- Check if the user is authenticated
  IF v_user_email IS NULL THEN
    result := jsonb_build_object('confirmError', 'Authentication required to confirm a reservation');
    RETURN result;
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
    result := jsonb_build_object('confirmError', 'Reservation not found or not yours');
    RETURN result;
  END IF;
  
  -- Check if the reservation is still in pending state
  IF v_reservation.status != 'pending' THEN
    result := jsonb_build_object('confirmError', 'Reservation is not in pending state');
    RETURN result;
  END IF;
  
  -- Check if the hold has expired
  IF v_reservation.hold_expiry < now() THEN
    result := jsonb_build_object('confirmError', 'Reservation hold has expired');
    RETURN result;
  END IF;
  
  -- Double-check for overlaps in case another booking was made simultaneously
  SELECT check_reservation_overlap(
    v_reservation.room_id, 
    v_reservation.start_time, 
    v_reservation.end_time,
    v_reservation.id
  ) INTO v_overlap;
  
  -- If an overlap was detected during confirmation, reject the booking
  IF v_overlap THEN
    -- Cancel this reservation since it can't be confirmed
    UPDATE reservations
    SET status = 'cancelled'
    WHERE id = p_reservation_id;
    
    result := jsonb_build_object('confirmError', 'Overlapping reservation detected during confirmation');
    RETURN result;
  END IF;
  
  -- All checks passed, confirm the reservation
  UPDATE reservations
  SET status = 'confirmed', hold_expiry = NULL
  WHERE id = p_reservation_id;
  
  -- Success - return null error to indicate success
  result := jsonb_build_object('confirmError', null);
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 