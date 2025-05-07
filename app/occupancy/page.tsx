/**
 * COMPONENT: OccupancyPage
 * 
 * PURPOSE: Main page for the library occupancy monitoring system
 * 
 * CONTEXT: Accessed via /occupancy route, displays real-time and historical
 * library occupancy data through visualizations
 * 
 * DATA FLOW: Uses React Suspense for loading states and delegates data
 * fetching/display to the OccupancyDashboard component
 * 
 * KEY DEPENDENCIES: OccupancyDashboard component
 */

import { Suspense } from "react";
import OccupancyDashboard from "./components/OccupancyDashboard";

export default function OccupancyPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Library Occupancy</h1>

      <Suspense
        fallback={
          <div className="text-center py-10">Loading occupancy data...</div>
        }
      >
        <OccupancyDashboard />
      </Suspense>
    </div>
  );
} 