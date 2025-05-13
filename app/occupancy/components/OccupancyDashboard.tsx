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
 *   - Gets data from the shared OccupancyContext
 *   - Distributes data to child visualization components
 * 
 * KEY DEPENDENCIES: 
 *   - OccupancyContext for shared data management
 *   - Card components from shadcn/ui
 *   - Child visualization components
 */

"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useOccupancy } from "@/contexts/OccupancyContext";
import OccupancyGauge from "./OccupancyGauge";
import OccupancyTrends from "./OccupancyTrends";

export default function OccupancyDashboard() {
  /**
   * CONTEXT DATA
   * 
   * Use the shared OccupancyContext to get consistent data across the app
   */
  const { currentOccupancy, historicalData, isLoading, lastUpdated } = useOccupancy();

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
      {/* Last Updated Timestamp */}
      {lastUpdated && (
        <div className="text-sm text-gray-500 text-right">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
      
      {/* Overall Occupancy Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Overall Occupancy */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Current Occupancy</CardTitle>
            <CardDescription>Overall library space utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <OccupancyGauge data={currentOccupancy} />
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
    </div>
  );
} 