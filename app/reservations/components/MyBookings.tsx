'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { format, parseISO, isAfter } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Reservation } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

/**
 * MyBookings Component
 * ====================
 * PURPOSE:
 *   Displays a list of the user's current and upcoming reservations,
 *   allowing them to view details and cancel bookings if needed.
 * 
 * CONTEXT:
 *   This component is a part of the reservation management system,
 *   giving users visibility into their booked time slots and room details.
 * 
 * FEATURES:
 *   - Real-time updates when reservations change
 *   - Visual distinction between active and past reservations
 *   - Ability to cancel upcoming reservations
 *   - Clear empty state when no bookings exist
 *   - Compact, space-efficient design with animations
 *   - Expandable/collapsible interface
 * 
 * BUSINESS RULES:
 *   - Only shows confirmed reservations (not pending or cancelled)
 *   - Only allows cancellation of active (future) reservations
 *   - Only shows today's reservations and future ones
 */

// Extended reservation type that includes room name
// This is necessary for displaying the room name without additional lookups
interface ReservationWithRoom extends Reservation {
  room_name: string;
}

const MyBookings = () => {
  // Access authentication context for user information
  const { user } = useAuth();
  
  // Local state for reservation data and UI states
  const [reservations, setReservations] = useState<ReservationWithRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // State for expanding/collapsing the reservations section
  const [isExpanded, setIsExpanded] = useState(true);

  /**
   * Fetches the user's active reservations from the database
   * 
   * IMPLEMENTATION DETAILS:
   * - Fetches only confirmed reservations from today onwards
   * - Includes room name via Supabase's nested query syntax
   * - Orders by start time for chronological display
   * - Sets up real-time subscription for live updates
   * 
   * SIDE EFFECTS:
   * - Updates reservations state with fetched data
   * - Updates loading and error states
   */
  useEffect(() => {
    const fetchReservations = async () => {
      // Return early if user is not authenticated
      if (!user) {
        setReservations([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Get today's date (start of day) for filtering
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Try to use the join query first (this requires the foreign key constraint)
        let reservationsData;
        let useJoinMethod = true;
        
        // First attempt: join query
        try {
          const { data, error } = await supabase
            .from('reservations')
            .select('*, rooms(name)')  // Get reservation data and room name
            .eq('user_email', user.email)
            .eq('status', 'confirmed')
            .gte('start_time', today.toISOString())
            .order('start_time');

          if (error) {
            console.error('Join query failed:', JSON.stringify(error));
            // If this fails, we'll try the separate queries method instead
            useJoinMethod = false;
          } else {
            reservationsData = data;
          }
        } catch (joinError) {
          console.error('Join query error:', joinError);
          useJoinMethod = false;
        }
        
        // If join method failed, use separate queries as fallback
        if (!useJoinMethod) {
          console.log('Falling back to separate queries method');
          
          // Get reservations without joining
          const { data: reservationsResult, error: reservationsError } = await supabase
            .from('reservations')
            .select('*')
            .eq('user_email', user.email)
            .eq('status', 'confirmed')
            .gte('start_time', today.toISOString())
            .order('start_time');
            
          if (reservationsError) {
            console.error('Reservations query error:', JSON.stringify(reservationsError));
            throw reservationsError;
          }
          
          reservationsData = reservationsResult;
        }
        
        // It's normal to have no data if the user hasn't made any reservations
        if (!reservationsData || reservationsData.length === 0) {
          setReservations([]);
          setIsLoading(false);
          return;
        }
        
        // Process the data based on which method was used
        try {
          let reservationsWithRoom;
          
          if (useJoinMethod) {
            // Process data from join query
            reservationsWithRoom = reservationsData.map(item => ({
              ...item,
              room_name: item.rooms?.name || 'Unknown Room'
            }));
          } else {
            // Get room data separately and then combine
            const roomIds = [...new Set(reservationsData.map(res => res.room_id))];
            
            const { data: roomsData, error: roomsError } = await supabase
              .from('rooms')
              .select('id, name')
              .in('id', roomIds);
              
            if (roomsError) {
              console.error('Rooms query error:', JSON.stringify(roomsError));
              throw roomsError;
            }
            
            // Create a mapping of room IDs to room names
            const roomMap = new Map();
            roomsData?.forEach(room => {
              roomMap.set(room.id, room.name);
            });
            
            // Combine reservation data with room names
            reservationsWithRoom = reservationsData.map(reservation => ({
              ...reservation,
              room_name: roomMap.get(reservation.room_id) || 'Unknown Room'
            }));
          }
          
          setReservations(reservationsWithRoom as ReservationWithRoom[]);
        } catch (formatErr) {
          console.error('Error processing reservation data:', formatErr);
          setError('Error processing reservation data');
        }
      } catch (err) {
        console.error('Error fetching reservations:', err);
        // Show a user-friendly error but log details for debugging
        setError('Failed to load your reservations');
        // Don't show an error toast if there just aren't any reservations yet
        if (err instanceof Error && err.message !== 'No data found') {
          toast.error('Failed to load your reservations');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchReservations();

    // Set up real-time subscription for the user's reservations
    // This ensures the UI updates automatically when reservations change
    const subscription = supabase
      .channel('user-reservations')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'reservations',
          filter: user ? `user_email=eq.${user.email}` : undefined
        }, 
        () => {
          fetchReservations();
        }
      )
      .subscribe();
      
    // Clean up subscription when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  /**
   * Cancels a reservation by updating its status in the database
   * 
   * PROCESS:
   * 1. Confirms the user's intent with a confirmation dialog
   * 2. Updates the reservation status to 'cancelled' in the database
   * 3. Updates local state to reflect the change immediately
   * 4. Provides feedback via toast notifications
   * 
   * SECURITY:
   * - Verifies user is authenticated before proceeding
   * - Includes user email in query to ensure users can only cancel their own reservations
   * 
   * @param {string} id - The UUID of the reservation to cancel
   */
  const handleCancelReservation = async (id: string) => {
    // Check if user is authenticated
    if (!user) {
      toast.error('You must be logged in to cancel a reservation');
      return;
    }

    // Ask for confirmation before cancelling
    if (!confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }

    try {
      // Update reservation status to cancelled in the database
      // Using user_email in the filter ensures users can only cancel their own reservations
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('user_email', user.email);

      if (error) throw error;

      toast.success('Reservation cancelled successfully');
      
      // Update local state immediately instead of waiting for the real-time update
      // This provides a more responsive user experience
      setReservations(reservations.filter(res => res.id !== id));
    } catch (err) {
      console.error('Error cancelling reservation:', err);
      toast.error('Failed to cancel reservation');
    }
  };

  // Loading state with skeleton UI
  if (isLoading) {
    return (
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">My Bookings</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base">My Bookings</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="text-red-500 text-center py-2 text-sm">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not authenticated state
  if (!user) {
    return (
      <Card className="shadow-sm border border-gray-200">
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base">My Bookings</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="text-center text-gray-500 py-2 text-sm">
            Please sign in to view your bookings
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main component render with reservation list and animations
  return (
    <Card className="shadow-sm border border-gray-200">
      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-base">My Bookings</CardTitle>
        {reservations.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 
              <ChevronUp className="h-4 w-4" /> : 
              <ChevronDown className="h-4 w-4" />
            }
          </Button>
        )}
      </CardHeader>
      <motion.div
        animate={{ height: isExpanded ? 'auto' : reservations.length > 0 ? '0px' : 'auto' }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="overflow-hidden"
      >
        <CardContent className="px-4 pb-3">
          {/* Empty state when user has no reservations - made more compact */}
          {reservations.length === 0 ? (
            <div className="text-center text-gray-500 py-2 text-sm">
              You don&apos;t have any active bookings
            </div>
          ) : (
            // List of reservations with animation
            <AnimatePresence initial={false}>
              <div className="space-y-2">
                {reservations.map((reservation) => {
                  // Parse ISO strings to Date objects for manipulation
                  const startTime = parseISO(reservation.start_time);
                  const endTime = parseISO(reservation.end_time);
                  // Determine if reservation is in the future (still active)
                  const isActive = isAfter(endTime, new Date());
                  
                  return (
                    <motion.div
                      key={reservation.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className={`rounded-md border p-3 ${
                        // Visual distinction between active and past reservations
                        isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                      } hover:shadow-sm transition-shadow`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          {/* Room name heading */}
                          <h3 className="font-semibold text-sm truncate">{reservation.room_name}</h3>
                          {/* Time range formatting */}
                          <div className="text-xs text-gray-600 mt-1">
                            {format(startTime, 'MMM d, h:mm a')} - {format(endTime, 'h:mm a')}
                          </div>
                          {/* Reservation purpose */}
                          <div className="text-xs text-gray-700 mt-1 truncate">{reservation.agenda}</div>
                        </div>
                        {/* Cancel button only shown for active reservations */}
                        {isActive && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 w-7 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleCancelReservation(reservation.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          )}
        </CardContent>
      </motion.div>
    </Card>
  );
};

export default MyBookings; 