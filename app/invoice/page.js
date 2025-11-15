'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SalonLayout from '../components/SalonLayout';
import { getAppointments, getCustomerById } from '../../lib/db';
import { useAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { FileText, Eye, Printer, Plus, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function InvoicePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/invoice');
      return;
    }

    async function fetchAppointments() {
      try {
        setLoading(true);
        console.log('🔍 Fetching appointments with pagination...');

        // Calculate offset for pagination
        const offset = (currentPage - 1) * itemsPerPage;

        // Get appointments with pagination and descending order
        const { data, error, count } = await supabase
          .from('appointments')
          .select(`
            *,
            customers!customer_id(*),
            staff!staff_id(*),
            services:appointment_services(
              service:services(*)
            )
          `, { count: 'exact' })
          .order('date', { ascending: false })
          .order('start_time', { ascending: false })
          .range(offset, offset + itemsPerPage - 1);

        if (error) throw error;

        const appointmentsData = data || [];
        setTotalCount(count || 0);
        setTotalPages(Math.ceil((count || 0) / itemsPerPage));

        console.log('✅ Appointments fetched:', appointmentsData.length);
        setAppointments(appointmentsData);

        // Transform appointments into invoices
        const processedInvoices = [];

        for (const appointment of appointmentsData) {
          let customerInfo = appointment.customers;

          if (!customerInfo && appointment.customer_id) {
            // If customer info is not already joined, fetch it
            try {
              customerInfo = await getCustomerById(appointment.customer_id);
            } catch (err) {
              console.error(`Error fetching customer ${appointment.customer_id}:`, err);
              customerInfo = { name: 'Unknown Customer' };
            }
          }

          // Calculate total price from services with membership discount
          let totalPrice = appointment.total_price || 0;
          if (appointment.services && appointment.services.length > 0) {
            let discountPercent = 0;
            const membershipType = customerInfo?.membership_type;

            if (membershipType) {
              // Set discount percentage based on membership type
              if (membershipType.includes('Gold')) {
                discountPercent = 50;
              } else if (membershipType.includes('Silver Plus')) {
                discountPercent = 38;
              } else if (membershipType.includes('Silver')) {
                discountPercent = 30;
              } else if (membershipType.includes('Non-Membership-10k')) {
                discountPercent = 30;
              } else if (membershipType.includes('Non-Membership-20k')) {
                discountPercent = 38;
              } else if (membershipType.includes('Non-Membership-30k')) {
                discountPercent = 35;
              } else if (membershipType.includes('Non-Membership-50k')) {
                discountPercent = 50;
              }
            }

            // Calculate total with discount
            totalPrice = appointment.services.reduce((total, service) => {
              const basePrice = service.price || (service.service && service.service.price) || 0;
              const discountedPrice = basePrice * (1 - (discountPercent / 100));
              return total + parseFloat(discountedPrice);
            }, 0);

            // Round to 2 decimal places
            totalPrice = Math.round(totalPrice * 100) / 100;
          }

          // Check if there's a transaction associated with this appointment
          let creditUsed = 0;
          const invoiceId = `INV-${appointment.id.substring(0, 6)}`;

          try {
            const { data: transactionData } = await supabase
              .from('transactions')
              .select('credit_used')
              .eq('invoice_id', appointment.id)
              .limit(1);

            if (transactionData && transactionData.length > 0) {
              creditUsed = transactionData[0].credit_used || 0;
            }
          } catch (err) {
            console.error(`Error fetching transaction for ${invoiceId}:`, err);
          }

          // Calculate final amount after credit
          const finalAmount = Math.max(0, totalPrice - creditUsed);

          processedInvoices.push({
            id: invoiceId,
            appointment_id: appointment.id,
            customer: customerInfo?.name || 'Unknown Customer',
            customer_id: appointment.customer_id,
            date: appointment.date,
            amount: totalPrice,
            creditUsed: creditUsed,
            finalAmount: finalAmount,
            membership: customerInfo?.membership_type,
            status: appointment.status === 'completed' ? 'Paid' : 'Pending',
            appointment: appointment,
            customerInfo: customerInfo
          });
        }

        setInvoices(processedInvoices);
        setFilteredInvoices(processedInvoices);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError('Failed to load appointments. Please try again.');
        setLoading(false);
      }
    }

    if (user) {
      fetchAppointments();
    }
  }, [user, authLoading, router, currentPage]);

  // Apply filter when statusFilter changes
  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredInvoices(invoices);
    } else {
      setFilteredInvoices(invoices.filter(invoice =>
        invoice.status.toLowerCase() === statusFilter.toLowerCase()
      ));
    }
  }, [statusFilter, invoices]);

  // Reset to first page only when filter changes (not when invoices change)
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes || '00'} ${suffix}`;
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handlePrintInvoice = (invoice) => {
    // Redirect to invoice create page with appointment ID
    router.push(`/invoice/create?appointment=${invoice.appointment_id}`);
  };

  if (authLoading || loading) {
    return (
      <SalonLayout currentPage="Invoices">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
          <p className="mt-4 text-muted-foreground">Loading invoices...</p>
        </div>
      </SalonLayout>
    );
  }

  if (error) {
    return (
      <SalonLayout currentPage="Invoices">
        <div className="container mx-auto py-20 text-center">
          <Card className="max-w-xl mx-auto">
            <CardContent className="pt-6">
              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Error</h2>
              <p>{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="mt-6"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout currentPage="Invoices">
      <main className="container mx-auto py-10 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-purple-600" />
              <h1 className="text-3xl font-bold">Invoices</h1>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Invoices</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={() => router.push('/book-appointment')}>
                <Plus className="mr-2 h-4 w-4" />
                Book New Appointment
              </Button>
            </div>
          </div>

          {filteredInvoices.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.id}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{invoice.customer || 'Unknown Customer'}</div>
                              <div className="text-sm text-muted-foreground">{invoice.customerInfo?.phone || ''}</div>
                              {invoice.membership && (
                                <Badge variant="secondary" className="mt-1 text-xs">
                                  {invoice.membership}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(invoice.date)}</TableCell>
                          <TableCell>
                            <div>
                              <div>₹{parseFloat(invoice.finalAmount).toLocaleString()}</div>
                              {invoice.creditUsed > 0 && (
                                <div className="text-xs text-teal-600 dark:text-teal-400">
                                  Credit: ₹{parseFloat(invoice.creditUsed).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={invoice.status === 'Paid' ? 'default' : 'secondary'}>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewInvoice(invoice)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePrintInvoice(invoice)}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </div>
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
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No invoices found</h3>
                <p className="text-muted-foreground mb-6">
                  {statusFilter === 'all'
                    ? 'There are no invoices generated yet.'
                    : `There are no ${statusFilter} invoices.`}
                </p>
                <Button onClick={() => router.push('/book-appointment')}>
                  Book an Appointment
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Invoice Modal */}
      <Dialog open={showInvoiceModal} onOpenChange={setShowInvoiceModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Invoice #{selectedInvoice?.id}</DialogTitle>
            <DialogDescription>Detailed invoice information</DialogDescription>
          </DialogHeader>

          {selectedInvoice && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Customer:</p>
                      <p className="font-medium">{selectedInvoice.customer}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date:</p>
                      <p className="font-medium">{formatDate(selectedInvoice.date)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status:</p>
                      <Badge variant={selectedInvoice.status === 'Paid' ? 'default' : 'secondary'}>
                        {selectedInvoice.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount:</p>
                      <p className="font-medium">₹{parseFloat(selectedInvoice.amount).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <h3 className="font-medium mb-3">Services</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.appointment.services && selectedInvoice.appointment.services.length > 0 ? (
                        selectedInvoice.appointment.services.map((service, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{service.service?.name || 'Service'}</TableCell>
                            <TableCell>₹{parseFloat(service.price || (service.service && service.service.price) || 0).toLocaleString()}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell>Salon Services</TableCell>
                          <TableCell>₹{parseFloat(selectedInvoice.amount).toLocaleString()}</TableCell>
                        </TableRow>
                      )}
                      <TableRow className="bg-muted/50">
                        <TableCell className="text-right font-medium">Total:</TableCell>
                        <TableCell className="font-medium">₹{parseFloat(selectedInvoice.amount).toLocaleString()}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowInvoiceModal(false)}>
                  Close
                </Button>
                <Button onClick={() => handlePrintInvoice(selectedInvoice)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Invoice
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </SalonLayout>
  );
}
