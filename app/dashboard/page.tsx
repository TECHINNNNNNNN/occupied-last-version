'use client'

/**
 * COMPONENT: Dashboard Layout
 * PURPOSE: Provides the main dashboard interface with user profile and key functions
 * CONTEXT: Entry point for authenticated users to access all library features
 * DATA FLOW: Retrieves user data from AuthContext, displays profile and navigation options
 * KEY DEPENDENCIES: AuthContext, OccupancyContext, Next.js router, Component organization
 */

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useOccupancy } from '@/contexts/OccupancyContext'
import { supabase } from '@/lib/supabase'
import { getPosts } from '@/app/communication/services/communicationService'
import { Post } from '@/app/communication/types/communicationTypes'
import { ChartDataPoint, Reservation } from './types'
import { getInitials } from './utils'
import Image from 'next/image'
// Component imports
import ProfileCard from './components/ProfileCard'
import OccupancyCard from './components/OccupancyCard'
import RoomManagementCard from './components/RoomManagementCard'
import OccupancyTrendsCard from './components/OccupancyTrendsCard'
import CommunicationsCard from './components/CommunicationsCard'
import { NavBar } from './components/Navbar'
import { FileText, Home } from 'lucide-react'
import { User } from 'lucide-react'
import { Briefcase } from 'lucide-react'
import Announcement from './components/Announcement'

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
  
  // FUNCTION: Get time-based greeting
  const getTimeBasedGreeting = () => {
    const currentHour = new Date().getHours();
    
    if (currentHour >= 5 && currentHour < 12) {
      return 'Good morning';
    } else if (currentHour >= 12 && currentHour < 17) {
      return 'Good afternoon';
    } else if (currentHour >= 17 && currentHour < 22) {
      return 'Good evening';
    } else {
      return 'Welcome back';
    }
  };

 

  const navItems = [
    { name: 'Home', url: '#', icon: Home },
    { name: 'Statistics', url: '#', icon: User },
    { name: 'Reservations', url: '#', icon: Briefcase },
    { name: 'Communications', url: '#', icon: FileText }
  ] 
  
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
        setRecentCommunications(posts.slice(0, 4));
      } catch (error) {
        console.error("Error fetching communications:", error);
      } finally {
        setCommunicationsLoading(false);
      }
    };
    
    fetchCommunications();
  }, []);

  // Calculate user display properties
  const userName = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const initials = getInitials(userName);
  const userRole = profile?.role || 'Engineering Student';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || '';

  return (
    // Main container with reduced padding for better space usage
    <div className="min-h-screen w-screen flex flex-col bg-gradient-to-br from-slate-300 via-amber-50 to-amber-100 opacity-90 p-2 overflow-auto">
      {/*
        Content container with improved proportions
        - Using h-full to respect parent constraints
        - Added pb-6 to ensure bottom padding when scrolling
      */}

      <div className="px-3 mx-auto flex flex-col w-full h-full">
        <div className=' hidden md:flex justify-between py-2 px-4'>
          <Image src="/images/logolibrary.webp" alt="logo" width={50} height={50} className='w-10 h-10' />
          <NavBar items={navItems} />
        </div>

        {/* SECTION: Personalized Welcome Header */}
        <div className="w-full flex-1 p-4">
          <h1 className="text-5xl font-bold font-ancizar italic">{getTimeBasedGreeting()}, {userName}!</h1>
          <p className="text-lg text-gray-600">Monitor, book, and manage your library spaces with ease.</p>
        </div>

        {/* 
          SECTION: Dashboard Grid
          - Single unified grid for all cards
          - Using grid-rows-[auto] to adapt to content
          - 12-column layout with consistent gap
        */}
        <div className="grid flex-1 sm:grid-cols-12 grid-cols-12  gap-4">
          {/* Profile Card */}
          <ProfileCard 
            userName={userName}
            userRole={userRole}
            avatarUrl={avatarUrl}
            initials={initials}
          />
          
          {/* Occupancy Card */}
          <OccupancyCard 
            isLoading={isLoading}
            currentOccupancy={currentOccupancy}
          />
          
          {/* Room Management Card */}
          <RoomManagementCard 
            upcomingReservations={upcomingReservations}
            isLoadingReservations={isLoadingReservations}
            availableRooms={availableRooms}
            totalRooms={totalRooms}
          />

          {/* Recent Communications Card */}
          <CommunicationsCard 
            recentCommunications={recentCommunications}
            communicationsLoading={communicationsLoading}
          />

          {/* Announcement Card */}
          <Announcement />

          {/* Occupancy Trends Card */}
          <OccupancyTrendsCard 
            isLoading={isLoading}
            chartData={chartData}
          />

          
          
        </div>
      </div>
      
    </div>
  )
} 