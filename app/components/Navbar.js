'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import UserMenu from './UserMenu';
import { getUpcomingBirthdays, getUpcomingAnniversaries } from '@/lib/db';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  
  // Menu items in the specified sequence
  const menuItems = [
    { href: '/', label: 'Home' },
    { href: '/book-appointment', label: 'Book' },
    { href: '/sales', label: 'Sales' },
    { href: '/services', label: 'Service' },
    { href: '/staff', label: 'Operator' },
    { href: '/customers', label: 'Customers' },
    { href: '/client-history', label: 'History' },
    { href: '/notifications', label: 'Notifications', hasNotifications: true },
    { href: '/membership', label: 'Membership' },
    { href: '/credit', label: 'Credit' },
    { href: '/invoice', label: 'Invoices' },
    { href: '/products', label: 'Products' },
    { href: '/reports', label: 'Reports' }
  ];

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const [birthdays, anniversaries] = await Promise.all([
          getUpcomingBirthdays(),
          getUpcomingAnniversaries()
        ]);
        setNotificationCount(birthdays.length + anniversaries.length);
      } catch (error) {
        console.error('Error fetching notification count:', error);
        setNotificationCount(0);
      }
    };

    fetchNotificationCount();
    
    // Refresh count every 5 minutes
    const interval = setInterval(fetchNotificationCount, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="p-4 md:p-6 flex items-center justify-between border-b bg-white dark:bg-gray-800 shadow-sm relative z-20">
      <Link href="/dashboard" className="flex items-center gap-2">
        <img src="/logo2.png" alt="Glam CRM Logo" className="h-12 w-auto bg-white rounded" />
      </Link>
      
      {/* Desktop menu */}
      <nav className="hidden lg:flex gap-4 xl:gap-6">
        {menuItems.map((item) => (
          <Link 
            key={item.label} 
            href={item.href} 
            className={`font-medium hover:text-purple-600 dark:hover:text-purple-300 transition relative ${
              item.href === '/' ? 'text-purple-600 dark:text-purple-300' : ''
            }`}
          >
            {item.label}
            {item.hasNotifications && notificationCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
      
      {/* Mobile menu button */}
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleMenu}
          className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-300 focus:outline-none"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
        
        <UserMenu />
      </div>
      
      {/* Mobile menu dropdown */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 shadow-md lg:hidden z-10">
          <div className="py-2 px-4 space-y-2">
            {menuItems.map((item) => (
              <Link 
                key={item.label} 
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="block py-2 px-2 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition relative"
              >
                <div className="flex items-center justify-between">
                  <span>{item.label}</span>
                  {item.hasNotifications && notificationCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold ml-2">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
} 