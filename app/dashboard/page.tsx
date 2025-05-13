'use client'

/**
 * COMPONENT: Dashboard Layout
 * PURPOSE: Provides the main dashboard interface with user profile and key functions
 * CONTEXT: Entry point for authenticated users to access all library features
 * DATA FLOW: Retrieves user data from AuthContext, displays profile and navigation options
 * KEY DEPENDENCIES: AuthContext, OccupancyContext, Next.js router, Tailwind CSS
 */

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useOccupancy } from '@/contexts/OccupancyContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MessageCircle, ThumbsUp } from 'lucide-react'
import { format } from 'date-fns'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { getPosts } from '@/app/communication/services/communicationService'
import { Post } from '@/app/communication/types/communicationTypes'
import { supabase } from '@/lib/supabase'
import { Skeleton } from '@/components/ui/skeleton'

// Define simplified chart data
interface ChartDataPoint {
  time: string;
  occupancy: number;
}

// Define mock types for Room Management
interface Reservation {
  id: string;
  room_id: number;
  room_name: string; // This will be populated from the rooms table
  start_time: string;
  end_time: string;
  agenda: string;
  num_people: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  user_email?: string; // Added to match the database schema
  created_at?: string; // Added to match the database schema
}

// Custom tooltip for the chart
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    dataKey: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border rounded shadow-sm text-sm">
        <p className="font-medium">{label}</p>
        <p>
          Occupancy:{" "}
          <span className="font-semibold">{payload[0].value}%</span>
        </p>
      </div>
    );
  }
  return null;
};

