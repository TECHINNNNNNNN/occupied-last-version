/**
 * COMPONENT: OccupancyTrendsCard
 * PURPOSE: Displays a chart showing occupancy trends over time
 * CONTEXT: Part of the dashboard main view, shows occupancy patterns
 * DATA FLOW: Receives chart data and loading state from parent
 * KEY DEPENDENCIES: recharts library, CustomTooltip component
 */

import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartDataPoint } from '../types';
import CustomTooltip from './CustomTooltip';

interface OccupancyTrendsCardProps {
  isLoading: boolean;
  chartData: ChartDataPoint[];
  className?: string; 
}

const OccupancyTrendsCard = ({ isLoading, chartData, className }: OccupancyTrendsCardProps) => {
  return (
    <div className={`col-span-5 max-md:col-span-12 ${className} col-start-4 bg-white/65 backdrop-blur-sm p-2  rounded-3xl  flex flex-col min-h-[300px]`}>
      <h2 className="text-lg font-semibold mb-1 text-gray-800 p-1">Occupancy Trends</h2>
      
      {isLoading || chartData.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Loading trends data...</p>
        </div>
      ) : (
        <div className="flex-1 w-full h-full min-h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
              {/* Background Grid */}
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              
              {/* X-Axis (Time) */}
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 11 }}
                tickMargin={5}
              />
              
              {/* Y-Axis (Occupancy Percentage) */}
              <YAxis
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                width={40}
              />
              
              {/* Tooltip */}
              <Tooltip content={<CustomTooltip />} />
              
              {/* Data Line */}
              <Line
                type="monotone"
                dataKey="occupancy"
                name="Occupancy"
                stroke="#EAD637"
                strokeWidth={2}
                dot={true}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      
      
    </div>
  );
};

export default OccupancyTrendsCard; 