/**
 * COMMUNICATION TYPES
 * 
 * Type definitions for the library communication platform.
 * 
 * PURPOSE:
 * Provides TypeScript interfaces and types for all communication-related data structures,
 * ensuring type safety throughout the communication feature.
 * 
 * CONTEXT:
 * These types model our database schema and are used across components, hooks, and services.
 * 
 * DATA FLOW:
 * - Used to type API responses from Supabase
 * - Used to type component props and state
 * - Used to type function parameters and return values
 */

/**
 * User profile information
 */
export interface User {
  id: string;
  name: string;
  avatar: string;
}

/**
 * Library zone information
 */
export interface Zone {
  id: string;
  name: string;
  floor: number;
  capacity: number;
  description?: string;
}

/**
 * Topic/hashtag information
 */
export interface Topic {
  id: string;
  name: string;
}

/**
 * Reply to a communication post
 */
export interface Reply {
  id: string;
  user: User;
  content: string;
  createdAt: Date;
}

/**
 * Communication post with all related data
 */
export interface Post {
  id: string;
  user: User;
  content: string;
  zone: Zone | null;
  topics: Topic[];
  likeCount: number;
  liked: boolean;
  replies: Reply[];
  imageUrl: string | null;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Filter options for communication posts
 */
export type PostFilter = 'all' | `zone:${string}` | `topic:${string}`;

/**
 * Post creation parameters
 */
export interface CreatePostParams {
  content: string;
  zoneId: string | null;
  imageUrl: string | null;
  expiresAt: Date;
  hashtags: string[];
} 