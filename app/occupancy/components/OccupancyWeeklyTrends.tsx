/**
 * COMPONENT: OccupancyWeeklyTrends
 * 
 * PURPOSE: Displays weekly occupancy data as a bar chart to visualize weekly patterns
 * 
 * CONTEXT: Used in the OccupancyDashboard to show occupancy patterns over the past week
 * 
 * DATA FLOW: 
 *   - Receives weekly data points from parent component
 *   - Formats data for the chart visualization
 *   - Renders an interactive bar chart with tooltips
 * 
 * KEY DEPENDENCIES:
 *   - recharts for data visualization
 *   - Custom tooltip component for better data presentation
 *   - OccupancyContext for type definitions
 */

"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { WeeklyDataPoint } from "@/contexts/OccupancyContext";

interface OccupancyWeeklyTrendsProps {
  data: WeeklyDataPoint[];
}

/**
 * CUSTOM TOOLTIP COMPONENT
 * 
 * Enhances tooltip appearance and information display
 * Shows the day and occupancy details
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    dataKey: string;
    payload: any;
  }>;
  label?: string;
}

export default function OccupancyWeeklyTrends({ data }: OccupancyWeeklyTrendsProps) {
  /**
   * DATA FORMATTING EFFECT
   * 
   * No need to transform weekly data as it's already in the right format
   * for recharts visualization
   */
  
  /**
   * CUSTOM TOOLTIP COMPONENT
   * 
   * Enhances tooltip appearance and information display
   * Shows detailed information when hovering over chart elements
   */
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const weekday = payload[0].payload.formattedDay;
      
      return (
        <div className="bg-white p-3 border rounded shadow-sm text-sm min-w-[200px]">
          <p className="font-medium text-gray-900 mb-1">{weekday}</p>
          
          {payload.map((entry, index) => {
            const value = entry.dataKey === 'averageOccupancy' || entry.dataKey === 'peakOccupancy'
              ? `${Math.round(entry.value * 100)}%`
              : entry.value.toLocaleString();
              
            const label = entry.dataKey === 'averageOccupancy' 
              ? 'Average Occupancy'
              : entry.dataKey === 'peakOccupancy'
                ? 'Peak Occupancy'
                : 'Total Visitors';
                
            const color = entry.dataKey === 'averageOccupancy' 
              ? '#60a5fa'
              : entry.dataKey === 'peakOccupancy'
                ? '#f87171'
                : '#10b981';
              
            return (
              <div key={index} className="flex justify-between items-center mt-1">
                <span className="text-gray-600">{label}:</span>
                <span className="font-semibold" style={{ color }}>
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  /**
   * FORMAT DATA FOR READABILITY
   * 
   * Converts raw data values to percentages and numbers
   * for better readability in the chart
   */
  const formatYAxis = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
        >
          {/* Background Grid */}
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          
          {/* X-Axis (Days) */}
          <XAxis
            dataKey="formattedDay"
            tick={{ fontSize: 12 }}
          />
          
          {/* Y-Axis (Percentage) */}
          <YAxis
            yAxisId="percentage"
            tickFormatter={formatYAxis}
            domain={[0, 1]} // 0-100%
            tick={{ fontSize: 12 }}
          />
          
          {/* Secondary Y-Axis (Visitors Count) - Hidden but used for scaling */}
          <YAxis
            yAxisId="visitors"
            orientation="right"
            tick={{ fontSize: 0 }} // Hide ticks
            axisLine={false} // Hide axis line
            domain={['dataMin - 50', 'dataMax + 50']} // Auto scale with padding
          />
          
          {/* Reference Line - Optimal occupancy target */}
          <ReferenceLine 
            y={0.7} 
            yAxisId="percentage" 
            label={{ value: "Optimal", position: "insideTopRight", fontSize: 11 }}
            stroke="#9333ea" 
            strokeDasharray="3 3" 
          />
          
          {/* Tooltip */}
          <Tooltip content={<CustomTooltip />} />
          
          {/* Legend */}
          <Legend />
          
          {/* Data Bars */}
          <Bar
            dataKey="averageOccupancy"
            name="Average Occupancy"
            yAxisId="percentage"
            fill="#60a5fa" // Blue
            radius={[4, 4, 0, 0]} // Rounded top corners
          />
          <Bar
            dataKey="peakOccupancy"
            name="Peak Occupancy"
            yAxisId="percentage"
            fill="#f87171" // Red
            radius={[4, 4, 0, 0]} // Rounded top corners
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 