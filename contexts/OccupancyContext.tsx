/**
 * COMPONENT: OccupancyContext
 * 
 * PURPOSE: Provides a central source of truth for library occupancy data
 * across the application to ensure consistency
 * 
 * CONTEXT: Used by both dashboard and dedicated occupancy pages to access
 * synchronized occupancy data
 * 
 * DATA FLOW: 
 *   - Manages polling for occupancy data updates
 *   - Distributes real-time and historical data to subscribed components
 *   - Ensures consistent data visualization across the application
 * 
 * KEY DEPENDENCIES: 
 *   - React Context API for state distribution
 *   - Mock data utilities (to be replaced with real API calls in production)
 */

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  getOverallOccupancy,
  generateHistoricalData
} from "@/utils/mockOccupancyData";

// Define the occupancy data types
export interface OccupancyData {
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
export interface HistoricalDataPoint {
  time: string;
  hour: number;
  formattedTime: string;
  overall: number;
  totalOccupancy: number;
  totalCapacity: number;
  zones?: Array<{
    id: string;
    name: string;
    count: number;
    capacity: number;
    percentage: number;
  }>;
}

// Context interface
interface OccupancyContextType {
  currentOccupancy: OccupancyData | null;
  historicalData: HistoricalDataPoint[];
  isLoading: boolean;
  lastUpdated: Date | null;
  refreshData: () => void;
}

// Create the context with a default value
const OccupancyContext = createContext<OccupancyContextType>({
  currentOccupancy: null,
  historicalData: [],
  isLoading: true,
  lastUpdated: null,
  refreshData: () => {},
});

// Create the provider component
export function OccupancyProvider({ children }: { children: React.ReactNode }) {
  // STATE: Occupancy data state with proper typing
  const [currentOccupancy, setCurrentOccupancy] = useState<OccupancyData | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /**
   * Fetch Data Function
   * 
   * Retrieves occupancy data from mock data generator (or API in production)
   * Updates context state with consistent values
   * Tracks last update timestamp for freshness indicators
   */
  const fetchData = () => {
    try {
      // Get current overall occupancy
      const overall = getOverallOccupancy();
      setCurrentOccupancy(overall);

      // Get 12 hours of historical data (maximum needed by any component)
      // Components can filter this down as needed
      const historical = generateHistoricalData(12);
      setHistoricalData(historical);

      // Update last refresh timestamp
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching occupancy data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Initial Data Load & Polling Setup
   * 
   * Fetches data immediately on mount and sets up interval
   * for periodic refresh to simulate real-time data
   */
  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up polling interval (every 60 seconds)
    const intervalId = setInterval(fetchData, 60000);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Context value object
  const value = {
    currentOccupancy,
    historicalData,
    isLoading,
    lastUpdated,
    refreshData: fetchData, // Expose refresh function for manual updates
  };

  return (
    <OccupancyContext.Provider value={value}>
      {children}
    </OccupancyContext.Provider>
  );
}

// Custom hook for consuming the context
export function useOccupancy() {
  const context = useContext(OccupancyContext);
  
  if (context === undefined) {
    throw new Error("useOccupancy must be used within an OccupancyProvider");
  }
  
  return context;
} 