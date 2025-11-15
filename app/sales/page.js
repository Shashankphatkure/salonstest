'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SalonLayout from '../components/SalonLayout';
import { useAuth } from '../../lib/auth';
import { getProducts, getCustomers, createCustomer, createOrder } from '../../lib/db';
import { ShoppingCart, User, Package, Printer, CheckCircle, Search, X, Plus, Minus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SalesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productQuantities, setProductQuantities] = useState({});
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [orderTotal, setOrderTotal] = useState(0);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [orderResult, setOrderResult] = useState(null);

  // Fetch products and customers on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch products
        const productsData = await getProducts();
        setProducts(productsData);

        // Fetch customers
        const customersData = await getCustomers();
        setCustomers(customersData);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  // Update order total when products or quantities change
  useEffect(() => {
    let total = 0;
    selectedProducts.forEach(product => {
      const quantity = productQuantities[product.id] || 1;
      total += parseFloat(product.price) * quantity;
    });
    setOrderTotal(total);
  }, [selectedProducts, productQuantities]);

  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  // Filter customers based on search query
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    customer.phone.toLowerCase().includes(customerSearchQuery.toLowerCase())
  );

  // Select customer function
  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setShowCustomerSearch(false);
  };

  // Handle radio button change for customer type
  const handleCustomerTypeChange = (value) => {
    const isExisting = value === 'existing';
    setIsExistingCustomer(isExisting);
    if (!isExisting) {
      // Reset customer data when switching to new customer
      setSelectedCustomer(null);
      setCustomerName('');
      setCustomerPhone('');
    }
  };

  // Toggle product selection
  const toggleProductSelection = (product) => {
    if (selectedProducts.some(p => p.id === product.id)) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
      // Remove from quantities
      const newQuantities = { ...productQuantities };
      delete newQuantities[product.id];
      setProductQuantities(newQuantities);
    } else {
      setSelectedProducts([...selectedProducts, product]);
      // Set default quantity to 1
      setProductQuantities({ ...productQuantities, [product.id]: 1 });
    }
  };

  // Update product quantity
  const updateProductQuantity = (productId, quantity) => {
    if (quantity < 1) quantity = 1;
    setProductQuantities({ ...productQuantities, [productId]: parseInt(quantity) });
  };

  // Increment quantity
  const incrementQuantity = (productId) => {
    const currentQuantity = productQuantities[productId] || 1;
    updateProductQuantity(productId, currentQuantity + 1);
  };

  // Decrement quantity
  const decrementQuantity = (productId) => {
    const currentQuantity = productQuantities[productId] || 1;
    if (currentQuantity > 1) {
      updateProductQuantity(productId, currentQuantity - 1);
    }
  };

  // Remove product from selection
  const removeProduct = (productId) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
    const newQuantities = { ...productQuantities };
    delete newQuantities[productId];
    setProductQuantities(newQuantities);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedProducts.length === 0) {
      setError('Please select at least one product');
      return;
    }

    try {
      setLoading(true);

      // Handle customer data
      let customerId = null;
      let customerInfo = null;

      if (selectedCustomer) {
        // Use existing customer
        customerId = selectedCustomer.id;
        customerInfo = selectedCustomer;
      } else {
        // Create a new customer first
        try {
          const currentDate = new Date().toISOString().split('T')[0];
          const newCustomer = {
            name: customerName,
            phone: customerPhone,
            join_date: currentDate,
            last_visit: currentDate
          };

          const createdCustomer = await createCustomer(newCustomer);
          customerId = createdCustomer.id;
          customerInfo = createdCustomer;
        } catch (err) {
          console.error('Error creating customer:', err);
          setError('Failed to create customer. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Prepare order data
      const orderData = {
        customer_id: customerId,
        total_amount: orderTotal,
        status: 'completed'
      };

      // Prepare order items
      const orderItems = selectedProducts.map(product => ({
        product_id: product.id,
        quantity: productQuantities[product.id] || 1,
        price: parseFloat(product.price)
      }));

      // Create the order
      const order = await createOrder(orderData, orderItems);
      setOrderResult(order);
      setSuccess(true);

      // Reset form
      setSelectedProducts([]);
      setProductQuantities({});
      setSelectedCustomer(null);
      setCustomerName('');
      setCustomerPhone('');
      setIsExistingCustomer(false);

      setLoading(false);
    } catch (err) {
      console.error('Error creating sale:', err);
      setError('Failed to create sale. Please try again.');
      setLoading(false);
    }
  };

  // Handle printing invoice
  const handlePrintInvoice = () => {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Create a new window for the invoice
    const invoiceWindow = window.open('', '_blank');

    // Generate the invoice HTML
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sale Invoice - Hair & Care Unisex Salon</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #eaeaea;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          }
          .invoice-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .invoice-title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .invoice-details {
            margin-bottom: 30px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          table th, table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #eaeaea;
          }
          table th {
            background-color: #f8f8f8;
          }
          .total-row td {
            font-weight: bold;
            border-top: 2px solid #333;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          @media print {
            body {
              padding: 0;
            }
            .invoice-container {
              border: none;
              box-shadow: none;
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="invoice-header">
            <div>
              <div class="invoice-title">Hair & Care Unisex Salon</div>
              <div>Shop No 03, Ground floor, Govind Chintamani CHS</div>
              <div>Plot No.57/4, near Taluka Police Station, Nityanand Nagar</div>
              <div>HOC Colony, Panvel, Navi Mumbai, Maharashtra 410206</div>
              <div>Phone: +91 93722 17698</div>
            </div>
            <div>
              <div class="invoice-title">SALE INVOICE</div>
              <div>Date: ${formattedDate}</div>
              <div>Time: ${new Date().toLocaleTimeString()}</div>
              <div>Created: ${formattedDate}</div>
              <div>Invoice #: INV-S-${Math.floor(Math.random() * 10000)}</div>
            </div>
          </div>

          <div class="invoice-details">
            <div class="customer-details">
              <h3>BILL TO:</h3>
              <div>${orderResult?.customers?.name || 'Guest Customer'}</div>
              <div>${orderResult?.customers?.phone || ''}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit Price (₹)</th>
                <th>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${orderResult?.items?.map(item => `
                <tr>
                  <td>${item.product.title}</td>
                  <td>${item.quantity}</td>
                  <td>₹${parseFloat(item.price).toLocaleString()}</td>
                  <td>₹${(parseFloat(item.price) * item.quantity).toLocaleString()}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="3" style="text-align: right;">Total:</td>
                <td>₹${parseFloat(orderResult?.total_amount || 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            <p>Thank you for your business! We look forward to seeing you again.</p>
            ${orderResult?.customers?.membership_type ? `<p>Membership Plan: ${orderResult.customers.membership_type}</p>` : ''}
          </div>

          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print();" style="padding: 10px 20px; background: #512da8; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Print Invoice
            </button>
          </div>
        </div>
      </body>
      </html>
    `;

    // Write the HTML to the new window and print
    invoiceWindow.document.open();
    invoiceWindow.document.write(invoiceHtml);
    invoiceWindow.document.close();
  };

  return (
    <SalonLayout currentPage="Sales">
      <main className="container mx-auto py-10 px-4">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingCart className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Create Sale</h1>
        </div>

        {loading && !success ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-muted-foreground">Loading products and customers...</p>
          </div>
        ) : success ? (
          <Card className="max-w-xl mx-auto border-green-500 bg-green-50 dark:bg-green-900/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                <CardTitle className="text-green-700 dark:text-green-400">Sale Created Successfully!</CardTitle>
              </div>
              <CardDescription className="text-green-600 dark:text-green-300">
                Thank you for shopping. Your sale has been recorded.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button onClick={() => setSuccess(false)}>
                Create Another Sale
              </Button>
              <Button variant="outline" onClick={handlePrintInvoice}>
                <Printer className="mr-2 h-4 w-4" />
                Print Invoice
              </Button>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Customer Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-purple-600" />
                    <CardTitle>Customer Information</CardTitle>
                  </div>
                  <CardDescription>Select existing or add new customer</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Customer Type Selection */}
                  <RadioGroup
                    value={isExistingCustomer ? 'existing' : 'new'}
                    onValueChange={handleCustomerTypeChange}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="new" id="new" />
                      <Label htmlFor="new">New Customer</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="existing" id="existing" />
                      <Label htmlFor="existing">Existing Customer</Label>
                    </div>
                  </RadioGroup>

                  {isExistingCustomer ? (
                    <div className="space-y-4">
                      <div className="relative">
                        <Label>Search Customer</Label>
                        <div className="relative mt-1">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="text"
                            value={customerSearchQuery}
                            onChange={(e) => {
                              setCustomerSearchQuery(e.target.value);
                              setShowCustomerSearch(true);
                            }}
                            onClick={() => setShowCustomerSearch(true)}
                            className="pl-9"
                            placeholder="Search by name or phone"
                          />
                        </div>

                        {/* Customer search results dropdown */}
                        {showCustomerSearch && (
                          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                            {filteredCustomers.length > 0 ? (
                              filteredCustomers.map(customer => (
                                <div
                                  key={customer.id}
                                  className="px-4 py-2 hover:bg-accent cursor-pointer"
                                  onClick={() => selectCustomer(customer)}
                                >
                                  <div className="font-medium">{customer.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {customer.phone}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-muted-foreground">
                                No customers found
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {selectedCustomer && (
                        <Card className="bg-muted/50">
                          <CardContent className="pt-4">
                            <div className="font-medium">{selectedCustomer.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {selectedCustomer.phone}
                            </div>
                            {selectedCustomer.membership_type && (
                              <Badge variant="secondary" className="mt-2">
                                {selectedCustomer.membership_type}
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Customer's full name"
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="Customer's phone number"
                          required
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Products Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-purple-600" />
                    <CardTitle>Select Products</CardTitle>
                  </div>
                  <CardDescription>Choose products to include in sale</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="pl-9"
                      placeholder="Search products..."
                    />
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-lg">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(product => (
                        <div
                          key={product.id}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedProducts.some(p => p.id === product.id)
                              ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700'
                              : 'hover:bg-accent'
                          }`}
                          onClick={() => toggleProductSelection(product)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedProducts.some(p => p.id === product.id)}
                            onChange={() => {}}
                            className="h-4 w-4 rounded border-input"
                          />
                          <div className="ml-3 flex-1">
                            <h4 className="font-medium">{product.title}</h4>
                            <div className="flex justify-end">
                              <span className="text-sm font-medium">
                                ₹{parseFloat(product.price).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No products found
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Selected Products Summary */}
            {selectedProducts.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Sale Summary</CardTitle>
                  <CardDescription>Review order details before completing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedProducts.map(product => {
                          const quantity = productQuantities[product.id] || 1;
                          const total = parseFloat(product.price) * quantity;

                          return (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">
                                {product.title}
                              </TableCell>
                              <TableCell>
                                ₹{parseFloat(product.price).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => decrementQuantity(product.id)}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="w-12 text-center">{quantity}</span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => incrementQuantity(product.id)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>
                                ₹{total.toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeProduct(product.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-muted/50">
                          <TableCell colSpan={3} className="text-right font-bold">
                            Total
                          </TableCell>
                          <TableCell className="font-bold">
                            ₹{orderTotal.toLocaleString()}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button
                      type="submit"
                      disabled={loading || selectedProducts.length === 0}
                    >
                      {loading ? 'Processing...' : 'Complete Sale'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </form>
        )}
      </main>
    </SalonLayout>
  );
}
