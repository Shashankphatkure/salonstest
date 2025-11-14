'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CustomersList from '../components/CustomersList';
import SalonLayout from '../components/SalonLayout';

// Create a component that uses useSearchParams
function CustomerNotification() {
  const [showNotification, setShowNotification] = useState(false);
  const searchParams = useSearchParams();
  const updatedMembership = searchParams.get('updatedMembership');
  
  useEffect(() => {
    if (updatedMembership) {
      setShowNotification(true);
      // Auto-hide notification after 5 seconds
      const timer = setTimeout(() => setShowNotification(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [updatedMembership]);

  if (!showNotification) return null;

  return (
    <div className="mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-md relative">
      <button 
        onClick={() => setShowNotification(false)}
        className="absolute top-2 right-2 text-green-700 hover:text-green-900"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
      <p>
        <span className="font-bold">Success!</span> Customer's membership has been updated.
      </p>
    </div>
  );
}

export default function CustomersPage() {
  const [currentPage, setCurrentPage] = useState('customers');

  return (
    <SalonLayout currentPage="customers">
      <div className="container mx-auto px-4 py-8">
        {/* Wrap the component that uses useSearchParams in Suspense */}
        <Suspense fallback={<div className="mb-4 h-16"></div>}>
          <CustomerNotification />
        </Suspense>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Customer Management
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              View, add, and manage your salon customers
            </p>
          </div>
          
          <CustomersList />
        </div>
      </div>
    </SalonLayout>
  );
} 