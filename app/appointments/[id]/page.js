'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../../lib/auth';
import { getAppointmentById, updateAppointment } from '../../../lib/db';
import InvoiceDisplay from '../../components/InvoiceDisplay';

export default function AppointmentDetailPage({ params }) {
  // Unwrap the params using React.use()
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push(`/auth/login?redirect=/appointments/${id}`);
      return;
    }
    
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch appointment data
        const appointmentData = await getAppointmentById(id);
        
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
      fetchData();
    }
  }, [user, authLoading, router, id]);

  // Format date for display
  const formatDate = (dateString) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${suffix}`;
  };

  // Function to handle status change
  const handleStatusChange = async (newStatus) => {
    try {
      setUpdateLoading(true);
      
      const updates = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      // Add completed_at timestamp if completing the appointment
      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
      
      // Add cancelled_at timestamp if cancelling the appointment
      if (newStatus === 'cancelled') {
        updates.cancelled_at = new Date().toISOString();
      }
      
      // Update the appointment
      const updatedAppointment = await updateAppointment(id, updates);
      setAppointment(updatedAppointment);
      
      // Show invoice immediately if appointment is completed
      if (newStatus === 'completed') {
        setShowInvoice(true);
      }
      
      setUpdateLoading(false);
    } catch (err) {
      console.error('Error updating appointment:', err);
      setError('Failed to update appointment status. Please try again.');
      setUpdateLoading(false);
    }
  };
  
  // Calculate total service amount
  const calculateTotalAmount = () => {
    if (!appointment || !appointment.services) return 0;
    
    let total = appointment.services.reduce((total, serviceItem) => {
      const basePrice = serviceItem.service?.price || 0;
      
      // Apply discount based on membership if available
      let discountPercent = 0;
      const membershipType = appointment.customers?.membership_type;
      
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
      
      // Apply discount
      const priceAfterDiscount = basePrice * (1 - (discountPercent / 100));
      return total + priceAfterDiscount;
    }, 0);
    
    return Math.round(total * 100) / 100; // Round to 2 decimal places
  };

  // Handle generate invoice button click
  const handleGenerateInvoice = () => {
    setShowInvoice(true);
  };
  
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900">
        <Navbar />
        <div className="container mx-auto py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading appointment details...</p>
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
              onClick={() => router.push('/appointments')}
              className="mt-6 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              Back to Appointments
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!appointment) return null;
  
  // Get status badge color
  const getStatusBadge = (status) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    
    return statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900">
      <Navbar />
      
      <main className="container mx-auto py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-8">
            <button 
              className="mr-4 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
              onClick={() => router.push('/appointments')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Appointment Details</h1>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            {/* Header section */}
            <div className="bg-gray-50 dark:bg-gray-700 p-6 border-b border-gray-200 dark:border-gray-600">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                      Appointment #{appointment.id.substring(0, 8)}
                    </h2>
                    <span className={`ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(appointment.status)}`}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-600 dark:text-gray-300">
                    Created on {new Date(appointment.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {appointment.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleStatusChange('completed')}
                        disabled={updateLoading}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                      >
                        Complete
                      </button>
                    </>
                  )}
                  {appointment.status === 'confirmed' && (
                    <button
                      onClick={() => handleStatusChange('completed')}
                      disabled={updateLoading}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                    >
                      Complete
                    </button>
                  )}
                  {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusChange('cancelled')}
                      disabled={updateLoading}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                    >
                      Cancel
                    </button>
                  )}
                  {appointment.status === 'completed' && (
                    <button
                      onClick={handleGenerateInvoice}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                    >
                      Generate Invoice
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Appointment details */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    Appointment Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Date:</span>
                      <p className="font-medium text-gray-800 dark:text-white">{formatDate(appointment.date)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Time:</span>
                      <p className="font-medium text-gray-800 dark:text-white">
                        {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Status:</span>
                      <p className="font-medium text-gray-800 dark:text-white capitalize">{appointment.status}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Notes:</span>
                      <p className="font-medium text-gray-800 dark:text-white">{appointment.notes || 'No notes'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                    Customer Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Name:</span>
                      <p className="font-medium text-gray-800 dark:text-white">{appointment.customers?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                      <p className="font-medium text-gray-800 dark:text-white">{appointment.customers?.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  Staff Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Name:</span>
                    <p className="font-medium text-gray-800 dark:text-white">{appointment.staff?.name || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  Services
                </h3>
                {appointment.services && appointment.services.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Service
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Duration
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Price
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {appointment.services.map((serviceItem, index) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {serviceItem.service?.name || 'Unknown Service'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {serviceItem.service?.duration || '30'} minutes
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              ₹{serviceItem.service?.price || 0}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 dark:bg-gray-700">
                          <td colSpan="2" className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                            Total
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            ₹{calculateTotalAmount()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No services assigned to this appointment.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Invoice Modal */}
      {showInvoice && <InvoiceDisplay appointment={appointment} onClose={() => setShowInvoice(false)} />}
    </div>
  );
} 