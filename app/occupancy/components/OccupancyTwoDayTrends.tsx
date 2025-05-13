/**
 * COMPONENT: OccupancyTwoDayTrends
 * 
 * PURPOSE: Displays detailed 2-day occupancy data as a line chart
 * 
 * CONTEXT: Used in the OccupancyDashboard to show occupancy patterns over the last 48 hours
 * 
 * DATA FLOW: 
 *   - Receives 2-day detailed data points from parent component
 *   - Renders an interactive line chart with improved granularity
 * 
 * KEY DEPENDENCIES:
 *   - recharts for data visualization
 *   - Custom tooltip component for better data presentation
 *   - OccupancyContext for type definitions
 */

"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { TwoDayDataPoint } from "@/contexts/OccupancyContext";

interface OccupancyTwoDayTrendsProps {
  data: TwoDayDataPoint[];
}

/**
 * CUSTOM TOOLTIP COMPONENT
 * 
 * Enhances tooltip appearance and information display
 * Shows the time and occupancy details
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    dataKey: string;
    payload: TwoDayDataPoint;
  }>;
  label?: string;
}

export default function OccupancyTwoDayTrends({ data }: OccupancyTwoDayTrendsProps) {
  /**
   * CUSTOM TOOLTIP COMPONENT
   * 
   * Enhances tooltip appearance and information display
   * Shows detailed information when hovering over chart points
   */
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const { formattedDay, formattedTime, overall, totalOccupancy, totalCapacity } = payload[0].payload;
      
      return (
        <div className="bg-white p-3 border rounded shadow-sm text-sm">
          <p className="font-medium text-gray-900">{formattedDay} at {formattedTime}</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Occupancy:</span>
              <span className="font-semibold text-blue-500">
                {Math.round(overall * 100)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">People:</span>
              <span className="font-semibold">
                {totalOccupancy} / {totalCapacity}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  /**
   * FORMAT DATA FOR READABILITY
   * 
   * Converts raw data values to percentages for better readability in the chart
   */
  const formatYAxis = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  /**
   * FORMAT X-AXIS LABELS
   * 
   * Shows time with day indicator for better context
   */
  const formatXAxis = (value: string) => {
    // Extract just the hour for cleaner display
    if (!value) return '';
    const parts = value.split(' ');
    if (parts.length < 2) return value;
    
    return `${parts[0]} ${parts[1].split(':')[0]}h`;
  };

  /**
   * DETERMINE CURRENT TIME
   * 
   * For highlighting the current time in the chart
   */
  const now = new Date();
  const currentHour = now.getHours();
  
  // Find the current time point in the data
  const currentIndex = data.findIndex(point => {
    const pointDate = new Date(point.time);
    return pointDate.getHours() === currentHour && 
           pointDate.getDate() === now.getDate() &&
           pointDate.getMonth() === now.getMonth();
  });

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
        >
          {/* Background Grid */}
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          
          {/* X-Axis (Time) */}
          <XAxis
            dataKey="dayHour"
            tickFormatter={formatXAxis}
            tick={{ fontSize: 11 }}
            interval={2} // Show fewer ticks for readability
          />
          
          {/* Y-Axis (Percentage) */}
          <YAxis
            tickFormatter={formatYAxis}
            domain={[0, 1]} // 0-100%
            tick={{ fontSize: 12 }}
          />
          
          {/* Reference Line for Optimal Capacity */}
          <ReferenceLine
            y={0.7}
            stroke="#9333ea"
            strokeDasharray="3 3"
            label={{ value: "Optimal", position: "insideTopRight", fontSize: 11 }}
          />
          
          {/* Highlight Current Hour */}
          {currentIndex > 0 && (
            <ReferenceArea
              x1={data[currentIndex-1]?.dayHour}
              x2={data[currentIndex]?.dayHour}
              fill="#10b981"
              fillOpacity={0.1}
              strokeOpacity={0.3}
            />
          )}
          
          {/* Tooltip */}
          <Tooltip content={<CustomTooltip />} />
          
          {/* Legend */}
          <Legend />
          
          {/* Data Line */}
          <Line
            type="monotone"
            dataKey="overall"
            name="Occupancy"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 2 }}
            activeDot={{ r: 6, fill: "#3b82f6" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 