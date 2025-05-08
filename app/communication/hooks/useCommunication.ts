/**
 * USE COMMUNICATION HOOK
 * 
 * This custom hook encapsulates the state and logic for the communication platform.
 * It provides a reusable way to access posts, filtering, and interaction functions.
 * 
 * CONTEXT:
 * Centralizes the communication platform's data management and business logic,
 * making it easier to reuse across different components.
 * 
 * DATA FLOW:
 * - Manages posts state and loading state
 * - Provides functions for filtering and interacting with posts
 * - Handles post expiration automatically
 * 
 * KEY DEPENDENCIES:
 * - React hooks for state management
 * - generateMockPosts for demo data
 */

import { useState, useEffect, useCallback } from "react";
import { generateMockPosts, Post, Reply } from "../utils/mockCommunicationData";

/**
 * Custom hook for communication platform functionality
 * 
 * @returns Object containing posts data and interaction functions
 */
export function useCommunication() {
  // Post and loading state
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all', 'zone:{zoneId}', 'topic:{topicName}'

  /**
   * Remove posts that have expired
   * Called periodically to clean up the feed
   */
  const removeExpiredPosts = useCallback(() => {
    const now = new Date();
    setPosts((currentPosts) =>
      currentPosts.filter((post) => {
        return !post.expiresAt || new Date(post.expiresAt) > now;
      })
    );
  }, []);

  /**
   * Load initial posts data
   * In a real app, this would fetch from an API
   */
  useEffect(() => {
    // Generate mock data
    const mockPosts = generateMockPosts(15);

    // Filter out already expired posts on initial load
    const now = new Date();
    const validPosts = mockPosts.filter((post) => {
      return !post.expiresAt || new Date(post.expiresAt) > now;
    });

    setPosts(validPosts);
    setLoading(false);

    // Set up interval to check for expired posts every minute
    const intervalId = setInterval(removeExpiredPosts, 60000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, [removeExpiredPosts]);

  /**
   * Add a new post to the feed
   * 
   * @param newPost - The new post object to add
   */
  const createPost = (newPost: Post) => {
    setPosts([newPost, ...posts]);
  };

  /**
   * Toggle like status on a post
   * 
   * @param postId - ID of the post to like/unlike
   */
  const likePost = (postId: string) => {
    setPosts(
      posts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            liked: !post.liked,
            likeCount: post.liked ? post.likeCount - 1 : post.likeCount + 1,
          };
        }
        return post;
      })
    );
  };

  /**
   * Add a reply to a post
   * 
   * @param postId - ID of the post to add reply to
   * @param reply - Reply object to add
   */
  const addReply = (postId: string, reply: Reply) => {
    setPosts(
      posts.map((post) => {
        if (post.id === postId) {
          return {
            ...post,
            replies: [...post.replies, reply],
          };
        }
        return post;
      })
    );
  };

  /**
   * Get filtered posts based on the current filter
   */
  const filteredPosts = (() => {
    if (filter === "all") return posts;

    if (filter.startsWith("zone:")) {
      const zoneId = filter.split(":")[1];
      return posts.filter((post) => post.zone && post.zone.id === zoneId);
    }

    if (filter.startsWith("topic:")) {
      const topicName = filter.split(":")[1];
      return posts.filter((post) => 
        post.topics.some((topic) => topic.name === topicName)
      );
    }

    return posts;
  })();

  return {
    posts,           // All posts
    filteredPosts,   // Posts filtered by current filter
    loading,         // Loading state
    filter,          // Current filter string
    setFilter,       // Function to change filter
    createPost,      // Function to add a new post
    likePost,        // Function to like/unlike a post
    addReply,        // Function to add a reply to a post
  };
} 