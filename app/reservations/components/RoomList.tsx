'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useReservationStore } from '../store/reservationStore';
import type { Room } from '../types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

/**
 * COMPONENT: RoomList
 * PURPOSE: Displays available rooms as square Notion-style cards that users can select
 * CONTEXT: First step in the room reservation flow, allowing users to browse and choose rooms
 * DATA FLOW: Fetches rooms from Supabase → Renders as interactive cards → Updates global selection state on click
 * KEY DEPENDENCIES: Supabase for room data, reservation store for state management
 */
interface RoomListProps {
  horizontalScroll?: boolean;
}

const RoomList = ({ horizontalScroll = false }: RoomListProps) => {
  const {
    rooms,
    setRooms,
    selectedRoomId,
    setSelectedRoomId,
    isLoadingRooms,
    setIsLoadingRooms,
  } = useReservationStore();

  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Fetch rooms on component mount
  useEffect(() => {
    const fetchRooms = async () => {
      if (!user) {
        setError('Please sign in to view rooms');
        return;
      }

      setIsLoadingRooms(true);
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .order('name');

        if (error) throw error;
        
        if (!data || data.length === 0) {
          setError('No rooms available');
          return;
        }

        setRooms(data as Room[]);
      } catch (error) {
        console.error('Error fetching rooms:', error);
        setError('Failed to load rooms. Please try again.');
        toast.error('Failed to load rooms. Please try again.');
      } finally {
        setIsLoadingRooms(false);
      }
    };

    fetchRooms();
  }, [setRooms, setIsLoadingRooms, user]);

  // Error state - Notion-style empty state
  if (error) {
    return (
      <div className="text-gray-500 text-sm py-4 flex items-center justify-center">
        <span className="bg-gray-100 px-3 py-1 rounded-md">{error}</span>
      </div>
    );
  }

  // Loading state - Notion-style skeleton cards
  if (isLoadingRooms) {
    return (
      <div className={horizontalScroll ? "flex space-x-3" : "grid grid-cols-1 md:grid-cols-3 gap-3"}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className={horizontalScroll ? "h-36 w-36 rounded-md flex-shrink-0" : "h-36 w-full rounded-md"} />
        ))}
      </div>
    );
  }

  // Empty state - Notion-style message
  if (!rooms.length) {
    return (
      <div className="text-gray-500 text-sm py-4 flex items-center justify-center">
        <span className="bg-gray-100 px-3 py-1 rounded-md">No rooms available at the moment</span>
      </div>
    );
  }

  return (
    <div className={horizontalScroll ? "w-full" : ""}>
      <div className={horizontalScroll 
        ? "flex space-x-3" 
        : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
      }>
        {rooms.map((room) => (
          <div
            key={room.id}
            className={`
              aspect-square flex flex-col p-3 cursor-pointer rounded-md border border-gray-200
              transition-all duration-150 ease-in-out
              hover:bg-gray-50 focus-within:ring-1 focus-within:ring-gray-300
              ${selectedRoomId === room.id ? 'bg-blue-50 border-blue-200' : 'bg-white'}
              ${horizontalScroll ? 'w-36 h-36 flex-shrink-0' : 'w-full'}
            `}
            onClick={() => setSelectedRoomId(selectedRoomId === room.id ? null : room.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedRoomId(selectedRoomId === room.id ? null : room.id);
              }
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium text-sm text-gray-800 truncate">{room.name}</div>
              {room.has_projector && (
                <div className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-sm">
                  Projector
                </div>
              )}
            </div>
            
            <div className="mt-1 text-xs text-gray-500 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {room.capacity}
            </div>
            
            {room.location && (
              <div className="mt-1 text-xs text-gray-500 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {room.location}
              </div>
            )}
            
            <div className="mt-auto">
              {selectedRoomId === room.id && (
                <div className="text-xs font-medium text-blue-600 flex items-center mt-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Selected
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoomList; 