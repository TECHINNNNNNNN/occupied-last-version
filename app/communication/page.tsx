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
 */

import CommunicationFeed from "./components/CommunicationFeed";

export default function CommunicationPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Library Community</h1>
      <CommunicationFeed />
    </div>
  );
} 