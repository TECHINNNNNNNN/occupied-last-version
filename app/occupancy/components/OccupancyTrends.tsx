/**
 * COMPONENT: OccupancyTrends
 * 
 * PURPOSE: Displays historical occupancy data as a line chart to visualize trends
 * 
 * CONTEXT: Used in the OccupancyDashboard to show occupancy patterns over time
 * 
 * DATA FLOW: 
 *   - Receives historical data points from parent component
 *   - Formats data for the chart visualization
 *   - Renders an interactive line chart with tooltips
 * 
 * KEY DEPENDENCIES:
 *   - recharts for data visualization
 *   - Custom tooltip component for better data presentation
 */

"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/**
 * Historical data point structure provided by parent component
 */
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

/**
 * Simplified data structure for chart rendering
 */
interface ChartDataPoint {
  time: string;
  occupancy: number;
}

interface OccupancyTrendsProps {
  data: HistoricalDataPoint[];
}

/**
 * CUSTOM TOOLTIP COMPONENT
 * 
 * Enhances tooltip appearance and information display
 * Shows the time and occupancy percentage
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    dataKey: string;
  }>;
  label?: string;
}

export default function OccupancyTrends({ data }: OccupancyTrendsProps) {
  /**
   * STATE MANAGEMENT
   * 
   * chartData: Formatted data ready for recharts visualization
   */
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  /**
   * DATA FORMATTING EFFECT
   * 
   * Transforms raw historical data into format optimized for the chart
   * Triggered whenever the input data changes
   */
  useEffect(() => {
    const formattedData = data.map((item) => ({
      time: item.formattedTime,
      occupancy: Math.round(item.overall * 100), // Convert from 0-1 to 0-100%
    }));

    setChartData(formattedData);
  }, [data]);

  /**
   * CUSTOM TOOLTIP COMPONENT
   * 
   * Enhances tooltip appearance and information display
   * Shows the time and occupancy percentage
   */
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

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
        >
          {/* Background Grid */}
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          
          {/* X-Axis (Time) */}
          <XAxis
            dataKey="time"
            tickFormatter={(value) => value}
            tick={{ fontSize: 12 }}
          />
          
          {/* Y-Axis (Occupancy Percentage) */}
          <YAxis
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]} // Fixed scale from 0-100%
            tick={{ fontSize: 12 }}
          />
          
          {/* Tooltip */}
          <Tooltip content={<CustomTooltip />} />
          
          {/* Legend */}
          <Legend />
          
          {/* Data Line */}
          <Line
            type="monotone" // Smooth line
            dataKey="occupancy"
            name="Occupancy"
            stroke="#3b82f6" // Blue
            strokeWidth={2}
            dot={false} // Hide individual data points for cleaner look
            activeDot={{ r: 6 }} // Show dots only on hover/active
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 