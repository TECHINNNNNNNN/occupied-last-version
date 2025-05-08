"use client";

/**
 * FILTER BAR COMPONENT
 * 
 * This component provides filtering options for the communication feed.
 * Users can filter posts by all posts, specific zones, or topics/hashtags.
 * 
 * CONTEXT:
 * Part of the communication platform's discovery system, helping users
 * find relevant content by filtering the feed.
 * 
 * DATA FLOW:
 * - Receives the current filter state and a callback for when filter changes
 * - Uses Tabs component for the main filter categories
 * - Renders zone and topic filter buttons based on selected tab
 * 
 * KEY DEPENDENCIES:
 * - shadcn/ui Tabs components
 * - MOCK_ZONES and MOCK_TOPICS data from mockCommunicationData
 */

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MOCK_ZONES, MOCK_TOPICS } from "../utils/mockCommunicationData";

interface FilterBarProps {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
}

/**
 * Filter selection bar for the communication feed
 * 
 * @param currentFilter - Current filter string (format: "all", "zone:{id}", or "topic:{name}")
 * @param onFilterChange - Callback function when filter changes
 * @returns A tabs component with filter options
 */
export default function FilterBar({ 
  currentFilter, 
  onFilterChange 
}: FilterBarProps) {
  // Keep track of which tab is selected (all, zones, topics)
  const [selectedTab, setSelectedTab] = useState("all");

  /**
   * Handle tab change (all, zones, topics)
   * 
   * @param value - The selected tab value
   */
  const handleTabChange = (value: string) => {
    setSelectedTab(value);

    // If "all" tab is selected, clear any filters
    if (value === "all") {
      onFilterChange("all");
    }
    // Otherwise, keep the current zone/topic filter if appropriate for the tab
    // or reset to showing all items of that tab category
  };

  /**
   * Handle selection of a specific zone
   * 
   * @param zoneId - The ID of the selected zone
   */
  const handleZoneSelect = (zoneId: string) => {
    onFilterChange(`zone:${zoneId}`);
  };

  /**
   * Handle selection of a specific topic/hashtag
   * 
   * @param topicName - The name of the selected topic
   */
  const handleTopicSelect = (topicName: string) => {
    onFilterChange(`topic:${topicName}`);
  };

  return (
    <div className="space-y-2">
      {/* Main filter tabs */}
      <Tabs
        defaultValue="all"
        value={selectedTab}
        onValueChange={handleTabChange}
      >
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">All Posts</TabsTrigger>
          <TabsTrigger value="zones">Zones</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Zone filter buttons */}
      {selectedTab === "zones" && (
        <div className="flex flex-wrap gap-2 mt-2">
          {MOCK_ZONES.map((zone) => (
            <button
              key={zone.id}
              className={`px-3 py-1 text-sm rounded-full ${
                currentFilter === `zone:${zone.id}`
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => handleZoneSelect(zone.id)}
            >
              {zone.name}
            </button>
          ))}
        </div>
      )}

      {/* Topic filter buttons */}
      {selectedTab === "topics" && (
        <div className="flex flex-wrap gap-2 mt-2">
          {MOCK_TOPICS.map((topic) => (
            <button
              key={topic.id}
              className={`px-3 py-1 text-sm rounded-full ${
                currentFilter === `topic:${topic.name}`
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              onClick={() => handleTopicSelect(topic.name)}
            >
              #{topic.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 