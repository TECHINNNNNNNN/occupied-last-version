'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { Checkbox } from '@/components/ui/checkbox'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { toast } from 'sonner'
import { ROOMS } from '@/constants/reservationsConstants'
import type { Reservation } from '@/types'
import { areConsecutive } from '@/lib/logic/reservations'
import { TIME_SLOTS } from '@/constants/reservationsConstants'
import { useAuth } from '@/contexts/AuthContext'

// Set the Bangkok timezone string
const BANGKOK_TZ = 'Asia/Bangkok'

// Helper to get the current time in Bangkok
function getBangkokNow() {
  return toZonedTime(new Date(), BANGKOK_TZ)
}

// Helper to get a Date in Bangkok for a given hour/minute
function getBangkokDateForSlot(hour: number, min: number) {
  const now = getBangkokNow()
  const date = new Date(now)
  date.setHours(hour, min, 0, 0)
  return date
}

// Helper to convert UTC to Bangkok time for display (UTC+7)
function utcToBangkokDisplay(utcDateString: string) {
  const utcDate = new Date(utcDateString);
  const bangkokDate = new Date(utcDate.getTime() + (7 * 60 * 60 * 1000));
  return bangkokDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export default function ReservationsPage() {
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null)
  const [userReservations, setUserReservations] = useState<Reservation[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [booking, setBooking] = useState(false)
  const [agenda, setAgenda] = useState('')
  const [numPeople, setNumPeople] = useState('')
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [slotMessage, setSlotMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [optimisticReservations, setOptimisticReservations] = useState<Reservation[]>([])
  const [cancelling, setCancelling] = useState(false)
  const [conflictDetected, setConflictDetected] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const { user } = useAuth()

  // Placeholder for today's date
  const today = new Date()
  const todayString = today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // Fetch reservations for the selected room and day
  const fetchReservations = useCallback(async () => {
    if (!selectedRoom) return
    const now = getBangkokNow()
    const startOfDay = new Date(now)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(now)
    endOfDay.setHours(23, 59, 59, 999)
    // Convert to UTC for query
    const startUTC = fromZonedTime(startOfDay, BANGKOK_TZ)
    const endUTC = fromZonedTime(endOfDay, BANGKOK_TZ)
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('room_id', selectedRoom)
      .gte('start_time', startUTC.toISOString())
      .lte('start_time', endUTC.toISOString())
    // Convert times to Bangkok time for logic
    setReservations(data || []) // Store raw UTC strings
  }, [selectedRoom])

  useEffect(() => {
    fetchReservations()
  }, [fetchReservations, today])

  // Fetch today's reservations for the current user
  async function fetchUserReservations() {
    // Get email from Supabase Auth
    const user_email = user?.email || '';
    const now = getBangkokNow();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const startUTC = fromZonedTime(startOfDay, BANGKOK_TZ);
    const endUTC = fromZonedTime(endOfDay, BANGKOK_TZ);
    const { data } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_email', user_email)
      .gte('start_time', startUTC.toISOString())
      .lte('start_time', endUTC.toISOString());
    setUserReservations(data || []); // Store raw UTC strings
  }

  useEffect(() => {
    fetchUserReservations();
  }, [selectedRoom, today, user]); // Added user dependency

  // Update user reservations in real time
  useEffect(() => {
    const subscribeUserReservations = async () => {
      // Get email from Supabase Auth
      const user_email = user?.email || '';
      const channel = supabase
        .channel('user-reservations')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `user_email=eq.${user_email}`
        }, () => {
          fetchUserReservations();
        })
        .subscribe();
      return channel;
    };
    let channelRef: RealtimeChannel | null = null;
    subscribeUserReservations().then(channel => { channelRef = channel });
    return () => {
      if (channelRef) channelRef.unsubscribe();
    };
  }, [user]); // Added user dependency

  // Helper to check if a slot is booked
  function getSlotStatus(slot: string) {
    const [hour, min] = slot.split(':').map(Number)
    const slotStartBangkok = getBangkokDateForSlot(hour, min)
    // Convert the Bangkok slot start time to a UTC Date object for comparison
    const slotStartUTC = fromZonedTime(slotStartBangkok, BANGKOK_TZ)

    // Combine actual reservations (UTC strings) and optimistic reservations (UTC strings)
    const combinedReservations = [
      ...reservations,
      ...optimisticReservations
    ];

    return combinedReservations.find(r => {
      // Create Date objects directly from the UTC strings
      const resStartUTC = new Date(r.start_time)
      const resEndUTC = new Date(r.end_time)
      // Compare UTC times
      return slotStartUTC >= resStartUTC && slotStartUTC < resEndUTC
    })
  }

  // Helper to check if a slot is in the past (for today)
  function isSlotInPast(slot: string) {
    const [hour, min] = slot.split(':').map(Number)
    const slotStart = getBangkokDateForSlot(hour, min)
    return slotStart < getBangkokNow()
  }

  // Handle slot selection
  function handleSlotChange(slot: string) {
    setSlotMessage('')
    if (selectedSlots.includes(slot)) {
      // Deselect slot
      const newSelection = selectedSlots.filter(s => s !== slot)
      setSelectedSlots(newSelection)
      return
    }
    // Add slot
    if (selectedSlots.length >= 4) {
      setSlotMessage('You can select up to 4 consecutive slots (2 hours max).')
      return
    }
    const newSelection = [...selectedSlots, slot].sort((a, b) => TIME_SLOTS.indexOf(a) - TIME_SLOTS.indexOf(b))
    if (!areConsecutive(newSelection)) {
      setSlotMessage('Please select only consecutive slots.')
      return
    }
    setSelectedSlots(newSelection)
  }

  // Disable logic for checkboxes
  function isSlotDisabled(slot: string) {
    const booked = getSlotStatus(slot)
    if (booked) return true
    if (isSlotInPast(slot)) return true
    if (selectedSlots.length === 0) return false
    if (selectedSlots.length >= 4 && !selectedSlots.includes(slot)) return true
    // Only allow extending at the ends
    const indices = selectedSlots.map(s => TIME_SLOTS.indexOf(s)).sort((a, b) => a - b)
    const min = indices[0], max = indices[indices.length - 1]
    const idx = TIME_SLOTS.indexOf(slot)
    if (idx === min - 1 || idx === max + 1) return false
    if (selectedSlots.includes(slot)) return false
    return true
  }

  // Get summary of selected period
  function getSelectedPeriod() {
    if (selectedSlots.length === 0) return ''
    const indices = selectedSlots.map(s => TIME_SLOTS.indexOf(s)).sort((a, b) => a - b)
    const start = TIME_SLOTS[indices[0]]
    const endIdx = indices[indices.length - 1] + 1
    const end = endIdx < TIME_SLOTS.length ? TIME_SLOTS[endIdx] : '21:00'
    return `${start} - ${end}`
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    if (!agenda.trim()) {
      setFormError('Agenda is required.')
      return
    }
    if (!numPeople || isNaN(Number(numPeople)) || Number(numPeople) < 1) {
      setFormError('Please enter a valid number of people.')
      return
    }
    if (selectedSlots.length === 0) {
      setFormError('Please select at least one time slot.')
      return
    }
    // Ensure slots are consecutive
    if (!areConsecutive(selectedSlots)) {
      setFormError('Please select only consecutive slots.')
      return
    }

    const indices = selectedSlots.map(s => TIME_SLOTS.indexOf(s)).sort((a, b) => a - b)
    const startSlot = TIME_SLOTS[indices[0]]
    const endIdx = indices[indices.length - 1] + 1
    const endSlot = endIdx < TIME_SLOTS.length ? TIME_SLOTS[endIdx] : '21:00'
    const [startHour, startMin] = startSlot.split(':').map(Number)
    const [endHour, endMin] = endSlot.split(':').map(Number)
    const start = getBangkokDateForSlot(startHour, startMin)
    const end = getBangkokDateForSlot(endHour, endMin)
    const startUTC = fromZonedTime(start, BANGKOK_TZ)
    const endUTC = fromZonedTime(end, BANGKOK_TZ)

    // Check for overlap again before booking
    const overlap = [...reservations, ...optimisticReservations].some(r => {
      const resStart = new Date(r.start_time)
      const resEnd = new Date(r.end_time)
      return (startUTC < resEnd && endUTC > resStart)
    })
    if (overlap) {
      setFormError('Selected period overlaps with an existing booking.')
      return
    }

    setBooking(true)
    // Get email from Supabase Auth
    const user_email = user?.email || 'unknown'

    // Create optimistic reservation
    const optimisticReservation: Reservation = {
      id: 'temp-' + Date.now(),
      room_id: selectedRoom!,
      user_email,
      start_time: startUTC.toISOString(),
      end_time: endUTC.toISOString(),
      created_at: new Date().toISOString(),
      agenda,
    }

    // Add to optimistic reservations
    setOptimisticReservations(prev => [...prev, optimisticReservation])

    try {
      const { error } = await supabase.from('reservations').insert({
        room_id: selectedRoom,
        user_email,
        start_time: startUTC.toISOString(),
        end_time: endUTC.toISOString(),
        created_at: new Date().toISOString(),
        agenda,
        num_people: Number(numPeople),
      }).select()

      // Check for error from Supabase
      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || 'Failed to make reservation');
      }

      setFormSuccess('Reservation successful!')
      toast('Reservation has been created.')
      setAgenda('')
      setNumPeople('')
      setSelectedSlots([])
      // Remove optimistic reservation after successful booking
      setOptimisticReservations(prev => prev.filter(r => r.id !== optimisticReservation.id))
    } catch (error) {
      console.error('Reservation error:', error);
      
      // Provide a user-friendly error message
      const errorMessage = error instanceof Error 
        ? error.message.includes('already been booked') 
          ? error.message 
          : 'Failed to make reservation. This time slot may already be booked.'
        : 'Failed to make reservation. Please try again.';
      
      setFormError(errorMessage);
      toast.error(errorMessage);
      
      // Remove optimistic reservation on error
      setOptimisticReservations(prev => prev.filter(r => r.id !== optimisticReservation.id))
      
      // Set conflict detected to true for visual indication
      setConflictDetected(true)
      
      // Refresh reservations data to get the latest state
      await refreshReservationsData();
      
      // Reset conflict indication after a delay
      setTimeout(() => setConflictDetected(false), 3000);
    } finally {
      setBooking(false)
    }
  }

  // Supabase Realtime subscription for reservations
  const subscriptionRef = useRef<RealtimeChannel | null>(null)
  useEffect(() => {
    if (!selectedRoom) return

    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
    }

    const channel = supabase
      .channel('room-reservations')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'reservations', 
        filter: `room_id=eq.${selectedRoom}` 
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newReservation = payload.new as Reservation
          setReservations(prev => [...prev, newReservation])
          
          // Check if any of our selected slots conflict with this new reservation
          const newStart = new Date(newReservation.start_time)
          const newEnd = new Date(newReservation.end_time)
          
          // If we have selected slots that overlap with the new reservation, clear them
          const hasConflict = selectedSlots.some(slot => {
            const [hour, min] = slot.split(':').map(Number)
            const slotStartBangkok = getBangkokDateForSlot(hour, min)
            const slotStartUTC = fromZonedTime(slotStartBangkok, BANGKOK_TZ)
            return slotStartUTC >= newStart && slotStartUTC < newEnd
          })
          
          if (hasConflict) {
            // Clear conflicting slots and notify user
            setSelectedSlots(prev => prev.filter(slot => {
              const [hour, min] = slot.split(':').map(Number)
              const slotStartBangkok = getBangkokDateForSlot(hour, min)
              const slotStartUTC = fromZonedTime(slotStartBangkok, BANGKOK_TZ)
              return !(slotStartUTC >= newStart && slotStartUTC < newEnd)
            }))
            
            toast.warning("Some of your selected time slots were just booked by another user", {
              duration: 5000,
            })
            
            setConflictDetected(true)
            setTimeout(() => setConflictDetected(false), 5000)
          }
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id
          setReservations(prev => prev.filter(r => r.id !== deletedId))
          // Refresh to show newly available slots 
          fetchReservations()
        }
      })
      .subscribe()

    subscriptionRef.current = channel
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
      }
    }
  }, [selectedRoom, today, selectedSlots])

  // Helper to check if a reservation is in the past
  function isReservationInPast(reservation: Reservation) {
    const endTime = new Date(reservation.end_time)
    const now = new Date() // Current time in UTC
    return endTime < now  // Both in UTC, so comparison is valid
  }

  // Handle reservation cancellation
  async function handleCancel(reservation: Reservation) {
    if (isReservationInPast(reservation)) {
      toast.error('Cannot cancel past reservations')
      return
    }

    if (!confirm('Are you sure you want to cancel this reservation?')) {
      return
    }

    setCancelling(true)
    try {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', reservation.id)
        .eq('user_email', reservation.user_email) // Extra safety check

      if (error) throw error

      toast.success('Reservation cancelled successfully')
      // The real-time subscription will automatically update the UI
    } catch (error) {
      console.error('Error cancelling reservation:', error)
      toast.error('Failed to cancel reservation')
    } finally {
      setCancelling(false)
    }
  }

  // Refresh all reservations and update UI
  async function refreshReservationsData() {
    try {
      setRefreshing(true)
      await Promise.all([
        fetchReservations(),
        fetchUserReservations()
      ])
      
      // Clear any selected slots that are now booked
      setSelectedSlots(prev => prev.filter(slot => !getSlotStatus(slot)))
    } catch (error) {
      console.error('Error refreshing reservations:', error)
    } finally {
      setRefreshing(false)
    }
  }

  // Add a periodic refresh to keep booked slots up to date
  useEffect(() => {
    if (!selectedRoom) return
    
    // Initial fetch
    refreshReservationsData()
    
    // Set up interval (refresh every 30 seconds)
    const intervalId = setInterval(() => {
      refreshReservationsData()
    }, 30000)
    
    return () => clearInterval(intervalId)
  }, [selectedRoom])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Reserve a Study Room</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-6xl mx-auto">
        {/* Room List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Available Rooms</h2>
          <div className="flex flex-col gap-4">
            {ROOMS.map(room => (
              <Card
                key={room.id}
                className={`flex items-center justify-between p-5 cursor-pointer border-2 transition-all duration-150 hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-400 ${selectedRoom === room.id ? 'border-indigo-600 ring-2 ring-indigo-400' : 'border-gray-200'}`}
                tabIndex={0}
                aria-selected={selectedRoom === room.id}
                onClick={() => {
                  setSelectedRoom(room.id);
                  setConflictDetected(false);
                }}
                onKeyDown={e => { 
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedRoom(room.id);
                    setConflictDetected(false);
                  }
                }}
              >
                <div>
                  <div className="font-semibold text-lg">{room.name}</div>
                  <div className="text-sm text-gray-500">Projector: {room.hasProjector ? 'Yes' : 'No'}</div>
                </div>
                {selectedRoom === room.id && <span className="text-indigo-600 font-bold">Selected</span>}
              </Card>
            ))}
          </div>
        </div>
        {/* Reservation Card */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Reservation Details</h2>
          {!selectedRoom && <div className="text-gray-500">Select a room to reserve.</div>}
          {selectedRoom && (
            <Card className="p-6 shadow-lg border-2 border-indigo-100">
              <div className="mb-4">
                <div className="font-semibold text-lg mb-1">{ROOMS.find(r => r.id === selectedRoom)?.name}</div>
                <div className="text-sm text-gray-500 mb-2">Date: {todayString}</div>
              </div>
              <form onSubmit={handleBook} className="space-y-4">
                <div>
                  <label className="block font-semibold mb-1">Agenda <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={agenda}
                    onChange={e => setAgenda(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Number of People <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    value={numPeople}
                    onChange={e => setNumPeople(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center">
                    <label className="block font-semibold mb-1">Select Time Slots <span className="text-red-500">*</span></label>
                    {refreshing && <span className="text-xs text-gray-500">Updating slots...</span>}
                  </div>
                  {conflictDetected && (
                    <div className="text-red-600 font-medium border border-red-300 bg-red-50 p-2 rounded mb-2 animate-pulse">
                      Time slot conflict detected! Some slots have been booked by another user.
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {TIME_SLOTS.map(slot => (
                      <label key={slot} className={`flex items-center gap-2 px-2 py-1 rounded border ${isSlotDisabled(slot) ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white border-gray-300 cursor-pointer hover:border-indigo-400'}`}>
                        <Checkbox
                          checked={selectedSlots.includes(slot)}
                          onCheckedChange={() => !isSlotDisabled(slot) && handleSlotChange(slot)}
                          disabled={isSlotDisabled(slot)}
                        />
                        <span>{slot}</span>
                      </label>
                    ))}
                  </div>
                  {slotMessage && <div className="text-sm text-red-500 mt-2">{slotMessage}</div>}
                </div>
                {/* Show selected period */}
                {selectedSlots.length > 0 && (
                  <div className="text-green-700 font-semibold">Selected Period: {getSelectedPeriod()}</div>
                )}
                {/* Show form error or success */}
                {formError && <div className="text-red-600 font-medium mt-2">{formError}</div>}
                {formSuccess && <div className="text-green-600 font-medium mt-2">{formSuccess}</div>}
                <Button type="submit" disabled={booking}>
                  {booking ? 'Booking...' : 'Book'}
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>

      {/* User Reservations Table */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-4">My Reservations (Today)</h2>
        <Table>
          <thead>
            <tr>
              <th>Room</th>
              <th>Start</th>
              <th>End</th>
              <th>Agenda</th>
              <th>Email</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {userReservations.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-gray-500">No reservations yet.</td>
              </tr>
            ) : (
              userReservations.map(res => (
                <tr key={res.id}>
                  <td>{ROOMS.find(r => r.id === res.room_id)?.name || res.room_id}</td>
                  <td>{utcToBangkokDisplay(res.start_time)}</td>
                  <td>{utcToBangkokDisplay(res.end_time)}</td>
                  <td>{res.agenda}</td>
                  <td>{res.user_email}</td>
                  <td>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      disabled={cancelling || isReservationInPast(res)}
                      onClick={() => handleCancel(res)}
                    >
                      {cancelling ? 'Cancelling...' : 'Cancel'}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  )
}