/**
 * COMPONENT: OccupancyZones
 * 
 * PURPOSE: Displays detailed occupancy information for each library zone
 * with filtering by floor
 * 
 * CONTEXT: Used in the OccupancyDashboard to show zone-specific information
 * 
 * DATA FLOW: 
 *   - Receives zone data from parent component
 *   - Manages floor filter selection state
 *   - Renders progress bars and status indicators for each zone
 * 
 * KEY DEPENDENCIES:
 *   - Tabs from shadcn/ui for floor filtering
 *   - Progress component from shadcn/ui for visualization
 *   - chroma-js for color scale generation
 */

"use client";

import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import chroma from "chroma-js";

/**
 * Zone data structure provided by parent component
 */
interface ZoneData {
  id: string;
  name: string;
  capacity: number;
  floor: number;
  current: number;
  percentage: number;
  status: string;
}

interface OccupancyZonesProps {
  data: ZoneData[];
}

export default function OccupancyZones({ data }: OccupancyZonesProps) {
  /**
   * STATE MANAGEMENT
   * 
   * selectedFloor: Tracks which floor tab is currently selected
   * "all" represents showing zones from all floors
   */
  const [selectedFloor, setSelectedFloor] = useState("all");

  /**
   * COLOR SCALE GENERATION
   * 
   * Creates a continuous color gradient from green (low occupancy)
   * to red (high occupancy) for consistent visual indicators
   */
  const colorScale = chroma
    .scale(["#22c55e", "#f59e0b", "#ef4444"])
    .domain([0, 1]);

  /**
   * FLOOR FILTERING LOGIC
   * 
   * Extract unique floor numbers for tabs and filter data based on selection
   */
  const floors = [...new Set(data.map((zone) => zone.floor))].sort();
  const filteredZones =
    selectedFloor === "all"
      ? data
      : data.filter((zone) => zone.floor === parseInt(selectedFloor));

  return (
    <div>
      {/* Floor Selection Tabs */}
      <Tabs defaultValue="all" onValueChange={setSelectedFloor}>
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Floors</TabsTrigger>
          {floors.map((floor) => (
            <TabsTrigger key={floor} value={floor.toString()}>
              Floor {floor}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Zone Listing */}
        <div className="space-y-4">
          {filteredZones.map((zone) => {
            // Generate color based on occupancy percentage
            const color = colorScale(zone.percentage).hex();

            return (
              <div key={zone.id} className="flex items-center space-x-4">
                <div className="flex-1">
                  {/* Zone Name and Floor */}
                  <div className="flex justify-between mb-1">
                    <div>
                      <span className="font-medium">{zone.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        Floor {zone.floor}
                      </span>
                    </div>
                    {/* Current Occupancy Count */}
                    <span className="text-sm text-gray-600">
                      {zone.current} / {zone.capacity}
                    </span>
                  </div>
                  {/* Occupancy Progress Bar */}
                  <Progress
                    value={zone.percentage * 100}
                    className="h-2"
                    style={
                      {
                        "--progress-background": color,
                      } as React.CSSProperties
                    }
                  />
                </div>
                {/* Percentage Badge */}
                <div
                  className="text-sm font-medium rounded-full px-2 py-1"
                  style={{
                    backgroundColor: color,
                    color: zone.percentage > 0.5 ? "white" : "black", // Ensure text contrast
                  }}
                >
                  {Math.round(zone.percentage * 100)}%
                </div>
              </div>
            );
          })}
        </div>
      </Tabs>
    </div>
  );
} 