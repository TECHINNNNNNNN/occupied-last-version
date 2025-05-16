"use client";

/**
 * COMMUNICATION PAGE
 * 
 * The main page for the library communication platform.
 * Serves as a container for the feed of posts from students and staff.
 * 
 * CONTEXT:
 * This is the top-level page component for the communication feature,
 * allowing students to share real-time updates about the library.
 * 
 * DATA FLOW:
 * - Renders the CommunicationFeed component which handles all data
 *   management and user interactions
 * 
 * KEY DEPENDENCIES:
 * - CommunicationFeed for the main social feed functionality
 */

import CommunicationFeed from "./components/CommunicationFeed";

export default function CommunicationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-300 via-amber-50 to-amber-100 p-8">
      <div className="w-full px-4 py-6 sm:py-8 md:container md:mx-auto">
        <h1 className="text-2xl md:text-4xl  mb-6 text-center font-ancizar font-semibold">Library Community</h1>
        <CommunicationFeed />
      </div>
    </div>
  );
} 