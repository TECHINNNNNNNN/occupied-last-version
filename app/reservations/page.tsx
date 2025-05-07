"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import RoomList from "./components/RoomList"
import RoomDetailsPanel from "./components/RoomDetailsPanel"
import TimelineSelector from "./components/TimelineSelector"
import ReservationForm from "./components/ReservationForm"
import MyBookings from "./components/MyBookings"
import Notifications from "./components/Notifications"
import { useReservationStore } from "./store/reservationStore"
import { useAuth } from "@/contexts/AuthContext"

/**
 * COMPONENT: ReservationsPage
 * PURPOSE: Main page for the library room reservation system with a Notion-inspired UI
 * CONTEXT: Central hub for users to discover available rooms, view details, select time slots, and manage bookings
 * DATA FLOW: Loads user auth state → Renders room selection → User selects room → Shows details and available times → User books room
 * KEY DEPENDENCIES: Supabase for authentication and database, zustand for state management
 */
export default function ReservationsPage() {
  const { selectedRoomId } = useReservationStore()
  const { user, loading } = useAuth()
  const router = useRouter()

  // Authentication check - redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  // Loading state with Notion-style skeleton UI
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfbfa] p-4 md:p-6">
        <div className="animate-pulse max-w-6xl mx-auto">
          <div className="h-7 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-12 mb-3">
              <div className="flex space-x-3 overflow-x-auto pb-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-36 h-36 bg-gray-200 rounded-md flex-shrink-0"></div>
                ))}
              </div>
            </div>
            <div className="md:col-span-6">
              <div className="h-64 bg-gray-200 rounded-md mb-3"></div>
            </div>
            <div className="md:col-span-6">
              <div className="h-64 bg-gray-200 rounded-md mb-3"></div>
            </div>
            <div className="md:col-span-6">
              <div className="h-64 bg-gray-200 rounded-md"></div>
            </div>
            <div className="md:col-span-6">
              <div className="h-64 bg-gray-200 rounded-md"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Router will handle redirect
  }

  return (
    <div className="min-h-screen bg-[#fbfbfa] p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-xl md:text-2xl font-medium text-gray-800 mb-4 md:mb-6">Library Room Reservation</h1>
        
        {/* Notion-style grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Top section: Available rooms as square cards */}
          <div className="md:col-span-12 mb-3">
            <div className="bg-white rounded-md border border-gray-200 p-3 md:p-4 hover:shadow-sm transition-shadow">
              <h2 className="text-sm font-medium text-gray-700 mb-3">Available Rooms</h2>
              <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                <div className="flex space-x-3" style={{ minWidth: "max-content" }}>
                  <RoomList horizontalScroll={true} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile view: Stacked panels when room is selected */}
          {selectedRoomId && (
            <div className="md:hidden grid grid-cols-1 gap-3 mb-3">
              {/* Room details panel for mobile */}
              <div className="bg-white rounded-md border border-gray-200 p-3 hover:shadow-sm transition-shadow">
                <h2 className="text-sm font-medium text-gray-700 mb-3">Room Details</h2>
                <RoomDetailsPanel />
              </div>
              
              {/* Time slot selector for mobile */}
              <div className="bg-white rounded-md border border-gray-200 p-3 hover:shadow-sm transition-shadow">
                <h2 className="text-sm font-medium text-gray-700 mb-3">Available Time Slots</h2>
                <TimelineSelector />
              </div>
              
              {/* Reservation form for mobile */}
              <div className="bg-white rounded-md border border-gray-200 p-3 hover:shadow-sm transition-shadow">
                <h2 className="text-sm font-medium text-gray-700 mb-3">Reserve Room</h2>
                <ReservationForm />
              </div>
            </div>
          )}
          
          {/* Desktop view: Side-by-side panels */}
          <div className="hidden md:block md:col-span-6 mb-3">
            <div className="bg-white rounded-md border border-gray-200 p-4 h-full hover:shadow-sm transition-shadow">
              <h2 className="text-sm font-medium text-gray-700 mb-3">Room Details</h2>
              {selectedRoomId ? (
                <RoomDetailsPanel />
              ) : (
                <div className="rounded-md bg-gray-50 p-4 text-gray-500 text-center text-sm h-[calc(100%-2rem)]">
                  <p className="mt-8">Select a room to view details</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="hidden md:block md:col-span-6 mb-3">
            <div className="bg-white rounded-md border border-gray-200 p-4 h-full hover:shadow-sm transition-shadow">
              <h2 className="text-sm font-medium text-gray-700 mb-3">Available Time Slots</h2>
              {selectedRoomId ? (
                <TimelineSelector />
              ) : (
                <div className="rounded-md bg-gray-50 p-4 text-gray-500 text-center text-sm h-[calc(100%-2rem)]">
                  <p className="mt-8">Select a room to view available time slots</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Bottom sections */}
          <div className="md:col-span-6 mb-3">
            <div className="bg-white rounded-md border border-gray-200 p-3 md:p-4 h-full hover:shadow-sm transition-shadow">
              <MyBookings />
            </div>
          </div>
          
          <div className="hidden md:block md:col-span-6 mb-3">
            <div className="bg-white rounded-md border border-gray-200 p-4 h-full hover:shadow-sm transition-shadow">
              <h2 className="text-sm font-medium text-gray-700 mb-3">Reserve Room</h2>
              {selectedRoomId ? (
                <ReservationForm />
              ) : (
                <div className="rounded-md bg-gray-50 p-4 text-gray-500 text-center text-sm h-[calc(100%-2rem)]">
                  <p className="mt-8">Select a room to make a reservation</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Component */}
      <Notifications />
    </div>
  )
}
