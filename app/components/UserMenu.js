'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth';

export default function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 focus:outline-none"
      >
        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
          {user ? (
            <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
              {user.email?.charAt(0).toUpperCase()}
            </span>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-purple-600 dark:text-purple-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          )}
        </div>
        <span className="text-sm font-medium hidden md:inline-block">
          {user ? user.email : 'Account'}
        </span>
        <svg
          className="h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
          <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
            {user ? (
              <>
                <span className="block px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                  Signed in as:
                  <br />
                  <span className="font-medium text-gray-900 dark:text-white">{user.email}</span>
                </span>
                <div className="border-t border-gray-100 dark:border-gray-700"></div>
                <Link href="/dashboard" passHref>
                  <span 
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    role="menuitem"
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </span>
                </Link>
                <Link href="/membership" passHref>
                  <span 
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    role="menuitem"
                    onClick={() => setIsOpen(false)}
                  >
                    Memberships
                  </span>
                </Link>
                <div className="border-t border-gray-100 dark:border-gray-700"></div>
                <span
                  className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  role="menuitem"
                  onClick={() => {
                    signOut();
                    setIsOpen(false);
                  }}
                >
                  Sign out
                </span>
              </>
            ) : (
              <>
                <Link href="/auth/login" passHref>
                  <span 
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    role="menuitem"
                    onClick={() => setIsOpen(false)}
                  >
                    Sign in
                  </span>
                </Link>
                <Link href="/auth/register" passHref>
                  <span 
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    role="menuitem"
                    onClick={() => setIsOpen(false)}
                  >
                    Create account
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 