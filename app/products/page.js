'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SalonLayout from '../components/SalonLayout';
import { useAuth } from '../../lib/auth';
import { deleteProduct, getProducts, createProduct, updateProduct } from '../../lib/db';
import CSVImportExport from '../components/CSVImportExport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, Trash2, Package, AlertTriangle } from 'lucide-react';

export default function Products() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editProductId, setEditProductId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    quantity: '',
    low_stock_threshold: '10'
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const productsData = await getProducts();
      setProducts(productsData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Please try again.');
      setLoading(false);
    }
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: ['price', 'quantity', 'low_stock_threshold'].includes(name)
        ? value.replace(/[^0-9.]/g, '')
        : value
    });
  };

  // Clear form data
  const clearForm = () => {
    setFormData({
      title: '',
      price: '',
      quantity: '',
      low_stock_threshold: '10'
    });
    setIsEditing(false);
    setEditProductId(null);
    setError(null);
  };

  // Edit product
  const handleEdit = (product) => {
    setIsEditing(true);
    setEditProductId(product.id);
    setFormData({
      title: product.title,
      price: product.price.toString(),
      quantity: (product.quantity || 0).toString(),
      low_stock_threshold: (product.low_stock_threshold || 10).toString()
    });
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.price) {
      setError('Please fill in title and price');
      return;
    }

    try {
      setLoading(true);

      const productData = {
        title: formData.title,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity) || 0,
        low_stock_threshold: parseInt(formData.low_stock_threshold) || 10
      };

      if (isEditing) {
        await updateProduct(editProductId, productData);
      } else {
        await createProduct(productData);
      }

      clearForm();
      await fetchProducts();

      setLoading(false);
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Failed to save product. Please try again.');
      setLoading(false);
    }
  };

  // Show delete confirmation modal
  const confirmDelete = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setProductToDelete(null);
    setDeletePassword('');
  };

  // Delete product
  const handleDelete = async () => {
    if (!deletePassword) {
      setError('Please enter admin password to delete');
      return;
    }

    try {
      setLoading(true);
      await deleteProduct(productToDelete.id, deletePassword);
      setShowDeleteModal(false);
      setProductToDelete(null);
      setDeletePassword('');
      await fetchProducts();
      setLoading(false);
    } catch (err) {
      console.error('Error deleting product:', err);
      setError('Failed to delete product. Please check your password and try again.');
      setLoading(false);
    }
  };

  // Handle CSV import
  const handleImportProducts = async (importedData) => {
    try {
      // Transform imported data to match database schema
      const productsToInsert = importedData.map(row => ({
        title: row.title || '',
        price: parseFloat(row.price) || 0,
        quantity: parseInt(row.quantity) || 0,
        low_stock_threshold: parseInt(row.low_stock_threshold) || 10
      }));

      // Insert products one by one
      for (const product of productsToInsert) {
        await createProduct(product);
      }

      // Refresh product list
      await fetchProducts();

      return true;
    } catch (error) {
      console.error('Error importing products:', error);
      throw new Error('Failed to import products: ' + error.message);
    }
  };

  // CSV column definitions
  const csvColumns = [
    { key: 'title', label: 'Title' },
    { key: 'price', label: 'Price' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'low_stock_threshold', label: 'Low Stock Threshold' }
  ];

  // Sample data for CSV template
  const sampleProductData = [
    {
      title: 'Hair Serum Premium',
      price: '1500',
      quantity: '50',
      low_stock_threshold: '10'
    },
    {
      title: 'Conditioning Treatment',
      price: '2500',
      quantity: '30',
      low_stock_threshold: '5'
    },
    {
      title: 'Hair Oil Organic',
      price: '800',
      quantity: '100',
      low_stock_threshold: '20'
    }
  ];

  // Check if product is low stock
  const isLowStock = (product) => {
    return product.quantity <= (product.low_stock_threshold || 10);
  };

  return (
    <SalonLayout currentPage="Products">
      <main className="container mx-auto py-10 px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Manage Products</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Add, edit, and manage your salon products with stock tracking</p>
        </div>

        {/* CSV Import/Export */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Import/Export Products</CardTitle>
            <CardDescription>Upload or download product data in CSV format</CardDescription>
          </CardHeader>
          <CardContent>
            <CSVImportExport
              data={products}
              columns={csvColumns}
              onImport={handleImportProducts}
              filename="products"
              entityName="products"
              sampleData={sampleProductData}
            />
          </CardContent>
        </Card>

        {loading && !products.length ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {/* Product Form */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</CardTitle>
                <CardDescription>
                  {isEditing ? 'Update product information' : 'Create a new product'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-4 rounded">
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Product Title *</Label>
                    <Input
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter product title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹) *</Label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-gray-500 dark:text-gray-400">₹</span>
                      <Input
                        id="price"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        className="pl-8"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Stock Quantity *</Label>
                    <div className="relative">
                      <Package className="absolute left-3 top-2.5 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        className="pl-10"
                        placeholder="0"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="low_stock_threshold">Low Stock Alert Threshold</Label>
                    <div className="relative">
                      <AlertTriangle className="absolute left-3 top-2.5 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <Input
                        id="low_stock_threshold"
                        name="low_stock_threshold"
                        type="number"
                        value={formData.low_stock_threshold}
                        onChange={handleInputChange}
                        className="pl-10"
                        placeholder="10"
                        min="0"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Alert when stock falls below this number
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'Saving...' : isEditing ? 'Update Product' : 'Add Product'}
                    </Button>

                    {isEditing && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={clearForm}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Product List */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Products ({products.length})</CardTitle>
                <CardDescription>Manage your product inventory</CardDescription>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No products found. Add a new product to get started.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.id} className={isLowStock(product) ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {product.title}
                                {isLowStock(product) && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                                    <AlertTriangle className="h-3 w-3" />
                                    Low Stock
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              ₹{product.price.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-medium ${isLowStock(product) ? 'text-red-600 dark:text-red-400' : ''}`}>
                                {product.quantity || 0}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                / {product.low_stock_threshold || 10}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(product)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => confirmDelete(product)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
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
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{productToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="deletePassword">Admin Password</Label>
            <Input
              id="deletePassword"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter admin password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SalonLayout>
  );
} 