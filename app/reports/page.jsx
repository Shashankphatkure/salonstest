'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import Navbar from '../components/Navbar';
import DailyReport from '../components/DailyReport';
import { getAppointments, getMembershipPlans, getCustomers } from '../../lib/db';
import ExportButtons from '../components/ExportButtons';

export default function Reports() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  // State for report data
  const [membershipStats, setMembershipStats] = useState(null);
  const [revenueStats, setRevenueStats] = useState(null);
  const [topServices, setTopServices] = useState([]);
  const [dateRange, setDateRange] = useState('last30days');
  const [activeReportType, setActiveReportType] = useState('overview'); // 'overview' or 'daily'

  // Check if user has admin role
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login?redirect=/reports');
      } else {
        setLoading(false);
        // Always show password modal for any authenticated user
        setShowPasswordModal(true);
      }
    }
  }, [user, authLoading, router]);

  // Fetch data if authorized
  useEffect(() => {
    if (authorized) {
      fetchReportData();
    }
  }, [authorized, dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Get date range
      const { startDate, endDate } = getDateRangeFromSelection(dateRange);
      
      // Fetch appointments data using the available function
      const appointmentsData = await getAppointments({
        dateFrom: startDate,
        dateTo: endDate
      });
      
      // Fetch membership data
      const membershipPlans = await getMembershipPlans();
      const customersData = await getCustomers();
      
      // Transform data for UI
      const membershipData = processMembershipData(membershipPlans, customersData, startDate, endDate);
      const revenueData = processRevenueData(appointmentsData, startDate, endDate);
      const services = processTopServices(appointmentsData);
      
      // Update state
      setMembershipStats(membershipData);
      setRevenueStats(revenueData);
      setTopServices(services);
      
    } catch (error) {
      console.error('Error fetching report data:', error);
      setError('Failed to load report data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeFromSelection = (selection) => {
    const endDate = new Date().toISOString().split('T')[0];
    let startDate;
    
    switch(selection) {
      case 'last30days':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'last3months':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'last6months':
        startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'thisyear':
        startDate = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        break;
      case 'alltime':
        startDate = '2020-01-01'; // arbitrary past date
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }
    
    return { startDate, endDate };
  };

  const processMembershipData = (plans, customers, startDate, endDate) => {
    // Filter customers by the selected date range (customers created within the period)
    const filteredCustomers = customers.filter(customer => {
      const createdAt = new Date(customer.created_at);
      const filterStart = new Date(startDate);
      const filterEnd = new Date(endDate);
      return createdAt >= filterStart && createdAt <= filterEnd;
    });
    
    // Count actual customers by membership type (from filtered customers)
    const membershipCounts = filteredCustomers.reduce((acc, customer) => {
      const membershipType = customer.membership_type;
      
      if (membershipType && membershipType !== 'None') {
        // Normalize membership type names
        if (membershipType.includes('Gold')) {
          acc.gold += 1;
        } else if (membershipType.includes('Silver Plus')) {
          acc.silverPlus += 1;
        } else if (membershipType.includes('Silver') && !membershipType.includes('Plus')) {
          acc.silver += 1;
        } else if (membershipType.includes('Non-Membership')) {
          acc.nonMembership += 1;
        }
      }
      return acc;
    }, { gold: 0, silverPlus: 0, silver: 0, nonMembership: 0 });
    
    // Get all-time membership counts for export purposes
    const allTimeMembershipCounts = customers.reduce((acc, customer) => {
      const membershipType = customer.membership_type;
      
      if (membershipType && membershipType !== 'None') {
        // Normalize membership type names
        if (membershipType.includes('Gold')) {
          acc.gold += 1;
        } else if (membershipType.includes('Silver Plus')) {
          acc.silverPlus += 1;
        } else if (membershipType.includes('Silver') && !membershipType.includes('Plus')) {
          acc.silver += 1;
        } else if (membershipType.includes('Non-Membership')) {
          acc.nonMembership += 1;
        }
      }
      return acc;
    }, { gold: 0, silverPlus: 0, silver: 0, nonMembership: 0 });
    
    // For "Total Members", show members who joined within the selected period
    const membersInPeriod = filteredCustomers.filter(customer => 
      customer.membership_type && customer.membership_type !== 'None'
    ).length;
    
    // Also get lifetime total for reference
    const allTimeMembersCount = customers.filter(customer => 
      customer.membership_type && customer.membership_type !== 'None'
    ).length;
    
    // Calculate new customers within the selected date range
    const newCustomersInPeriod = filteredCustomers.length;
    
    // Calculate new customers this month (for display purposes)
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const newCustomersThisMonth = customers.filter(customer => {
      const createdAt = new Date(customer.created_at);
      return createdAt >= firstDayOfMonth;
    }).length;
    
    return {
      totalMembers: membersInPeriod, // Members who joined in selected period
      allTimeMembers: allTimeMembersCount, // All-time total for reference
      activeMembers: membersInPeriod, // Members in selected period are considered active
      newCustomersThisMonth, // Always show this month for consistency
      newCustomersInPeriod, // New customers in selected period
      membersByPlan: {
        // Show membership distribution for the selected period - for dashboard display
        gold: membershipCounts.gold,
        silverPlus: membershipCounts.silverPlus,
        silver: membershipCounts.silver,
        nonMembership: membershipCounts.nonMembership
      },
      allTimeMembersByPlan: {
        // Show all-time membership distribution - for exports
        gold: allTimeMembershipCounts.gold,
        silverPlus: allTimeMembershipCounts.silverPlus,
        silver: allTimeMembershipCounts.silver,
        nonMembership: allTimeMembershipCounts.nonMembership
      },
      retentionRate: 92 // This could be calculated from actual data if needed
    };
  };

  const processRevenueData = (appointmentsData, startDate, endDate) => {
    // Only include completed appointments for revenue calculation
    const completedAppointments = appointmentsData.filter(appointment => 
      appointment.status === 'completed'
    );
    
    // Calculate current month's revenue (always September 2025 for comparison)
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    // Filter completed appointments for current and previous month (for growth calculation)
    const currentMonthAppointments = completedAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return appointmentDate.getMonth() === currentMonth && 
             appointmentDate.getFullYear() === currentYear;
    });
    
    const previousMonthAppointments = completedAppointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return appointmentDate.getMonth() === previousMonth && 
             appointmentDate.getFullYear() === previousYear;
    });
    
    // Calculate revenue from completed appointments
    const currentMonthRevenue = currentMonthAppointments.reduce(
      (sum, appointment) => sum + (parseFloat(appointment.total_amount) || 0), 0
    );
    
    const previousMonthRevenue = previousMonthAppointments.reduce(
      (sum, appointment) => sum + (parseFloat(appointment.total_amount) || 0), 0
    );
    
    // Calculate growth percentage
    const growth = previousMonthRevenue > 0 
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
      : currentMonthRevenue > 0 ? 100 : 0;
    
    // Calculate total revenue for the selected period (this is the main change)
    const totalRevenue = completedAppointments.reduce(
      (sum, appointment) => sum + (parseFloat(appointment.total_amount) || 0), 0
    );
    
    // Estimate points based on revenue (assuming 1 rupee = 1 point for services)
    const totalPointsIssued = Math.round(totalRevenue);
    const totalPointsRedeemed = Math.round(totalPointsIssued * 0.75); // Estimate 75% redemption
    
    return {
      thisMonth: Math.round(currentMonthRevenue), // Always current month for comparison
      lastMonth: Math.round(previousMonthRevenue), // Always previous month for comparison
      growth: parseFloat(growth.toFixed(1)), // Growth is always month-over-month
      totalRevenue: Math.round(totalRevenue), // Revenue for selected period
      totalPointsIssued, // Based on selected period
      totalPointsRedeemed, // Based on selected period
      averageServiceValue: completedAppointments.length > 0 
        ? Math.round(totalRevenue / completedAppointments.length)
        : 0
    };
  };

  const processTopServices = (appointmentsData) => {
    // Extract services from appointments
    const serviceMap = new Map();
    
    appointmentsData.forEach(appointment => {
      // Check if the appointment has services data
      if (appointment.services && Array.isArray(appointment.services)) {
        appointment.services.forEach(serviceItem => {
          const service = serviceItem.service;
          if (service) {
            const serviceId = service.id;
            const serviceName = service.name;
            const servicePrice = service.price || 0;
            
            if (serviceMap.has(serviceId)) {
              const existingService = serviceMap.get(serviceId);
              existingService.count += 1;
              existingService.revenue += servicePrice;
            } else {
              serviceMap.set(serviceId, {
                name: serviceName,
                count: 1,
                revenue: servicePrice
              });
            }
          }
        });
      }
    });
    
    // Convert map to array and sort by revenue
    return Array.from(serviceMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    // Simple password check - in a real app, this would be a more secure check
    if (password === 'admin123') {
      setAuthorized(true);
      setShowPasswordModal(false);
      setError('');
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  const handleDateRangeChange = (e) => {
    setDateRange(e.target.value);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (showPasswordModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
            Reports Access
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">
            Enter the admin password to view reports.
          </p>
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="password">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter admin password"
                required
              />
            </div>
            <div className="flex justify-between items-center mt-6">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
              >
                Access Reports
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!authorized) {
    // This shouldn't happen but just in case
    router.push('/');
    return null;
  }

  if (!membershipStats || !revenueStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading report data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900">
      <Navbar />
      
      <div className="container mx-auto py-10 px-4">
        <div className="mb-10">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Salon Reports</h2>
          <p className="text-gray-600 dark:text-gray-300">
            View analytics and statistics for your salon's performance and membership.
          </p>
        </div>

        {/* Report Type Navigation */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveReportType('overview')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                activeReportType === 'overview'
                  ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Overview Reports
            </button>
            <button
              onClick={() => setActiveReportType('daily')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                activeReportType === 'daily'
                  ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Daily Report
            </button>
          </div>
        </div>

        {/* Conditional Content Based on Report Type */}
        {activeReportType === 'daily' ? (
          <DailyReport />
        ) : (
          <>
        {/* Date Selector */}
        <div className="mb-8 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <select 
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm pl-3 pr-10 py-2 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
                value={dateRange}
                onChange={handleDateRangeChange}
              >
                <option value="last30days">Last 30 Days</option>
                <option value="last3months">Last 3 Months</option>
                <option value="last6months">Last 6 Months</option>
                <option value="thisyear">This Year</option>
                <option value="alltime">All Time</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <button 
              className="px-4 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-md font-medium"
              onClick={fetchReportData}
            >
              Generate Report
            </button>
          </div>
          <ExportButtons 
            reportData={{ membershipStats, revenueStats, topServices }}
            dateRange={dateRange}
            startDate={getDateRangeFromSelection(dateRange).startDate}
            endDate={getDateRangeFromSelection(dateRange).endDate}
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Members in Period</h3>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{membershipStats.totalMembers}</p>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-green-500 font-medium">+{membershipStats.newCustomersInPeriod} customers</span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">| All-time: {membershipStats.allTimeMembers} members</span>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Period Revenue</h3>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">₹{revenueStats.totalRevenue.toLocaleString()}</p>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-blue-500 font-medium">Current Month: ₹{revenueStats.thisMonth.toLocaleString()}</span>
              <span className={`font-medium ml-2 ${revenueStats.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ({revenueStats.growth >= 0 ? '+' : ''}{revenueStats.growth}%)
              </span>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Points Issued</h3>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{revenueStats.totalPointsIssued.toLocaleString()}</p>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-purple-500 font-medium">{revenueStats.totalPointsRedeemed.toLocaleString()} redeemed</span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">
                ({revenueStats.totalPointsIssued > 0 
                  ? Math.round((revenueStats.totalPointsRedeemed/revenueStats.totalPointsIssued)*100) 
                  : 0}%)
              </span>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Retention Rate</h3>
            <p className="text-3xl font-bold text-gray-800 dark:text-white">{membershipStats.retentionRate}%</p>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-green-500 font-medium">Excellent</span>
              <span className="text-gray-500 dark:text-gray-400 ml-2">industry avg: 65%</span>
            </div>
          </div>
        </div>

        {/* Membership Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Membership Distribution</h3>
            <div className="space-y-4">
              {membershipStats.totalMembers > 0 ? (
                <>
                  {/* Gold */}
                  {membershipStats.membersByPlan.gold > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-amber-500 rounded mr-3"></div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Gold</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{membershipStats.membersByPlan.gold}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          ({Math.round((membershipStats.membersByPlan.gold / membershipStats.totalMembers) * 100)}%)
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Silver Plus */}
                  {membershipStats.membersByPlan.silverPlus > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-purple-500 rounded mr-3"></div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Silver Plus</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{membershipStats.membersByPlan.silverPlus}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          ({Math.round((membershipStats.membersByPlan.silverPlus / membershipStats.totalMembers) * 100)}%)
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Silver */}
                  {membershipStats.membersByPlan.silver > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-gray-500 rounded mr-3"></div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Silver</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{membershipStats.membersByPlan.silver}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          ({Math.round((membershipStats.membersByPlan.silver / membershipStats.totalMembers) * 100)}%)
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Non-Membership */}
                  {membershipStats.membersByPlan.nonMembership > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Non-Membership Plans</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{membershipStats.membersByPlan.nonMembership}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          ({Math.round((membershipStats.membersByPlan.nonMembership / membershipStats.totalMembers) * 100)}%)
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No membership data available
                </div>
              )}
            </div>
          </div>

          {/* Top Services */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Top Services by Revenue</h3>
            <div className="space-y-4">
              {topServices.length > 0 ? (
                topServices.map((service, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center justify-center font-medium mr-3">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline mb-1">
                        <h4 className="font-medium text-gray-700 dark:text-gray-300">{service.name}</h4>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">₹{service.revenue.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ width: `${(service.revenue / Math.max(...topServices.map(s => s.revenue))) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{service.count} services performed</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No service data available for the selected period
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-10">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-6">Monthly Revenue Trend</h3>
          <div className="h-64 flex items-end justify-between space-x-2">
            {[65, 72, 86, 81, 90, 87, 94, 88, 95, 85, 91, 97].map((height, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="w-full bg-purple-500 rounded-t-sm transition-all duration-300 hover:bg-purple-600" 
                  style={{ height: `${height}%` }}
                ></div>
                <span className="text-xs mt-2 text-gray-500 dark:text-gray-400">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href="/reports/daily">
            <button className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg">
              View Daily Report
            </button>
          </Link>
          <Link href="/dashboard">
            <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg">
              View Member Dashboard
            </button>
          </Link>
          <Link href="/services">
            <button className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg">
              Manage Services
            </button>
          </Link>
        </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 mt-20 py-8 border-t">
        <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400 text-sm">
          <p>© {new Date().getFullYear()} Hair & Care Unisex Salon. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
} 