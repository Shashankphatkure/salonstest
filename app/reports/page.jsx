'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import SalonLayout from '../components/SalonLayout';
import DailyReport from '../components/DailyReport';
import { getAppointments, getMembershipPlans, getCustomers } from '../../lib/db';
import ExportButtons from '../components/ExportButtons';
import { BarChart3, TrendingUp, Users, DollarSign, Award, Calendar, Loader2, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  if (loading || authLoading) {
    return (
      <SalonLayout currentPage="Reports">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </SalonLayout>
    );
  }

  if (showPasswordModal) {
    return (
      <SalonLayout currentPage="Reports">
        <div className="container mx-auto py-20 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30 mb-4">
                <Lock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle>Reports Access</CardTitle>
              <CardDescription>
                Enter the admin password to view reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    required
                  />
                </div>
                <div className="flex justify-between gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/')}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Access Reports
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </SalonLayout>
    );
  }

  if (!authorized) {
    // This shouldn't happen but just in case
    router.push('/');
    return null;
  }

  if (!membershipStats || !revenueStats) {
    return (
      <SalonLayout currentPage="Reports">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
          <p className="mt-4 text-muted-foreground">Loading report data...</p>
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout currentPage="Reports">
      <main className="container mx-auto py-10 px-4">
        <div className="flex items-center gap-3 mb-8">
          <BarChart3 className="h-8 w-8 text-purple-600" />
          <div>
            <h2 className="text-3xl font-bold">Salon Reports</h2>
            <p className="text-muted-foreground">
              View analytics and statistics for your salon's performance and membership.
            </p>
          </div>
        </div>

        {/* Report Type Navigation with Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview Reports</TabsTrigger>
            <TabsTrigger value="daily">Daily Report</TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            <DailyReport />
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            {/* Date Selector */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-48">
                      <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="last30days">Last 30 Days</SelectItem>
                          <SelectItem value="last3months">Last 3 Months</SelectItem>
                          <SelectItem value="last6months">Last 6 Months</SelectItem>
                          <SelectItem value="thisyear">This Year</SelectItem>
                          <SelectItem value="alltime">All Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={fetchReportData}>
                      Generate Report
                    </Button>
                  </div>
                  <ExportButtons
                    reportData={{ membershipStats, revenueStats, topServices }}
                    dateRange={dateRange}
                    startDate={getDateRangeFromSelection(dateRange).startDate}
                    endDate={getDateRangeFromSelection(dateRange).endDate}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardDescription>Members in Period</CardDescription>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{membershipStats.totalMembers}</div>
                  <div className="mt-2 flex items-center text-sm">
                    <span className="text-green-500 font-medium">+{membershipStats.newCustomersInPeriod} customers</span>
                    <span className="text-muted-foreground ml-2">| All-time: {membershipStats.allTimeMembers}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardDescription>Period Revenue</CardDescription>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">₹{revenueStats.totalRevenue.toLocaleString()}</div>
                  <div className="mt-2 flex items-center text-sm">
                    <span className="text-blue-500 font-medium">Current: ₹{revenueStats.thisMonth.toLocaleString()}</span>
                    <span className={`font-medium ml-2 ${revenueStats.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      ({revenueStats.growth >= 0 ? '+' : ''}{revenueStats.growth}%)
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardDescription>Points Issued</CardDescription>
                    <Award className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{revenueStats.totalPointsIssued.toLocaleString()}</div>
                  <div className="mt-2 flex items-center text-sm">
                    <span className="text-purple-500 font-medium">{revenueStats.totalPointsRedeemed.toLocaleString()} redeemed</span>
                    <span className="text-muted-foreground ml-2">
                      ({revenueStats.totalPointsIssued > 0
                        ? Math.round((revenueStats.totalPointsRedeemed/revenueStats.totalPointsIssued)*100)
                        : 0}%)
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardDescription>Retention Rate</CardDescription>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{membershipStats.retentionRate}%</div>
                  <div className="mt-2 flex items-center text-sm">
                    <span className="text-green-500 font-medium">Excellent</span>
                    <span className="text-muted-foreground ml-2">industry avg: 65%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Membership Distribution & Top Services */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Membership Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {membershipStats.totalMembers > 0 ? (
                    <>
                      {membershipStats.membersByPlan.gold > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-amber-500 rounded"></div>
                            <span className="font-medium">Gold</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">{membershipStats.membersByPlan.gold}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              ({Math.round((membershipStats.membersByPlan.gold / membershipStats.totalMembers) * 100)}%)
                            </span>
                          </div>
                        </div>
                      )}

                      {membershipStats.membersByPlan.silverPlus > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-purple-500 rounded"></div>
                            <span className="font-medium">Silver Plus</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">{membershipStats.membersByPlan.silverPlus}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              ({Math.round((membershipStats.membersByPlan.silverPlus / membershipStats.totalMembers) * 100)}%)
                            </span>
                          </div>
                        </div>
                      )}

                      {membershipStats.membersByPlan.silver > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-gray-500 rounded"></div>
                            <span className="font-medium">Silver</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">{membershipStats.membersByPlan.silver}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              ({Math.round((membershipStats.membersByPlan.silver / membershipStats.totalMembers) * 100)}%)
                            </span>
                          </div>
                        </div>
                      )}

                      {membershipStats.membersByPlan.nonMembership > 0 && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 bg-blue-500 rounded"></div>
                            <span className="font-medium">Non-Membership Plans</span>
                          </div>
                          <div className="text-right">
                            <span className="font-medium">{membershipStats.membersByPlan.nonMembership}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              ({Math.round((membershipStats.membersByPlan.nonMembership / membershipStats.totalMembers) * 100)}%)
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No membership data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Services by Revenue</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {topServices.length > 0 ? (
                    topServices.map((service, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 flex items-center justify-center font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-baseline">
                            <h4 className="font-medium">{service.name}</h4>
                            <span className="text-sm font-medium">₹{service.revenue.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className="bg-purple-500 h-2 rounded-full"
                              style={{ width: `${(service.revenue / Math.max(...topServices.map(s => s.revenue))) * 100}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-muted-foreground">{service.count} services performed</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No service data available for the selected period
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Monthly Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2">
                  {[65, 72, 86, 81, 90, 87, 94, 88, 95, 85, 91, 97].map((height, index) => (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div
                        className="w-full bg-purple-500 rounded-t-sm transition-all duration-300 hover:bg-purple-600 cursor-pointer"
                        style={{ height: `${height}%` }}
                      ></div>
                      <span className="text-xs mt-2 text-muted-foreground">
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/dashboard">
                <Button>
                  <Calendar className="mr-2 h-4 w-4" />
                  View Member Dashboard
                </Button>
              </Link>
              <Link href="/services">
                <Button variant="outline">
                  Manage Services
                </Button>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </SalonLayout>
  );
}
