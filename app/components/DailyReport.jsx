'use client';

import { useState, useEffect } from 'react';
import { getDailyStats, getDailyReportData } from '../../lib/db';

export default function DailyReport() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyStats, setDailyStats] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch daily report data
  const fetchDailyReport = async (date) => {
    try {
      setLoading(true);
      setError(null);
      
      const [stats, data] = await Promise.all([
        getDailyStats(date),
        getDailyReportData(date)
      ]);
      
      setDailyStats(stats);
      setReportData(data);
    } catch (err) {
      console.error('Error fetching daily report:', err);
      setError('Failed to load daily report data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and date change
  useEffect(() => {
    fetchDailyReport(selectedDate);
  }, [selectedDate]);

  // Handle date change
  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Export to CSV function
  const exportToCSV = () => {
    if (!reportData) return;
    
    const csvData = [
      ['Daily Report', selectedDate],
      [''],
      ['Appointments Summary'],
      ['Status', 'Count'],
      ['Total', dailyStats.appointments.total],
      ['Completed', dailyStats.appointments.completed],
      ['Pending', dailyStats.appointments.pending],
      ['In Progress', dailyStats.appointments.inProgress],
      ['Cancelled', dailyStats.appointments.cancelled],
      ['No Show', dailyStats.appointments.noShow],
      [''],
      ['Revenue Summary'],
      ['Type', 'Amount (₹)'],
      ['Total Revenue', dailyStats.revenue.total],
      ['Cash Revenue', dailyStats.revenue.cash],
      ['Credit Used', dailyStats.revenue.credit],
      ['Average Service Value', dailyStats.revenue.average.toFixed(2)],
      [''],
      ['Staff Performance'],
      ['Staff Name', 'Services', 'Revenue (₹)'],
      ...dailyStats.staff.map(staff => [staff.name, staff.servicesCount, staff.revenue])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-report-${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading daily report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-md">
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        <button 
          onClick={() => fetchDailyReport(selectedDate)}
          className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!dailyStats) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No data available for the selected date.
      </div>
    );
  }

  return (
    <div className="space-y-8 print:space-y-4">
      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print { display: none !important; }
          .print-break { page-break-after: always; }
          body { font-size: 12px; }
          .print\\:text-sm { font-size: 0.875rem; }
          .print\\:p-2 { padding: 0.5rem; }
          .print\\:shadow-none { box-shadow: none; }
          .print\\:border { border: 1px solid #e5e7eb; }
        }
      `}</style>

      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Hair & Care Unisex Salon</h1>
        <h2 className="text-lg font-medium text-gray-600 mt-2">Daily Report</h2>
        <p className="text-gray-500 mt-1">Date: {new Date(selectedDate).toLocaleDateString('en-IN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</p>
        <p className="text-gray-500 text-sm mt-1">Generated on: {new Date().toLocaleString('en-IN')}</p>
      </div>

      {/* Header with Date Selector and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Date
            </label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm px-3 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button 
            onClick={() => fetchDailyReport(selectedDate)}
            className="mt-6 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium"
          >
            Refresh
          </button>
        </div>
        
        <div className="flex gap-2 no-print">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium"
          >
            Print Report
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Daily Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Appointments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
              <svg className="h-6 w-6 text-blue-700 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Appointments</h3>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{dailyStats.appointments.total}</p>
            </div>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mr-3">
              <svg className="h-6 w-6 text-green-700 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cash Revenue</h3>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">₹{dailyStats.revenue.cash.toLocaleString()}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Total: ₹{dailyStats.revenue.total.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Completed Appointments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-3">
              <svg className="h-6 w-6 text-purple-700 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</h3>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{dailyStats.appointments.completed}</p>
            </div>
          </div>
        </div>

        {/* New Customers */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mr-3">
              <svg className="h-6 w-6 text-orange-700 dark:text-orange-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">New Customers</h3>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{dailyStats.customers.new}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Appointment Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Completed</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${dailyStats.appointments.total > 0 ? (dailyStats.appointments.completed / dailyStats.appointments.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="font-medium text-gray-800 dark:text-white">{dailyStats.appointments.completed}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Pending</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: `${dailyStats.appointments.total > 0 ? (dailyStats.appointments.pending / dailyStats.appointments.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="font-medium text-gray-800 dark:text-white">{dailyStats.appointments.pending}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">In Progress</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${dailyStats.appointments.total > 0 ? (dailyStats.appointments.inProgress / dailyStats.appointments.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="font-medium text-gray-800 dark:text-white">{dailyStats.appointments.inProgress}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Cancelled</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${dailyStats.appointments.total > 0 ? (dailyStats.appointments.cancelled / dailyStats.appointments.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="font-medium text-gray-800 dark:text-white">{dailyStats.appointments.cancelled}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">No Show</span>
              <div className="flex items-center">
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                  <div
                    className="bg-gray-500 h-2 rounded-full"
                    style={{ width: `${dailyStats.appointments.total > 0 ? (dailyStats.appointments.noShow / dailyStats.appointments.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="font-medium text-gray-800 dark:text-white">{dailyStats.appointments.noShow}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Revenue Breakdown</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">Cash Revenue</span>
              <span className="font-medium text-gray-800 dark:text-white">₹{dailyStats.revenue.cash.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">Credit Used</span>
              <span className="font-medium text-gray-800 dark:text-white">₹{dailyStats.revenue.credit.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
              <span className="text-purple-600 dark:text-purple-400 font-medium">Total Invoice Amount</span>
              <span className="font-bold text-purple-800 dark:text-purple-300">₹{dailyStats.revenue.total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
              <span className="text-green-600 dark:text-green-400 font-medium">Net Cash Revenue</span>
              <span className="font-bold text-green-800 dark:text-green-300">₹{(dailyStats.revenue.finalRevenue || dailyStats.revenue.cash).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-gray-600 dark:text-gray-400">Average Service Value</span>
              <span className="font-medium text-gray-800 dark:text-white">₹{dailyStats.revenue.average.toFixed(0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Performance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Staff Performance</h3>
        {dailyStats.staff.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Staff Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Services
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Avg per Service
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {dailyStats.staff.map((staff, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {staff.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {staff.servicesCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      ₹{staff.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      ₹{staff.servicesCount > 0 ? (staff.revenue / staff.servicesCount).toFixed(0) : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No staff performance data available for this date.
          </div>
        )}
      </div>

      {/* Detailed Appointments List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Today's Appointments</h3>
        {reportData && reportData.appointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Staff
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {reportData.appointments.map((appointment, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {appointment.start_time} - {appointment.end_time || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      <div>
                        <div className="font-medium">{appointment.customer_name || appointment.customers?.name || 'N/A'}</div>
                        <div className="text-gray-500 dark:text-gray-400">{appointment.customer_phone || appointment.customers?.phone || ''}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {appointment.staff?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        appointment.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        appointment.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                        appointment.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}>
                        {appointment.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      ₹{appointment.total_amount?.toLocaleString() || '0'}
                      {appointment.status === 'completed' && (
                        <div className="text-xs text-green-600 dark:text-green-400">
                          Invoice Generated
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No appointments scheduled for this date.
          </div>
        )}
      </div>
    </div>
  );
}
