/**
 * COMPONENT: ProfileCard
 * PURPOSE: Displays user profile information in a visually appealing card
 * CONTEXT: Part of the dashboard main view, shows user identity and role
 * DATA FLOW: Receives user data as props
 * KEY DEPENDENCIES: None
 */

import Link from 'next/link';

interface ProfileCardProps {
  userName: string;
  userRole: string;
  avatarUrl: string;
  initials: string;
}

const ProfileCard = ({ userName, userRole, avatarUrl, initials }: ProfileCardProps) => {
  return (
    <Link 
      href="/profile" 
      className="col-span-2  bg-white rounded-3xl shadow overflow-hidden h-full relative group"
    >
      {/* Background Image with Gradient Overlay */}
      <div className="absolute inset-0 w-full h-full">
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={userName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
            <span className="text-6xl font-bold text-indigo-600">{initials}</span>
          </div>
        )}
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-300/15  to-transparent"></div>
      </div>
      
      {/* Content overlay */}
        <div className="mb-1 absolute bottom-0 flex justify-between w-full items-center  px-2">
          <p className="text-sm text-gray-200 p-2">{userRole}</p>
          <h2 className="text-2xl font-bold font-mono p-2 px-4  text-gray-200 inline-block">{userName}</h2>
          
        </div>
        
        {/* Hover effect for clickable indication */}
        {/* <div className="flex flex-col justify-end items-end">
          <p className="text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-end">
            Click to view profile
          </p>
        </div> */}
      
    </Link>
  );
};

export default ProfileCard; 