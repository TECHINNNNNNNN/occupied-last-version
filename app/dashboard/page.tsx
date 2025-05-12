'use client'

/**
 * COMPONENT: Dashboard Layout
 * PURPOSE: Provides the main dashboard interface with user profile and key functions
 * CONTEXT: Entry point for authenticated users to access all library features
 * DATA FLOW: Retrieves user data from AuthContext, displays profile and navigation options
 * KEY DEPENDENCIES: AuthContext, Next.js router, Tailwind CSS
 */

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useEffect, useState } from 'react'
import { getOverallOccupancy, generateHistoricalData } from '@/utils/mockOccupancyData'
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

// Define the type for occupancy data
interface OccupancyData {
  occupied: number;
  capacity: number;
  percentage: number;
  status: string;
  zones?: Array<{
    id: string;
    name: string;
    capacity: number;
    current: number;
    percentage: number;
    status: string;
    floor: number;
  }>;
}

// Define types for historical data
interface HistoricalDataPoint {
  time: string;
  hour: number;
  formattedTime: string;
  overall: number;
  totalOccupancy: number;
  totalCapacity: number;
}

// Define simplified chart data
interface ChartDataPoint {
  time: string;
  occupancy: number;
}

// Define mock types for Room Management
interface Reservation {
  id: string;
  room_id: number;
  room_name: string;
  start_time: string;
  end_time: string;
  agenda: string;
  num_people: number;
  status: 'pending' | 'confirmed' | 'cancelled';
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
  
  // STATE: Occupancy data for the gauge - properly typed
  const [occupancyData, setOccupancyData] = useState<OccupancyData | null>(null);
  
  // STATE: Historical data for the trends chart
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  
  // STATE: Mock room reservations
  const [upcomingReservations, setUpcomingReservations] = useState<Reservation[]>([]);
  const [availableRooms, setAvailableRooms] = useState<number>(0);
  const totalRooms = 12; // This is a constant since it doesn't change
  
  // STATE: Real communications from the service
  const [recentCommunications, setRecentCommunications] = useState<Post[]>([]);
  const [communicationsLoading, setCommunicationsLoading] = useState<boolean>(true);
  
