'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import Navbar from '../../components/Navbar';
import DailyReport from '../../components/DailyReport';

export default function DailyReportPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState('');

  // Check if user has admin role
  useEffect(() => {
    if (!authLoading) {
      // For now, we'll use a simple password check
      // In production, this should be properly secured with role-based access
      setShowPasswordModal(true);
    }
  }, [authLoading]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    
    // Simple password check - in production, this should be more secure
    const adminPassword = "salon123";
    
    if (password === adminPassword) {
      setAuthorized(true);
      setShowPasswordModal(false);
      setError('');
    } else {
      setError('Incorrect password. Access denied.');
      setPassword('');
    }
  };

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Show password modal
  if (showPasswordModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Admin Access Required</h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Daily reports contain sensitive business information. Please enter the admin password to continue.
            </p>
          </div>
          
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-md">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
          
          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter admin password"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push('/reports')}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md"
              >
                Access Reports
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!authorized) {
    // This shouldn't happen but just in case
    router.push('/reports');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900">
      <Navbar />
      
      <div className="container mx-auto py-10 px-4">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Daily Report</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Comprehensive daily performance and analytics report for salon operations.
          </p>
        </div>

        <DailyReport />
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 mt-20 py-8 border-t">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} Hair & Care Unisex Salon. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
