'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useReservationStore } from '../store/reservationStore';
import { format, addMinutes, parseISO, isAfter } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

/**
 * TimelineSelector Component
 * ==========================
 * PURPOSE:
 *   Displays an interactive grid of time slots for the selected room,
 *   showing which slots are available for booking and allowing the user
 *   to select consecutive time slots for their reservation.
 * 
 * CONTEXT:
 *   Central component in the reservation flow that visualizes availability
 *   and allows users to select their desired time slots.
 * 
 * FEATURES:
 *   - Real-time updates of room availability
 *   - Clear visual distinction between available, booked, and selected slots
 *   - Enforces consecutive time slot selection
 *   - Dynamically adjusts to display only future time slots
 *   - Handles different operating hours for weekdays and weekends
 */

// Define time slot interval in minutes
// This constant sets the granularity of reservations
// 30 minutes is chosen as a balance between flexibility and practicality
const SLOT_INTERVAL = 30;

// Define operating hours based on library schedule
// Different hours for weekdays and weekends reflect real-world operation
// This avoids showing time slots when the library is closed
const OPERATING_HOURS = {
  weekday: { start: 8, end: 21 }, // 8:00 AM - 9:00 PM weekdays
  weekend: { start: 9, end: 18 }  // 9:00 AM - 6:00 PM weekends
};

