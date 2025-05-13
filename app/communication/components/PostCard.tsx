"use client";

/**
 * POST CARD COMPONENT
 * 
 * Displays a single post in the library communication feed.
 * 
 * PURPOSE:
 * Presents a post's content, metadata, and interactions to users in a 
 * card format that encourages engagement.
 * 
 * CONTEXT:
 * Main content display component for the communication platform, appearing
 * multiple times in the feed to show individual posts.
 * 
 * DATA FLOW:
 * - Receives post data from database via props
 * - Manages local UI state (reply visibility)
 * - Calls parent callbacks for data modifications
 * - Formats dates and renders post content
 * 
 * KEY DEPENDENCIES:
 * - PostActions for interaction buttons
 * - ReplySection for comments display and creation
 * - TopicTags for hashtag display
 * - ExpirationTimer for countdown display
 */

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Post } from "../types/communicationTypes";
import PostActions from "./PostActions";
import ReplySection from "./ReplySection";
import TopicTags from "./TopicTags";
import ExpirationTimer from "./ExpirationTimer";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Component to handle image display with error fallback
 * This addresses issues with loading images from Supabase storage
 */
function ImageWithFallback({ 
  src, 
  alt, 
  className 
}: { 
  src: string; 
  alt: string; 
  className?: string;
}) {
  const [error, setError] = useState(false);
  
  const handleError = () => {
    console.error("Failed to load image:", src);
    // Log additional information to help debug
    if (src.endsWith('.webp')) {
      console.warn("WebP format detected - this may have compatibility issues in some browsers");
    }
    setError(true);
    
    // Dispatch a custom event to notify parent components about image loading issues
    const errorEvent = new CustomEvent('image-load-error', { 
      detail: { imageUrl: src } 
    });
    window.dispatchEvent(errorEvent);
  };
  
  // Use the placeholder if there's an error, otherwise use the provided src
  const imageSrc = error ? "/images/image-placeholder.svg" : src;
  
  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${className || ''} ${error ? 'broken-image' : ''}`}
      onError={handleError}
      loading="lazy"
      crossOrigin="anonymous"
    />
  );
}

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onAddReply: (content: string) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
}

/**
 * Card component for displaying a post with all its details
 * 
 * @param post - Post data to display
 * @param onLike - Callback function when like button is clicked
 * @param onAddReply - Callback function when a reply is added
 * @param onDelete - Callback function when a post is deleted
 * @returns A card component with the post content and interactions
 */
export default function PostCard({ 
  post, 
  onLike, 
  onAddReply,
  onDelete 
}: PostCardProps) {
  // Track if reply section is expanded
  const [showReplies, setShowReplies] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Toggle visibility of the reply section
   */
  const toggleReplies = () => {
    setShowReplies(!showReplies);
  };

  /**
   * Handle post deletion with confirmation
   */
  const handleDelete = async () => {
    if (!onDelete) return;
    
    try {
      setIsDeleting(true);
      await onDelete();
    } catch (error) {
      console.error("Error deleting post:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
      {/* Post header with user info and metadata */}
      <div className="flex items-start gap-2 sm:gap-3">
        <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
          <AvatarImage src={post.user.avatar} alt={post.user.name} />
          <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between sm:gap-2">
            <div>
              <h3 className="font-medium text-sm">{post.user.name}</h3>
              <p className="text-gray-500 text-xs">
                {formatDistanceToNow(post.createdAt, {
                  addSuffix: true,
                })}
              </p>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-0">
              {/* Delete button (only shown to post owner) */}
              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 sm:h-8 sm:w-8 text-gray-500 hover:text-red-600"
                      disabled={isDeleting}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Post</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this post? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {/* Show expiration timer if post has an expiration date */}
              {post.expiresAt && <ExpirationTimer expiresAt={post.expiresAt} />}

              {/* Show zone tag if post has a zone */}
              {post.zone && (
                <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs hidden sm:block">
                  {post.zone.name}
                </div>
              )}
            </div>
          </div>

          {/* Zone tag for mobile (if post has a zone) */}
          {post.zone && (
            <div className="mt-1 sm:hidden">
              <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                {post.zone.name}
              </span>
            </div>
          )}

          {/* Post content */}
          <div className="mt-2">
            <p className="whitespace-pre-wrap break-words text-sm sm:text-base">{post.content}</p>

            {/* Image (if any) */}
            {post.imageUrl && (
              <div className="mt-3">
                <ImageWithFallback
                  src={post.imageUrl}
                  alt="Post attachment"
                  className="rounded-md max-h-64 sm:max-h-96 w-auto object-contain"
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