import { format } from 'date-fns';

/**
 * FORMAT UTILITIES
 * Helper functions for consistent date and time formatting across dashboard components
 */

/**
 * Formats an ISO time string to a 12-hour time format
 * 
 * @param isoTime - ISO format time string
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export const formatTime = (isoTime: string): string => {
  return format(new Date(isoTime), 'h:mm a');
};

/**
 * Formats an ISO date string to a relative format
 * Shows "Today", "Tomorrow", or the date as "MMM d"
 * 
 * @param isoTime - ISO format date string
 * @returns Formatted date string (e.g., "Today", "Tomorrow", or "Jan 5")
 */
export const formatDate = (isoTime: string): string => {
  const date = new Date(isoTime);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return format(date, 'MMM d');
  }
};

/**
 * Formats a date to a relative "time ago" format
 * 
 * @param date - Date object
 * @returns Formatted relative time (e.g., "Just now", "5m ago", "2h ago")
 */
export const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInMinutes < 24 * 60) {
    return `${Math.floor(diffInMinutes / 60)}h ago`;
  } else {
    return format(date, 'MMM d');
  }
};

/**
 * Returns an appropriate color based on occupancy percentage
 * 
 * @param percentage - Occupancy percentage (0-1)
 * @returns Color hex code
 */
export const getStatusColor = (percentage: number): string => {
  return "#EAD637"; // red
};

/**
 * Generates initials from a name
 * 
 * @param name - Full name string
 * @returns Uppercase initials (e.g., "JD" for "John Doe")
 */
export const getInitials = (name: string | null | undefined): string => {
  if (!name) return 'U';
  return name.split(' ').map((part: string) => part[0]).join('').toUpperCase();
}; 