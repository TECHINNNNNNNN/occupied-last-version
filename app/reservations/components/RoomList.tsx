'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useReservationStore } from '../store/reservationStore';
import type { Room } from '../types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const RoomList = () => {
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

  if (error) {
    return (
      <div className="rounded-lg bg-white shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Available Rooms</h2>
        <div className="text-red-500 text-center py-8">
          {error}
        </div>
      </div>
    );
  }

  if (isLoadingRooms) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-4">Available Rooms</h2>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!rooms.length) {
    return (
      <div className="rounded-lg bg-white shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Available Rooms</h2>
        <div className="text-gray-500 text-center py-8">
          No rooms available at the moment.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Available Rooms</h2>
      <div className="space-y-4">
        {rooms.map((room) => (
          <Card
            key={room.id}
            className={`flex items-center justify-between p-5 cursor-pointer border-2 transition-all duration-150 hover:shadow-md focus-within:ring-2 focus-within:ring-indigo-400 ${
              selectedRoomId === room.id
                ? 'border-indigo-600 ring-2 ring-indigo-400'
                : 'border-gray-200'
            }`}
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
            <div>
              <div className="font-semibold text-lg">{room.name}</div>
              <div className="text-sm text-gray-500">
                Capacity: {room.capacity} {room.capacity === 1 ? 'person' : 'people'}
              </div>
              {room.has_projector && (
                <div className="text-sm text-indigo-600">Has Projector</div>
              )}
              {room.location && (
                <div className="text-sm text-gray-500">Location: {room.location}</div>
              )}
            </div>
            {selectedRoomId === room.id && (
              <span className="text-indigo-600 font-bold">Selected</span>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RoomList; 