// SECTION: Dashboard Container
export default function Dashboard() {
  const { user } = useAuth();
  
  // CONTEXT: Use shared occupancy data from context
  const { currentOccupancy, historicalData, isLoading } = useOccupancy();
  
  // STATE: Chart data prepared from historical data
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  
  // STATE: Real room reservations
  const [upcomingReservations, setUpcomingReservations] = useState<Reservation[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState<boolean>(true);
  const [availableRooms, setAvailableRooms] = useState<number>(0);
  const totalRooms = 12; // This is a constant since it doesn't change
  
  // STATE: Real communications from the service
  const [recentCommunications, setRecentCommunications] = useState<Post[]>([]);
  const [communicationsLoading, setCommunicationsLoading] = useState<boolean>(true);
  
  // STATE: User profile data
  const [profile, setProfile] = useState<{
    id: string;
    name: string;
    avatar_url: string;
    role: string;
  } | null>(null);
  
  // EFFECT: Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Failed to fetch profile:', error);
          return;
        }

        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, [user]);
  
  // EFFECT: Format historical data for the chart
  useEffect(() => {
    if (historicalData.length > 0) {
      // Get only the last 8 hours of data for the dashboard chart
      const limitedData = historicalData.slice(-8);
      
      const formatted = limitedData.map(item => ({
        time: item.formattedTime,
        occupancy: Math.round(item.overall * 100) // Convert to percentage
      }));
      setChartData(formatted);
    }
  }, [historicalData]);
  
  // EFFECT: Fetch real reservation data and available rooms
  useEffect(() => {
    const fetchReservations = async () => {
      // Return early if user is not authenticated
      if (!user) {
        setUpcomingReservations([]);
        setIsLoadingReservations(false);
        return;
      }

      setIsLoadingReservations(true);

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
        
        // Process the data based on which method was used
        let reservationsWithRoom: Reservation[] = [];
        
        if (reservationsData && reservationsData.length > 0) {
          if (useJoinMethod) {
            // Process data from join query
            reservationsWithRoom = reservationsData.map(item => ({
              ...item,
              room_name: item.rooms?.name || 'Unknown Room'
            }));
          } else {
            // Get room data separately and then combine
            const roomIds = [...new Set(reservationsData.map((res) => res.room_id))];
            
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
            roomsData?.forEach((room) => {
              roomMap.set(room.id, room.name);
            });
            
            // Combine reservation data with room names
            reservationsWithRoom = reservationsData.map((reservation) => ({
              ...reservation,
              room_name: roomMap.get(reservation.room_id) || 'Unknown Room'
            }));
          }
        }
          
        setUpcomingReservations(reservationsWithRoom);
      } catch (err) {
        console.error('Error fetching reservations:', err);
      } finally {
        setIsLoadingReservations(false);
      }
    };

    // Fetch available rooms count
    const fetchAvailableRooms = async () => {
      try {
        const { error } = await supabase
          .from('rooms')
          .select('count', { count: 'exact' });
        
        if (error) {
          console.error('Error fetching room count:', error);
          return;
        }
        
        // For now we'll still randomize available rooms, but this would be replaced with real availability logic
        setAvailableRooms(Math.floor(Math.random() * 6) + 5);
      } catch (error) {
        console.error('Error fetching available rooms:', error);
        setAvailableRooms(8); // Default fallback
      }
    };

    fetchReservations();
    fetchAvailableRooms();

    // Set up real-time subscription for the user's reservations
    const subscription = supabase
      .channel('reservation-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'reservations',
        filter: user ? `user_email=eq.${user.email}` : undefined,
      }, () => {
        // Refetch reservations when data changes
        fetchReservations();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);
  
  // EFFECT: Fetch real communication data
  useEffect(() => {
    const fetchCommunications = async () => {
      try {
        setCommunicationsLoading(true);
        const posts = await getPosts();
        // Get most recent 3 posts for the dashboard
        setRecentCommunications(posts.slice(0, 3));
      } catch (error) {
        console.error("Error fetching communications:", error);
      } finally {
        setCommunicationsLoading(false);
      }
    };
    
    fetchCommunications();
  }, []);
  
  // Generate initials for avatar fallback
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return 'U';
    return name.split(' ').map((part: string) => part[0]).join('').toUpperCase();
  };

  const userName = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = getInitials(userName);
  const userRole = profile?.role || 'Engineering Student';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || '';
  
  // Helper to format time for display
  const formatTime = (isoTime: string): string => {
    return format(new Date(isoTime), 'h:mm a');
  };
  
  // Helper to format date for display
  const formatDate = (isoTime: string): string => {
    const date = new Date(isoTime);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return format(date, 'MMM d');
    }
  };
  
  // Helper to format time ago
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 24 * 60) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return format(date, 'MMM d');
    }
  };

  // Helper function to get color based on occupancy percentage
  function getStatusColor(percentage: number): string {
    if (percentage < 0.3) return "#22c55e"; // green
    if (percentage < 0.6) return "#f59e0b"; // amber
    if (percentage < 0.85) return "#f97316"; // orange
    return "#ef4444"; // red
  }

  return (
    // Main container with reduced padding for better space usage
    <div className="h-screen w-screen flex flex-col bg-gray-50 p-4 overflow-auto">
      {/*
        Content container with improved proportions
        - Using h-full to respect parent constraints
        - Added pb-6 to ensure bottom padding when scrolling
      */}
      <div className="max-w-7xl mx-auto flex flex-col w-full h-full gap-4 pb-6">
        {/* SECTION: Welcome Header - slimmer design */}
        <div className="w-full mb-2">
          <h1 className="text-3xl font-bold">Welcome to the Engineering Library!</h1>
          <p className="text-lg text-gray-600">Monitor, book, and manage your library spaces with ease.</p>
        </div>

        {/* 
          SECTION: Dashboard Grid
          - Single unified grid for all cards
          - Using grid-rows-[auto] to adapt to content
          - 12-column layout with consistent gap
        */}
        <div className="grid grid-cols-12 gap-4">
          {/* Profile Card - first row, first 3 columns */}
          <Link 
            href="/profile" 
            className="col-span-3 bg-white rounded-lg shadow overflow-hidden h-full relative group"
          >
            {/* Background Image with Gradient Overlay */}
            <div className="absolute inset-0 w-full h-full">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
                  <span className="text-6xl font-bold text-indigo-600">{initials}</span>
                </div>
              )}
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            </div>
            
            {/* Content overlay */}
            <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
              <div className="mb-1">
                <h2 className="text-xl font-semibold">{userName}</h2>
                <p className="text-sm text-gray-200">{userRole}</p>
              </div>
              
              {/* Hover effect for clickable indication */}
              <p className="text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                Click to view profile
              </p>
            </div>
          </Link>
          
          {/* Occupancy Card - first row, next 4 columns */}
          <div className="col-span-4 bg-white rounded-lg shadow p-4 flex flex-col">
            <h2 className="text-lg font-semibold mb-1">Occupancy</h2>
            
            {/* Simplified Occupancy Display */}
            <div className="flex-1 flex items-center justify-center">
              {isLoading || !currentOccupancy ? (
                <p className="text-gray-400">Loading occupancy data...</p>
              ) : (
                <div className="w-full text-center">
                  {/* Percentage Circle */}
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 mb-1" 
                       style={{ 
                         borderColor: getStatusColor(currentOccupancy.percentage),
                         background: `linear-gradient(to right, ${getStatusColor(currentOccupancy.percentage)}22, ${getStatusColor(currentOccupancy.percentage)}44)`
                       }}>
                    <span className="text-xl font-bold">
                      {Math.round(currentOccupancy.percentage * 100)}%
                    </span>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="mb-1">
                    <span className="text-sm font-medium px-3 py-0.5 rounded-full"
                          style={{ 
                            backgroundColor: getStatusColor(currentOccupancy.percentage),
                            color: currentOccupancy.percentage > 0.5 ? 'white' : 'black'
                          }}>
                      {currentOccupancy.status}
                    </span>
                  </div>
                  
                  {/* Occupancy Count */}
                  <p className="text-sm text-gray-600">
                    {currentOccupancy.occupied} / {currentOccupancy.capacity} spots occupied
                  </p>
                </div>
              )}
            </div>
            
            {/* Link to detailed occupancy view */}
            <div className="mt-auto text-center">
              <Link href="/occupancy" className="text-sm text-indigo-600 hover:underline">
                View detailed occupancy data
              </Link>
            </div>
          </div>
          
          {/* Room Management Card - first row, next 5 columns */}
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

          {/* Occupancy Trends Card - second row, spans 7 columns */}
          <div className="col-span-7 bg-white rounded-lg shadow p-4 flex flex-col h-80 mt-2">
            <h2 className="text-lg font-semibold mb-1">Occupancy Trends</h2>
            
            {isLoading || chartData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-400">Loading trends data...</p>
              </div>
            ) : (
              <div className="flex-1 w-full h-full min-h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                  >
                    {/* Background Grid */}
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    
                    {/* X-Axis (Time) */}
                    <XAxis 
                      dataKey="time" 
                      tick={{ fontSize: 11 }}
                      tickMargin={5}
                    />
                    
                    {/* Y-Axis (Occupancy Percentage) */}
                    <YAxis
                      tickFormatter={(value) => `${value}%`}
                      domain={[0, 100]}
                      tick={{ fontSize: 11 }}
                      width={40}
                    />
                    
                    {/* Tooltip */}
                    <Tooltip content={<CustomTooltip />} />
                    
                    {/* Data Line */}
                    <Line
                      type="monotone"
                      dataKey="occupancy"
                      name="Occupancy"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={true}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            
            <div className="mt-auto pt-1 text-center">
              <Link href="/occupancy" className="text-sm text-indigo-600 hover:underline">
                View detailed trend analysis
              </Link>
            </div>
          </div>
          
          {/* Recent Communications Card - second row, spans 5 columns */}
          <div className="col-span-5 bg-white rounded-lg shadow p-4 flex flex-col h-80 mt-2">
            <h2 className="text-lg font-semibold mb-1">Recent Communications</h2>
            
            {/* Communications feed */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {communicationsLoading ? (
                <p className="text-sm text-gray-400">Loading communications...</p>
              ) : recentCommunications.length > 0 ? (
                recentCommunications.map((post) => (
                  <div key={post.id} className="pb-2 border-b border-gray-100 last:border-0">
                    {/* User and time */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage src={post.user.avatar} alt={post.user.name} />
                          <AvatarFallback className="text-xs">
                            {getInitials(post.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{post.user.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{formatTimeAgo(post.createdAt)}</span>
                    </div>
                    
                    {/* Content */}
                    <p className="text-sm text-gray-700 break-words mb-1 line-clamp-2">
                      {post.content}
                    </p>
                    
                    {/* Tags and location */}
                    {(post.topics?.length > 0 || post.zone) && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {post.topics?.slice(0, 2).map(topic => (
                          <span key={topic.id} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                            #{topic.name}
                          </span>
                        ))}
                        {post.zone && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {post.zone.name}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex text-xs text-gray-500 mt-1">
                      <div className="flex items-center mr-3">
                        <ThumbsUp className="w-3 h-3 mr-1" />
                        <span>{post.likeCount}</span>
                      </div>
                      <div className="flex items-center">
                        <MessageCircle className="w-3 h-3 mr-1" />
                        <span>{post.replies.length}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No recent communications</p>
              )}
            </div>
            
            {/* Link to communications page */}
            <div className="mt-auto pt-1 text-center border-t border-gray-100">
              <Link href="/communication" className="text-sm text-indigo-600 hover:underline">
                View all community posts
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}