  // EFFECT: Fetch occupancy data and set up polling interval
  useEffect(() => {
    const fetchOccupancyData = () => {
      try {
        const data = getOverallOccupancy();
        setOccupancyData(data);
        
        // Also fetch historical data (last 8 hours)
        const historical = generateHistoricalData(8);
        setHistoricalData(historical);
      } catch (error) {
        console.error("Error fetching occupancy data:", error);
      }
    };
    
    // Initial fetch
    fetchOccupancyData();
    
    // Set up polling every 60 seconds
    const intervalId = setInterval(fetchOccupancyData, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);
  
  // EFFECT: Format historical data for the chart
  useEffect(() => {
    if (historicalData.length > 0) {
      const formatted = historicalData.map(item => ({
        time: item.formattedTime,
        occupancy: Math.round(item.overall * 100) // Convert to percentage
      }));
      setChartData(formatted);
    }
  }, [historicalData]);
  
  // EFFECT: Fetch mock reservation data
  useEffect(() => {
    // In a real app, this would come from an API/supabase
    const mockReservations: Reservation[] = [
      {
        id: '1',
        room_id: 3,
        room_name: 'Group Study B3',
        start_time: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
        end_time: new Date(new Date().setHours(16, 0, 0, 0)).toISOString(),
        agenda: 'Group Project Work',
        num_people: 4,
        status: 'confirmed'
      },
      {
        id: '2',
        room_id: 1,
        room_name: 'Quiet Room A1',
        start_time: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(), // tomorrow
        end_time: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString(), // tomorrow
        agenda: 'Study Session',
        num_people: 1,
        status: 'confirmed'
      }
    ];
    
    setUpcomingReservations(mockReservations);
    
    // Mock available rooms (random between 5-10)
    setAvailableRooms(Math.floor(Math.random() * 6) + 5);
  }, []);
  
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

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = getInitials(userName);
  
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
    <div className="min-h-screen flex flex-col bg-gray-50 p-4">
      {/*
        Content container with improved proportions
        - Using h-screen to ensure it fits the viewport height
        - Reduced gap for better space efficiency
      */}
      <div className="max-w-7xl mx-auto flex flex-col w-full h-screen gap-4">
        {/* SECTION: Welcome Header - slimmer design */}
        <div className="w-full mb-1">
          <h1 className="text-3xl font-bold">Welcome to the Engineering Library!</h1>
          <p className="text-lg text-gray-600">Monitor, book, and manage your library spaces with ease.</p>
        </div>

        {/* 
          SECTION: Dashboard Grid
          - Using grid-rows-[40%_60%] to create a proportional split
          - Top section gets 40% of space, bottom gets 60%
          - Reduced gap for better space efficiency
        */}
        <div className="grid grid-rows-[40%_60%] gap-4 flex-1 overflow-hidden">
          {/* Top Row - Cards */}
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* Profile Card */}
            <Link href="/profile" className="col-span-3 bg-white rounded-lg shadow p-4 flex flex-col items-center justify-between">
              {/* Avatar Section - slightly reduced size */}
              <div className="relative w-20 h-20 mb-2">
                <Avatar className="w-full h-full border-2 border-gray-100">
                  <AvatarImage src={user?.user_metadata?.avatar_url || ''} alt={userName} />
                  <AvatarFallback className="text-xl bg-indigo-100 text-indigo-600">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              {/* Name Section */}
              <div className="text-center">
                <h2 className="text-xl font-semibold">{userName}</h2>
                <p className="text-gray-500 text-sm">Engineering Student</p>
              </div>
              
              {/* Hint that card is clickable */}
              <p className="text-xs text-gray-400 mt-1">Click to view profile</p>
            </Link>
            
            {/* Occupancy Card */}
            <div className="col-span-4 bg-white rounded-lg shadow p-4 flex flex-col">
              <h2 className="text-lg font-semibold mb-1">Occupancy</h2>
              
              {/* Simplified Occupancy Display */}
              <div className="flex-1 flex items-center justify-center">
                {occupancyData ? (
                  <div className="w-full text-center">
                    {/* Percentage Circle */}
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 mb-1" 
                         style={{ 
                           borderColor: getStatusColor(occupancyData.percentage),
                           background: `linear-gradient(to right, ${getStatusColor(occupancyData.percentage)}22, ${getStatusColor(occupancyData.percentage)}44)`
                         }}>
                      <span className="text-xl font-bold">
                        {Math.round(occupancyData.percentage * 100)}%
                      </span>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="mb-1">
                      <span className="text-sm font-medium px-3 py-0.5 rounded-full"
                            style={{ 
                              backgroundColor: getStatusColor(occupancyData.percentage),
                              color: occupancyData.percentage > 0.5 ? 'white' : 'black'
                            }}>
                        {occupancyData.status}
                      </span>
                    </div>
                    
                    {/* Occupancy Count */}
                    <p className="text-sm text-gray-600">
                      {occupancyData.occupied} / {occupancyData.capacity} spots occupied
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-400">Loading occupancy data...</p>
                )}
              </div>
              
              {/* Link to detailed occupancy view */}
              <div className="mt-auto text-center">
                <Link href="/occupancy" className="text-sm text-indigo-600 hover:underline">
                  View detailed occupancy data
                </Link>
              </div>
            </div>
            
            {/* Room Management Card */}
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
                <div className="space-y-1 mb-1 overflow-y-auto max-h-[calc(100%-3rem)]">
                  {upcomingReservations.length > 0 ? (
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
                    <p className="text-sm text-gray-400">No upcoming reservations</p>
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
          </div>

          {/* Bottom Row - Charts and Communications */}
          <div className="grid grid-cols-12 gap-4 h-full">
            {/* Occupancy Trends Card */}
            <div className="col-span-7 bg-white rounded-lg shadow p-4 flex flex-col h-full">
              <h2 className="text-lg font-semibold mb-1">Occupancy Trends</h2>
              
              {chartData.length > 0 ? (
                <div className="flex-1 w-full h-[calc(100%-3rem)] min-h-[150px]">
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
                        dot={false}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-gray-400">Loading trends data...</p>
                </div>
              )}
              
              <div className="mt-auto pt-1 text-center">
                <Link href="/occupancy" className="text-sm text-indigo-600 hover:underline">
                  View detailed trend analysis
                </Link>
              </div>
            </div>
            
            {/* Recent Communications Card */}
            <div className="col-span-5 bg-white rounded-lg shadow p-4 flex flex-col h-full">
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
    </div>
  )
}