'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import SalonLayout from '../components/SalonLayout';
import PlanUpgrade from '../components/PlanUpgrade';

// Create a component that uses useSearchParams
function MembershipContent() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customer');
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(customerId || '');
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch customers from Supabase
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, membership_type');
          
        if (error) throw error;
        
        const mappedCustomers = data.map(customer => ({
          id: customer.id,
          name: customer.name,
          membershipType: customer.membership_type
        }));
        
        setCustomers(mappedCustomers);
        setFilteredCustomers(mappedCustomers);
        
      } catch (error) {
        console.error('Error fetching customers:', error);
        alert('Error loading customers. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCustomers();
  }, []);

  // Filter customers when search term changes
  useEffect(() => {
    const results = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(results);
  }, [searchTerm, customers]);

  const handleSelectPlan = async (planType) => {
    if (!selectedCustomer) {
      alert('Please select a customer first to assign membership');
      return;
    }
    
    try {
      // Update customer membership in Supabase
      const { error } = await supabase
        .from('customers')
        .update({ 
          membership_type: planType,
          updated_at: new Date()
        })
        .eq('id', selectedCustomer);
        
      if (error) throw error;
      
      // Calculate initial points based on the plan type
      let initialPoints = 0;
      
      if (planType === 'Non-Membership-10k') {
        initialPoints = 13000;
      } else if (planType === 'Non-Membership-20k') {
        initialPoints = 27600;
      } else if (planType === 'Non-Membership-30k') {
        initialPoints = 40500;
      } else if (planType === 'Non-Membership-50k') {
        initialPoints = 75000;
      } else if (planType === 'Silver') {
        initialPoints = 4500; // Starting points for Silver
      } else if (planType === 'Silver Plus') {
        initialPoints = 7500; // Starting points for Silver Plus
      } else if (planType === 'Gold') {
        initialPoints = 12500; // Starting points for Gold
      }
      
      // Also add a record to memberships table for history with points balance
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          customer_id: selectedCustomer,
          membership_type: planType,
          start_date: new Date(),
          active: true,
          points_balance: initialPoints
        });
      
      if (membershipError) {
        console.error('Error adding membership history:', membershipError);
        // Don't stop the flow if this fails
      }
      
      alert(`Assigned ${planType} membership to customer ID: ${selectedCustomer} with ${initialPoints} initial points`);
      
      // Redirect back to customer page
      router.push(`/customers?updatedMembership=${selectedCustomer}`);
      
    } catch (error) {
      console.error('Error updating membership:', error);
      alert('Error updating membership. Please try again.');
    }
  };

  return (
    <>
      {isLoading ? (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <>
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Membership Plans</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Choose the perfect membership plan for exclusive benefits, discounts, and rewards.
            </p>
            
            {/* Customer Selection with Search */}
            <div className="mt-6 max-w-md">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assign Membership to Customer
              </label>
              
              {/* Search input */}
              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a customer</option>
                {filteredCustomers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.membershipType !== 'None' ? `(Current: ${customer.membershipType})` : '( Walkin Customer)'}
                  </option>
                ))}
              </select>
              {filteredCustomers.length === 0 && searchTerm !== '' && (
                <p className="mt-2 text-sm text-red-500">No customers found matching "{searchTerm}"</p>
              )}
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Select a customer before choosing a membership plan below
              </p>
            </div>
          </div>

          
          
          {/* Plan Upgrade section - always visible now */}
          <div className="mb-10">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Plan Migration Options</h3>
            <PlanUpgrade customerId={selectedCustomer} />
          </div>

