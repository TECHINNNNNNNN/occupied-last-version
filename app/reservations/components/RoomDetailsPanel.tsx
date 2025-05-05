'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import { useReservationStore } from '../store/reservationStore';
import type { Room } from '../types';
import Image from 'next/image';

const RoomDetailsPanel = () => {
  const { selectedRoomId } = useReservationStore();
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoomDetails = async () => {
      if (!selectedRoomId) {
        setRoom(null);
        return;
      }

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
        setError('Failed to load room details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoomDetails();
  }, [selectedRoomId]);

  if (!selectedRoomId) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-4/5" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Room Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!room) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Room Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-500">
            Select a room to view details
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{room.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {room.photo_url && (
          <div className="relative h-48 w-full overflow-hidden rounded-md">
            <Image
              src={room.photo_url}
              alt={room.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 400px"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder-room.jpg';
              }}
            />
          </div>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Capacity:</span>
            <span className="font-medium">{room.capacity} {room.capacity === 1 ? 'person' : 'people'}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Projector:</span>
            <span className="font-medium">{room.has_projector ? 'Yes' : 'No'}</span>
          </div>
          
          {room.location && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Location:</span>
              <span className="font-medium">{room.location}</span>
            </div>
          )}
        </div>
        
        <div className="text-sm text-gray-500 pt-2 border-t">
          <p>Select time slots in the calendar to make a reservation for this room.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoomDetailsPanel; 