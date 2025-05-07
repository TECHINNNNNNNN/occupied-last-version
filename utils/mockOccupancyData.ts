/**
 * UTILITY: Mock Occupancy Data Generator
 * 
 * PURPOSE: Generates realistic mock data for library occupancy visualization when real sensor data is unavailable
 * 
 * CONTEXT: Used by the Occupancy monitoring components to display realistic occupancy patterns
 * 
 * DATA FLOW: This utility provides static zone definitions and functions that generate:
 *   - Current occupancy data for all zones
 *   - Historical occupancy trends
 *   - Overall library occupancy statistics
 * 
 * KEY DEPENDENCIES: None - uses native JavaScript APIs for data generation
 */

// import { faker } from "@faker-js/faker";

/**
 * Library zone definitions with capacity information
 * Each zone represents a distinct area in the library with its own occupancy tracking
 */
export const LIBRARY_ZONES = [
  { id: "zone1", name: "Main Reading Area", capacity: 120, floor: 1 },
  { id: "zone2", name: "Quiet Study Zone", capacity: 60, floor: 1 },
  { id: "zone3", name: "Group Study Rooms", capacity: 40, floor: 2 },
  { id: "zone4", name: "Computer Lab", capacity: 30, floor: 2 },
  { id: "zone5", name: "Research Commons", capacity: 50, floor: 3 },
];

/**
 * Generates realistic current occupancy data for all library zones
 * 
 * PURPOSE: Creates time-sensitive mock data that follows typical library usage patterns
 * 
 * RETURNS: Array of zone objects with current occupancy statistics
 *   - current: Number of people currently in the zone
 *   - percentage: Occupancy as a fraction of capacity (0-1)
 *   - status: Text classification of occupancy level
 * 
 * ASSUMPTIONS: Library operating hours are 8am-10pm
 * 
 * IMPLEMENTATION: Uses time-based patterns, day of week factors, and zone-specific
 * behavior patterns to generate realistic occupancy numbers
 */
export function generateCurrentOccupancy() {
  const now = new Date();
  const hour = now.getHours();

  // Library is closed outside of operating hours (8am-10pm)
  if (hour < 8 || hour > 22) {
    return LIBRARY_ZONES.map((zone) => ({
      ...zone,
      current: 0,
      percentage: 0,
      status: "Closed",
    }));
  }

  // Create realistic occupancy based on time of day
  return LIBRARY_ZONES.map((zone) => {
    // Time-based patterns
    let baseOccupancyFactor;

    // Morning: gradually increases
    if (hour < 12) {
      baseOccupancyFactor = 0.3 + (hour - 8) * 0.1;
    }
    // Afternoon: peak hours
    else if (hour < 18) {
      baseOccupancyFactor = 0.7 + Math.random() * 0.2;
    }
    // Evening: gradually decreases
    else {
      baseOccupancyFactor = 0.8 - (hour - 18) * 0.1;
    }

    // Weekend adjustment
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekendFactor = isWeekend ? 0.7 : 1;

    // Add natural variation per zone
    let zoneFactor = 1;
    switch (zone.id) {
      case "zone1":
        zoneFactor = 0.9 + Math.random() * 0.2; // Main reading always busy
        break;
      case "zone2":
        zoneFactor = 0.7 + Math.random() * 0.3; // Quiet study variable
        break;
      case "zone3":
        zoneFactor = hour > 15 ? 0.9 : 0.5; // Group rooms busier in evenings
        break;
      case "zone4":
        zoneFactor = hour < 14 ? 0.9 : 0.6; // Computer lab busier in mornings
        break;
      case "zone5":
        zoneFactor = 0.5 + Math.random() * 0.4; // Research commons variable
        break;
    }

    // Calculate final occupancy with some randomness
    const baseOccupancy = Math.floor(
      zone.capacity * baseOccupancyFactor * weekendFactor * zoneFactor
    );

    // Add natural variation
    const randomVariation = Math.floor(
      zone.capacity * 0.1 * (Math.random() - 0.5)
    );
    const current = Math.max(
      0,
      Math.min(zone.capacity, baseOccupancy + randomVariation)
    );
    const percentage = current / zone.capacity;

    // Determine status
    let status;
    if (percentage < 0.3) status = "Low";
    else if (percentage < 0.6) status = "Moderate";
    else if (percentage < 0.85) status = "High";
    else status = "Very High";

    return {
      ...zone,
      current,
      percentage,
      status,
    };
  });
}

