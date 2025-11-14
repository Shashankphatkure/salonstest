'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getServices, deleteService } from '../../lib/db';

const ServicesSection = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    try {
      setLoading(true);
      const servicesData = await getServices();
      setServices(servicesData);
      
      // Group services by category
      const groupedServices = servicesData.reduce((acc, service) => {
        const category = service.category || 'Other';
        if (!acc[category]) {
          acc[category] = {
            id: category,
            category: category,
            items: []
          };
        }
        
        acc[category].items.push({
          id: service.id,
          name: service.name,
          price: service.price || 0,
          description: service.description || '',
        });
        
        return acc;
      }, {});
      
      setCategories(Object.values(groupedServices));
      setError(null);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError('Failed to load services. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteClick = (service) => {
    setServiceToDelete(service);
    setShowDeleteModal(true);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;
    
    setDeleteLoading(true);
    try {
      await deleteService(serviceToDelete.id);
      setShowDeleteModal(false);
      setServiceToDelete(null);
      // Refetch services after deletion
      fetchServices();
    } catch (err) {
      console.error('Error deleting service:', err);
      setDeleteError('Failed to delete service. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">Loading services...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">Our Services</h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Explore our wide range of premium salon services. Members receive additional benefits and rewards.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/services/categories">
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg">
              Manage Categories
            </button>
          </Link>
          <Link href="/services/create">
            <button className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg">
              Add New Service
            </button>
          </Link>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <p className="text-gray-600 dark:text-gray-300">No services available. Add a new service to get started.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          {categories.map((category) => (
            <div key={category.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="px-6 py-4 bg-purple-100 dark:bg-purple-900/30 border-b border-purple-200 dark:border-purple-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-purple-800 dark:text-purple-300">{category.category}</h3>
                <Link href="/services/categories">
                  <span className="text-xs text-purple-600 dark:text-purple-400 hover:underline cursor-pointer">
                    Edit Category
                  </span>
                </Link>
              </div>
              
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {category.items.map((service) => (
                  <div key={service.id} className="px-6 py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-medium text-gray-800 dark:text-white">{service.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{service.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">₹{service.price}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {Math.round(service.price * 0.8)} - {Math.round(service.price * 0.5)} for members
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end space-x-2">
                      <Link href={`/services/edit/${service.id}`}>
                        <button className="px-3 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
                          Edit
                        </button>
                      </Link>
                      <button 
                        onClick={() => handleDeleteClick(service)}
                        className="px-3 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium rounded-full"
                      >
                        Delete
                      </button>
                      <button className="px-3 py-1 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-full">
                        Book Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-12 text-center">
        <div className="inline-block bg-purple-100 dark:bg-purple-900/20 rounded-lg px-6 py-4 text-gray-700 dark:text-gray-300 text-sm">
          <p className="font-medium text-purple-700 dark:text-purple-300 mb-2">Membership Benefits</p>
          <p>Gold Members: <span className="font-medium">Up to 50% off</span> on services</p>
          <p>Silver Plus: <span className="font-medium">Up to 35% off</span> on services</p>
          <p>Silver: <span className="font-medium">Up to 20% off</span> on services</p>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6 animate-fade-in">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Confirm Delete</h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete <span className="font-semibold">{serviceToDelete?.name}</span>? This action cannot be undone.
            </p>
            
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md text-sm">
                {deleteError}
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg ${deleteLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesSection; 