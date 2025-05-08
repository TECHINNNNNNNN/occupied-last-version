"use client";

/**
 * EXPIRATION TIMER COMPONENT
 * 
 * This component displays a visual countdown timer showing how long until a post expires.
 * It uses a circular progress indicator and text to show the remaining time.
 * The color changes based on how much time is left (green → yellow → red).
 * 
 * CONTEXT:
 * Part of the communication platform's ephemeral content system where posts automatically
 * expire after a set time to keep content fresh and relevant.
 * 
 * DATA FLOW:
 * Receives an expiration timestamp and calculates the time remaining, updating every second.
 * 
 * KEY DEPENDENCIES:
 * - date-fns for time calculations
 * - React hooks for state management and effects
 */

import { useState, useEffect } from "react";
import {
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
} from "date-fns";

interface ExpirationTimerProps {
  expiresAt: Date;
}

/**
 * Visual countdown timer for post expiration
 * 
 * @param expiresAt - The date when the post will expire
 * @returns A component showing remaining time with visual indicator
 */
export default function ExpirationTimer({ expiresAt }: ExpirationTimerProps) {
  // State for text display and visual percentage
  const [timeLeft, setTimeLeft] = useState("");
  const [percentage, setPercentage] = useState(100);

  // Update the timer every second
  useEffect(() => {
    // Calculate remaining time and set appropriate display text
    const calculateTimeLeft = () => {
      const now = new Date();
      const expirationDate = new Date(expiresAt);

      // Check if already expired
      if (now >= expirationDate) {
        setTimeLeft("Expired");
        setPercentage(0);
        return;
      }

      // Calculate total duration (assuming 1 hour is default if not specified)
      // This is used to calculate the percentage remaining for the visual indicator
      const creationTime = expirationDate.getTime() - 60 * 60 * 1000; 
      const totalDuration = expirationDate.getTime() - creationTime;

      // Calculate remaining time
      const timeRemaining = expirationDate.getTime() - now.getTime();

      // Calculate percentage remaining (clamped between 0-100%)
      const percentRemaining = (timeRemaining / totalDuration) * 100;
      setPercentage(Math.max(0, Math.min(100, percentRemaining)));

      // Format time remaining in a human-readable format
      // Show hours if > 1 hour left
      const hoursLeft = differenceInHours(expirationDate, now);
      if (hoursLeft > 0) {
        setTimeLeft(`${hoursLeft}h left`);
        return;
      }

      // Show minutes if > 1 minute left
      const minutesLeft = differenceInMinutes(expirationDate, now);
      if (minutesLeft > 0) {
        setTimeLeft(`${minutesLeft}m left`);
        return;
      }

      // Show seconds if less than a minute left
      const secondsLeft = differenceInSeconds(expirationDate, now);
      setTimeLeft(`${secondsLeft}s left`);
    };

    // Calculate immediately then set up interval
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    // Clean up interval on unmount
    return () => clearInterval(timer);
  }, [expiresAt]);

  // Determine color based on time left
  const getColor = () => {
    if (percentage > 50) return "text-green-500";
    if (percentage > 25) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Visual indicator (circle that empties as time passes) */}
      <div className="relative w-4 h-4">
        <svg viewBox="0 0 36 36" className="w-4 h-4">
          {/* Background circle (gray) */}
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#e6e6e6"
            strokeWidth="4"
            strokeDasharray="100, 100"
          />
          {/* Foreground circle (colored, shows remaining time) */}
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${percentage}, 100`}
            className={getColor()}
          />
        </svg>
      </div>
      {/* Text display of time remaining */}
      <span className={`text-xs font-medium ${getColor()}`}>{timeLeft}</span>
    </div>
  );
} 