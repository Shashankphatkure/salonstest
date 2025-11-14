'use client';

import { useState } from 'react';

export default function PasswordProtectedDelete({ onDelete, itemName }) {
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleOpenModal = () => {
    setShowModal(true);
    setPassword('');
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    
    // Simple password verification - in a real app, this should be handled more securely
    if (password === 'admin123') {
      setShowModal(false);
      onDelete();
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="px-3 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-300 text-sm rounded"
      >
        Delete
      </button>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Confirm {itemName} Deletion
            </h3>
            
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Please enter the admin password to delete this {itemName.toLowerCase()}.
            </p>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                {error}
              </div>
            )}
            
            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="password">
                  Admin Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter password"
                  required
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Confirm Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 