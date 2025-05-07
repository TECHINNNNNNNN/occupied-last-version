'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useReservationStore } from '../store/reservationStore';
import type { Room } from '../types';

/**
 * COMPONENT: RoomDetailsPanel
 * PURPOSE: Displays detailed information about the selected room in a Notion-inspired card layout
 * CONTEXT: Provides users with comprehensive room information after selection from the room list
 * DATA FLOW: Receives selected room ID from store → Fetches room details → Renders clean, minimal UI
 * KEY DEPENDENCIES: Supabase for room data fetching, reservation store for room selection state
 */
const RoomDetailsPanel = () => {
  const { selectedRoomId } = useReservationStore();
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRoomId) {
      setRoom(null);
      return;
    }

    const fetchRoomDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', selectedRoomId)
          .single();

        if (error) throw error;
        setRoom(data as Room);
      } catch (err) {
        console.error('Error fetching room details:', err);
        setError('Could not load room details');
        setRoom(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomDetails();
  }, [selectedRoomId]);

  if (!selectedRoomId) {
    return (
      <div className="text-gray-500 text-sm p-4 flex items-center justify-center h-[calc(100%-2rem)]">
        <span className="bg-gray-100 px-3 py-1 rounded-md">Select a room to view details</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-6 w-2/3 rounded-md" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-32 w-full rounded-md" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="text-gray-500 text-sm p-4 flex items-center justify-center h-[calc(100%-2rem)]">
        <span className="bg-gray-100 px-3 py-1 rounded-md">{error || 'Room not found'}</span>
      </div>
    );
  }

  // Notion-style room features as property list
  const features = [
    { 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      label: "Capacity",
      value: `${room.capacity} ${room.capacity === 1 ? 'person' : 'people'}`
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: "Location",
      value: room.location || "Not specified"
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      label: "Projector",
      value: room.has_projector ? "Available" : "Not available"
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Room name header with Notion-style */}
      <div className="mb-3">
        <h3 className="text-base font-medium text-gray-800">{room.name}</h3>
        <div className="h-1 w-16 bg-blue-100 mt-1 rounded"></div>
      </div>

      {/* Room image if available - placeholder otherwise */}
      <div className="w-full h-32 bg-gray-100 rounded-md mb-4 overflow-hidden flex items-center justify-center">
        {room.photo_url ? (
          <img src={room.photo_url} alt={room.name} className="w-full h-full object-cover" />
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 22V12h6v10" />
          </svg>
        )}
      </div>

      {/* Room properties - Notion-style */}
      <div className="space-y-3">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center text-sm">
            <div className="mr-2">{feature.icon}</div>
            <div className="text-gray-500">{feature.label}</div>
            <div className="mx-2 text-gray-300">•</div>
            <div className="text-gray-700">{feature.value}</div>
          </div>
        ))}
      </div>

      {/* Additional notes section with placeholder content */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md text-sm text-gray-700 border border-gray-100">
        Please select time slots to make a reservation for this room.
      </div>
    </div>
  );
};

export default RoomDetailsPanel; 