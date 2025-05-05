'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO, addMinutes } from 'date-fns';
import { useReservationStore } from '../store/reservationStore';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

/**
 * ReservationForm Component
 * =========================
 * PURPOSE:
 *   Allows users to finalize their room reservation by entering purpose and 
 *   attendee information, then submitting the reservation to the database.
 * 
 * CONTEXT:
 *   This component is displayed after a user has selected a room and time slots.
 *   It's the final step in the reservation process before confirmation.
 * 
 * INPUTS:
 *   - Selected room information (from store)
 *   - Selected time slots (from store)
 *   - User input for agenda and number of attendees
 * 
 * OUTPUTS:
 *   - Creates and confirms a reservation in the database
 *   - Provides user feedback on success/failure
 * 
 * IMPLEMENTATION NOTES:
 *   Uses a two-step reservation process with a temporary hold to prevent
 *   race conditions when multiple users try to book the same slot.
 */

const ReservationForm = () => {
  // Get authentication context for user information
  const { user } = useAuth();
  const router = useRouter();
  
  // Access global reservation state from Zustand store
  const { 
    selectedRoomId, 
    selectedSlots, 
    formData, 
    setFormData, 
    resetFormData,
    rooms 
  } = useReservationStore();
  
  // Local state to track form submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find the selected room details from the rooms array
  const selectedRoom = rooms.find(room => room.id === selectedRoomId);

  /**
   * Validates all form inputs and reservation conditions
   * 
   * VALIDATION CHECKS:
   * - User is authenticated
   * - Room is selected
   * - Time slots are selected
   * - Required fields are filled
   * - Number of people doesn't exceed room capacity
   * 
   * @returns {boolean} Whether the form is valid and ready for submission
   */
  const isFormValid = () => {
    if (!user) {
      toast.error('You must be logged in to make a reservation');
      router.push('/login');
      return false;
    }

    if (!selectedRoomId) {
      toast.error('Please select a room');
      return false;
    }

    if (selectedSlots.length === 0) {
      toast.error('Please select at least one time slot');
      return false;
    }

    if (!formData.agenda.trim()) {
      toast.error('Please enter a purpose for your reservation');
      return false;
    }

    if (formData.numPeople < 1) {
      toast.error('Number of people must be at least 1');
      return false;
    }

    if (selectedRoom && formData.numPeople > selectedRoom.capacity) {
      toast.error(`The room capacity is ${selectedRoom.capacity} people`);
      return false;
    }

    return true;
  };

  /**
   * Handles form submission to create a reservation
   * 
   * PROCESS:
   * 1. Validates form data
   * 2. Creates a reservation with temporary hold
   * 3. Confirms the reservation if no conflicts occur
   * 4. Provides user feedback and resets form
   * 
   * TECHNICAL DETAILS:
   * - First tries to use Supabase RPC calls to database functions
   * - Falls back to direct table access if RPC fails
   * - Implements error handling for various failure scenarios
   * - Manages loading state during async operations
   * 
   * @param {React.FormEvent} e - Form submission event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isFormValid()) return;
    
    setIsSubmitting(true);
    
    try {
      if (!user?.email) {
        toast.error('You must be logged in to make a reservation');
        router.push('/login');
        return;
      }

      const sortedSlots = [...selectedSlots].sort();
      const startTime = parseISO(sortedSlots[0]);
      const lastSlot = parseISO(sortedSlots[sortedSlots.length - 1]);
      const endTime = addMinutes(lastSlot, 30);
      
      // Create the reservation using RPC function instead of direct insert
      console.log('Calling create_reservation_with_hold with:', {
        p_room_id: selectedRoomId,
        p_start_time: startTime.toISOString(),
        p_end_time: endTime.toISOString(),
        p_agenda: formData.agenda,
        p_num_people: formData.numPeople
      });
      
      // Make sure all parameters are of the correct type
      const params = {
        p_room_id: Number(selectedRoomId), // Ensure it's a number
        p_start_time: startTime.toISOString(),
        p_end_time: endTime.toISOString(),
        p_agenda: String(formData.agenda), // Ensure it's a string
        p_num_people: Number(formData.numPeople) // Ensure it's a number
      };
      
      console.log('Sending parameters with types:', {
        'p_room_id': typeof params.p_room_id + ' → ' + params.p_room_id,
        'p_start_time': typeof params.p_start_time + ' → ' + params.p_start_time,
        'p_end_time': typeof params.p_end_time + ' → ' + params.p_end_time,
        'p_agenda': typeof params.p_agenda + ' → ' + params.p_agenda,
        'p_num_people': typeof params.p_num_people + ' → ' + params.p_num_people
      });
      
      const { data, error } = await supabase.rpc('create_reservation_with_hold', params);
      
      console.log('Response from create_reservation_with_hold:', { data, error });
        
      if (error) {
        console.error('Error during create_reservation_with_hold:', error);
        if (error.message?.includes('Overlapping reservation')) {
          toast.error('This time slot is already booked. Please select another time.');
        } else {
          toast.error(`Failed to initiate reservation: ${error.message}`);
        }
        // Stop execution if there was an error creating the hold
        setIsSubmitting(false);
        return; 
      }

      // Ensure data (reservation ID) is valid before proceeding
      if (!data) {
        console.error('No reservation ID returned from create_reservation_with_hold');
        toast.error('Failed to get reservation ID. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // If we got here, we have a reservation ID. Now confirm it.
      console.log(`Calling confirm_reservation with ID: ${data}`);
      const confirmResponse = await supabase.rpc('confirm_reservation', {
        p_reservation_id: data
      });

      console.log('Response from confirm_reservation:', confirmResponse);
      
      // Check if there was an RPC call error
      if (confirmResponse.error) {
        console.error('Error during confirm_reservation RPC call:', confirmResponse.error);
        toast.error(`Failed to confirm reservation: ${confirmResponse.error.message}`);
        setIsSubmitting(false);
        return;
      }
      
      // Check if there was a business logic error returned in the data
      const confirmError = confirmResponse.data?.confirmError;
      if (confirmError) {
        console.error('Error during confirm_reservation:', confirmError);
        if (confirmError.includes('Overlapping reservation')) {
          toast.error('This time slot was just booked by someone else. Please select another time.');
        } else if (confirmError.includes('Reservation hold has expired')) {
          toast.error('Your reservation hold expired. Please try again quickly.');
        } else {
          toast.error(`Failed to confirm reservation: ${confirmError}`);
        }
        // Even if confirmation fails, stop loading
        setIsSubmitting(false);
        return; 
      }

      // Success! Clear form and show success message
      console.log('Reservation confirmed successfully!');
      // Display a success toast with helpful information
      toast.success(
        `Your room has been booked successfully! You've reserved ${selectedRoom?.name} from ${format(startTime, 'h:mm a')} to ${format(endTime, 'h:mm a')}.`,
        {
          duration: 5000, // Show for 5 seconds
          description: "You can view all your bookings in the 'My Bookings' section below."
        }
      );
      resetFormData();
      router.refresh();
      
    } catch (error) {
      console.error('Error creating reservation:', error);
      toast.error('Failed to create reservation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handles input field changes and updates form state
   * 
   * IMPLEMENTATION DETAIL:
   * - Handles both text fields and number fields appropriately
   * - For numPeople, converts string value to integer
   * 
   * @param {React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>} e - Input change event
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      // For numPeople, convert string to number; otherwise, keep as string
      [name]: name === 'numPeople' ? parseInt(value) || 0 : value,
    });
  };

  // If prerequisites aren't met, show placeholder with instructions
  if (!selectedRoomId || selectedSlots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Make a Reservation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">
            Please select a room and time slots to make a reservation.
          </p>
        </CardContent>
      </Card>
    );
  }

  /**
   * Formats the selected time slots into a human-readable time range
   * 
   * EXAMPLE: "2:00 PM - 3:30 PM (90 minutes)"
   * 
   * @returns {string} Formatted time range string
   */
  const formatTimeDisplay = () => {
    if (selectedSlots.length === 0) return '';
    
    const sortedSlots = [...selectedSlots].sort();
    const start = parseISO(sortedSlots[0]);
    const lastSlot = parseISO(sortedSlots[sortedSlots.length - 1]);
    const end = addMinutes(lastSlot, 30);
    
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')} (${selectedSlots.length * 30} minutes)`;
  };

  // Main form render
  return (
    <Card>
      <CardHeader>
        <CardTitle>Make a Reservation</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Room information (non-editable) */}
          <div className="space-y-1">
            <Label htmlFor="room">Room</Label>
            <Input 
              id="room" 
              value={selectedRoom?.name || ''} 
              disabled 
              className="bg-gray-50"
            />
          </div>
          
          {/* Time slot information (non-editable) */}
          <div className="space-y-1">
            <Label htmlFor="time">Time</Label>
            <Input 
              id="time" 
              value={formatTimeDisplay()} 
              disabled 
              className="bg-gray-50"
            />
          </div>
          
          {/* Number of attendees input */}
          <div className="space-y-1">
            <Label htmlFor="numPeople">Number of People</Label>
            <Input
              id="numPeople"
              name="numPeople"
              type="number"
              min="1"
              max={selectedRoom?.capacity || 20}
              value={formData.numPeople}
              onChange={handleInputChange}
              required
            />
            {selectedRoom && (
              <p className="text-xs text-gray-500 mt-1">
                Maximum capacity: {selectedRoom.capacity}
              </p>
            )}
          </div>
          
          {/* Purpose/agenda input */}
          <div className="space-y-1">
            <Label htmlFor="agenda">Purpose</Label>
            <Textarea
              id="agenda"
              name="agenda"
              placeholder="Enter the purpose of your reservation"
              value={formData.agenda}
              onChange={handleInputChange}
              required
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
        <CardFooter>
          {/* Submit button with loading state */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Reservation...' : 'Confirm Reservation'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ReservationForm; 