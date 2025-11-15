'use client';

import { useState, useRef, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function InvoiceDisplay({ appointment, onClose }) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [customerMembership, setCustomerMembership] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [creditApplied, setCreditApplied] = useState(0);
  const [hasRecordedTransaction, setHasRecordedTransaction] = useState(false);
  const supabase = createClientComponentClient();
  const printRef = useRef(null);
  
  // Generate invoice ID based on appointment ID
  const invoiceId = `INV-${appointment.id.substring(0, 6)}`;
  const services = appointment.services || [];
  const customerInfo = appointment.customers || {};

  useEffect(() => {
    const fetchCustomerMembership = async () => {
      if (!customerInfo?.id) {
        setIsLoading(false);
        return;
      }
      
      try {
        // Fetch active membership for the customer
        const { data: membershipData, error: membershipError } = await supabase
          .from('memberships')
          .select('*')
          .eq('customer_id', customerInfo.id)
          .eq('active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (membershipError && membershipError.code !== 'PGRST116') {
          console.error('Error fetching membership:', membershipError);
        }
        
        setCustomerMembership(membershipData || null);
        
        // Check if we've already recorded a transaction for this appointment
        if (appointment.id) {
          const { data: transactionData, error: transactionError } = await supabase
            .from('transactions')
            .select('*')
            .eq('invoice_id', appointment.id)
            .limit(1);
            
          if (transactionError) {
            console.error('Error checking transaction:', transactionError);
          }
          
          setHasRecordedTransaction(transactionData && transactionData.length > 0);
          
          // If there's a transaction, get the credit used
          if (transactionData && transactionData.length > 0) {
            setCreditApplied(transactionData[0].credit_used || 0);
          } else if (membershipData) {
            // Calculate credit to apply based on membership type
            calculateCreditToApply(membershipData);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCustomerMembership();
  }, [appointment.id, customerInfo.id, invoiceId, supabase]);

  // Calculate total service amount
  const calculateTotalAmount = () => {
    if (!appointment || !appointment.services || appointment.services.length === 0) {
      return parseFloat(appointment.total_price || 0);
    }
    
    return appointment.services.reduce((total, serviceItem) => {
      // Check all possible locations for the price
      const price = serviceItem.price || 
                   (serviceItem.service && serviceItem.service.price) || 
                   0;
      return total + parseFloat(price);
    }, 0);
  };
  
  const totalAmount = calculateTotalAmount();

  // Calculate how much credit to apply based on membership
  const calculateCreditToApply = (membership) => {
    if (!membership || !membership.points_balance) {
      console.log('No membership or zero points balance, skipping credit application');
      setCreditApplied(0);
      return;
    }
    
    console.log('Calculating credit to apply from membership:', membership);
    
    let maxCreditPercentage = 0;
    let membershipType = customerInfo.membership_type || '';
    
    // Determine max credit percentage based on membership type according to plan structure:
    // Silver: 30% discount (20% on first service)
    // Silver Plus: 38% discount (35% on first service)
    // Gold: 50% discount (50% on first service)
    // Non-Membership plans have their own specific percentages
    if (membershipType === 'Gold') {
      maxCreditPercentage = 50; // Gold: 50% discount per plan
    } else if (membershipType === 'Silver Plus') {
      maxCreditPercentage = 38; // Silver Plus: 38% discount per plan
    } else if (membershipType === 'Silver') {
      maxCreditPercentage = 30; // Silver: 30% discount per plan
    } else if (membershipType.includes('Non-Membership-10k')) {
      maxCreditPercentage = 70; // 10k plan: 30% off
    } else if (membershipType.includes('Non-Membership-20k')) {
      maxCreditPercentage = 38; // 20k plan: 38% off
    } else if (membershipType.includes('Non-Membership-30k')) {
      maxCreditPercentage = 45; // 30k plan: 45% off
    } else if (membershipType.includes('Non-Membership-50k')) {
      maxCreditPercentage = 60; // 50k plan: 60% off
    } else {
      maxCreditPercentage = 0; // Default for no plan: no discount
    }
    
    console.log(`Membership type: ${membershipType}, Max credit percentage: ${maxCreditPercentage}%`);
    console.log(`Points balance: ${membership.points_balance}, Total amount: ${totalAmount}`);
    
    // Calculate maximum credit that can be applied
    const maxCreditAmount = Math.min(
      membership.points_balance, // Can't use more points than available
      totalAmount * (maxCreditPercentage / 100) // Can't exceed max percentage of bill
    );
    
    console.log(`Calculated max credit to apply: ${maxCreditAmount} (${maxCreditPercentage}% of ${totalAmount}, limited by ${membership.points_balance} available points)`);
    
    // Round down to nearest whole number for cleaner display
    const roundedCredit = Math.floor(maxCreditAmount);
    setCreditApplied(roundedCredit);
  };

  // Record transaction in the database
  const recordTransaction = async () => {
    // Log the values to help with debugging
    console.log('Transaction conditions:', {
      hasRecordedTransaction,
      customerId: customerInfo?.id,
      appointmentId: appointment.id,
      creditApplied
    });
    
    if (hasRecordedTransaction || !customerInfo?.id || !appointment.id || creditApplied <= 0) {
      console.log('Skipping transaction recording due to conditions not met');
      return;
    }
    
    try {
      // Record the transaction
      const transactionData = {
        customer_id: customerInfo.id,
        amount: totalAmount,
        credit_used: creditApplied,
        service_name: services.length > 0 
          ? services.map(s => s.service?.name || 'Service').join(', ')
          : 'Salon Service',
        date: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD for SQL DATE
        invoice_id: appointment.id,
        appointment_id: appointment.id // Add this field to match the schema
      };
      
      console.log('Inserting transaction data:', transactionData);
      
      const { data, error: transactionError } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select(); // Add this to get the inserted record
        
      if (transactionError) {
        console.error('Error recording transaction:', transactionError);
        return;
      }
      
      console.log('Transaction recorded successfully:', data);
      
      // Update membership points balance if there's an active membership
      if (customerMembership && customerMembership.id) {
        const newBalance = Math.max(0, customerMembership.points_balance - creditApplied);
        
        const { error: membershipError } = await supabase
          .from('memberships')
          .update({ points_balance: newBalance })
          .eq('id', customerMembership.id);
          
        if (membershipError) {
          console.error('Error updating membership balance:', membershipError);
        } else {
          console.log('Membership balance updated to:', newBalance);
        }
      }
      
      setHasRecordedTransaction(true);
    } catch (error) {
      console.error('Error in recordTransaction:', error);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes || '00'} ${suffix}`;
  };

  // Handle print manually in case react-to-print fails
  const handleManualPrint = () => {
    window.print();
  };

  // Check if the ref is valid
  useEffect(() => {
    if (!printRef.current) {
      console.error('Print ref is not initialized');
    }
  }, []);

  // Handle print function using react-to-print
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onBeforePrint: async () => {
      setIsPrinting(true);
      // Record transaction before printing
      if (!hasRecordedTransaction && !isLoading && appointment.status === 'completed') {
        await recordTransaction();
      }
      return Promise.resolve();
    },
    onAfterPrint: () => setIsPrinting(false),
    documentTitle: `Invoice-${invoiceId}`,
    onPrintError: (errorLocation, error) => {
      console.error(`Print error at ${errorLocation}:`, error);
      // Fallback to manual printing
      handleManualPrint();
    }
  });

  // Handle back/close button
  const handleClose = () => {
    if (onClose && typeof onClose === 'function') {
      onClose();
    } else {
      // Fallback if onClose is not provided
      window.history.back();
    }
  };

  // Calculate amount to pay after credit
  const amountToPay = Math.max(0, totalAmount - creditApplied);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-50 dark:bg-gray-700 p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Invoice #{invoiceId}</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              disabled={isPrinting}
            >
              {isPrinting ? 'Printing...' : 'Print'}
            </button>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
        
        <div className="p-6 bg-white">
          <div ref={printRef} className="invoice-container">
            <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-200">
              <div className="flex items-start">
                <div className="mr-4 w-32 h-20 relative">
                  <img
                    src="/logo2.png"
                    alt="Glam CRM Logo"
                    className="w-32 h-20 object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-purple-600 mb-1">Hair & Care Unisex Salon</h2>
                  <p className="text-gray-600">Shop No 03, Ground floor, Govind Chintamani CHS</p>
                  <p className="text-gray-600">Plot No.57/4, near Taluka Police Station, Nityanand Nagar</p>
                  <p className="text-gray-600">HOC Colony, Panvel, Navi Mumbai, Maharashtra 410206</p>
                  <p className="text-gray-600">Phone: +91 93722 17698</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-800 mb-1">INVOICE</h2>
                <p className="text-gray-600">Date: {formatDate(appointment.date)}</p>
                <p className="text-gray-600">Time: {new Date().toLocaleTimeString()}</p>
                <p className="text-gray-600">Created: {formatDate(new Date())} </p>
                <p className="text-gray-600">Invoice #: {invoiceId}</p>
                <p className="text-gray-600">Status: {appointment.status === 'completed' ? 'Paid' : 'Pending'}</p>
              </div>
            </div>
            
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">BILL TO:</h3>
              <p className="text-gray-700 font-semibold">{customerInfo?.name || 'Guest Customer'}</p>
              <p className="text-gray-600">{customerInfo?.phone || ''}</p>
              <p className="text-gray-600">{customerInfo?.email || ''}</p>
              {customerInfo?.membership_type && (
                <p className="text-teal-600 font-medium mt-2">Membership: {customerInfo.membership_type}</p>
              )}
            </div>
            
            <div className="overflow-x-auto mb-8">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operator</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price (₹)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {services && services.length > 0 ? (
                    services.map((serviceItem, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {serviceItem.service?.name || 'Service'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {appointment.staff?.name || 'Staff'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(appointment.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          ₹{parseFloat(serviceItem.price || (serviceItem.service && serviceItem.service.price) || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Salon Services
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {appointment.staff?.name || 'Staff'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(appointment.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                        ₹{parseFloat(appointment.total_price || 0).toLocaleString()}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="4" className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      Subtotal
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                      ₹{totalAmount.toLocaleString()}
                    </td>
                  </tr>
                  
                  {creditApplied > 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-teal-600">
                        Credit Applied ({customerInfo?.membership_type || 'Membership'})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-teal-600 text-right">
                        -₹{creditApplied.toLocaleString()}
                      </td>
                    </tr>
                  )}
                  
                  <tr className="bg-gray-50">
                    <td colSpan="4" className="px-6 py-4 whitespace-nowrap text-right text-base font-bold text-gray-900">
                      TOTAL DUE
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base font-bold text-gray-900 text-right">
                      ₹{amountToPay.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <div className="mb-8 border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Payment Information</h3>
              <p className="text-gray-600">Payment Method: Cash</p>
              <p className="text-gray-600">Payment Date: {formatDate(appointment.completed_at || appointment.date)}</p>
              {customerInfo?.membership_type && (
                <div className="mt-2">
                  <p className="text-gray-600">Membership Plan: {customerInfo.membership_type}</p>
                  {customerMembership && (
                    <p className="text-gray-600">Membership Credit Balance: ₹{Math.max(0, (customerMembership.points_balance - creditApplied)).toLocaleString()}</p>
                  )}
                </div>
              )}
            </div>
            
            <div className="text-center text-gray-500 text-sm mt-8 pt-4 border-t border-gray-200">
              <p>Thank you for your business!</p>
              <p>For any inquiries, please contact us at: +91 93722 17698</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add print-specific styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .invoice-container,
          .invoice-container * {
            visibility: visible;
          }
          .invoice-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          button {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
} 