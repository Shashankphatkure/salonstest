'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const CreditPlanDetails = ({ planType = 'standard', customerData }) => {
  const supabase = createClientComponentClient();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Credit data based on membership plan
  const membershipCreditDetails = {
    gold: {
      name: 'Gold Membership',
      initialCredit: 12500,
      monthlyBonus: 1000,
      maxUsagePerVisit: 70,
      validityMonths: 12,
      discountPercentage: 50
    },
    silverPlus: {
      name: 'Silver Plus Membership',
      initialCredit: 7500,
      monthlyBonus: 500,
      maxUsagePerVisit: 50,
      validityMonths: 12,
      discountPercentage: 38
    },
    silver: {
      name: 'Silver Membership',
      initialCredit: 0,
      monthlyBonus: 250,
      maxUsagePerVisit: 30,
      validityMonths: 12,
      discountPercentage: 30
    },
    nonMembership: {
      name: 'Non-Membership Credit',
      initialCredit: 0, // Will be calculated based on the plan
      monthlyBonus: 0,
      maxUsagePerVisit: 70, // 70% max for non-membership plans
      validityMonths: 6,
      discountPercentage: 0 // Will be calculated based on plan value
    },
    standard: {
      name: 'Standard Credit',
      initialCredit: 0,
      monthlyBonus: 0,
      maxUsagePerVisit: 20,
      validityMonths: 6,
      discountPercentage: 0
    }
  };

  // Fetch transactions for the customer
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!customerData) {
        console.log('No customer data available, skipping transaction fetch');
        return;
      }
      
      try {
        setIsLoading(true);
        console.log('Fetching transactions for customer ID:', customerData.id);
        
        // Fetch transactions from Supabase
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('customer_id', customerData.id)
          .order('date', { ascending: false });
          
        if (error) {
          console.error('Supabase error fetching transactions:', error);
          throw error;
        }
        
        console.log(`Fetched ${data?.length || 0} transactions:`, data);
        setTransactions(data || []);
        
      } catch (error) {
        console.error('Error fetching transactions:', error.message, error);
        // Don't let errors prevent component rendering
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTransactions();
  }, [customerData, supabase]);

  // Calculate credit details based on membership type
  const calculateNonMembershipDetails = () => {
    const membershipType = customerData?.membership_type || '';
    let initialCredit = 0;
    let discountPercentage = 0;
    let planAmount = 0;
    
    // Extract plan amount from membership type
    if (membershipType.includes('10k')) {
      planAmount = 10000;
      initialCredit = 13000;
      discountPercentage = 30;
    } else if (membershipType.includes('20k')) {
      planAmount = 20000;
      initialCredit = 27600;
      discountPercentage = 38;
    } else if (membershipType.includes('30k')) {
      planAmount = 30000;
      initialCredit = 40500;
      discountPercentage = 35;
    } else if (membershipType.includes('50k')) {
      planAmount = 50000;
      initialCredit = 75000;
      discountPercentage = 50;
    }
    
    return {
      initialCredit,
      discountPercentage,
      planAmount
    };
  };

  // Calculate credit details based on membership and transactions
  const calculateCreditDetails = () => {
    let planDetails = { ...membershipCreditDetails[planType] };
    
    // Handle special calculations for Non-Membership plans
    if (planType === 'nonMembership') {
      const nonMembershipDetails = calculateNonMembershipDetails();
      planDetails = {
        ...planDetails,
        initialCredit: nonMembershipDetails.initialCredit,
        discountPercentage: nonMembershipDetails.discountPercentage,
        planAmount: nonMembershipDetails.planAmount,
        name: `Non-Membership Plan (₹${nonMembershipDetails.planAmount.toLocaleString()})`
      };
    }
    
    // If no customer data, return default values
    if (!customerData) {
      return {
        ...planDetails,
        totalAmount: planDetails.initialCredit,
        paidAmount: 0,
        bonusAmount: planDetails.initialCredit,
        thisMonthBonus: planDetails.monthlyBonus,
        remainingCredit: planDetails.initialCredit,
        usedCredit: 0,
        validUntil: new Date(Date.now() + planDetails.validityMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
    }
    
    // Membership start date or fallback to join date
    const startDate = customerData.activeMembership?.start_date 
      ? new Date(customerData.activeMembership.start_date) 
      : new Date(customerData.join_date);
    
    // Calculate validity end date
    const validUntil = new Date(startDate);
    validUntil.setMonth(validUntil.getMonth() + planDetails.validityMonths);
    
    // Calculate months since membership started
    const today = new Date();
    const monthsSinceMembership = 
      (today.getFullYear() - startDate.getFullYear()) * 12 + 
      (today.getMonth() - startDate.getMonth());
    
    // Calculate total bonus points earned over time (capped at membership validity)
    const monthlyBonusEarned = Math.min(
      monthsSinceMembership, 
      planDetails.validityMonths
    ) * planDetails.monthlyBonus;
    
    // Initial credit + monthly bonuses
    let totalCreditEarned = planDetails.initialCredit + monthlyBonusEarned;
    
    // For membership plans with points, use the points_balance
    if (planType !== 'nonMembership' && planType !== 'standard' && customerData.activeMembership) {
      totalCreditEarned = customerData.points_balance;
    }
    
    // Calculate used credit from transactions
    const usedCredit = transactions.reduce((total, transaction) => 
      total + (transaction.credit_used || 0), 0);
    
    // Remaining credit
    const remainingCredit = Math.max(0, totalCreditEarned - usedCredit);
    
    // Determine if we're eligible for this month's bonus
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const membershipMonth = startDate.getMonth();
    const membershipYear = startDate.getFullYear();
    
    // Check if we're within the validity period and eligible for this month's bonus
    const isWithinValidity = monthsSinceMembership < planDetails.validityMonths;
    const hasReceivedThisMonthBonus = 
      currentMonth === membershipMonth && currentYear === membershipYear && monthsSinceMembership === 0;
      
    // Calculate this month's bonus
    const thisMonthBonus = isWithinValidity && !hasReceivedThisMonthBonus ? planDetails.monthlyBonus : 0;
    
    return {
      ...planDetails,
      totalAmount: totalCreditEarned,
      paidAmount: planType === 'nonMembership' ? planDetails.planAmount || 0 : 0,
      bonusAmount: planDetails.initialCredit,
      thisMonthBonus: thisMonthBonus,
      remainingCredit: remainingCredit,
      usedCredit: usedCredit,
      validUntil: validUntil.toISOString().split('T')[0],
      transactions: transactions.map(tx => ({
        id: tx.id,
        date: tx.date,
        service: tx.service_name || 'Salon Service',
        amount: tx.amount || 0,
        creditUsed: tx.credit_used || 0,
        amountPaid: (tx.amount || 0) - (tx.credit_used || 0)
      }))
    };
  };

  const planData = calculateCreditDetails();
  
  // Calculate days remaining
  const validDate = new Date(planData.validUntil);
  const today = new Date();
  const daysRemaining = Math.ceil((validDate - today) / (1000 * 60 * 60 * 24));
  
  // Calculate percentage used
  const percentUsed = planData.totalAmount > 0 
    ? Math.round((planData.usedCredit / planData.totalAmount) * 100) 
    : 0;

  return (
    <div className="space-y-8 py-6">
      {/* Credit Info Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-teal-700 dark:text-teal-400">{planData.name}</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Valid until {new Date(planData.validUntil).toLocaleDateString()} ({daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired'})
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center min-w-[120px]">
              <p className="text-sm text-gray-500 dark:text-gray-400">Credit Balance</p>
              <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                ₹{planData.remainingCredit.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center min-w-[120px]">
              <p className="text-sm text-gray-500 dark:text-gray-400">This Month's Bonus</p>
              <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                ₹{planData.thisMonthBonus.toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center min-w-[120px]">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Value</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                ₹{planData.totalAmount.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Usage Progress */}
        <div className="mt-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="flex justify-between mb-2">
            <h3 className="font-medium text-gray-700 dark:text-gray-300">Credit Usage</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">{percentUsed}% used</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div 
              className="h-full bg-teal-500 rounded-full" 
              style={{ width: `${percentUsed}%` }}
            ></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-4">
            {planType === 'nonMembership' && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Plan Amount</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">₹{planData.paidAmount.toLocaleString()}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Credit Value</p>
              <p className="text-sm font-medium text-teal-600 dark:text-teal-400">₹{planData.bonusAmount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{planType !== 'nonMembership' ? 'Monthly Bonus' : 'Discount'}</p>
              {planType !== 'nonMembership' ? (
                <p className="text-sm font-medium text-teal-600 dark:text-teal-400">+₹{planData.monthlyBonus.toLocaleString()}/month</p>
              ) : (
                <p className="text-sm font-medium text-teal-600 dark:text-teal-400">{planData.discountPercentage}% off services</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Used Credit</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">₹{planData.usedCredit.toLocaleString()}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Max Usage Per Visit</p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {planData.maxUsagePerVisit}% (₹{Math.round(planData.remainingCredit * (planData.maxUsagePerVisit/100)).toLocaleString()})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Credit Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 bg-teal-50 dark:bg-teal-900/30 border-b border-teal-100 dark:border-teal-900/50">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white">Transaction History</h3>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-500"></div>
            </div>
          ) : planData.transactions && planData.transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Service Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credit Used</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cash Paid</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {planData.transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-200">
                        {transaction.service}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        ₹{transaction.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-teal-600 dark:text-teal-400 font-medium">
                        ₹{transaction.creditUsed.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        ₹{transaction.amountPaid.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No transactions yet. {customerData?.name || 'Customer'}'s credit is ready to be used.
            </div>
          )}
        </div>
      </div>

      {/* Calculation Example */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
          How Your Credit Works
        </h3>
        <div className="space-y-4 text-gray-600 dark:text-gray-300">
          <p>
            With {customerData ? customerData.name + "'s" : "your"} {planData.name} plan, 
            {planData.totalAmount > 0 ? (
              <>
                {' '}the total credit value is <span className="font-semibold">₹{planData.totalAmount.toLocaleString()}</span>, 
                of which <span className="font-semibold">₹{planData.remainingCredit.toLocaleString()}</span> is remaining.
              </>
            ) : (
              ' no initial credit is provided, but monthly bonuses accumulate over time.'
            )}
          </p>
          <p>
            For each visit, up to <span className="font-semibold">{planData.maxUsagePerVisit}%</span> of the total credit 
            can be used (currently <span className="font-semibold">₹{Math.round(planData.remainingCredit * (planData.maxUsagePerVisit/100)).toLocaleString()}</span>).
          </p>
          <p>
            For example, if a service costs ₹{Math.round(planData.remainingCredit * (planData.maxUsagePerVisit/100) * 0.8).toLocaleString()}, 
            credit can be used and no additional payment is needed. For more expensive services, the difference would be paid in cash.
          </p>
          <p className="text-sm text-teal-600 dark:text-teal-400 font-medium">
            This credit is valid until {new Date(planData.validUntil).toLocaleDateString()} 
            - {daysRemaining > 0 ? 'make sure to use it before it expires!' : 'it has expired.'}
          </p>
          {planData.discountPercentage > 0 && (
            <p className="mt-4 bg-teal-50 dark:bg-teal-900/20 p-3 rounded-lg">
              <span className="font-semibold">Plan benefit:</span> Get {planData.discountPercentage}% off on all services.
              {planType !== 'nonMembership' && planData.monthlyBonus > 0 && ` Plus, receive ₹${planData.monthlyBonus.toLocaleString()} in bonus credit every month.`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditPlanDetails; 