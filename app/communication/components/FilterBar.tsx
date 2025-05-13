"use client";

/**
 * FILTER BAR COMPONENT
 * 
 * Provides filtering options for the communication feed by topic.
 * 
 * PURPOSE:
 * Allows users to filter posts by specific topics or reset to view all,
 * helping them find relevant content quickly.
 * 
 * CONTEXT:
 * Appears below the post creation form in the communication feed, providing
 * a way to explore content categorically.
 * 
 * DATA FLOW:
 * - Receives topics data from parent via props
 * - Manages tab selection state internally
 * - Sends filter changes back to parent for post filtering
 * 
 * KEY DEPENDENCIES:
 * - shadcn/ui Tabs components for tab interface
 * - PostFilter type for type-safe filter options
 */

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Topic, PostFilter } from "../types/communicationTypes";

interface FilterBarProps {
  topics: Topic[];
  currentFilter: PostFilter;
  onFilterChange: (filter: PostFilter) => void;
}

/**
 * Filter selection bar for the communication feed
 * 
 * @param topics - List of topics
 * @param currentFilter - Current filter string (format: "all" or "topic:{name}")
 * @param onFilterChange - Callback function when filter changes
 * @returns A tabs component with filter options
 */
export default function FilterBar({ 
  topics,
  currentFilter, 
  onFilterChange
}: FilterBarProps) {
  // Keep track of which tab is selected (all, topics)
  const [selectedTab, setSelectedTab] = useState("all");

  /**
   * Handle tab change (all, topics)
   * 
   * @param value - The selected tab value
   */
  const handleTabChange = (value: string) => {
    setSelectedTab(value);

    // If "all" tab is selected, clear any filters
    if (value === "all") {
      onFilterChange("all");
    }
    // Otherwise, keep the current topic filter if appropriate for the tab
  };

  /**
   * Handle selection of a specific topic/hashtag
   * 
   * @param topicName - The name of the selected topic
   */
  const handleTopicSelect = (topicName: string) => {
    onFilterChange(`topic:${topicName}` as PostFilter);
  };

  return (
    <div className="space-y-2 w-full">
      {/* Main filter tabs */}
      <Tabs
        defaultValue="all"
        value={selectedTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="w-full md:w-auto justify-start">
          <TabsTrigger value="all" className="flex-1 md:flex-none">All Posts</TabsTrigger>
          <TabsTrigger value="topics" className="flex-1 md:flex-none">Topics</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Topic filter buttons */}
      {selectedTab === "topics" && (
        <div className="flex flex-wrap gap-2 mt-2">
          {topics.map((topic) => (
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