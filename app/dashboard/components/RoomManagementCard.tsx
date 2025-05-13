/**
 * COMPONENT: RoomManagementCard
 * PURPOSE: Displays room reservation information and management options
 * CONTEXT: Part of the dashboard main view, shows user's bookings and available rooms
 * DATA FLOW: Receives reservation data and room availability as props
 * KEY DEPENDENCIES: Reservation type, formatting utilities
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Reservation } from '../types';
import { formatDate, formatTime } from '../utils';

interface RoomManagementCardProps {
  upcomingReservations: Reservation[];
  isLoadingReservations: boolean;
  availableRooms: number;
  totalRooms: number;
}

const RoomManagementCard = ({
  upcomingReservations,
  isLoadingReservations,
  availableRooms,
  totalRooms,
}: RoomManagementCardProps) => {
  return (
    <div className="col-span-5 bg-white rounded-lg shadow p-4 flex flex-col">
      <h2 className="text-lg font-semibold mb-1">Room Management</h2>
      
      {/* Quick Actions */}
      <div className="flex space-x-2 mb-2">
        <Link href="/reservations" className="flex-1">
          <Button variant="default" size="sm" className="w-full bg-indigo-600 hover:bg-indigo-700">
            Book Room
          </Button>
        </Link>
        <Link href="/reservations?view=available" className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            Find Available
          </Button>
        </Link>
        <Link href="/reservations?view=myBookings" className="flex-1">
          <Button variant="ghost" size="sm" className="w-full">
            View All
          </Button>
        </Link>
      </div>
      
      {/* Upcoming Reservations */}
      <div className="flex-1 overflow-hidden">
        <h3 className="text-sm font-medium text-gray-500 mb-1">Upcoming Reservations</h3>
        <div className="space-y-1 mb-1 overflow-y-auto max-h-32">
          {isLoadingReservations ? (
            <div className="flex flex-col space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          ) : upcomingReservations.length > 0 ? (
            upcomingReservations.map((reservation, index) => (
              <div 
                key={reservation.id} 
                className="flex items-start py-1 border-b border-gray-100 last:border-0 text-sm"
              >
                <div className="flex-shrink-0 text-indigo-500 mt-0.5 mr-2">
                  {index === 0 ? <Calendar size={14} /> : <Clock size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {reservation.room_name}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {formatDate(reservation.start_time)}, {formatTime(reservation.start_time)} - {formatTime(reservation.end_time)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400 mb-2">No upcoming reservations</p>
              <Link href="/reservations">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  Book a Room
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Current Status */}
      <div className="mt-auto">
        <div className="flex items-center text-sm text-gray-600">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
          <span>{availableRooms} of {totalRooms} rooms available now</span>
        </div>
        <Link href="/reservations" className="text-xs text-indigo-600 hover:underline mt-1 inline-block">
          Manage your reservations
        </Link>
      </div>
    </div>
  );
};

export default RoomManagementCard; 