/**
 * Generates historical occupancy data for trend charts
 * 
 * PURPOSE: Creates time-series data showing occupancy patterns over a specified time period
 * 
 * INPUTS:
 *   - hours: Number of hours of historical data to generate (default: 12)
 * 
 * RETURNS: Array of hourly data points containing:
 *   - time: ISO timestamp
 *   - hour: Hour of the day (0-23)
 *   - formattedTime: Formatted hour string (e.g., "14:00")
 *   - overall: Overall library occupancy as fraction (0-1)
 *   - totalOccupancy: Total number of people in library
 *   - totalCapacity: Total capacity of all zones
 *   - zones: Detailed occupancy data for each zone
 * 
 * IMPLEMENTATION: Creates a series of timestamps working backward from current time,
 * generating plausible occupancy data for each time point.
 */
export function generateHistoricalData(hours = 12) {
  const data = [];
  const now = new Date();

  // Generate data for each hour
  for (let i = 0; i < hours; i++) {
    const time = new Date(now);
    time.setHours(now.getHours() - i);

    // Skip hours when library is closed
    const hour = time.getHours();
    if (hour < 8 || hour > 22) continue;

    // Calculate total occupancy for this hour
    let totalOccupancy = 0;
    let totalCapacity = 0;

    const zoneData = LIBRARY_ZONES.map((zone) => {
      // Similar logic to current occupancy but with more randomness for historical data
      let baseOccupancyFactor;

      if (hour < 12) {
        baseOccupancyFactor = 0.3 + (hour - 8) * 0.1;
      } else if (hour < 18) {
        baseOccupancyFactor = 0.7 + Math.random() * 0.2;
      } else {
        baseOccupancyFactor = 0.8 - (hour - 18) * 0.1;
      }

      const dayOfWeek = time.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const weekendFactor = isWeekend ? 0.7 : 1;

      // More randomness for historical data
      const randomFactor = 0.7 + Math.random() * 0.6;

      const count = Math.floor(
        zone.capacity * baseOccupancyFactor * weekendFactor * randomFactor
      );
      const capped = Math.max(0, Math.min(zone.capacity, count));

      totalOccupancy += capped;
      totalCapacity += zone.capacity;

      return {
        id: zone.id,
        name: zone.name,
        count: capped,
        capacity: zone.capacity,
        percentage: capped / zone.capacity,
      };
    });

    data.push({
      time: time.toISOString(),
      hour: time.getHours(),
      formattedTime: `${time.getHours()}:00`,
      overall: totalOccupancy / totalCapacity,
      totalOccupancy,
      totalCapacity,
      zones: zoneData,
    });
  }

  // Sort chronologically (oldest to newest)
  return data.sort(
    (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
  );
}

/**
 * Calculates overall library occupancy metrics
 * 
 * PURPOSE: Aggregates zone-specific data into library-wide statistics
 * 
 * RETURNS: Object containing:
 *   - occupied: Total number of people in the library
 *   - capacity: Total library capacity
 *   - percentage: Overall occupancy as fraction (0-1)
 *   - status: Text classification of occupancy level
 *   - zones: Detailed zone-specific occupancy data
 * 
 * IMPLEMENTATION: Uses current zone occupancy data to calculate aggregate metrics
 */
export function getOverallOccupancy() {
  const zoneData = generateCurrentOccupancy();
  const totalOccupied = zoneData.reduce((sum, zone) => sum + zone.current, 0);
  const totalCapacity = zoneData.reduce((sum, zone) => sum + zone.capacity, 0);

  const percentage = totalOccupied / totalCapacity;

  let status;
  if (percentage < 0.3) status = "Low";
  else if (percentage < 0.6) status = "Moderate";
  else if (percentage < 0.85) status = "High";
  else status = "Very High";

  return {
    occupied: totalOccupied,
    capacity: totalCapacity,
    percentage,
    status,
    zones: zoneData,
  };
} 