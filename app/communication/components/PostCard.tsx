"use client";

/**
 * POST CARD COMPONENT
 * 
 * This component displays a single post in the communication feed.
 * It shows the post content, user info, interactions, and replies.
 * 
 * CONTEXT:
 * The main content display component for the communication platform,
 * representing individual posts in the feed.
 * 
 * DATA FLOW:
 * - Receives post data and callbacks for interactions
 * - Manages reply section visibility state internally
 * - Passes interaction events to parent component
 * 
 * KEY DEPENDENCIES:
 * - Avatar for user profile pictures
 * - PostActions for interaction buttons
 * - TopicTags for displaying hashtags
 * - ReplySection for comments
 * - ExpirationTimer for showing remaining time
 */

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Post, Reply } from "../utils/mockCommunicationData";
import PostActions from "./PostActions";
import ReplySection from "./ReplySection";
import TopicTags from "./TopicTags";
import ExpirationTimer from "./ExpirationTimer";

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onAddReply: (reply: Reply) => void;
}

/**
 * Card component for displaying a post with all its details
 * 
 * @param post - Post data to display
 * @param onLike - Callback function when like button is clicked
 * @param onAddReply - Callback function when a reply is added
 * @returns A card component with the post content and interactions
 */
export default function PostCard({ post, onLike, onAddReply }: PostCardProps) {
  // Track if reply section is expanded
  const [showReplies, setShowReplies] = useState(false);

  /**
   * Toggle visibility of the reply section
   */
  const toggleReplies = () => {
    setShowReplies(!showReplies);
  };

  return (
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      {/* Post header with user info and metadata */}
      <div className="flex items-start gap-3">
        <Avatar>
          <AvatarImage src={post.user.avatar} alt={post.user.name} />
          <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-sm">{post.user.name}</h3>
              <p className="text-gray-500 text-xs">
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Show expiration timer if post has an expiration date */}
              {post.expiresAt && <ExpirationTimer expiresAt={post.expiresAt} />}

              {/* Show zone tag if post has a zone */}
              {post.zone && (
                <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                  {post.zone.name}
                </div>
              )}
            </div>
          </div>

          {/* Post content */}
          <div className="mt-2">
            <p className="whitespace-pre-wrap break-words">{post.content}</p>

            {/* Image (if any) */}
            {post.imageUrl && (
              <div className="mt-3">
                <img
                  src={post.imageUrl}
                  alt="Post attachment"
                  className="rounded-md max-h-96 w-auto object-contain"
                />
              </div>
            )}

            {/* Topic tags */}
            {post.topics.length > 0 && (
              <div className="mt-2">
                <TopicTags topics={post.topics} />
              </div>
            )}
          </div>

          {/* Post actions (like, reply, share) */}
          <div className="mt-3">
            <PostActions post={post} onLike={onLike} onReply={toggleReplies} />
          </div>

          {/* Replies section - conditionally shown based on state */}
          {(showReplies || post.replies.length > 0) && (
            <div className="mt-3">
              <ReplySection
                postId={post.id}
                replies={post.replies}
                onAddReply={onAddReply}
                isExpanded={showReplies}
                onToggle={toggleReplies}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 