/**
 * COMPONENT: OccupancyPrediction
 * 
 * PURPOSE: Displays predicted occupancy data for future hours
 * 
 * CONTEXT: Used in the OccupancyDashboard to show occupancy forecasts
 * 
 * DATA FLOW: 
 *   - Receives prediction data points from parent component
 *   - Visualizes predictions with confidence intervals
 * 
 * KEY DEPENDENCIES:
 *   - recharts for data visualization
 *   - Custom tooltip component for better data presentation
 *   - OccupancyContext for type definitions
 */

"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { PredictionDataPoint } from "@/contexts/OccupancyContext";

interface OccupancyPredictionProps {
  data: PredictionDataPoint[];
}

/**
 * CUSTOM TOOLTIP COMPONENT
 * 
 * Enhances tooltip appearance and information display
 * Shows the prediction details with confidence level
 */
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    dataKey: string;
    payload: PredictionDataPoint;
  }>;
  label?: string;
}

export default function OccupancyPrediction({ data }: OccupancyPredictionProps) {
  /**
   * CUSTOM TOOLTIP COMPONENT
   * 
   * Enhances tooltip appearance and information display
   * Shows predicted occupancy with confidence level
   */
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const { formattedDay, formattedTime, predicted, confidence } = payload[0].payload;
      const confidencePercent = Math.round(confidence * 100);
      
      return (
        <div className="bg-white p-3 border rounded shadow-sm text-sm min-w-[180px]">
          <p className="font-medium text-gray-900">{formattedDay} at {formattedTime}</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Predicted:</span>
              <span className="font-semibold text-purple-600">
                {Math.round(predicted * 100)}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Confidence:</span>
              <span className={`font-semibold ${confidencePercent > 75 ? 'text-green-500' : confidencePercent > 60 ? 'text-amber-500' : 'text-red-500'}`}>
                {confidencePercent}%
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

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
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
            interval={1}
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
          
          {/* Tooltip */}
          <Tooltip content={<CustomTooltip />} />
          
          {/* Data Area with Gradient */}
          <defs>
            <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          
          <Area
            type="monotone"
            dataKey="predicted"
            name="Predicted Occupancy"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#predictedGradient)"
            activeDot={{ r: 6, fill: "#8b5cf6" }}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Confidence Indicator */}
      <div className="mt-2 flex items-center justify-center text-xs text-gray-500">
        <span className="inline-block h-3 w-3 rounded-full bg-purple-600 mr-1 opacity-70"></span>
        <span>Prediction confidence decreases with time</span>
      </div>
    </div>
  );
} 