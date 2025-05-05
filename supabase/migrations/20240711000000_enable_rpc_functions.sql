-- =================================================================
-- ENABLE RPC FUNCTIONS FOR RESERVATION SYSTEM
-- =================================================================
-- This migration ensures that the necessary functions for the reservation
-- system are properly exposed for RPC calls from the client-side application.
-- =================================================================

-- First, make sure the functions exist and are using SECURITY DEFINER
-- to run with appropriate privileges

-- Re-create the create_reservation_with_hold function with SECURITY DEFINER
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

-- Re-create the confirm_reservation function with SECURITY DEFINER
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
  
  -- Check if the user is authenticated
  IF v_user_email IS NULL THEN
    RAISE EXCEPTION 'Authentication required to confirm a reservation';
  END IF;
  
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
-- Grant RPC access to authenticated users
-- =================================================================
-- Explicitly grant EXECUTE permission to authenticated users
-- This ensures the functions can be called via RPC

-- Grant execute permission on reservation functions
GRANT EXECUTE ON FUNCTION create_reservation_with_hold(int, timestamptz, timestamptz, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_reservation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_reservation_overlap(int, timestamptz, timestamptz, uuid) TO authenticated; 