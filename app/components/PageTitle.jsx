import React from 'react';

/**
 * PageTitle component for displaying page headers with title, description and icon
 * 
 * @param {Object} props
 * @param {string} props.title - The title of the page
 * @param {string} props.description - The description text
 * @param {React.ReactNode} props.icon - Optional icon element
 */
export default function PageTitle({ title, description, icon }) {
  return (
    <div className="flex items-center mb-6">
      {icon && (
        <div className="mr-4 p-2 bg-purple-100 rounded-full dark:bg-purple-900">
          {icon}
        </div>
      )}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{title}</h1>
        {description && (
          <p className="text-gray-600 dark:text-gray-300 mt-1">{description}</p>
        )}
      </div>
    </div>
  );
} 