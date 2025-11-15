'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import SalonLayout from '../../components/SalonLayout';
import { useAuth } from '../../../lib/auth';
import { getStaffById, getServices } from '../../../lib/db';

export default function StaffDetailsPage({ params }) {
  // Unwrap the params using React.use()
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [staff, setStaff] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push(`/auth/login?redirect=/staff/${id}`);
      return;
    }
    
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch staff data
        const staffData = await getStaffById(id);
        
        if (!staffData) {
          setError('Operator not found');
          setLoading(false);
          return;
        }
        
        setStaff(staffData);
        
        // Fetch services to map service IDs to names
        const servicesData = await getServices();
        setServices(servicesData);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
        setLoading(false);
      }
    }
    
    if (user) {
      fetchData();
    }
  }, [user, authLoading, router, id]);
  
  // Get service names from IDs
  const getServiceNames = () => {
    if (!staff || !staff.services || !services.length) return [];
    
    const staffServiceIds = staff.services.map(service => 
      typeof service === 'object' ? service.id : service
    );
    
    return services
      .filter(service => staffServiceIds.includes(service.id))
      .map(service => service.name);
  };
  
  if (authLoading || loading) {
    return (
      <SalonLayout currentPage="staff">
        <div className="container mx-auto py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </SalonLayout>
    );
  }
  
  if (error) {
    return (
      <SalonLayout currentPage="staff">
        <div className="container mx-auto py-20 text-center">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md max-w-xl mx-auto">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error</h2>
            <p className="text-gray-700 dark:text-gray-300">{error}</p>
            <button
              onClick={() => router.push('/staff')}
              className="mt-6 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            >
              Back to Operators List
            </button>
          </div>
        </div>
      </SalonLayout>
    );
  }
  
  if (!staff) return null;
  
  const serviceNames = getServiceNames();
  
  return (
    <SalonLayout currentPage="staff">
      <main className="container mx-auto py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-8">
            <button 
              className="mr-4 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
              onClick={() => router.push('/staff')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Operator Details</h1>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex flex-col">
                {/* Operator Info */}
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{staff.name}</h2>
                      <p className="text-purple-600 dark:text-purple-400 font-medium">{staff.title || staff.role}</p>
                    </div>
                    
                    <div className={`px-3 py-1 rounded-full text-sm ${
                      staff.active || staff.is_available 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {staff.active || staff.is_available ? 'Available' : 'Unavailable'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 mb-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</h3>
                      <p className="mt-1 text-gray-800 dark:text-white">{staff.email}</p>
                    </div>
                    
                    {staff.phone && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</h3>
                        <p className="mt-1 text-gray-800 dark:text-white">{staff.phone}</p>
                      </div>
                    )}
                    
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Services</h3>
                      <div className="mt-1">
                        {serviceNames.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {serviceNames.map((name, index) => (
                              <span key={index} className="px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 dark:text-gray-400">No services assigned</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {(staff.bio || staff.description) && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Biography</h3>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{staff.bio || staff.description}</p>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => router.push(`/staff/edit/${id}`)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      Edit Profile
                    </button>
                    <button
                      onClick={() => router.push(`/appointments/staff/${id}`)}
                      className="px-4 py-2 border border-purple-600 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 dark:border-purple-500 dark:text-purple-400 rounded-lg flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      View Appointments
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </SalonLayout>
  );
} 