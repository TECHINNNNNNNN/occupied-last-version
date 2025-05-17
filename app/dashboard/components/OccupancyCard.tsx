/**
 * COMPONENT: OccupancyCard
 * PURPOSE: Displays current library occupancy information
 * CONTEXT: Key card on dashboard showing real-time occupancy status
 * DATA FLOW: Receives occupancy data and loading state from parent
 * KEY DEPENDENCIES: getStatusColor utility
 */

import Link from 'next/link';
import { getStatusColor } from '../utils';

interface OccupancyCardProps {
  isLoading: boolean;
  currentOccupancy: {
    percentage: number;
    status: string;
    occupied: number;
    capacity: number;
  } | null;
}

const OccupancyCard = ({ isLoading, currentOccupancy }: OccupancyCardProps) => {
  return (
    <div className=" h-full bg-white/65 backdrop-blur-sm rounded-3xl  p-4 flex flex-col hover:bg-white/80 hover:shadow-lg transition-all duration-300">
      <h2 className="text-lg font-semibold mb-1">Occupancy</h2>
      
      {/* Simplified Occupancy Display */}
      <div className="flex-1 flex items-center justify-center">
        {isLoading || !currentOccupancy ? (
          <p className="text-gray-400">Loading occupancy data...</p>
        ) : (
          <div className="w-full text-center">
            {/* Percentage Circle */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 mb-1" 
                 style={{ 
                   borderColor: getStatusColor(currentOccupancy.percentage),
                  
                 }}>
              <span className="text-xl  font-bold">
                {Math.round(currentOccupancy.percentage * 100)}%
              </span>
            </div>
            
            {/* Status Badge */}
            <div className="mb-1">
              <span className="text-xs font-mono font-medium px-3 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: getStatusColor(currentOccupancy.percentage),
                      color: currentOccupancy.percentage > 0.5 ? 'white' : 'black'
                    }}>
                {currentOccupancy.status}
              </span>
            </div>
            
            {/* Occupancy Count */}
            <p className="text-sm text-gray-600">
              {currentOccupancy.occupied} / {currentOccupancy.capacity} spots occupied
            </p>
          </div>
        )}
      </div>
      
      
    </div>
  );
};

export default OccupancyCard; 