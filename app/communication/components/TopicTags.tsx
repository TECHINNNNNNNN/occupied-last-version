"use client";

/**
 * TOPIC TAGS COMPONENT
 * 
 * Displays topic hashtags associated with a post.
 * 
 * PURPOSE:
 * Shows topic categorization for posts, helping users identify
 * the post subject and providing visual organization.
 * 
 * CONTEXT:
 * Part of the PostCard component, displaying hashtags that
 * were automatically extracted from post content.
 * 
 * DATA FLOW:
 * - Receives array of Topic objects from parent
 * - Renders each as an interactive tag with # prefix
 * 
 * KEY DEPENDENCIES:
 * - Topic type from communicationTypes
 */

import { Topic } from "../types/communicationTypes";

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