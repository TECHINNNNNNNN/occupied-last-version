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

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOccupancy } from "@/contexts/OccupancyContext";
import OccupancyGauge from "./OccupancyGauge";
import OccupancyTrends from "./OccupancyTrends";
import OccupancyWeeklyTrends from "./OccupancyWeeklyTrends";
import OccupancyTwoDayTrends from "./OccupancyTwoDayTrends";
import OccupancyPrediction from "./OccupancyPrediction";

export default function OccupancyDashboard() {
  /**
   * STATE MANAGEMENT
   * 
   * activeTab: Tracks which trend view is currently active
   */
  const [activeTab, setActiveTab] = useState<string>("today");

  /**
   * CONTEXT DATA
   * 
   * Use the shared OccupancyContext to get consistent data across the app
   */
  const { 
    currentOccupancy, 
    historicalData, 
    weeklyData,
    twoDayData,
    predictionData,
    isLoading, 
    lastUpdated 
  } = useOccupancy();

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

        {/* Trends Card with Tabs */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Occupancy Trends</CardTitle>
            <CardDescription>Occupancy patterns over time</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="today" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 p-0 max-md: flex max-md:flex-wrap">
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="2day">48-Hour</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="prediction">Prediction</TabsTrigger>
              </TabsList>
              
              <TabsContent value="today" className="m-0">
                <OccupancyTrends data={historicalData} />
              </TabsContent>
              
              <TabsContent value="2day" className="m-0">
                <OccupancyTwoDayTrends data={twoDayData} />
              </TabsContent>
              
              <TabsContent value="weekly" className="m-0">
                <OccupancyWeeklyTrends data={weeklyData} />
              </TabsContent>
              
              <TabsContent value="prediction" className="m-0">
                <OccupancyPrediction data={predictionData} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 