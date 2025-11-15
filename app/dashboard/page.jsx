'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Users, CreditCard, Scissors, TrendingUp, Clock } from 'lucide-react';
import SalonLayout from '../components/SalonLayout';
import { useAuth } from '../../lib/auth';
import {
  getAppointments,
  getCustomers,
  getServices,
  getStaff,
  getUserMembership,
  getMembershipPlans,
  getFilteredAppointments,
  updateAppointment,
  getAppointmentCounts
} from '../../lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [memberships, setMemberships] = useState({ total: 0, active: 0 });
  const [customers, setCustomers] = useState({ total: 0, new: 0 });
  const [services, setServices] = useState({ total: 0, booked: 0 });
  const [appointmentStats, setAppointmentStats] = useState({ total: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/dashboard');
      return;
    }

    async function fetchDashboardData() {
      if (!user) return;

      try {
        setLoading(true);

        // Fetch appointments
        const appointmentsData = await getAppointments({
          status: 'pending',
          limit: 5
        });

        // Ensure we have customer and service data
        if (appointmentsData && appointmentsData.length > 0) {
          appointmentsData.forEach(appointment => {
            if (!appointment.customer && appointment.customers) {
              appointment.customer = appointment.customers;
            }

            // Ensure services data is accessible
            if (!appointment.services && appointment.appointment_services) {
              appointment.services = appointment.appointment_services.map(as => ({
                ...as,
                name: as.service?.name || 'Service'
              }));
            }
          });
        }

        setAppointments(appointmentsData);

        // Get appointment counts efficiently
        const appointmentCounts = await getAppointmentCounts();

        setAppointmentStats({
          total: appointmentCounts.total,
          pending: appointmentCounts.pending
        });

        // Fetch membership stats
        const membershipPlans = await getMembershipPlans();
        const activeMembershipsCount = membershipPlans.reduce((acc, plan) =>
          acc + (plan.active_count || 0), 0);

        setMemberships({
          total: membershipPlans.reduce((acc, plan) => acc + (plan.total_count || 0), 0),
          active: activeMembershipsCount
        });

        // Fetch customer stats
        const customersData = await getCustomers();
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

        const newCustomersThisMonth = customersData.filter(customer =>
          new Date(customer.created_at) >= firstDayOfMonth
        );

        setCustomers({
          total: customersData.length,
          new: newCustomersThisMonth.length
        });

        // Fetch service stats
        const servicesData = await getServices();
        const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString().split('T')[0];
        const endDate = new Date().toISOString().split('T')[0];

        try {
          const recentBookings = await getFilteredAppointments({
            p_date_from: startDate,
            p_date_to: endDate,
            p_status: 'completed'
          });

          setServices({
            total: servicesData.length,
            booked: recentBookings ? recentBookings.reduce((acc, booking) => acc + (booking.service_count || 0), 0) : 0
          });
        } catch (err) {
          console.error('Error fetching booked services:', err);
          setServices({
            total: servicesData.length,
            booked: 0
          });
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
        setLoading(false);
      }
    }

    if (user) {
      fetchDashboardData();
    }
  }, [user, authLoading, router]);

  // Format date for display
  const formatDate = (dateString) => {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${suffix}`;
  };

  // Handle completing an appointment
  const handleCompleteAppointment = async (appointmentId) => {
    try {
      setLoading(true);

      await updateAppointment(appointmentId, {
        status: 'completed',
        completed_at: new Date().toISOString()
      });

      setAppointments(appointments.filter(appt => appt.id !== appointmentId));

      setAppointmentStats(prev => ({
        ...prev,
        pending: prev.pending - 1
      }));

      window.location.href = `/invoice`;

    } catch (error) {
      console.error('Error completing appointment:', error);
      setError('Failed to complete appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <SalonLayout currentPage="Dashboard">
        <div className="container mx-auto py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </SalonLayout>
    );
  }

  const stats = [
    {
      title: 'Appointments',
      value: appointmentStats.total,
      subtitle: `${appointmentStats.pending} pending`,
      icon: Calendar,
      href: '/appointments',
      iconColor: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/20'
    },
    {
      title: 'Memberships',
      value: memberships.total,
      subtitle: `${memberships.active} active (${memberships.total > 0 ? Math.round(memberships.active/memberships.total*100) : 0}%)`,
      icon: CreditCard,
      href: '/membership',
      iconColor: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20'
    },
    {
      title: 'Customers',
      value: customers.total,
      subtitle: `${customers.new} new this month`,
      icon: Users,
      href: '/customers',
      iconColor: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20'
    },
    {
      title: 'Services',
      value: services.total,
      subtitle: `${services.booked} booked this month`,
      icon: Scissors,
      href: '/services',
      iconColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/20'
    }
  ];

  return (
    <SalonLayout currentPage="Dashboard">
      <main className="container mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Overview of salon performance, appointments, and statistics</p>
          </div>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.title} href={stat.href}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-full ${stat.bgColor}`}>
                      <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.subtitle}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Appointments</CardTitle>
            <CardDescription>Manage and track pending appointments</CardDescription>
          </CardHeader>
          <CardContent>
            {appointments.length > 0 ? (
              <div className="space-y-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Services</TableHead>
                        <TableHead>Staff</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell>
                            <div className="font-medium">{formatDate(appointment.date)}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(appointment.start_time)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {appointment.customer?.name || appointment.customers?.name || appointment.customer_name || 'Unknown Customer'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {appointment.customer?.phone || appointment.customers?.phone || appointment.customer_phone || ''}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {appointment.services ?
                                appointment.services.map((s, i) => (
                                  <span key={i}>
                                    {s.name || s.service?.name || 'Service'}
                                    {i < appointment.services.length - 1 ? ', ' : ''}
                                  </span>
                                ))
                              : appointment.appointment_services ?
                                appointment.appointment_services.map((s, i) => (
                                  <span key={i}>
                                    {s.service?.name || s.service_name || 'Service'}
                                    {i < appointment.appointment_services.length - 1 ? ', ' : ''}
                                  </span>
                                ))
                              : 'No services'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {appointment.staff?.name || appointment.staff_name || 'Not assigned'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                              {appointment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link href={`/appointments/${appointment.id}`}>
                                <Button variant="ghost" size="sm">
                                  View
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCompleteAppointment(appointment.id)}
                                className="text-green-600 hover:text-green-700 dark:text-green-400"
                              >
                                Complete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end">
                  <Link href="/invoice">
                    <Button variant="link" className="text-primary">
                      View All Invoices →
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No pending appointments</h3>
                <p className="text-sm text-muted-foreground mt-2">Get started by booking a new appointment</p>
                <Link href="/book-appointment">
                  <Button className="mt-4">
                    Book a New Appointment
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </SalonLayout>
  );
}
