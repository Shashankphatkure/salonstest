'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import InvoiceDisplay from '../../components/InvoiceDisplay';
import { getAppointmentById } from '../../../lib/db';
import { useAuth } from '../../../lib/auth';

function InvoiceContent() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get('appointment');
  
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/invoice/create');
      return;
    }
    
    // Fetch appointment data when component mounts
    async function fetchAppointmentData() {
      if (!appointmentId) {
        setError('No appointment ID provided');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const appointmentData = await getAppointmentById(appointmentId);
        
        if (!appointmentData) {
          setError('Appointment not found');
          setLoading(false);
          return;
        }
        
        setAppointment(appointmentData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching appointment data:', err);
        setError('Failed to load appointment data. Please try again.');
        setLoading(false);
      }
    }
    
    if (user) {
      fetchAppointmentData();
    }
  }, [appointmentId, user, authLoading, router]);

  const handleGoBack = () => {
    router.push('/invoice');
  };
  
  if (authLoading || loading) {
    return (
      <div className="container mx-auto py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">Loading invoice...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto py-20 text-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md max-w-xl mx-auto">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error</h2>
          <p className="text-gray-700 dark:text-gray-300">{error}</p>
          <button
            onClick={() => router.push('/invoice')}
            className="mt-6 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            Go to Invoices
          </button>
        </div>
      </div>
    );
  }
  
  if (!appointment) return null;
  
  return <InvoiceDisplay appointment={appointment} onClose={handleGoBack} />;
}

export default function InvoiceCreatePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900">
      <Navbar />
      <Suspense fallback={
        <div className="container mx-auto py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      }>
        <InvoiceContent />
      </Suspense>
    </div>
  );
} 