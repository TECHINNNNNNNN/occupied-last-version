"use client";

/**
 * REPLY SECTION COMPONENT
 * 
 * Displays and manages replies/comments for a communication post.
 * 
 * PURPOSE:
 * Enables threaded discussions around posts by showing existing replies
 * and providing an interface for adding new ones.
 * 
 * CONTEXT:
 * Appears within post cards when a post has replies or when a user
 * clicks to view/add replies.
 * 
 * DATA FLOW:
 * - Receives replies data from parent via props
 * - Manages reply form state locally
 * - Sends new reply content to parent for database submission
 * - Formats dates and renders threaded conversation
 * 
 * KEY DEPENDENCIES:
 * - TextareaAutosize for expandable reply input
 * - Avatar component for user profile images
 * - date-fns for time formatting
 */

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import TextareaAutosize from "react-textarea-autosize";
import { Reply } from "../types/communicationTypes";

interface ReplySectionProps {
  replies: Reply[];
  onAddReply: (content: string) => Promise<boolean>;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * Section for viewing and adding replies to a post
 * 
 * @param replies - Array of existing replies
 * @param onAddReply - Callback function when a new reply is submitted
 * @param isExpanded - Whether the reply section is expanded to show input
 * @param onToggle - Callback function to toggle expanded state
 * @returns A component for viewing and adding replies
 */
export default function ReplySection({
  replies,
  onAddReply,
  isExpanded,
  onToggle,
}: ReplySectionProps) {
  // State for reply content input
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handle reply form submission
   * Submits the reply content to the parent component
   */
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();

    // Don't submit empty replies
    if (!replyContent.trim()) return;
    
    setIsSubmitting(true);

    try {
      // Pass the reply content to the parent handler
      const success = await onAddReply(replyContent);

      // Reset form after successful submission
      if (success) {
        setReplyContent("");
      }
    } catch (error) {
      console.error("Error creating reply:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine if we should show the "View replies" button
  const shouldShowViewButton = replies.length > 0 && !isExpanded;

  return (
    <div className="pl-1 sm:pl-2 border-l-2 border-gray-100">
      {/* View replies button - only shown when there are replies and section is collapsed */}
      {shouldShowViewButton && (
        <button
          className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 mt-2"
          onClick={onToggle}
        >
          View {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </button>
      )}

      {/* Reply list - only shown when expanded or there are replies to show */}
      {isExpanded && replies.length > 0 && (
        <div className="space-y-2 sm:space-y-3 my-2 sm:my-3">
          {replies.map((reply) => (
            <div key={reply.id} className="flex items-start gap-1 sm:gap-2">
              <Avatar className="w-5 h-5 sm:w-6 sm:h-6">
                <AvatarImage src={reply.user.avatar} alt={reply.user.name} />
                <AvatarFallback>{reply.user.name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="bg-gray-50 rounded-md p-1.5 sm:p-2 flex-1">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                  <span className="font-medium text-xs">{reply.user.name}</span>
                  <span className="text-gray-500 text-xs mt-0.5 sm:mt-0">
                    {formatDistanceToNow(reply.createdAt, {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-xs sm:text-sm mt-1">{reply.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply form - only shown when expanded */}
      {isExpanded && (
        <form onSubmit={handleSubmitReply} className="mt-2 sm:mt-3">
          <div className="flex items-start gap-1 sm:gap-2">
            <Avatar className="w-5 h-5 sm:w-6 sm:h-6">
              <AvatarImage src="/avatars/default.jpg" alt="Current User" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <TextareaAutosize
                placeholder="Write a reply..."
                className="w-full border rounded-md px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                maxRows={4}
              />

              <div className="flex justify-end mt-1 sm:mt-2">
                <Button
                  type="submit"
                  size="sm"
                  className="h-7 text-xs sm:text-sm px-2 sm:px-3"
                  disabled={isSubmitting || replyContent.length === 0}
                >
                  {isSubmitting ? "Sending..." : "Reply"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
} 