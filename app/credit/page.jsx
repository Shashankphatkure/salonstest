'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import CreditPlanDetails from '../components/CreditPlanDetails';
import SalonLayout from '../components/SalonLayout';
import Link from 'next/link';

// Create a component that uses useSearchParams
function CreditPlanContent() {
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customer');
  
  const [isLoading, setIsLoading] = useState(true);
  const [customerData, setCustomerData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomerData = async () => {
      try {
        setIsLoading(true);
        
        if (!customerId) {
          setError('No customer selected. Please select a customer to view their credit.');
          setIsLoading(false);
          return;
        }
        
        // Fetch customer data with their membership information
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*, memberships(*)')
          .eq('id', customerId)
          .single();
          
        if (customerError) throw customerError;
        
        if (!customerData) {
          setError('Customer not found.');
          setIsLoading(false);
          return;
        }
        
        // Get the active membership if available
        const activeMembership = customerData.memberships?.find(m => m.active === true);
        
        // Enhanced customer data with membership details
        const enhancedCustomerData = {
          ...customerData,
          activeMembership: activeMembership || null,
          points_balance: activeMembership?.points_balance || 0
        };
        
        setCustomerData(enhancedCustomerData);
        
      } catch (error) {
        console.error('Error fetching customer data:', error);
        setError('Failed to load customer data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCustomerData();
  }, [customerId, supabase]);
  
  // Determine credit plan based on membership type
  const getPlanType = () => {
    if (!customerData) return 'standard';
    
    const membershipType = customerData.membership_type;
    
    switch (membershipType) {
      case 'Gold':
        return 'gold';
      case 'Silver Plus':
        return 'silverPlus';
      case 'Silver':
        return 'silver';
      case 'Non-Membership-10k':
      case 'Non-Membership-20k':
      case 'Non-Membership-30k':
      case 'Non-Membership-50k':
        return 'nonMembership';
      default:
        return 'standard';
    }
  };

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Credit Plan</h2>
          <p className="text-gray-600 dark:text-gray-300">
            {customerData ? 
              `View credit details for ${customerData.name} (${customerData.membership_type} Plan)` : 
              'View membership credit details, transactions, and usage limits.'}
          </p>
        </div>
        
        {!customerId && (
          <div className="mt-4 sm:mt-0">
            <Link href="/membership">
              <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg">
                Upgrade Membership
              </button>
            </Link>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded shadow-md">
          <p className="font-medium">Error</p>
          <p>{error}</p>
          <div className="mt-4">
            <Link href="/customers">
              <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg">
                Select a Customer
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <CreditPlanDetails 
          planType={getPlanType()} 
          customerData={customerData} 
        />
      )}
    </>
  );
}

export default function CreditPlan() {
  return (
    <SalonLayout currentPage="credit">
      <div className="container mx-auto py-10 px-4">
        <Suspense fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
          </div>
        }>
          <CreditPlanContent />
        </Suspense>
      </div>
    </SalonLayout>
  );
} 