'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SalonLayout from '../components/SalonLayout';
import { getRepeatCustomers, getCustomerSpendingHistory } from '../../lib/db';
import { useAuth } from '../../lib/auth';
import { History, Users, TrendingUp, DollarSign, Loader2, Search as SearchIcon, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function ClientHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [repeatCustomers, setRepeatCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('totalSpending'); // totalSpending, visits, lastVisit

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/client-history');
      return;
    }

    if (user) {
      fetchRepeatCustomers();
    }
  }, [user, authLoading, router]);

  const fetchRepeatCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRepeatCustomers();
      setRepeatCustomers(data);
    } catch (err) {
      console.error('Error fetching repeat customers:', err);
      setError('Failed to load repeat customers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (customer) => {
    try {
      setSelectedCustomer(customer);
      setShowDetailsModal(true);

      // Fetch detailed spending history
      const details = await getCustomerSpendingHistory(customer.id);
      setCustomerDetails(details);
    } catch (err) {
      console.error('Error fetching customer details:', err);
      setError('Failed to load customer details.');
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedCustomer(null);
    setCustomerDetails(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes || '00'} ${suffix}`;
  };

  // Filter and sort customers first
  const filteredAndSortedCustomers = repeatCustomers
    .filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'visits':
          return b.totalAppointments - a.totalAppointments;
        case 'lastVisit':
          return new Date(b.lastVisit) - new Date(a.lastVisit);
        case 'totalSpending':
        default:
          return b.totalSpending - a.totalSpending;
      }
    });

  // Calculate pagination
  const totalFilteredCount = filteredAndSortedCustomers.length;
  const calculatedTotalPages = Math.ceil(totalFilteredCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredAndSortedCustomers.slice(startIndex, endIndex);

  // Update pagination state when filters change
  useEffect(() => {
    setTotalCount(totalFilteredCount);
    setTotalPages(calculatedTotalPages);

    // Reset to first page if current page is beyond available pages
    if (currentPage > calculatedTotalPages && calculatedTotalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredAndSortedCustomers.length, currentPage, calculatedTotalPages, totalFilteredCount]);

  // Reset to first page when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  if (authLoading || loading) {
    return (
      <SalonLayout currentPage="Client History">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
          <p className="mt-4 text-muted-foreground">Loading client history...</p>
        </div>
      </SalonLayout>
    );
  }

  if (error) {
    return (
      <SalonLayout currentPage="Client History">
        <div className="container mx-auto py-20 text-center">
          <Card className="max-w-xl mx-auto">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error</h2>
              <p>{error}</p>
              <Button onClick={fetchRepeatCustomers} className="mt-6">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout currentPage="Client History">
      <main className="container mx-auto py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex items-center gap-3">
              <History className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-3xl font-bold">Client History</h1>
                <p className="text-muted-foreground mt-1">
                  Customers who have visited multiple times and their spending history
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="totalSpending">Sort by Total Spending</SelectItem>
                  <SelectItem value="visits">Sort by Number of Visits</SelectItem>
                  <SelectItem value="lastVisit">Sort by Last Visit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Repeat Customers</CardDescription>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{repeatCustomers.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Total Revenue</CardDescription>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ₹{repeatCustomers.reduce((sum, customer) => sum + customer.totalSpending, 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardDescription>Average Spending</CardDescription>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ₹{repeatCustomers.length > 0
                    ? Math.round(repeatCustomers.reduce((sum, customer) => sum + customer.totalSpending, 0) / repeatCustomers.length)
                    : 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {paginatedCustomers.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Membership</TableHead>
                        <TableHead>Total Visits</TableHead>
                        <TableHead>Total Spending</TableHead>
                        <TableHead>Avg. Spending</TableHead>
                        <TableHead>Last Visit</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                  {customer.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{customer.name}</div>
                                <div className="text-sm text-muted-foreground">{customer.phone}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                customer.membership_type?.includes('Gold') ? 'default' :
                                customer.membership_type?.includes('Silver') ? 'secondary' :
                                'outline'
                              }
                            >
                              {customer.membership_type || 'Regular'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{customer.totalAppointments}</span>
                              <span className="text-sm text-muted-foreground">
                                ({customer.completedAppointments} completed)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            ₹{customer.totalSpending.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            ₹{customer.averageSpending.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {customer.lastVisit ? formatDate(customer.lastVisit) : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(customer)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                      <span className="font-medium">{totalCount}</span> results
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>

                      {/* Page numbers */}
                      {(() => {
                        const pages = [];
                        const startPage = Math.max(1, currentPage - 2);
                        const endPage = Math.min(totalPages, startPage + 4);

                        for (let i = startPage; i <= endPage; i++) {
                          pages.push(
                            <Button
                              key={`page-${i}`}
                              variant={currentPage === i ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCurrentPage(i)}
                            >
                              {i}
                            </Button>
                          );
                        }
                        return pages;
                      })()}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No repeat customers found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'No customers match your search criteria.' : 'No customers have made multiple visits yet.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Customer Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{selectedCustomer?.name}'s History</DialogTitle>
            <DialogDescription>
              {selectedCustomer?.phone} • {selectedCustomer?.email}
            </DialogDescription>
          </DialogHeader>

          {customerDetails ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Visits</h3>
                    <p className="text-2xl font-bold">{customerDetails.summary.totalAppointments}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Spending</h3>
                    <p className="text-2xl font-bold">₹{customerDetails.summary.totalSpending.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-sm font-medium text-muted-foreground">Average Spending</h3>
                    <p className="text-2xl font-bold">₹{customerDetails.summary.averageSpending.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-sm font-medium text-muted-foreground">Total Savings</h3>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ₹{customerDetails.summary.totalSavings.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Appointment History */}
              <div>
                <h3 className="text-lg font-medium mb-4">Appointment History</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Services</TableHead>
                        <TableHead>Staff</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerDetails.appointments.map((appointment, index) => (
                        <TableRow key={index}>
                          <TableCell>{formatDate(appointment.date)}</TableCell>
                          <TableCell className="text-muted-foreground">{formatTime(appointment.start_time)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {appointment.services?.map((service, idx) => (
                                <div key={idx} className="text-xs">
                                  {service.service?.name || 'Service'}
                                </div>
                              )) || 'No services listed'}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {appointment.staff?.name || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">₹{appointment.finalTotal.toLocaleString()}</div>
                              {appointment.savings > 0 && (
                                <div className="text-xs text-green-600 dark:text-green-400">
                                  Saved: ₹{appointment.savings.toFixed(0)}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                appointment.status === 'completed' ? 'default' :
                                appointment.status === 'pending' ? 'secondary' :
                                'destructive'
                              }
                            >
                              {appointment.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              <p className="mt-2 text-muted-foreground">Loading customer details...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SalonLayout>
  );
}
