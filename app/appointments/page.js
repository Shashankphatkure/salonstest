'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Plus, Eye, Trash2, Clock, Filter } from 'lucide-react';
import SalonLayout from '../components/SalonLayout';
import { useAuth } from '../../lib/auth';
import { getAppointments, deleteAppointment } from '../../lib/db';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AppointmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  // Handle appointment deletion with password protection
  const handleDeleteAppointment = async (appointmentId) => {
    // First confirmation
    if (!window.confirm("Are you sure you want to delete this appointment? This action cannot be undone.")) {
      return;
    }

    // Password protection for delete action
    const password = prompt("Please enter admin password to delete:");
    if (!password) return;

    try {
      // In a real app, you'd validate this on the server side
      // Here we're using a simple check for demo purposes
      if (password === "admin123") {
        setLoading(true);
        await deleteAppointment(appointmentId);

        // Update appointments list after deletion
        const updatedAppointments = appointments.filter(app => app.id !== appointmentId);
        setAppointments(updatedAppointments);
        alert("Appointment deleted successfully!");
      } else {
        alert("Incorrect password. Delete operation cancelled.");
      }
    } catch (err) {
      console.error('Error deleting appointment:', err);
      alert("Failed to delete appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/appointments');
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);

        // Fetch appointments data
        const appointmentsData = await getAppointments();
        setAppointments(appointmentsData || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError('Failed to load appointments. Please try again.');
        setLoading(false);
      }
    }

    if (user) {
      fetchData();
    }
  }, [user, authLoading, router]);

  // Format date for display
  const formatDate = (dateString) => {
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
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

  // Filter appointments based on status
  const filteredAppointments = filterStatus === 'all'
    ? appointments
    : appointments.filter(appointment => appointment.status === filterStatus);

  // Get status badge variant
  const getStatusBadge = (status) => {
    const statusVariants = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      no_show: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };

    return statusVariants[status] || statusVariants.pending;
  };

  if (authLoading || loading) {
    return (
      <SalonLayout currentPage="Appointments">
        <div className="container mx-auto py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading appointments...</p>
        </div>
      </SalonLayout>
    );
  }

  if (error) {
    return (
      <SalonLayout currentPage="Appointments">
        <div className="container mx-auto py-20 px-4">
          <Alert variant="destructive" className="max-w-xl mx-auto">
            <AlertDescription className="flex flex-col items-center gap-4">
              <p>{error}</p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout currentPage="Appointments">
      <main className="container mx-auto py-6 px-4">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
              <p className="text-muted-foreground">Manage and track all salon appointments</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Appointments</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={() => router.push('/book-appointment')} className="gap-2">
                <Plus className="h-4 w-4" />
                Book New Appointment
              </Button>
            </div>
          </div>

          {/* Appointments Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {filterStatus === 'all'
                  ? 'All Appointments'
                  : `${filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)} Appointments`}
              </CardTitle>
              <CardDescription>
                {filteredAppointments.length} {filteredAppointments.length === 1 ? 'appointment' : 'appointments'} found
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAppointments.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Services</TableHead>
                        <TableHead>Operator</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell>
                            <div className="font-medium">{formatDate(appointment.date)}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {appointment.customers?.name || appointment.customer_name || 'Unknown Customer'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {appointment.customers?.phone || appointment.customer_phone || ''}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {appointment.services?.map((s, i) => (
                                <span key={i}>
                                  {s.service?.name || s.name}
                                  {i < appointment.services.length - 1 ? ', ' : ''}
                                </span>
                              )) || 'No services'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {appointment.staff?.name || 'Unassigned'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(appointment.status)}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/appointments/${appointment.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAppointment(appointment.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">No appointments found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {filterStatus === 'all'
                      ? 'There are no appointments scheduled yet.'
                      : `There are no ${filterStatus} appointments.`}
                  </p>
                  <Button
                    onClick={() => router.push('/book-appointment')}
                    className="mt-6"
                  >
                    Book an Appointment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </SalonLayout>
  );
}
