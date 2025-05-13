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
}

const OccupancyTrendsCard = ({ isLoading, chartData }: OccupancyTrendsCardProps) => {
  return (
    <div className="col-span-7 bg-white rounded-lg shadow p-4 flex flex-col h-80 mt-2">
      <h2 className="text-lg font-semibold mb-1">Occupancy Trends</h2>
      
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
                stroke="#3b82f6"
                strokeWidth={2}
                dot={true}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      
      <div className="mt-auto pt-1 text-center">
        <Link href="/occupancy" className="text-sm text-indigo-600 hover:underline">
          View detailed trend analysis
        </Link>
      </div>
    </div>
  );
};

export default OccupancyTrendsCard; 