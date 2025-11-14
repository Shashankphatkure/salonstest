'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import SalonLayout from '../../../components/SalonLayout';
import { useAuth } from '../../../../lib/auth';
import { getStaffById, updateStaff } from '../../../../lib/db';

export default function EditStaffPage({ params }) {
  // Unwrap the params using React.use()
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;
  
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    is_available: true
  });
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push(`/auth/login?redirect=/staff/edit/${id}`);
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
        
        // Format staff data for form
        setFormData({
          name: staffData.name || '',
          phone: staffData.phone || '',
          bio: staffData.bio || '',
          is_available: staffData.is_available !== false
        });
        
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
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name) {
      setError('Please fill in all required fields (Name)');
      setSuccess(null);
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      
      await updateStaff(id, formData);
      
      setSuccess('Operator updated successfully');
      setSubmitting(false);
    } catch (err) {
      console.error('Error updating operator:', err);
      setError('Failed to update operator. Please try again.');
      setSuccess(null);
      setSubmitting(false);
    }
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
  
  return (
    <SalonLayout currentPage="staff">
      <main className="container mx-auto py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center mb-8">
            <button 
              className="mr-4 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
              onClick={() => router.push(`/staff/${id}`)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Edit Operator</h1>
          </div>
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-8 rounded-md">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-4 mb-8 rounded-md">
              <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="name">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="phone">
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    id="is_available"
                    name="is_available"
                    type="checkbox"
                    checked={formData.is_available}
                    onChange={handleChange}
                    className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label className="ml-2 block text-gray-700 dark:text-gray-300" htmlFor="is_available">
                    Operator is available for appointments
                  </label>
                </div>
              </div>
              
              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="bio">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows="5"
                    className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Tell us about this operator..."
                  ></textarea>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.push(`/staff/${id}`)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </SalonLayout>
  );
} 