{/* Membership Plans */}
<div className="grid md:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {/* Non-Membership Plans first */}
            {/* 10,000 Non-Membership Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transform transition-transform hover:scale-105">
              <div className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-200">Non-Membership</h3>
                  <div className="mt-4 flex items-baseline justify-center">
                    <span className="text-4xl font-extrabold">₹10,000</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">One-time payment with premium benefits</p>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-1">Valid for 6 months</p>
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1">Only 70% of the amount can be claimed at once</p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <p className="ml-3 text-gray-600 dark:text-gray-300">
                      <span className="font-medium">30% off</span> on all services
                    </p>
                  </div>
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <p className="ml-3 text-gray-600 dark:text-gray-300">
                      <span className="font-medium">No</span> monthly commitment
                    </p>
                  </div>
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <p className="ml-3 text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Credit balance</span> of ₹13,000
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 text-center">
                <button
                  className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-medium rounded-lg"
                  onClick={() => handleSelectPlan('Non-Membership-10k')}
                >
                  Select Plan
                </button>
              </div>
            </div>

            {/* 20,000 Non-Membership Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transform transition-transform hover:scale-105">
              <div className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-200">Non-Membership</h3>
                  <div className="mt-4 flex items-baseline justify-center">
                    <span className="text-4xl font-extrabold">₹20,000</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">One-time payment with premium benefits</p>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-1">Valid for 6 months</p>
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1">Only 38% of the amount can be claimed at once</p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <p className="ml-3 text-gray-600 dark:text-gray-300">
                      <span className="font-medium">38% off</span> on all services
                    </p>
                  </div>
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <p className="ml-3 text-gray-600 dark:text-gray-300">
                      <span className="font-medium">No</span> monthly commitment
                    </p>
                  </div>
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <p className="ml-3 text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Credit balance</span> of ₹27,600
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 text-center">
                <button
                  className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-medium rounded-lg"
                  onClick={() => handleSelectPlan('Non-Membership-20k')}
                >
                  Select Plan
                </button>
              </div>
            </div>

            {/* 30,000 Non-Membership Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transform transition-transform hover:scale-105">
              <div className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-200">Non-Membership</h3>
                  <div className="mt-4 flex items-baseline justify-center">
                    <span className="text-4xl font-extrabold">₹30,000</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">One-time payment with premium benefits</p>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-1">Valid for 6 months</p>
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1">Only 45% of the amount can be claimed at once</p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <p className="ml-3 text-gray-600 dark:text-gray-300">
                      <span className="font-medium">45% off</span> on all services
                    </p>
                  </div>
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <p className="ml-3 text-gray-600 dark:text-gray-300">
                      <span className="font-medium">No</span> monthly commitment
                    </p>
                  </div>
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <p className="ml-3 text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Credit balance</span> of ₹30,000
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 text-center">
                <button
                  className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-medium rounded-lg"
                  onClick={() => handleSelectPlan('Non-Membership-30k')}
                >
                  Select Plan
                </button>
              </div>
            </div>

            {/* 50,000 Non-Membership Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transform transition-transform hover:scale-105">
              <div className="p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-200">Non-Membership</h3>
                  <div className="mt-4 flex items-baseline justify-center">
                    <span className="text-4xl font-extrabold">₹50,000</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">One-time payment with premium benefits</p>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-1">Valid for 6 months</p>
                  <p className="text-sm text-red-500 dark:text-red-400 mt-1">Only 60% of the amount can be claimed at once</p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <p className="ml-3 text-gray-600 dark:text-gray-300">
                      <span className="font-medium">60% off</span> on all services
                    </p>
                  </div>
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <p className="ml-3 text-gray-600 dark:text-gray-300">
                      <span className="font-medium">No</span> monthly commitment
                    </p>
                  </div>
                  <div className="flex items-start">
                    <svg className="h-5 w-5 text-green-500 shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <p className="ml-3 text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Credit balance</span> of ₹50,000
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700 text-center">
                <button
                  className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white font-medium rounded-lg"
                  onClick={() => handleSelectPlan('Non-Membership-50k')}
                >
                  Select Plan
                </button>
              </div>
            </div>

            
          </div>


          {/* How It Works Section */}
          <div className="mt-16 max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md p-8">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">How Membership Works</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-medium text-purple-700 dark:text-purple-300 mb-2">Monthly Bonus Points</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Each month, bonus points are automatically added to your account based on your membership level.
                  These points can be redeemed for services at our salon.
                </p>
              </div>
              
              <div>
                <h4 className="text-lg font-medium text-purple-700 dark:text-purple-300 mb-2">Member Limits</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  Gold members can share benefits with unlimited family and friends. Silver Plus members can add up to 5 members,
                  while Silver members can add up to 3 members to their plan.
                </p>
              </div>
              
              <div>
                <h4 className="text-lg font-medium text-purple-700 dark:text-purple-300 mb-2">Example Savings</h4>
                <p className="text-gray-600 dark:text-gray-300">
                  With a Gold membership, if you have 3,000 points accumulated over 3 months and take a ₹5,000 service,
                  you'll use your points and only pay ₹2,000 in cash - that's a significant discount!
                </p>
              </div>
            </div>
          </div>

          
        </>
      )}
    </>
  );
}

export default function MembershipPlans() {
  return (
    <SalonLayout currentPage="membership">
      <div className="container mx-auto py-10 px-4">
        <Suspense fallback={
          <div className="flex justify-center items-center h-24">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        }>
          <MembershipContent />
        </Suspense>
      </div>
    </SalonLayout>
  );
} 