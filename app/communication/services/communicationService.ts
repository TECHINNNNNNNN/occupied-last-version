/**
 * COMMUNICATION SERVICE
 * 
 * Service to interact with the Supabase database for communication features.
 * Provides methods for CRUD operations on posts, reactions, and replies.
 * 
 * CONTEXT:
 * This serves as the data access layer for the communication feature,
 * abstracting Supabase database operations from UI components.
 * 
 * DATA FLOW:
 * - Receives requests from hooks and components
 * - Performs database operations via Supabase client
 * - Returns responses to the calling code
 * 
 * KEY DEPENDENCIES:
 * - Supabase client for database operations
 * - UUID generation for new records
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';
import { Post, User, Zone, Topic, Reply } from '../types/communicationTypes';

/**
 * Fetch all library zones
 * 
 * @returns Array of zones with id, name, floor, and capacity
 */
export async function getZones(): Promise<Zone[]> {
  const { data, error } = await supabase
    .from('library_zones')
    .select('id, name, floor, capacity')
    .order('floor, name');

  if (error) {
    console.error('Error fetching zones:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch a specific zone by ID
 * 
 * @param zoneId - The ID of the zone to fetch
 * @returns Zone data or null if not found
 */
export async function getZoneById(zoneId: string): Promise<Zone | null> {
  const { data, error } = await supabase
    .from('library_zones')
    .select('id, name, floor, capacity, description')
    .eq('id', zoneId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // Record not found
      return null;
    }
    console.error('Error fetching zone:', error);
    throw error;
  }

  return data;
}

/**
 * Fetch all available topics (hashtags)
 * 
 * @returns Array of topics with id and name
 */
export async function getTopics(): Promise<Topic[]> {
  const { data, error } = await supabase
    .from('topics')
    .select('id, name')
    .order('name');

  if (error) {
    console.error('Error fetching topics:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch all communications posts, including user, zone, and topics
 * 
 * @returns Array of communication posts with related data
 */
export async function getPosts(): Promise<Post[]> {
  // First get all posts
  const { data: postsData, error: postsError } = await supabase
    .from('communications')
    .select(`
      id, 
      content, 
      image_url,
      created_at,
      expires_at,
      zone_id,
      user_id
    `)
    .order('created_at', { ascending: false })
    .gt('expires_at', new Date().toISOString()); // Only non-expired posts

  if (postsError) {
    console.error('Error fetching posts:', postsError);
    throw postsError;
  }

  if (!postsData || postsData.length === 0) {
    return [];
  }

  // Get users for the posts
  const userIds = [...new Set(postsData.map(post => post.user_id))];
  const { data: usersData, error: usersError } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', userIds);

  if (usersError) {
    console.error('Error fetching users:', usersError);
    throw usersError;
  }

  const usersMap = new Map<string, User>();
  usersData?.forEach(user => {
    usersMap.set(user.id, {
      id: user.id,
      name: user.name || 'Anonymous User',
      avatar: user.avatar_url || '/avatars/default.jpg'
    });
  });

  // Get zones
  const zoneIds = [...new Set(postsData.filter(post => post.zone_id).map(post => post.zone_id))];
  const zonesMap = new Map<string, Zone>();
  
  if (zoneIds.length > 0) {
    const { data: zonesData, error: zonesError } = await supabase
      .from('library_zones')
      .select('id, name, floor, capacity')
      .in('id', zoneIds);

    if (zonesError) {
      console.error('Error fetching zones:', zonesError);
      throw zonesError;
    }

    zonesData?.forEach(zone => {
      zonesMap.set(zone.id, {
        id: zone.id,
        name: zone.name,
        floor: zone.floor,
        capacity: zone.capacity
      });
    });
  }

  // Get post topics
  const postIds = postsData.map(post => post.id);
  const { data: postTopicsData, error: postTopicsError } = await supabase
    .from('post_topics')
    .select('post_id, topic_id, topics(id, name)')
    .in('post_id', postIds);

  if (postTopicsError) {
    console.error('Error fetching post topics:', postTopicsError);
    throw postTopicsError;
  }

  // Group topics by post
  const postTopicsMap = new Map<string, Topic[]>();
  postTopicsData?.forEach(pt => {
    const topic = pt.topics as unknown as Topic;
    const postId = pt.post_id;
    
    if (!postTopicsMap.has(postId)) {
      postTopicsMap.set(postId, []);
    }
    
    postTopicsMap.get(postId)?.push({
      id: topic.id,
      name: topic.name
    });
  });

  // Get reactions (likes) counts
  const { data: likesData, error: likesError } = await supabase
    .from('reactions')
    .select('post_id, user_id')
    .eq('type', 'like')
    .in('post_id', postIds);

  if (likesError) {
    console.error('Error fetching likes:', likesError);
    throw likesError;
  }

  // Count likes per post and check if current user liked it
  const likesCountMap = new Map<string, number>();
  const userLikesMap = new Map<string, boolean>();
  
  // Get current user
  const { data: { session } } = await supabase.auth.getSession();
  const currentUserId = session?.user?.id;

  likesData?.forEach(like => {
    const postId = like.post_id;
    likesCountMap.set(postId, (likesCountMap.get(postId) || 0) + 1);
    
    if (like.user_id === currentUserId) {
      userLikesMap.set(postId, true);
    }
  });

  // Get replies
  const { data: repliesData, error: repliesError } = await supabase
    .from('replies')
    .select(`
      id, 
      post_id, 
      content, 
      created_at,
      user_id
    `)
    .in('post_id', postIds)
    .order('created_at');

  if (repliesError) {
    console.error('Error fetching replies:', repliesError);
    throw repliesError;
  }

  // Group replies by post
  const repliesMap = new Map<string, Reply[]>();
  
  // Get users for replies
  const replyUserIds = [...new Set(repliesData?.map(reply => reply.user_id) || [])];
  const replyUsersMap = new Map<string, User>();
  
  if (replyUserIds.length > 0) {
    const { data: replyUsersData, error: replyUsersError } = await supabase
      .from('profiles')
      .select('id, name, avatar_url')
      .in('id', replyUserIds);

    if (replyUsersError) {
      console.error('Error fetching reply users:', replyUsersError);
      throw replyUsersError;
    }

    replyUsersData?.forEach(user => {
      replyUsersMap.set(user.id, {
        id: user.id,
        name: user.name || 'Anonymous User',
        avatar: user.avatar_url || '/avatars/default.jpg'
      });
    });
  }

  // Map replies to posts
  repliesData?.forEach(reply => {
    const postId = reply.post_id;
    
    if (!repliesMap.has(postId)) {
      repliesMap.set(postId, []);
    }
    
    const user = replyUsersMap.get(reply.user_id) || {
      id: reply.user_id,
      name: 'Unknown User',
      avatar: '/avatars/default.jpg'
    };
    
    repliesMap.get(postId)?.push({
      id: reply.id,
      user,
      content: reply.content,
      createdAt: new Date(reply.created_at)
    });
  });

  // Combine all data into post objects
  return postsData.map(post => {
    const user = usersMap.get(post.user_id) || {
      id: post.user_id,
      name: 'Unknown User',
      avatar: '/avatars/default.jpg'
    };
    
    const zone = post.zone_id ? zonesMap.get(post.zone_id) || null : null;
    const topics = postTopicsMap.get(post.id) || [];
    const likeCount = likesCountMap.get(post.id) || 0;
    const liked = userLikesMap.get(post.id) || false;
    const replies = repliesMap.get(post.id) || [];
    
    return {
      id: post.id,
      user,
      content: post.content,
      zone,
      topics,
      likeCount,
      liked,
      replies,
      imageUrl: post.image_url,
      expiresAt: new Date(post.expires_at),
      createdAt: new Date(post.created_at)
    };
  });
}

/**
 * Create a new post with optional topics, zone, and image
 * 
 * @param content - Post content text
 * @param zoneId - Optional zone ID
 * @param imageUrl - Optional image URL
 * @param expiresAt - Expiration date
 * @param hashtags - Array of hashtag strings (without the # symbol)
 * @returns The created post ID
 */
export async function createPost(
  content: string,
  zoneId: string | null,
  imageUrl: string | null,
  expiresAt: Date,
  hashtags: string[]
): Promise<string> {
  // Get current user
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('You must be logged in to create a post');
  }

  const userId = session.user.id;
  const postId = uuidv4();
  
  // Start transaction
  // Since Supabase doesn't support proper transactions via the JS client,
  // we'll do our best with sequential operations
  
  // 1. Create the post
  const { error: postError } = await supabase
    .from('communications')
    .insert({
      id: postId,
      user_id: userId,
      content,
      zone_id: zoneId,
      image_url: imageUrl,
      expires_at: expiresAt.toISOString(),
    });

  if (postError) {
    console.error('Error creating post:', postError);
    throw postError;
  }

  // 2. Create or get topics and link them to the post
  if (hashtags.length > 0) {
    try {
      for (const tag of hashtags) {
        // First try to get an existing topic
        const { data: existingTopic, error: topicError } = await supabase
          .from('topics')
          .select('id')
          .eq('name', tag)
          .single();

        if (topicError && topicError.code !== 'PGRST116') { // Not just "not found"
          console.error('Error finding topic:', topicError);
          throw topicError;
        }

        let topicId;
        if (existingTopic) {
          topicId = existingTopic.id;
        } else {
          // Create a new topic if it doesn't exist
          const { data: newTopic, error: createTopicError } = await supabase
            .from('topics')
            .insert({ name: tag })
            .select('id')
            .single();

          if (createTopicError) {
            console.error('Error creating topic:', createTopicError);
            throw createTopicError;
          }

          topicId = newTopic?.id;
        }

        // Link topic to post
        const { error: linkError } = await supabase
          .from('post_topics')
          .insert({
            post_id: postId,
            topic_id: topicId
          });

        if (linkError) {
          console.error('Error linking topic to post:', linkError);
          throw linkError;
        }
      }
    } catch (error) {
      // If anything fails with topics, we still keep the post
      console.error('Error handling topics:', error);
    }
  }

  return postId;
}

/**
 * Toggle a like on a post
 * 
 * @param postId - ID of the post to like/unlike
 * @returns True if post is now liked, false if unliked
 */
export async function toggleLike(postId: string): Promise<boolean> {
  // Get current user
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('You must be logged in to like posts');
  }

  const userId = session.user.id;

  // Check if user already liked the post
  const { data: existingLike, error: checkError } = await supabase
    .from('reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('type', 'like')
    .single();

  if (checkError && checkError.code !== 'PGRST116') { // Not just "not found"
    console.error('Error checking like status:', checkError);
    throw checkError;
  }

  if (existingLike) {
    // Unlike the post
    const { error: unlikeError } = await supabase
      .from('reactions')
      .delete()
      .eq('id', existingLike.id);

    if (unlikeError) {
      console.error('Error unliking post:', unlikeError);
      throw unlikeError;
    }

    return false; // Post is now unliked
  } else {
    // Like the post
    const { error: likeError } = await supabase
      .from('reactions')
      .insert({
        post_id: postId,
        user_id: userId,
        type: 'like'
      });

    if (likeError) {
      console.error('Error liking post:', likeError);
      throw likeError;
    }

    return true; // Post is now liked
  }
}

/**
 * Add a reply to a post
 * 
 * @param postId - ID of the post to reply to
 * @param content - Reply content text
 * @returns The created reply object
 */
export async function addReply(postId: string, content: string): Promise<Reply> {
  // Get current user
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('You must be logged in to reply to posts');
  }

  const userId = session.user.id;
  const replyId = uuidv4();

  // Create the reply
  const { error: replyError } = await supabase
    .from('replies')
    .insert({
      id: replyId,
      post_id: postId,
      user_id: userId,
      content
    });

  if (replyError) {
    console.error('Error creating reply:', replyError);
    throw replyError;
  }

  // Get user profile for the response
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name, avatar_url')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
    // We'll continue and use defaults if needed
  }

  // Return the created reply
  return {
    id: replyId,
    user: {
      id: userId,
      name: profile?.name || session.user.email || 'Anonymous User',
      avatar: profile?.avatar_url || '/avatars/default.jpg'
    },
    content,
    createdAt: new Date()
  };
}

/**
 * Delete a post (only available to the post owner)
 * 
 * @param postId - ID of the post to delete
 * @returns True if successful
 */
export async function deletePost(postId: string): Promise<boolean> {
  // Because of RLS, this will only succeed if the user owns the post
  const { error } = await supabase
    .from('communications')
    .delete()
    .eq('id', postId);

  if (error) {
    console.error('Error deleting post:', error);
    throw error;
  }

  return true;
}

/**
 * Check if user is authenticated
 * 
 * @returns User object if authenticated, null otherwise
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('name, avatar_url')
    .eq('id', session.user.id)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
    // Return basic user info even if profile fetch fails
  }

  return {
    id: session.user.id,
    name: profile?.name || session.user.email || 'Anonymous User',
    avatar: profile?.avatar_url || '/avatars/default.jpg'
  };
} 