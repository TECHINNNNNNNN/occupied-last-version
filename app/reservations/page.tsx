'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import RoomList from './components/RoomList'
import RoomDetailsPanel from './components/RoomDetailsPanel'
import TimelineSelector from './components/TimelineSelector'
import ReservationForm from './components/ReservationForm'
import MyBookings from './components/MyBookings'
import Notifications from './components/Notifications'
import { useReservationStore } from './store/reservationStore'
import { useAuth } from '@/contexts/AuthContext'

export default function ReservationsPage() {
  const { selectedRoomId } = useReservationStore();
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-7xl mx-auto">
            <div className="md:col-span-3">
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
            <div className="md:col-span-6">
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
            <div className="md:col-span-3">
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Router will handle redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Reserve a Study Room (TODAY ONLY)</h1>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-7xl mx-auto">
        {/* Room List and Filters */}
        <div className="md:col-span-3">
          <RoomList />
        </div>
        {/* Timeline and Room Details */}
        <div className="md:col-span-6">
          {selectedRoomId ? (
            <TimelineSelector />
          ) : (
            <div className="rounded-lg bg-white shadow p-4 text-gray-500 text-center py-8">
              Select a room to view available time slots
            </div>
          )}
        </div>
        <div className="md:col-span-3">
          {selectedRoomId ? (
            <RoomDetailsPanel />
          ) : (
            <div className="rounded-lg bg-white shadow p-4 text-gray-500 text-center py-8">
              Select a room to view details
            </div>
          )}
        </div>
      </div>
      {/* Reservation Form below timeline on mobile, side-by-side on desktop */}
      <div className="max-w-2xl mx-auto mt-8">
        {selectedRoomId ? (
          <ReservationForm />
        ) : (
          <div className="rounded-lg bg-white shadow p-4 text-gray-500 text-center py-8">
            Select a room to make a reservation
          </div>
        )}
      </div>
      
      {/* My Bookings Section */}
      <div className="max-w-2xl mx-auto mt-8">
        <MyBookings />
      </div>
      
      <Notifications />
    </div>
  );
}