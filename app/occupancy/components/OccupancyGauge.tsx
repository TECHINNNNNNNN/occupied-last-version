/**
 * COMPONENT: OccupancyGauge
 * 
 * PURPOSE: Displays a visual gauge representation of current overall library occupancy
 * 
 * CONTEXT: Used in the OccupancyDashboard to show the overall occupancy percentage
 * 
 * DATA FLOW: Receives occupancy data from parent component and renders a gauge
 * visualization with corresponding color and text indicators
 * 
 * KEY DEPENDENCIES: 
 *   - react-gauge-component for gauge visualization
 *   - Color coding for different occupancy levels
 */

"use client";

import { GaugeComponent } from "react-gauge-component";

interface OccupancyGaugeProps {
  data: {
    percentage: number;
    occupied: number;
    capacity: number;
    status: string;
  } | null;
}

export default function OccupancyGauge({ data }: OccupancyGaugeProps) {
  // Handle loading/null state
  if (!data) {
    return <div className="text-center py-4">Loading gauge data...</div>;
  }

  /**
   * HELPER FUNCTION: getColor
   * 
   * Determines color based on occupancy percentage for consistent visual indicators
   * Green (low) → Amber (moderate) → Orange (high) → Red (very high)
   */
  const getColor = () => {
    const p = data.percentage;
    if (p < 0.3) return "#22c55e"; // green
    if (p < 0.6) return "#f59e0b"; // amber
    if (p < 0.85) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {/* Gauge Visualization */}
      <div className="w-full">
        <GaugeComponent
          id="occupancy-gauge"
          type="radial"
          arc={{
            width: 0.2,
            padding: 0.05,
            subArcs: [
              {
                limit: 30,
                color: "#22c55e", // Green for low occupancy
                showTick: true,
              },
              {
                limit: 60,
                color: "#f59e0b", // Amber for moderate occupancy
                showTick: true,
              },
              {
                limit: 85,
                color: "#f97316", // Orange for high occupancy
                showTick: true,
              },
              {
                limit: 100,
                color: "#ef4444", // Red for very high occupancy
                showTick: true,
              },
            ],
          }}
          pointer={{
            elastic: true, // Adds a spring animation effect
            animationDelay: 0,
          }}
          value={data.percentage * 100}
          minValue={0}
          maxValue={100}
          labels={{
            valueLabel: {
              formatTextValue: (value) => `${Math.round(value)}%`,
              style: { fontSize: "1.5rem", fontWeight: "bold" },
            },
          }}
        />
      </div>

      {/* Status Indicator and Occupancy Count */}
      <div className="text-center space-y-1">
        <div
          className="text-sm font-semibold rounded-full px-3 py-1 inline-block"
          style={{
            backgroundColor: getColor(),
            color: data.percentage > 0.5 ? "white" : "black", // Ensure text contrast
          }}
        >
          {data.status}
        </div>

        <p className="text-gray-600 font-medium">
          {data.occupied} / {data.capacity} spots occupied
        </p>
      </div>
    </div>
  );
} 