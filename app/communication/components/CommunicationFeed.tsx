"use client";

/**
 * COMMUNICATION FEED COMPONENT
 * 
 * This component manages the main feed of posts in the communication platform.
 * It handles data display, filtering, and user interactions with posts.
 * 
 * CONTEXT:
 * The central component of the communication platform that displays
 * all posts and manages their presentation.
 * 
 * DATA FLOW:
 * - Uses the useCommunication hook for data and interaction logic
 * - Renders the create post form and post cards
 * - Passes callbacks to child components
 * 
 * KEY DEPENDENCIES:
 * - useCommunication hook for data management
 * - CreatePost for post creation
 * - PostCard for displaying posts
 * - FilterBar for content filtering
 */

import { useCommunication } from "../hooks/useCommunication";
import CreatePost from "./CreatePost";
import PostCard from "./PostCard";
import FilterBar from "./FilterBar";

/**
 * Main feed component for the communication platform
 * 
 * @returns A component with post creation form and scrollable post feed
 */
export default function CommunicationFeed() {
  // Use our custom hook for all communication functionality
  const {
    filteredPosts,
    loading,
    filter,
    setFilter,
    createPost,
    likePost,
    addReply,
  } = useCommunication();

  // Show loading state
  if (loading) {
    return <div className="text-center p-8">Loading community posts...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Post creation form */}
      <CreatePost onCreatePost={createPost} />

      {/* Filter bar */}
      <div className="my-6">
        <FilterBar currentFilter={filter} onFilterChange={setFilter} />
      </div>

      {/* Posts feed */}
      <div className="space-y-6">
        {filteredPosts.length === 0 ? (
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No posts matching your filter.</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={() => likePost(post.id)}
              onAddReply={(reply) => addReply(post.id, reply)}
            />
          ))
        )}
      </div>
    </div>
  );
} 