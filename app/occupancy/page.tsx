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
    <div className="min-h-screen bg-gradient-to-br from-slate-300 via-amber-50 to-amber-100 ">
      <div className="container mx-auto px-8 pt-10">
        <h1 className="text-2xl md:text-4xl font-ancizar font-semibold text-center mb-6">Library Occupancy</h1>

        <Suspense
          fallback={
            <div className="text-center py-10">Loading occupancy data...</div>
          }
        >
          <OccupancyDashboard />
        </Suspense>
      </div>
    </div>
  );
} 