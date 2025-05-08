"use client";

/**
 * TOPIC TAGS COMPONENT
 * 
 * This component displays a list of topic tags (hashtags) associated with a post.
 * It renders each topic as a clickable pill/badge with a '#' prefix.
 * 
 * CONTEXT:
 * Part of the communication platform's categorization system, allowing users
 * to discover related content through topics/hashtags.
 * 
 * DATA FLOW:
 * Receives an array of topic objects and renders them as interactive elements.
 * 
 * KEY DEPENDENCIES:
 * - Topic interface from mockCommunicationData
 */

import { Topic } from "../utils/mockCommunicationData";

interface TopicTagsProps {
  topics: Topic[];
}

/**
 * Renders a list of topic hashtags as interactive pills
 * 
 * @param topics - Array of topic objects to display
 * @returns A component showing topic hashtags in a flex container
 */
export default function TopicTags({ topics }: TopicTagsProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {topics.map((topic) => (
        <div
          key={topic.id}
          className="px-2 py-0.5 bg-gray-100 text-blue-600 rounded-full text-xs hover:bg-gray-200 cursor-pointer"
        >
          #{topic.name}
        </div>
      ))}
    </div>
  );
} 