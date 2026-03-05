import React, { useContext, useState } from 'react';
import { useAuth } from "../context/AuthContext";

const UserProfileBar = () => {
  const { user, logout } =  useAuth()
  const [showMenu, setShowMenu] = useState(false);

  if (!user) return null;

  return (
    <div className="relative flex items-center justify-between p-4 border-b bg-gray-50">
      <div className="flex items-center space-x-3">
        {/* Profile Pic / Initial */}
        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
          {user.profilePicUrl ? (
            <img src={user.profilePicUrl} alt="me" className="rounded-full" />
          ) : (
            user.username?.charAt(0).toUpperCase()
          )}
        </div>
        
        {/* Name & Email */}
        <div className="flex flex-col overflow-hidden">
          <span className="font-semibold text-gray-800 truncate">{user.username}</span>
          <span className="text-xs text-gray-500 truncate">{user.email}</span>
        </div>
      </div>

      {/* Settings / Options Button */}
      <div className="relative">
        <button 
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white border rounded-md shadow-lg z-50">
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              Profile Settings
            </button>
            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border-b">
              Account Security
            </button>
            <button 
              onClick={logout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfileBar;