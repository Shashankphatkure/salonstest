'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Search, UserPlus, Eye, Edit, CreditCard, Trash2, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import CSVImportExport from './CSVImportExport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

const CustomersList = () => {
  const supabase = createClientComponentClient();
  // Customer state
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // State for modal and form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    birthdate: '',
    gender: '',
    address: '',
    membershipType: 'None',
    anniversary: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('joinDate');
  const [sortDirection, setSortDirection] = useState('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch customers from Supabase with pagination
  const fetchCustomers = async () => {
    try {
      setLoading(true);

      // Map frontend field names to database column names
      const columnMap = {
        'joinDate': 'join_date',
        'lastVisit': 'last_visit',
        'totalSpent': 'total_spent',
        'membershipType': 'membership_type'
      };

      const orderByColumn = columnMap[sortBy] || sortBy;
      const offset = (currentPage - 1) * itemsPerPage;

      // Get total count for pagination
      const { count } = await supabase
        .from('customers')
        .select('id', { count: 'exact', head: true });

      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));

      // Get paginated data
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order(orderByColumn, { ascending: sortDirection === 'asc' })
        .range(offset, offset + itemsPerPage - 1);

      if (error) throw error;

      setCustomers(data.map(customer => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        birthdate: customer.birthdate,
        gender: customer.gender,
        address: customer.address,
        joinDate: customer.join_date,
        lastVisit: customer.last_visit,
        membershipType: customer.membership_type,
        totalSpent: customer.total_spent,
        visits: customer.visits,
        anniversary: customer.anniversary
      })));
    } catch (error) {
      console.error('Error fetching customers:', error);
      alert('Error loading customers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load customers on component mount, sort change, and page change
  useEffect(() => {
    fetchCustomers();
  }, [sortBy, sortDirection, currentPage]);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (selectedCustomer) {
      setSelectedCustomer({
        ...selectedCustomer,
        [name]: value
      });
    } else {
      setNewCustomer({
        ...newCustomer,
        [name]: value
      });
    }
  };

  // Open modal for adding a new customer
  const openAddModal = () => {
    setSelectedCustomer(null);
    setNewCustomer({
      name: '',
      phone: '',
      birthdate: '',
      gender: '',
      address: '',
      membershipType: 'None',
      anniversary: ''
    });
    setIsModalOpen(true);
  };

  // Open modal for editing an existing customer
  const openEditModal = (customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  // Open modal for viewing customer details
  const openViewModal = (customer) => {
    setSelectedCustomer(customer);
    setIsViewModalOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (selectedCustomer) {
        // Update existing customer in Supabase
        const { error } = await supabase
          .from('customers')
          .update({
            name: selectedCustomer.name,
            phone: selectedCustomer.phone,
            birthdate: selectedCustomer.birthdate || null,
            gender: selectedCustomer.gender,
            address: selectedCustomer.address,
            anniversary: selectedCustomer.anniversary || null,
            updated_at: new Date()
          })
          .eq('id', selectedCustomer.id);

        if (error) throw error;
        setIsModalOpen(false);

      } else {
        // Add new customer to Supabase
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('customers')
          .insert({
            name: newCustomer.name,
            phone: newCustomer.phone,
            birthdate: newCustomer.birthdate || null,
            gender: newCustomer.gender,
            address: newCustomer.address,
            anniversary: newCustomer.anniversary || null,
            membership_type: newCustomer.membershipType || 'None',
            join_date: today,
            last_visit: today,
            total_spent: 0,
            visits: 0
          })
          .select();

        if (error) throw error;

        setIsModalOpen(false);

        // Ask if user wants to assign a membership if none is selected or default
        if ((newCustomer.membershipType === 'None' || !newCustomer.membershipType) && data && data[0]) {
          const goToMembership = window.confirm('Customer created successfully! Would you like to assign a membership plan now?');
          if (goToMembership) {
            window.location.href = `/membership?customer=${data[0].id}`;
            return;
          }
        }
      }

      // Refresh customer list
      fetchCustomers();

    } catch (error) {
      console.error('Error saving customer:', error);
      alert('Error saving customer. Please try again.');
    }
  };

  // Handle customer deletion
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        const { error } = await supabase
          .from('customers')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Refresh customer list
        fetchCustomers();

      } catch (error) {
        console.error('Error deleting customer:', error);
        alert('Error deleting customer. Please try again.');
      }
    }
  };

  // Handle CSV import
  const handleImportCustomers = async (importedData) => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Transform imported data to match database schema
      const customersToInsert = importedData.map(row => ({
        name: row.name || '',
        phone: row.phone || '',
        birthdate: row.birthdate || null,
        gender: row.gender || '',
        address: row.address || '',
        anniversary: row.anniversary || null,
        membership_type: row.membershipType || 'None',
        join_date: row.joinDate || today,
        last_visit: today,
        total_spent: parseFloat(row.totalSpent) || 0,
        visits: parseInt(row.visits) || 0
      }));

      // Insert customers in batches
      const { data, error } = await supabase
        .from('customers')
        .insert(customersToInsert)
        .select();

      if (error) throw error;

      // Refresh customer list
      await fetchCustomers();

      return true;
    } catch (error) {
      console.error('Error importing customers:', error);
      throw new Error('Failed to import customers: ' + error.message);
    }
  };

  // CSV column definitions
  const csvColumns = [
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'birthdate', label: 'Birth Date' },
    { key: 'gender', label: 'Gender' },
    { key: 'address', label: 'Address' },
    { key: 'anniversary', label: 'Anniversary' },
    { key: 'membershipType', label: 'Membership Type' },
    { key: 'joinDate', label: 'Join Date' },
    { key: 'totalSpent', label: 'Total Spent' },
    { key: 'visits', label: 'Visits' }
  ];

  // Sample data for CSV template
  const sampleCustomerData = [
    {
      name: 'John Doe',
      phone: '9876543210',
      birthdate: '1990-01-15',
      gender: 'Male',
      address: '123 Main St, City',
      anniversary: '2015-06-20',
      membershipType: 'Gold',
      joinDate: '2024-01-01',
      totalSpent: '15000',
      visits: '12'
    },
    {
      name: 'Jane Smith',
      phone: '9876543211',
      birthdate: '1985-05-22',
      gender: 'Female',
      address: '456 Oak Ave, Town',
      anniversary: '',
      membershipType: 'Silver',
      joinDate: '2024-02-15',
      totalSpent: '8500',
      visits: '8'
    }
  ];

  // Sort customers
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  // Apply search filter to current page data
  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery) ||
    customer.membershipType?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get membership badge variant
  const getMembershipBadge = (type) => {
    const variants = {
      'Gold': 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
      'Silver Plus': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      'Silver': 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      'Credit': 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-300',
      'None': 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400'
    };
    return variants[type] || variants['None'];
  };

  return (
    <div className="space-y-4">
      {/* Search and Add Customer */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            className="pl-10"
            placeholder="Search customers by name, phone, or membership..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={openAddModal} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* CSV Import/Export */}
      <Card className="p-4 bg-muted/50">
        <CSVImportExport
          data={customers}
          columns={csvColumns}
          onImport={handleImportCustomers}
          filename="customers"
          entityName="customers"
          sampleData={sampleCustomerData}
        />
      </Card>

      {/* Customers Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">
                  Name
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('membershipType')}>
                <div className="flex items-center gap-1">
                  Membership
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('joinDate')}>
                <div className="flex items-center gap-1">
                  Join Date
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('lastVisit')}>
                <div className="flex items-center gap-1">
                  Last Visit
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('totalSpent')}>
                <div className="flex items-center gap-1">
                  Total Spent
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Since {new Date(customer.joinDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{customer.phone}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getMembershipBadge(customer.membershipType)}>
                      {customer.membershipType || 'None'}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {customer.visits} visits
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(customer.joinDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(customer.lastVisit).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium">
                    ₹{customer.totalSpent.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openViewModal(customer)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(customer)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Link href={`/membership?customer=${customer.id}`}>
                        <Button variant="ghost" size="sm">
                          <CreditCard className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(customer.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No customers found. Try a different search term or add a new customer.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
            <span className="font-medium">{totalCount}</span> results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {(() => {
                const pages = [];
                const startPage = Math.max(1, currentPage - 2);
                const endPage = Math.min(totalPages, startPage + 4);

                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <Button
                      key={`page-${i}`}
                      variant={currentPage === i ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(i)}
                      className="w-8"
                    >
                      {i}
                    </Button>
                  );
                }
                return pages;
              })()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Customer Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
            </DialogTitle>
            <DialogDescription>
              {selectedCustomer ? 'Update customer information' : 'Fill in the details to create a new customer'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={selectedCustomer ? selectedCustomer.name : newCustomer.name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={selectedCustomer ? selectedCustomer.phone : newCustomer.phone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthdate">Birth Date</Label>
                <Input
                  id="birthdate"
                  name="birthdate"
                  type="date"
                  value={selectedCustomer ? selectedCustomer.birthdate : newCustomer.birthdate}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="anniversary">Anniversary Date</Label>
                <Input
                  id="anniversary"
                  name="anniversary"
                  type="date"
                  value={selectedCustomer ? selectedCustomer.anniversary : newCustomer.anniversary}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  name="gender"
                  value={selectedCustomer ? selectedCustomer.gender : newCustomer.gender}
                  onValueChange={(value) => handleInputChange({ target: { name: 'gender', value } })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!selectedCustomer && (
                <div className="space-y-2">
                  <Label htmlFor="membershipType">Membership</Label>
                  <Select
                    name="membershipType"
                    value={newCustomer.membershipType}
                    onValueChange={(value) => handleInputChange({ target: { name: 'membershipType', value } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select membership" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="None">No Membership</SelectItem>
                      <SelectItem value="Silver">Silver</SelectItem>
                      <SelectItem value="Silver Plus">Silver Plus</SelectItem>
                      <SelectItem value="Gold">Gold</SelectItem>
                      <SelectItem value="Credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={selectedCustomer ? selectedCustomer.address : newCustomer.address}
                  onChange={handleInputChange}
                  placeholder="Enter address"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {selectedCustomer ? 'Update Customer' : 'Add Customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Customer Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="sm:w-1/3">
                <div className="h-32 w-32 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center text-5xl font-medium mb-4">
                  {selectedCustomer.name.charAt(0)}
                </div>

                <Card className="p-4">
                  <h4 className="font-medium text-center mb-2">
                    {selectedCustomer.name}
                  </h4>

                  <div className="text-center mb-4">
                    <Badge className={getMembershipBadge(selectedCustomer.membershipType)}>
                      {selectedCustomer.membershipType || 'No Membership'}
                    </Badge>
                  </div>

                  <div className="text-sm space-y-2">
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Customer Since:</span>
                      <span className="font-medium">
                        {new Date(selectedCustomer.joinDate).toLocaleDateString()}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Total Visits:</span>
                      <span className="font-medium">
                        {selectedCustomer.visits}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Total Spent:</span>
                      <span className="font-medium">
                        ₹{selectedCustomer.totalSpent.toLocaleString()}
                      </span>
                    </p>
                  </div>
                </Card>
              </div>

              <div className="sm:w-2/3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                    <p className="text-base font-medium">{selectedCustomer.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Birth Date</p>
                    <p className="text-base font-medium">
                      {selectedCustomer.birthdate ? new Date(selectedCustomer.birthdate).toLocaleDateString() : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Anniversary</p>
                    <p className="text-base font-medium">
                      {selectedCustomer.anniversary ? new Date(selectedCustomer.anniversary).toLocaleDateString() : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gender</p>
                    <p className="text-base font-medium">{selectedCustomer.gender || 'Not provided'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="text-base font-medium">{selectedCustomer.address || 'Not provided'}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Last Visit</p>
                  <p className="text-base font-medium">
                    {new Date(selectedCustomer.lastVisit).toLocaleDateString()}
                  </p>
                </div>

                <div className="pt-4 flex flex-wrap gap-3">
                  <Button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      openEditModal(selectedCustomer);
                    }}
                  >
                    Edit Details
                  </Button>
                  <Link href={`/membership?customer=${selectedCustomer.id}`}>
                    <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>
                      Manage Membership
                    </Button>
                  </Link>
                  <Link href={`/credit?customer=${selectedCustomer.id}`}>
                    <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                      View Credits
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomersList;
