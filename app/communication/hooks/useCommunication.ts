/**
 * COMMUNICATION HOOK
 * 
 * Custom hook for managing communication data from Supabase.
 * 
 * PURPOSE:
 * Provides state management and data fetching logic for the communication feature,
 * abstracting the UI components from the data layer.
 * 
 * CONTEXT:
 * Acts as middleware between UI components and Supabase service,
 * handling data loading, refresh, filtering, and real-time updates.
 * 
 * DATA FLOW:
 * - Components call this hook to access and modify communication data
 * - Hook calls Supabase service methods to perform database operations
 * - Hook maintains local state for filtering and caching
 * - Hook subscribes to real-time updates when needed
 * 
 * KEY DEPENDENCIES:
 * - React hooks (useState, useEffect, useCallback)
 * - Supabase client for real-time subscriptions
 * - Communication service for CRUD operations
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import * as communicationService from '../services/communicationService';
import { Post, User, Zone, Topic, PostFilter } from '../types/communicationTypes';
import { extractHashtags } from '../utils/extractHashtags';

export function useCommunication() {
  // State for posts and loading status
  const [posts, setPosts] = useState<Post[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PostFilter>('all');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initialize data and subscriptions
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get current user
        const user = await communicationService.getCurrentUser();
        setCurrentUser(user);
        
        // Load zones, topics, and posts
        const [zonesData, topicsData, postsData] = await Promise.all([
          communicationService.getZones(),
          communicationService.getTopics(),
          communicationService.getPosts()
        ]);
        
        setZones(zonesData);
        setTopics(topicsData);
        setPosts(postsData);
      } catch (err) {
        console.error('Error initializing communication data:', err);
        setError('Failed to load communication data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    initData();

    // Subscribe to real-time updates
    const postsSubscription = supabase
      .channel('communications_channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'communications' 
      }, async () => {
        // Refresh all posts when any change happens
        // This is simpler than handling each change type individually
        try {
          const refreshedPosts = await communicationService.getPosts();
          setPosts(refreshedPosts);
        } catch (err) {
          console.error('Error refreshing posts after real-time update:', err);
        }
      })
      .subscribe();

    // Cleanup function to unsubscribe
    return () => {
      supabase.removeChannel(postsSubscription);
    };
  }, []);

  // Function to check and remove expired posts
  const removeExpiredPosts = useCallback(() => {
    const now = new Date();
    setPosts((currentPosts) =>
      currentPosts.filter((post) => {
        return !post.expiresAt || post.expiresAt > now;
      })
    );
  }, []);

  // Set up interval to check for expired posts every minute
  useEffect(() => {
    const intervalId = setInterval(removeExpiredPosts, 60000);
    return () => clearInterval(intervalId);
  }, [removeExpiredPosts]);

  // Refresh posts data
  const refreshPosts = useCallback(async () => {
    try {
      setLoading(true);
      const refreshedPosts = await communicationService.getPosts();
      setPosts(refreshedPosts);
    } catch (err) {
      console.error('Error refreshing posts:', err);
      setError('Failed to refresh posts. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new post
  const createPost = useCallback(async (
    content: string,
    selectedZoneId: string | null,
    imageUrl: string | null,
    expiresInHours: number
  ) => {
    try {
      setIsSubmitting(true);
      
      // Extract hashtags from content
      const hashtags = extractHashtags(content).map(tag => tag.substring(1)); // Remove # prefix
      
      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiresInHours);
      
      // Create post in database
      await communicationService.createPost(
        content,
        selectedZoneId,
        imageUrl,
        expiresAt,
        hashtags
      );
      
      // Refresh posts to show the new one
      await refreshPosts();
      
      return true;
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post. Please try again later.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [refreshPosts]);

  // Like/unlike a post
  const toggleLike = useCallback(async (postId: string) => {
    try {
      // Optimistically update UI
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          const updatedLiked = !post.liked;
          const updatedLikeCount = updatedLiked 
            ? post.likeCount + 1 
            : post.likeCount - 1;
          
          return {
            ...post,
            liked: updatedLiked,
            likeCount: updatedLikeCount
          };
        }
        return post;
      }));
      
      // Perform actual API call
      await communicationService.toggleLike(postId);
    } catch (err) {
      console.error('Error toggling like:', err);
      // Revert optimistic update on error
      await refreshPosts();
      setError('Failed to update like. Please try again later.');
    }
  }, [refreshPosts]);

  // Add a reply to a post
  const addReply = useCallback(async (postId: string, content: string) => {
    try {
      // Call API to add reply
      const newReply = await communicationService.addReply(postId, content);
      
      // Update local state
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            replies: [...post.replies, newReply]
          };
        }
        return post;
      }));
      
      return true;
    } catch (err) {
      console.error('Error adding reply:', err);
      setError('Failed to add reply. Please try again later.');
      return false;
    }
  }, []);

  // Delete a post
  const deletePost = useCallback(async (postId: string) => {
    try {
      // Call API to delete post
      await communicationService.deletePost(postId);
      
      // Update local state
      setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
      
      return true;
    } catch (err) {
      console.error('Error deleting post:', err);
      setError('Failed to delete post. Please try again later.');
      return false;
    }
  }, []);

  // Filter posts based on current filter
  const filteredPosts = posts.filter((post) => {
    if (filter === 'all') return true;

    if (filter.startsWith('zone:')) {
      const zoneId = filter.split(':')[1];
      return post.zone && post.zone.id === zoneId;
    }

    if (filter.startsWith('topic:')) {
      const topicName = filter.split(':')[1];
      return post.topics.some((topic) => topic.name === topicName);
    }

    return true;
  });

  return {
    posts: filteredPosts,
    zones,
    topics,
    loading,
    error,
    filter,
    currentUser,
    isSubmitting,
    setFilter,
    createPost,
    toggleLike,
    addReply,
    deletePost,
    refreshPosts,
  };
} 