/**
 * DASHBOARD TYPES
 * Type definitions used throughout the dashboard components
 */

/**
 * Simple data point for chart visualization
 */
export interface ChartDataPoint {
  time: string;
  occupancy: number;
}

/**
 * Represents a room reservation
 */
export interface Reservation {
  id: string;
  room_id: number;
  room_name: string;
  start_time: string;
  end_time: string;
  agenda: string;
  num_people: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  user_email?: string;
  created_at?: string;
}

/**
 * Properties for customizing chart tooltips
 */
export interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    name: string;
    dataKey: string;
  }>;
  label?: string;
}

/**
 * User profile information
 */
export interface UserProfile {
  id: string;
  name: string;
  avatar_url: string;
  role: string;
} 