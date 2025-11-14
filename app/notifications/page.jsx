'use client';

import { useState, useEffect } from 'react';
import { getUpcomingBirthdays, getUpcomingAnniversaries } from '@/lib/db';
import PageTitle from '@/app/components/PageTitle';

export default function NotificationsPage() {
  const [birthdays, setBirthdays] = useState([]);
  const [anniversaries, setAnniversaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('birthdays');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [birthdayData, anniversaryData] = await Promise.all([
        getUpcomingBirthdays(),
        getUpcomingAnniversaries()
      ]);
      setBirthdays(birthdayData);
      setAnniversaries(anniversaryData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getDaysFromNow = (dateString) => {
    const today = new Date();
    const eventDate = new Date(dateString);
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days`;
  };

  const NotificationCard = ({ customer, type }) => {
    const eventDate = type === 'birthdate' ? customer.nextBirthday : customer.nextAnniversary;
    
    return (
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {customer.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {customer.phone}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {formatDate(eventDate)} • {getDaysFromNow(eventDate)}
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              type === 'birthdate' 
                ? 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
                : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
            }`}>
              {type === 'birthdate' ? '🎂 Birthday' : '💝 Anniversary'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageTitle title="Notifications" />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <PageTitle title="Notifications" />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('birthdays')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'birthdays'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Upcoming Birthdays ({birthdays.length})
            </button>
            <button
              onClick={() => setActiveTab('anniversaries')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'anniversaries'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Upcoming Anniversaries ({anniversaries.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'birthdays' && (
            <div>
              {birthdays.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">🎂</div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No upcoming birthdays
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    No customer birthdays in the next 7 days.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Customer Birthdays (Next 7 Days)
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Call or message these customers to wish them a happy birthday!
                    </p>
                  </div>
                  {birthdays.map((customer) => (
                    <NotificationCard 
                      key={customer.id} 
                      customer={customer} 
                      type="birthdate" 
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'anniversaries' && (
            <div>
              {anniversaries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">💝</div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No upcoming anniversaries
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    No customer anniversaries in the next 7 days.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Customer Anniversaries (Next 7 Days)
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Call or message these customers to wish them a happy anniversary!
                    </p>
                  </div>
                  {anniversaries.map((customer) => (
                    <NotificationCard 
                      key={customer.id} 
                      customer={customer} 
                      type="anniversary" 
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Quick Summary
            </h3>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              <p>
                You have <strong>{birthdays.length} birthday{birthdays.length !== 1 ? 's' : ''}</strong> and{' '}
                <strong>{anniversaries.length} anniversar{anniversaries.length !== 1 ? 'ies' : 'y'}</strong> coming up in the next week.
              </p>
              <p className="mt-1">
                Consider calling or sending a personal message to strengthen customer relationships!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}