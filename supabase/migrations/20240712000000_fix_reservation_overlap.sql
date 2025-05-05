-- =================================================================
-- FIX RESERVATION OVERLAP FUNCTION (with enhanced logging)
-- =================================================================
-- This migration fixes the reservation overlap detection logic to properly
-- handle self-references and edge cases.
-- =================================================================

-- Function: check_reservation_overlap (Enhanced Logging)
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
  RAISE NOTICE '[check_overlap] Start: room=%, start=%, end=%, exclude_id=%',
    p_room_id, p_start_time, p_end_time, p_exclude_reservation_id;

  IF p_start_time >= p_end_time THEN
    RAISE WARNING '[check_overlap] Invalid time range: start >= end';
    RAISE EXCEPTION 'Invalid time range: start time must be before end time';
  END IF;

  RAISE NOTICE '[check_overlap] Cleaning expired holds...';
  UPDATE reservations
  SET status = 'cancelled'
  WHERE status = 'pending' AND hold_expiry < now();
  RAISE NOTICE '[check_overlap] Expired holds cleaned.';

  RAISE NOTICE '[check_overlap] Checking against confirmed reservations...';
  SELECT EXISTS (
    SELECT 1
    FROM reservations
    WHERE room_id = p_room_id
      AND status = 'confirmed'
      AND (p_exclude_reservation_id IS NULL OR id != p_exclude_reservation_id)
      AND (
        (p_start_time >= start_time AND p_start_time < end_time) OR
        (p_end_time > start_time AND p_end_time <= end_time) OR
        (p_start_time <= start_time AND p_end_time >= end_time)
      )
  ) INTO overlap_exists;
  
  RAISE NOTICE '[check_overlap] Result: %', overlap_exists;
  RETURN overlap_exists;
END;
$$ LANGUAGE plpgsql;

-- Function: create_reservation_with_hold (Enhanced Logging)
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
  RAISE NOTICE '[create_hold] Start: room=%, start=%, end=%', p_room_id, p_start_time, p_end_time;
  v_user_email := auth.email();
  RAISE NOTICE '[create_hold] User email: %', v_user_email;

  IF v_user_email IS NULL THEN
    RAISE WARNING '[create_hold] Auth check failed: User email is NULL';
    RAISE EXCEPTION 'Authentication required to create a reservation';
  END IF;
  
  RAISE NOTICE '[create_hold] Cleaning expired holds and user pending...';
  UPDATE reservations
  SET status = 'cancelled'
  WHERE (status = 'pending' AND hold_expiry < now()) OR (status = 'pending' AND user_email = v_user_email);
  RAISE NOTICE '[create_hold] Cleanup done.';

  RAISE NOTICE '[create_hold] Calling check_reservation_overlap...';
  SELECT check_reservation_overlap(p_room_id, p_start_time, p_end_time) INTO v_overlap;
  RAISE NOTICE '[create_hold] Overlap check returned: %', v_overlap;
  
  IF v_overlap THEN
    RAISE WARNING '[create_hold] Overlap detected!';
    RAISE EXCEPTION 'Overlapping reservation for this room and time period is not allowed';
  END IF;
  
  RAISE NOTICE '[create_hold] Inserting new pending reservation...';
  INSERT INTO reservations (
    room_id, user_email, start_time, end_time, agenda, num_people, status, hold_expiry
  ) VALUES (
    p_room_id, v_user_email, p_start_time, p_end_time, p_agenda, p_num_people, 'pending', now() + interval '30 seconds'
  ) RETURNING id INTO v_reservation_id;
  
  RAISE NOTICE '[create_hold] Inserted pending reservation with ID: %', v_reservation_id;
  RETURN v_reservation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: confirm_reservation (Enhanced Logging)
CREATE OR REPLACE FUNCTION confirm_reservation(
  p_reservation_id uuid
)
RETURNS boolean AS $$
DECLARE
  v_user_email text;
  v_reservation reservations;
  v_overlap boolean;
BEGIN
  RAISE NOTICE '[confirm] Start: reservation_id=%', p_reservation_id;
  v_user_email := auth.email();
  RAISE NOTICE '[confirm] User email: %', v_user_email;

  IF v_user_email IS NULL THEN
    RAISE WARNING '[confirm] Auth check failed: User email is NULL';
    RAISE EXCEPTION 'Authentication required to confirm a reservation';
  END IF;
  
  RAISE NOTICE '[confirm] Cleaning expired holds...';
  UPDATE reservations
  SET status = 'cancelled'
  WHERE status = 'pending' AND hold_expiry < now();
  RAISE NOTICE '[confirm] Expired holds cleaned.';

  RAISE NOTICE '[confirm] Fetching reservation...';
  SELECT * FROM reservations 
  WHERE id = p_reservation_id AND user_email = v_user_email
  INTO v_reservation;
  
  IF v_reservation IS NULL THEN
    RAISE WARNING '[confirm] Reservation not found or does not belong to user.';
    RAISE EXCEPTION 'Reservation not found or not yours';
  END IF;
  RAISE NOTICE '[confirm] Found reservation: status=%, hold_expiry=%', v_reservation.status, v_reservation.hold_expiry;
  
  IF v_reservation.status != 'pending' THEN
    RAISE WARNING '[confirm] Reservation status is not pending: %', v_reservation.status;
    RAISE EXCEPTION 'Reservation is not in pending state';
  END IF;
  
  IF v_reservation.hold_expiry < now() THEN
    RAISE WARNING '[confirm] Reservation hold expired: %', v_reservation.hold_expiry;
    RAISE EXCEPTION 'Reservation hold has expired';
  END IF;
  
  RAISE NOTICE '[confirm] Calling check_reservation_overlap...';
  SELECT check_reservation_overlap(
    v_reservation.room_id, v_reservation.start_time, v_reservation.end_time, v_reservation.id
  ) INTO v_overlap;
  RAISE NOTICE '[confirm] Overlap check returned: %', v_overlap;
  
  IF v_overlap THEN
    RAISE NOTICE '[confirm] Overlap detected during confirmation. Cancelling reservation ID: %', p_reservation_id;
    UPDATE reservations SET status = 'cancelled' WHERE id = p_reservation_id;
    RAISE EXCEPTION 'Overlapping reservation for this room and time period is not allowed';
  END IF;
  
  RAISE NOTICE '[confirm] Updating reservation to confirmed...';
  UPDATE reservations
  SET status = 'confirmed', hold_expiry = NULL
  WHERE id = p_reservation_id AND status = 'pending' AND user_email = v_user_email;
  
  RAISE NOTICE '[confirm] Reservation confirmed successfully.';
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions again just in case
GRANT EXECUTE ON FUNCTION check_reservation_overlap(int, timestamptz, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_reservation_with_hold(int, timestamptz, timestamptz, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_reservation(uuid) TO authenticated; 