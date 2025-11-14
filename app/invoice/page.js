'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { getAppointments, getCustomerById } from '../../lib/db';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

export default function InvoicePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/invoice');
      return;
    }
    
    async function fetchAppointments() {
      try {
        setLoading(true);
        console.log('🔍 Fetching appointments with pagination...');
        
        // Calculate offset for pagination
        const offset = (currentPage - 1) * itemsPerPage;
        
        // Get appointments with pagination and descending order
        const { data, error, count } = await supabase
          .from('appointments')
          .select(`
            *,
            customers!customer_id(*),
            staff!staff_id(*),
            services:appointment_services(
              service:services(*)
            )
          `, { count: 'exact' })
          .order('date', { ascending: false })
          .order('start_time', { ascending: false })
          .range(offset, offset + itemsPerPage - 1);
        
        if (error) throw error;
        
        const appointmentsData = data || [];
        setTotalCount(count || 0);
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));
        
        console.log('✅ Appointments fetched:', appointmentsData.length);
        setAppointments(appointmentsData);
        
        // Transform appointments into invoices
        const processedInvoices = [];
        
        for (const appointment of appointmentsData) {
          let customerInfo = appointment.customers;
          
          if (!customerInfo && appointment.customer_id) {
            // If customer info is not already joined, fetch it
            try {
              customerInfo = await getCustomerById(appointment.customer_id);
            } catch (err) {
              console.error(`Error fetching customer ${appointment.customer_id}:`, err);
              customerInfo = { name: 'Unknown Customer' };
            }
          }
          
          // Calculate total price from services with membership discount
          let totalPrice = appointment.total_price || 0;
          if (appointment.services && appointment.services.length > 0) {
            let discountPercent = 0;
            const membershipType = customerInfo?.membership_type;
            
            if (membershipType) {
              // Set discount percentage based on membership type
              if (membershipType.includes('Gold')) {
                discountPercent = 50;
              } else if (membershipType.includes('Silver Plus')) {
                discountPercent = 38;
              } else if (membershipType.includes('Silver')) {
                discountPercent = 30;
              } else if (membershipType.includes('Non-Membership-10k')) {
                discountPercent = 30;
              } else if (membershipType.includes('Non-Membership-20k')) {
                discountPercent = 38;
              } else if (membershipType.includes('Non-Membership-30k')) {
                discountPercent = 35;
              } else if (membershipType.includes('Non-Membership-50k')) {
                discountPercent = 50;
              }
            }
            
            // Calculate total with discount
            totalPrice = appointment.services.reduce((total, service) => {
              const basePrice = service.price || (service.service && service.service.price) || 0;
              const discountedPrice = basePrice * (1 - (discountPercent / 100));
              return total + parseFloat(discountedPrice);
            }, 0);
            
            // Round to 2 decimal places
            totalPrice = Math.round(totalPrice * 100) / 100;
          }
          
          // Check if there's a transaction associated with this appointment
          let creditUsed = 0;
          const invoiceId = `INV-${appointment.id.substring(0, 6)}`;
          
          try {
            const { data: transactionData } = await supabase
              .from('transactions')
              .select('credit_used')
              .eq('invoice_id', appointment.id)
              .limit(1);
              
            if (transactionData && transactionData.length > 0) {
              creditUsed = transactionData[0].credit_used || 0;
            }
          } catch (err) {
            console.error(`Error fetching transaction for ${invoiceId}:`, err);
          }
          
          // Calculate final amount after credit
          const finalAmount = Math.max(0, totalPrice - creditUsed);
          
          processedInvoices.push({
            id: invoiceId,
            appointment_id: appointment.id,
            customer: customerInfo?.name || 'Unknown Customer',
            customer_id: appointment.customer_id,
            date: appointment.date,
            amount: totalPrice,
            creditUsed: creditUsed,
            finalAmount: finalAmount,
            membership: customerInfo?.membership_type,
            status: appointment.status === 'completed' ? 'Paid' : 'Pending',
            appointment: appointment,
            customerInfo: customerInfo
          });
        }
        
        setInvoices(processedInvoices);
        setFilteredInvoices(processedInvoices);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError('Failed to load appointments. Please try again.');
        setLoading(false);
      }
    }
    
    if (user) {
      fetchAppointments();
    }
  }, [user, authLoading, router, currentPage]);
  
  // Apply filter when statusFilter changes
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredInvoices(invoices);
    } else {
      setFilteredInvoices(invoices.filter(invoice => 
        invoice.status.toLowerCase() === statusFilter.toLowerCase()
      ));
    }
  }, [statusFilter, invoices]);

  // Reset to first page only when filter changes (not when invoices change)
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);
  
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };
  
  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes || '00'} ${suffix}`;
  };
  
  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };
  
  const handlePrintInvoice = (invoice) => {
    // Redirect to invoice create page with appointment ID
    router.push(`/invoice/create?appointment=${invoice.appointment_id}`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900">
        <Navbar />
        <div className="container mx-auto py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading invoices...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900">
        <Navbar />
        <div className="container mx-auto py-20 text-center">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error</h2>
            <p className="text-gray-700 dark:text-gray-300">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900">
      <Navbar />
      
      <main className="container mx-auto py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Invoices</h1>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm"
              >
                <option value="all">All Invoices</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
              
              <button
                onClick={() => router.push('/book-appointment')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Book New Appointment
              </button>
            </div>
          </div>
          
          {filteredInvoices.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{invoice.id}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {invoice.customer || 'Unknown Customer'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {invoice.customerInfo?.phone || ''}
                          </div>
                          {invoice.membership && (
                            <div className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                              {invoice.membership}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{formatDate(invoice.date)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">₹{parseFloat(invoice.finalAmount).toLocaleString()}</div>
                          {invoice.creditUsed > 0 && (
                            <div className="text-xs text-teal-600 dark:text-teal-400">
                              Credit: ₹{parseFloat(invoice.creditUsed).toLocaleString()}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            invoice.status === 'Paid' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {invoice.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                            onClick={() => handleViewInvoice(invoice)}
                          >
                            View
                          </button>
                          <button
                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                            onClick={() => handlePrintInvoice(invoice)}
                          >
                            Print
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                        <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                        <span className="font-medium">{totalCount}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        
                        {/* Page numbers */}
                        {(() => {
                          const pages = [];
                          const startPage = Math.max(1, currentPage - 2);
                          const endPage = Math.min(totalPages, startPage + 4);
                          
                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                              <button
                                key={`page-${i}`}
                                onClick={() => setCurrentPage(i)}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                  currentPage === i
                                    ? 'z-10 bg-purple-50 border-purple-500 text-purple-600 dark:bg-purple-900 dark:border-purple-400 dark:text-purple-200'
                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600'
                                }`}
                              >
                                {i}
                              </button>
                            );
                          }
                          return pages;
                        })()}
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No invoices found</h3>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                {statusFilter === 'all' 
                  ? 'There are no invoices generated yet.'
                  : `There are no ${statusFilter} invoices.`}
              </p>
              <button
                onClick={() => router.push('/book-appointment')}
                className="mt-6 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Book an Appointment
              </button>
            </div>
          )}
        </div>
      </main>
      
      {/* Invoice Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Invoice #{selectedInvoice.id}</h2>
              <button 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={() => setShowInvoiceModal(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="border rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Customer:</p>
                  <p className="font-medium text-gray-800 dark:text-white">{selectedInvoice.customer}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Date:</p>
                  <p className="font-medium text-gray-800 dark:text-white">{formatDate(selectedInvoice.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status:</p>
                  <p className="font-medium text-gray-800 dark:text-white">{selectedInvoice.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Amount:</p>
                  <p className="font-medium text-gray-800 dark:text-white">₹{parseFloat(selectedInvoice.amount).toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <h3 className="font-medium text-gray-800 dark:text-white mb-2">Services</h3>
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Service</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Price</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {selectedInvoice.appointment.services && selectedInvoice.appointment.services.length > 0 ? (
                    selectedInvoice.appointment.services.map((service, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">{service.service?.name || 'Service'}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">₹{parseFloat(service.price || (service.service && service.service.price) || 0).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">Salon Services</td>
                      <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300">₹{parseFloat(selectedInvoice.amount).toLocaleString()}</td>
                    </tr>
                  )}
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <td className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-white text-right">Total:</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-white">₹{parseFloat(selectedInvoice.amount).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded mr-2 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                onClick={() => setShowInvoiceModal(false)}
              >
                Close
              </button>
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                onClick={() => {
                  handlePrintInvoice(selectedInvoice);
                }}
              >
                Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 