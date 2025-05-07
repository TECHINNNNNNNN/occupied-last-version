/**
 * COMPONENT: OccupancyDashboard
 * 
 * PURPOSE: Client component that displays comprehensive library occupancy data
 * through multiple visualizations
 * 
 * CONTEXT: Main content of the Occupancy page, showing real-time and historical
 * library occupancy information
 * 
 * DATA FLOW: 
 *   - Fetches mock data from utility functions (will be replaced with real API calls)
 *   - Updates data on a 1-minute polling interval
 *   - Distributes data to child visualization components
 * 
 * KEY DEPENDENCIES: 
 *   - React state for data management
 *   - Mock data generation utilities
 *   - Card components from shadcn/ui
 *   - Child visualization components
 */

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getOverallOccupancy,
  generateCurrentOccupancy,
  generateHistoricalData,
} from "@/utils/mockOccupancyData";
import OccupancyGauge from "./OccupancyGauge";
import OccupancyZones from "./OccupancyZones";
import OccupancyTrends from "./OccupancyTrends";

// Define types for the state variables
interface OverallData {
  occupied: number;
  capacity: number;
  percentage: number;
  status: string;
  zones: Array<ZoneData>;
}

interface ZoneData {
  id: string;
  name: string;
  capacity: number;
  floor: number;
  current: number;
  percentage: number;
  status: string;
}

interface HistoricalDataPoint {
  time: string;
  hour: number;
  formattedTime: string;
  overall: number;
  totalOccupancy: number;
  totalCapacity: number;
  zones: Array<{
    id: string;
    name: string;
    count: number;
    capacity: number;
    percentage: number;
  }>;
}

export default function OccupancyDashboard() {
  /**
   * STATE MANAGEMENT
   * 
   * overallData: Aggregated library-wide occupancy metrics
   * zonesData: Zone-specific occupancy information
   * historicalData: Time-series data for trend visualization
   * isLoading: Tracks data loading state for UI feedback
   */
  const [overallData, setOverallData] = useState<OverallData | null>(null);
  const [zonesData, setZonesData] = useState<ZoneData[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * DATA FETCHING EFFECT
   * 
   * Fetches initial data and sets up polling for real-time updates
   * In a production app, this would use authenticated API calls
   * and potentially WebSockets for real-time data
   */
  useEffect(() => {
    // Function to fetch occupancy data
    const fetchData = () => {
      try {
        // In a production app, these would be API calls to backend services
        const overall = getOverallOccupancy();
        const zones = generateCurrentOccupancy();
        const historical = generateHistoricalData(12); // Last 12 hours

        setOverallData(overall);
        setZonesData(zones);
        setHistoricalData(historical);
      } catch (error) {
        console.error("Error fetching occupancy data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial data fetch
    fetchData();

    // Set up polling for real-time updates (every minute)
    const intervalId = setInterval(fetchData, 60000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  /**
   * LOADING STATE RENDERING
   * 
   * Shows a loading indicator while data is being fetched
   * for better user experience
   */
  if (isLoading) {
    return <div className="text-center py-10">Loading occupancy data...</div>;
  }

  /**
   * COMPONENT RENDERING
   * 
   * Layout uses grid for responsive design:
   * - Single column on mobile
   * - Multi-column on larger screens
   * 
   * Content is organized into card components for visual separation
   */
  return (
    <div className="space-y-6">
      {/* Overall Occupancy Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Overall Occupancy */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Current Occupancy</CardTitle>
            <CardDescription>Overall library space utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <OccupancyGauge data={overallData} />
          </CardContent>
        </Card>

        {/* Historical Trends */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Occupancy Trends</CardTitle>
            <CardDescription>Occupancy patterns over time</CardDescription>
          </CardHeader>
          <CardContent>
            <OccupancyTrends data={historicalData} />
          </CardContent>
        </Card>
      </div>

      {/* Zone Details Section */}
      <Card>
        <CardHeader>
          <CardTitle>Zone Occupancy</CardTitle>
          <CardDescription>Current occupancy by library zone</CardDescription>
        </CardHeader>
        <CardContent>
          <OccupancyZones data={zonesData} />
        </CardContent>
      </Card>
    </div>
  );
} 