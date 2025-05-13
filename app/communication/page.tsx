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
    <div className="w-full px-4 py-6 sm:py-8 md:container md:mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center sm:text-left">Library Community</h1>
      <CommunicationFeed />
    </div>
  );
} 