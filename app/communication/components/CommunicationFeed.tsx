"use client";

/**
 * COMMUNICATION FEED COMPONENT
 * 
 * Main container for the library communication platform.
 * 
 * PURPOSE:
 * Central component that orchestrates the entire communication feature,
 * displaying posts, filters, and the post creation form.
 * 
 * CONTEXT:
 * Serves as the primary UI for the communication feature, rendering
 * all posts and supporting interactions.
 * 
 * DATA FLOW:
 * - Uses useCommunication hook to access and modify data
 * - Receives real-time updates through Supabase subscriptions
 * - Handles filtering and post interaction (like, reply)
 * - Manages loading and empty states
 * 
 * KEY DEPENDENCIES:
 * - useCommunication hook for data management
 * - PostCard for rendering individual posts
 * - FilterBar for post filtering
 * - CreatePost for post creation
 */

import CreatePost from "./CreatePost";
import PostCard from "./PostCard";
import FilterBar from "./FilterBar";
import { useCommunication } from "../hooks/useCommunication";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function CommunicationFeed() {
  // Get communication data and functions from our custom hook
  const { 
    posts, 
    zones,
    topics,
    loading, 
    error, 
    filter, 
    setFilter,
    toggleLike,
    addReply,
    deletePost,
    currentUser,
    refreshPosts
  } = useCommunication();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Post creation form */}
      <CreatePost />

      {/* Filtering options */}
      <div className="my-6">
        <FilterBar 
          zones={zones}
          topics={topics}
          currentFilter={filter} 
          onFilterChange={setFilter} 
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
          <p>{error}</p>
          <button 
            className="text-sm underline mt-2"
            onClick={() => window.location.reload()}
          >
            Try refreshing the page
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-1/3 mb-2" />
                  <Skeleton className="h-3 w-1/4 mb-4" />
                  <Skeleton className="h-20 w-full mb-4" />
                  <div className="flex gap-4">
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post feed */}
      {!loading && (
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No posts matching your filter.</p>
              {filter !== "all" && (
                <button 
                  className="text-blue-500 mt-2 text-sm"
                  onClick={() => setFilter("all")}
                >
                  View all posts instead
                </button>
              )}
              {filter === "all" && (
                <p className="text-sm text-gray-400 mt-2">
                  Be the first to share an update!
                </p>
              )}
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onLike={() => toggleLike(post.id)}
                onAddReply={(content) => addReply(post.id, content)}
                onDelete={currentUser && post.user.id === currentUser.id ? () => deletePost(post.id) : undefined}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
} 