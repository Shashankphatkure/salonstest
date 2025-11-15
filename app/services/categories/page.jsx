'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SalonLayout from '../../components/SalonLayout';
import { getServices, updateService, createService } from '../../../lib/db';

export default function CategoriesManagement() {
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    try {
      setLoading(true);
      const servicesData = await getServices();
      setServices(servicesData);
      
      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(servicesData.map(service => service.category || 'Other'))
      ).map(category => ({
        name: category,
        count: servicesData.filter(service => (service.category || 'Other') === category).length
      }));
      
      setCategories(uniqueCategories);
      setError(null);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError('Failed to load categories. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    
    // Create a dummy service with the new category if it doesn't exist
    if (!categories.some(cat => cat.name === newCategory)) {
      try {
        setActionLoading(true);
        await createService({
          name: `${newCategory} Service`,
          category: newCategory,
          price: 0,
          description: `This is a placeholder service for the ${newCategory} category.`
        });
        
        setNewCategory('');
        await fetchServices();
      } catch (err) {
        console.error('Error adding category:', err);
        setError('Failed to add category. Please try again.');
      } finally {
        setActionLoading(false);
      }
    } else {
      setError('This category already exists.');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleEditStart = (category) => {
    setEditingCategory({
      oldName: category.name,
      newName: category.name
    });
  };

  const handleEditCancel = () => {
    setEditingCategory(null);
  };

  const handleEditSave = async () => {
    if (!editingCategory || !editingCategory.newName.trim() || editingCategory.oldName === editingCategory.newName) {
      setEditingCategory(null);
      return;
    }

    try {
      setActionLoading(true);
      
      // Get all services in the category being edited
      const categoryServices = services.filter(
        service => (service.category || 'Other') === editingCategory.oldName
      );
      
      // Update all services in this category
      for (const service of categoryServices) {
        await updateService(service.id, {
          ...service,
          category: editingCategory.newName
        });
      }
      
      setEditingCategory(null);
      await fetchServices();
    } catch (err) {
      console.error('Error updating category:', err);
      setError('Failed to update category. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete) return;
    
    try {
      setActionLoading(true);
      
      // Find all services in this category
      const categoryServices = services.filter(
        service => (service.category || 'Other') === categoryToDelete.name
      );
      
      // Set all services in this category to "Other"
      for (const service of categoryServices) {
        await updateService(service.id, {
          ...service,
          category: 'Other'
        });
      }
      
      setShowDeleteModal(false);
      setCategoryToDelete(null);
      await fetchServices();
    } catch (err) {
      console.error('Error deleting category:', err);
      setError('Failed to delete category. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <SalonLayout currentPage="Service">
        <div className="container mx-auto py-10 px-4 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading categories...</p>
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout currentPage="Service">
      <main className="container mx-auto py-10 px-4">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Manage Categories</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Add, edit, or delete service categories.
            </p>
          </div>
          <Link href="/services">
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg">
              Back to Services
            </button>
          </Link>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="px-6 py-4 bg-teal-100 dark:bg-teal-900/30 border-b border-teal-200 dark:border-teal-800">
            <h3 className="text-xl font-bold text-teal-800 dark:text-teal-300">Add New Category</h3>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleAddCategory} className="flex items-end gap-4">
              <div className="flex-1">
                <label htmlFor="newCategory" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  id="newCategory"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter category name"
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading || !newCategory.trim()}
                className={`px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg ${
                  (actionLoading || !newCategory.trim()) ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {actionLoading ? 'Adding...' : 'Add Category'}
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-purple-100 dark:bg-purple-900/30 border-b border-purple-200 dark:border-purple-800">
            <h3 className="text-xl font-bold text-purple-800 dark:text-purple-300">Existing Categories</h3>
          </div>
          
          {categories.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 dark:text-gray-300">No categories found. Add a new category to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {categories.map((category) => (
                <div key={category.name} className="px-6 py-4">
                  {editingCategory && editingCategory.oldName === category.name ? (
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={editingCategory.newName}
                        onChange={(e) => setEditingCategory({...editingCategory, newName: e.target.value})}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white mr-4"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleEditSave}
                          disabled={actionLoading}
                          className={`px-3 py-1 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium rounded-full ${
                            actionLoading ? 'opacity-70 cursor-not-allowed' : ''
                          }`}
                        >
                          {actionLoading ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleEditCancel}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-full"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-gray-800 dark:text-white">
                          {category.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {category.count} service{category.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditStart(category)}
                          className="px-3 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(category)}
                          disabled={category.name === 'Other'}
                          className={`px-3 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 text-sm font-medium rounded-full ${
                            category.name === 'Other' ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6 animate-fade-in">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Confirm Delete</h3>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete the category <span className="font-semibold">{categoryToDelete?.name}</span>?
              All services in this category will be moved to the "Other" category.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg ${
                  actionLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SalonLayout>
  );
} 