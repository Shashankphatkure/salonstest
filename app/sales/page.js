'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { useAuth } from '../../lib/auth';
import { getProducts, getCustomers, createCustomer, createOrder } from '../../lib/db';

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
  const handleCustomerTypeChange = (e) => {
    const isExisting = e.target.value === 'existing';
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900">
      <Navbar />
      
      <main className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 text-center">Create Sale</h1>
        
        {loading && !success ? (
          <div className="max-w-4xl mx-auto text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading products and customers...</p>
          </div>
        ) : success ? (
          <div className="max-w-xl mx-auto bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">Sale Created Successfully!</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Thank you for shopping at Hair & Care Unisex Salon. Your sale has been recorded.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setSuccess(false)} 
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Create Another Sale
              </button>
              <button 
                onClick={handlePrintInvoice} 
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Print Invoice
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Customer Section */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Customer Information</h2>
                
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-4">
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                )}
                
                {/* Customer Type Selection */}
                <div className="mb-4">
                  <div className="flex items-center space-x-6">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="customerType"
                        value="new"
                        checked={!isExistingCustomer}
                        onChange={handleCustomerTypeChange}
                        className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-300">New Customer</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="customerType"
                        value="existing"
                        checked={isExistingCustomer}
                        onChange={handleCustomerTypeChange}
                        className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-gray-700 dark:text-gray-300">Existing Customer</span>
                    </label>
                  </div>
                </div>
                
                {isExistingCustomer ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <label className="block text-gray-700 dark:text-gray-300 mb-1">Search Customer</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={customerSearchQuery}
                          onChange={(e) => {
                            setCustomerSearchQuery(e.target.value);
                            setShowCustomerSearch(true);
                          }}
                          onClick={() => setShowCustomerSearch(true)}
                          className="w-full p-2 pl-8 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Search by name or phone"
                        />
                        <svg
                          className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      
                      {/* Customer search results dropdown */}
                      {showCustomerSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 shadow-lg rounded-md max-h-60 overflow-y-auto">
                          {filteredCustomers.length > 0 ? (
                            filteredCustomers.map(customer => (
                              <div
                                key={customer.id}
                                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                                onClick={() => selectCustomer(customer)}
                              >
                                <div className="font-medium text-gray-800 dark:text-white">{customer.name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {customer.phone}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-2 text-gray-500 dark:text-gray-400">
                              No customers found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {selectedCustomer && (
                      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800">
                        <div className="font-medium text-gray-800 dark:text-white">{selectedCustomer.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedCustomer.phone}
                        </div>
                        {selectedCustomer.membership_type && (
                          <div className="mt-1">
                            <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
                              {selectedCustomer.membership_type}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 mb-1">Name</label>
                      <input 
                        type="text" 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Customer's full name"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                      <input 
                        type="tel" 
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Customer's phone number"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Products Section */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Select Products</h2>
                
                <div className="mb-3">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      className="w-full p-2 pl-8 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Search products..."
                    />
                    <svg 
                      className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" 
                      xmlns="http://www.w3.org/2000/svg" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(product => (
                      <div 
                        key={product.id}
                        className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedProducts.some(p => p.id === product.id)
                            ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => toggleProductSelection(product)}
                      >
                        <input 
                          type="checkbox"
                          checked={selectedProducts.some(p => p.id === product.id)}
                          onChange={() => {}}
                          className="h-4 w-4 text-purple-600 rounded border-gray-300 dark:border-gray-700 focus:ring-purple-500"
                        />
                        <div className="ml-3 flex-1">
                          <h4 className="font-medium text-gray-700 dark:text-gray-300">{product.title}</h4>
                          <div className="flex justify-end">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              ₹{parseFloat(product.price).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-gray-500 dark:text-gray-400">No products found matching your search.</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Selected Products Summary */}
            {selectedProducts.length > 0 && (
              <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Sale Summary</h2>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Product
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Price
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Total
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedProducts.map(product => {
                        const quantity = productQuantities[product.id] || 1;
                        const total = parseFloat(product.price) * quantity;
                        
                        return (
                          <tr key={product.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {product.title}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              ₹{parseFloat(product.price).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => updateProductQuantity(product.id, e.target.value)}
                                className="w-16 p-1 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              ₹{total.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                type="button"
                                onClick={() => removeProduct(product.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-50 dark:bg-gray-700">
                        <td colSpan="3" className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                          Total
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                          ₹{orderTotal.toLocaleString()}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <button 
                    type="submit" 
                    className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg disabled:opacity-50"
                    disabled={loading || selectedProducts.length === 0}
                  >
                    {loading ? 'Processing...' : 'Complete Sale'}
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </main>
    </div>
  );
} 