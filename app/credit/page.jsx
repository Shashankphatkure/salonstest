'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import CreditPlanDetails from '../components/CreditPlanDetails';
import SalonLayout from '../components/SalonLayout';
import Link from 'next/link';
import { CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <CreditCard className="h-8 w-8 text-purple-600" />
          <div>
            <h2 className="text-3xl font-bold">Credit Plan</h2>
            <p className="text-muted-foreground">
              {customerData ?
                `View credit details for ${customerData.name} (${customerData.membership_type} Plan)` :
                'View membership credit details, transactions, and usage limits.'}
            </p>
          </div>
        </div>

        {!customerId && (
          <Link href="/membership">
            <Button>
              Upgrade Membership
            </Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
          <p className="mt-4 text-muted-foreground">Loading credit information...</p>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            <p className="mb-4">{error}</p>
            <Link href="/customers">
              <Button>
                Select a Customer
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
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
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        }>
          <CreditPlanContent />
        </Suspense>
      </div>
    </SalonLayout>
  );
}
