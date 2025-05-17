/**
 * COMPONENT: CommunicationsCard
 * PURPOSE: Displays recent community posts and discussions
 * CONTEXT: Part of the dashboard main view, shows community activity
 * DATA FLOW: Receives communications data and loading state from parent
 * KEY DEPENDENCIES: Post type, formatting utilities, Avatar component
 */

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, ThumbsUp } from 'lucide-react';
import { Post } from '@/app/communication/types/communicationTypes';
import { formatTimeAgo, getInitials } from '../utils';

interface CommunicationsCardProps {
  recentCommunications: Post[];
  communicationsLoading: boolean;
}

const CommunicationsCard = ({ 
  recentCommunications, 
  communicationsLoading 
}: CommunicationsCardProps) => {
  return (
    <div className="sm:col-span-5 max-md:col-span-12 lg:col-span-4 row-span-2 col-span-7 backdrop-blur-2xl  bg-white/65 rounded-3xl  p-4 flex flex-col">
      <h2 className="text-lg font-semibold mb-3">Recent Communications</h2>
      
      {/* Communications feed */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {communicationsLoading ? (
          <p className="text-sm text-gray-400">Loading communications...</p>
        ) : recentCommunications.length > 0 ? (
          recentCommunications.map((post) => (
            <div key={post.id} className="pb-2 border-b border-gray-100 last:border-0">
              {/* User and time */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={post.user.avatar} alt={post.user.name} />
                    <AvatarFallback className="text-xs">
                      {getInitials(post.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{post.user.name}</span>
                </div>
                <span className="text-xs text-gray-500">{formatTimeAgo(post.createdAt)}</span>
              </div>
              
              {/* Content */}
              <p className="text-sm text-gray-700 break-words mb-1 line-clamp-2">
                {post.content}
              </p>
              
              {/* Tags and location */}
              {(post.topics?.length > 0 || post.zone) && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {post.topics?.slice(0, 2).map(topic => (
                    <span key={topic.id} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                      #{topic.name}
                    </span>
                  ))}
                  {post.zone && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {post.zone.name}
                    </span>
                  )}
                </div>
              )}
              
              {/* Actions */}
              <div className="flex text-xs text-gray-500 mt-1">
                <div className="flex items-center mr-3">
                  <ThumbsUp className="w-3 h-3 mr-1" />
                  <span>{post.likeCount}</span>
                </div>
                <div className="flex items-center">
                  <MessageCircle className="w-3 h-3 mr-1" />
                  <span>{post.replies.length}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-400">No recent communications</p>
        )}
      </div>
      
      {/* Link to communications page */}
      <div className="mt-auto pt-1 text-center border-t border-gray-100">
        <Link href="/communication" className="text-sm text-gray-800 font-semibold hover:underline">
          View all community posts
        </Link>
      </div>
    </div>
  );
};

export default CommunicationsCard; 