const TimelineSelector = () => {
  // Access store values and auth context
  const { selectedRoomId, selectedSlots, setSelectedSlots } = useReservationStore();
  const { user } = useAuth();
  
  // State management for slot availability and loading states
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [reservedSlots, setReservedSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get today's date and determine if it's a weekend
  // This affects which operating hours we use
  const today = new Date();
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;
  
  // Select appropriate operating hours based on whether it's a weekday or weekend
  const hours = isWeekend ? OPERATING_HOURS.weekend : OPERATING_HOURS.weekday;

  /**
   * Generates all possible time slots for today during operating hours
   * 
   * PROCESS:
   * 1. Creates a list of time slots from opening until closing time
   * 2. Filters out past time slots (cannot book times that have already passed)
   * 3. Formats each slot as an ISO string for consistent comparison
   * 
   * @returns {string[]} Array of time slot strings in ISO format
   */
  const generateTimeSlots = () => {
    const slots: string[] = [];
    
    // Set start time to today at opening hour
    const startTime = new Date(today);
    startTime.setHours(hours.start, 0, 0, 0);
    
    // Set end time to today at closing hour
    const endTime = new Date(today);
    endTime.setHours(hours.end, 0, 0, 0);
    
    // Generate slots at regular intervals
    let currentSlot = startTime;
    
    while (currentSlot < endTime) {
      // Only include future time slots
      // This prevents booking slots in the past
      if (isAfter(currentSlot, new Date())) {
        slots.push(format(currentSlot, "yyyy-MM-dd'T'HH:mm:ss"));
      }
      // Advance to the next time slot
      currentSlot = addMinutes(currentSlot, SLOT_INTERVAL);
    }
    
    return slots;
  };

  /**
   * Fetches reservations for the selected room and calculates available slots
   * 
   * SIDE EFFECTS:
   * - Updates availableSlots and reservedSlots state
   * - Sets error state if fetch fails
   * - Controls loading state
   * 
   * IMPLEMENTATION DETAILS:
   * - Uses Supabase real-time subscriptions to keep data fresh
   * - Re-fetches when room selection changes
   * - Handles authentication requirements
   */
  useEffect(() => {
    // Define the fetch function inside the effect
    const fetchReservations = async () => {
      // Guard clause: don't proceed if no room selected or user not logged in
      if (!selectedRoomId || !user) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Format today's date range for the query
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        
        // Fetch all confirmed reservations for this room today
        const { data: confirmedReservations, error: confirmedError } = await supabase
          .from('reservations')
          .select('*')
          .eq('room_id', selectedRoomId)
          .eq('status', 'confirmed')
          .gte('start_time', todayStart.toISOString())
          .lte('end_time', todayEnd.toISOString());
          
        if (confirmedError) {
          console.error('Error fetching confirmed reservations:', confirmedError);
          throw confirmedError;
        }
        
        // Fetch all pending reservations for this room today that haven't expired
        const { data: pendingReservations, error: pendingError } = await supabase
          .from('reservations')
          .select('*')
          .eq('room_id', selectedRoomId)
          .eq('status', 'pending')
          .gte('hold_expiry', new Date().toISOString()) // Only pending reservations that haven't expired
          .gte('start_time', todayStart.toISOString())
          .lte('end_time', todayEnd.toISOString());
          
        if (pendingError) {
          console.error('Error fetching pending reservations:', pendingError);
          throw pendingError;
        }
        
        // Combine confirmed and pending reservations
        const allReservations = [
          ...(confirmedReservations || []),
          ...(pendingReservations || [])
        ];
        
        // Calculate which slots are reserved by expanding reservation time ranges
        // into individual slot time points
        const reserved: string[] = [];
        
        if (allReservations.length > 0) {
          allReservations.forEach(reservation => {
            try {
              const start = parseISO(reservation.start_time);
              const end = parseISO(reservation.end_time);
              
              // Validate that dates parsed correctly
              if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                console.error('Invalid date format in reservation:', reservation);
                return; // Skip this reservation
              }
              
              // For each reservation, mark all slots between start and end as reserved
              let current = start;
              while (current < end) {
                reserved.push(format(current, "yyyy-MM-dd'T'HH:mm:ss"));
                current = addMinutes(current, SLOT_INTERVAL);
              }
            } catch (parseError) {
              console.error('Error processing reservation:', parseError, reservation);
            }
          });
        }
        
        // Remove duplicates from reserved slots
        const uniqueReserved = [...new Set(reserved)];
        setReservedSlots(uniqueReserved);
        
        // Calculate available slots by filtering all possible slots
        // to exclude those that are reserved
        const allSlots = generateTimeSlots();
        const available = allSlots.filter(slot => !uniqueReserved.includes(slot));
        
        setAvailableSlots(available);
        
        // If there are no available slots, show a message
        if (available.length === 0 && allSlots.length > 0) {
          toast.info('This room is fully booked for today');
        }
      } catch (err) {
        console.error('Error fetching reservations:', err);
        setError('Failed to load availability. Please try again.');
        toast.error('Failed to load availability');
      } finally {
        setIsLoading(false);
      }
    };
    
    // Reset selected slots when changing rooms
    // This prevents invalid selections when switching between rooms
    setSelectedSlots([]);
    fetchReservations();
    
    // Set up real-time subscription for reservations
    // This ensures the UI updates instantly when others make bookings
    const subscription = supabase
      .channel('room-reservations')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'reservations',
          filter: `room_id=eq.${selectedRoomId}`
        }, 
        () => {
          console.log('Reservation change detected, refreshing availability');
          fetchReservations();
        }
      )
      .subscribe();
      
    // Set up a refresh interval to periodically check for availability
    // This handles expired pending reservations and other edge cases
    const refreshInterval = setInterval(() => {
      fetchReservations();
    }, 30000); // Refresh every 30 seconds
      
    // Clean up subscription and interval when component unmounts or dependencies change
    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [selectedRoomId, setSelectedSlots, user]);

  /**
   * Helper function to determine if a slot is consecutive to the current selection
   * @param {string[]} selected - Currently selected slots (ISO strings)
   * @param {string} candidate - Slot to check (ISO string)
   * @returns {boolean} True if candidate is consecutive to selected
   */
  function isConsecutive(selected: string[], candidate: string): boolean {
    if (selected.length === 0) return true;
    // Sort slots for comparison
    const sorted = [...selected].sort();
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const candidateTime = parseISO(candidate).getTime();
    const firstTime = parseISO(first).getTime();
    const lastTime = parseISO(last).getTime();
    // Check if candidate is immediately before or after the current block
    return (
      candidateTime === firstTime - SLOT_INTERVAL * 60 * 1000 ||
      candidateTime === lastTime + SLOT_INTERVAL * 60 * 1000
    );
  }

  /**
   * Handles time slot selection with business rules enforcement
   *
   * ENFORCES:
   * - Max 4 consecutive slots (2 hours)
   * - Only allows adding slots that are consecutive to the current selection
   * - Provides user feedback for invalid selections
   */
  const handleSlotClick = (slot: string) => {
    // If slot is already selected, remove it
    if (selectedSlots.includes(slot)) {
      setSelectedSlots(selectedSlots.filter(s => s !== slot));
      return;
    }

    // If no slots are selected yet, just add this one
    if (selectedSlots.length === 0) {
      setSelectedSlots([slot]);
      return;
    }

    // If already 4 slots selected, prevent adding more
    if (selectedSlots.length === 4) {
      toast.info('You can only select up to 2 hours (4 consecutive slots).');
      return;
    }

    // Only allow adding slots that are consecutive to the current selection
    if (!isConsecutive(selectedSlots, slot)) {
      setSelectedSlots([slot]);
      toast.info('Selected time slots must be consecutive.');
      return;
    }

    // Add the slot and sort
    const allSlots = [...selectedSlots, slot].sort();
    setSelectedSlots(allSlots);
  };

  // Display loading state with skeleton UI
  if (isLoading) {
    return (
      <div className="rounded-lg bg-white shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Available Time Slots</h2>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  // Display error state if something went wrong
  if (error) {
    return (
      <div className="rounded-lg bg-white shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Available Time Slots</h2>
        <div className="text-red-500 text-center py-8">
          {error}
        </div>
      </div>
    );
  }

  // Main component render with time slot grid
  return (
    <div className="rounded-lg bg-white shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Available Time Slots</h2>
      <div className="text-sm text-gray-500 mb-4">
        Select available time slots for today ({format(today, 'EEEE, MMMM d')})
      </div>
      
      {/* Show message when no slots are available */}
      {availableSlots.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No available time slots for today. Please try another room.
        </div>
      ) : (
        /* Time slot grid with color-coding for different states */
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {generateTimeSlots().map((slot) => {
            // Determine slot state for proper styling
            const isAvailable = availableSlots.includes(slot);
            const isSelected = selectedSlots.includes(slot);
            const isPast = !isAvailable && !reservedSlots.includes(slot);
            
            // --- NEW LOGIC: Disable slots that break the 2-hour/4-consecutive rule ---
            let disableSlot = false;
            if (!isAvailable) {
              disableSlot = true;
            } else if (selectedSlots.length > 0) {
              // If already 4 slots, disable all others
              if (selectedSlots.length === 4 && !isSelected) {
                disableSlot = true;
              } else if (
                // If not selected, only enable if consecutive to current selection
                !isSelected &&
                (selectedSlots.length === 0 || !isConsecutive(selectedSlots, slot))
              ) {
                disableSlot = true;
              }
            }

            return (
              <button
                key={slot}
                className={`px-2 py-3 rounded-md text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-indigo-600 text-white' // Selected - highlighted in brand color
                    : isAvailable && !disableSlot
                    ? 'bg-white border border-gray-300 hover:bg-gray-100 text-gray-700' // Available - neutral/clickable
                    : isPast
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' // Past/unavailable - dimmed
                    : 'bg-red-100 text-red-800 cursor-not-allowed' // Reserved or disabled - red warning color
                }`}
                disabled={disableSlot}
                onClick={() => handleSlotClick(slot)}
              >
                {format(parseISO(slot), 'h:mm a')}
              </button>
            );
          })}
        </div>
      )}
      
      {/* Summary of selected time range */}
      {selectedSlots.length > 0 && (
        <div className="mt-4 p-4 bg-indigo-50 rounded-md">
          <div className="font-medium text-indigo-800">Selected Time:</div>
          <div className="text-indigo-700">
            {format(parseISO(selectedSlots[0]), 'h:mm a')} - 
            {format(parseISO(selectedSlots[selectedSlots.length - 1]), 'h:mm a')} 
            ({selectedSlots.length * SLOT_INTERVAL} minutes)
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineSelector; 