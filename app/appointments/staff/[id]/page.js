'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import SalonLayout from '../../../components/SalonLayout';
import { useAuth } from '../../../../lib/auth';
import { getStaffById, getAppointments, checkTableExists } from '../../../../lib/db';

export default function StaffAppointmentsPage({ params }) {
  // Unwrap the params using React.use()
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [staff, setStaff] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [tableExists, setTableExists] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push(`/auth/login?redirect=/appointments/staff/${id}`);
      return;
    }
    
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch staff data
        const staffData = await getStaffById(id);
        
        if (!staffData) {
          setError('Staff member not found');
          setLoading(false);
          return;
        }
        
        setStaff(staffData);
        
        // Check if appointments table exists
        const appointmentsExist = await checkTableExists('appointments');
        setTableExists(appointmentsExist);
        
        if (appointmentsExist) {
          try {
            // Fetch appointments for this staff member
            const filters = { staffId: id };
            
            // Add date filters if provided
            if (dateFrom) filters.dateFrom = dateFrom;
            if (dateTo) filters.dateTo = dateTo;
            
            const appointmentsData = await getAppointments(filters);
            setAppointments(appointmentsData || []);
          } catch (appointmentError) {
            console.error('Error fetching appointments:', appointmentError);
            setAppointments([]); // Set empty array as fallback
          }
        } else {
          // Table doesn't exist
          setAppointments([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load staff data. Please try again.');
        setLoading(false);
      }
    }
    
    if (user) {
      fetchData();
    }
  }, [user, authLoading, router, id, dateFrom, dateTo]);

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

  // Filter appointments based on status
  const filteredAppointments = filterStatus === 'all' 
    ? appointments 
    : appointments.filter(appointment => appointment.status === filterStatus);
  
  // Calculate total amount from filtered appointments
  const totalAmount = filteredAppointments.reduce((sum, appointment) => {
    return sum + (appointment.total_price || 0);
  }, 0);
  
  // Today's date as default max for date inputs
  const today = new Date().toISOString().split('T')[0];
  
  if (authLoading || loading) {
    return (
      <SalonLayout currentPage="Appointments">
        <div className="container mx-auto py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading appointments...</p>
        </div>
      </SalonLayout>
    );
  }

  if (error) {
    return (
      <SalonLayout currentPage="Appointments">
        <div className="container mx-auto py-20 text-center">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error</h2>
            <p className="text-gray-700 dark:text-gray-300">{error}</p>
            <button
              onClick={() => router.push('/staff')}
              className="mt-6 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              Back to Staff List
            </button>
          </div>
        </div>
      </SalonLayout>
    );
  }

  if (!staff) return null;

  return (
    <SalonLayout currentPage="Appointments">
      <main className="container mx-auto py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex items-center">
              <button 
                className="mr-4 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                onClick={() => router.push(`/staff/${id}`)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Appointments</h1>
                <p className="text-gray-600 dark:text-gray-300">Staff member: {staff.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
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
          
          {/* Filter controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm"
                >
                  <option value="all">All Appointments</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  max={today}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                    setFilterStatus('all');
                  }}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
          
          {/* Total amount display */}
          <div className="bg-purple-100 dark:bg-purple-900/30 p-4 rounded-xl shadow-sm mb-6">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-purple-700 dark:text-purple-400 font-medium">Filtered Results: </span>
                <span className="text-gray-700 dark:text-gray-300">{filteredAppointments.length} appointments</span>
              </div>
              <div>
                <span className="text-purple-700 dark:text-purple-400 font-medium">Total Amount: </span>
                <span className="text-gray-900 dark:text-white font-bold">₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            {filteredAppointments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Customer
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Services
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Total
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredAppointments.map((appointment) => (
                      <tr key={appointment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(appointment.date)}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {appointment.customers?.name || 'Unknown Customer'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {appointment.customers?.phone || ''}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {appointment.services?.map((s, i) => (
                              <span key={i}>{s.service?.name}{i < appointment.services.length - 1 ? ', ' : ''}</span>
                            )) || 'No services'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            ₹{appointment.total_price?.toLocaleString() || '0'}
                          </div>
                          {appointment.points_used > 0 && (
                            <div className="text-xs text-purple-600 dark:text-purple-400">
                              ({appointment.points_used} points used)
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            appointment.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            appointment.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                            onClick={() => router.push(`/appointments/${appointment.id}`)}
                          >
                            View
                          </button>
                          {appointment.status === 'pending' && (
                            <button
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              // onClick={handleCompleteAppointment}
                            >
                              Complete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No appointments found</h3>
                
                {tableExists ? (
                  <p className="text-gray-500 dark:text-gray-400 mb-6">
                    {filterStatus === 'all' 
                      ? `${staff.name} doesn't have any appointments${dateFrom || dateTo ? ' in the selected date range' : ''}.` 
                      : `No ${filterStatus} appointments found for ${staff.name}${dateFrom || dateTo ? ' in the selected date range' : ''}.`}
                  </p>
                ) : (
                  <div className="text-amber-600 dark:text-amber-400 mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg mb-6 mx-auto max-w-md">
                    <span className="block font-semibold mb-1">Database Setup Required:</span>
                    The appointments table doesn't exist in the database. 
                    Please contact the administrator to set up the appointments system.
                  </div>
                )}
                
                {tableExists && (
                  <button
                    onClick={() => router.push('/book-appointment')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg inline-flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Book New Appointment
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </SalonLayout>
  );
} 