'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Edit, Trash2, Calendar, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { getServices, deleteService } from '../../lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ServicesSection = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    try {
      setLoading(true);
      const servicesData = await getServices();
      setServices(servicesData);

      // Group services by category
      const groupedServices = servicesData.reduce((acc, service) => {
        const category = service.category || 'Other';
        if (!acc[category]) {
          acc[category] = {
            id: category,
            category: category,
            items: []
          };
        }

        acc[category].items.push({
          id: service.id,
          name: service.name,
          price: service.price || 0,
          description: service.description || '',
        });

        return acc;
      }, {});

      setCategories(Object.values(groupedServices));
      setError(null);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError('Failed to load services. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteClick = (service) => {
    setServiceToDelete(service);
    setShowDeleteModal(true);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!serviceToDelete) return;

    setDeleteLoading(true);
    try {
      await deleteService(serviceToDelete.id);
      setShowDeleteModal(false);
      setServiceToDelete(null);
      // Refetch services after deletion
      fetchServices();
    } catch (err) {
      console.error('Error deleting service:', err);
      setDeleteError('Failed to delete service. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading services...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No services available. Add a new service to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {categories.map((category) => (
            <Card key={category.id} className="overflow-hidden">
              <CardHeader className="bg-primary/10 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl">{category.category}</CardTitle>
                  <Link href="/services/categories">
                    <Button variant="ghost" size="sm" className="text-xs h-7">
                      Edit Category
                    </Button>
                  </Link>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="divide-y">
                  {category.items.map((service) => (
                    <div key={service.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-base mb-1">{service.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {service.description || 'No description available'}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-primary">₹{service.price}</div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            ₹{Math.round(service.price * 0.5)}-₹{Math.round(service.price * 0.8)} members
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex justify-end gap-2">
                        <Link href={`/services/edit/${service.id}`}>
                          <Button variant="secondary" size="sm" className="gap-1">
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(service)}
                          className="gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </Button>
                        <Button variant="default" size="sm" className="gap-1">
                          <Calendar className="h-3 w-3" />
                          Book Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Membership Benefits Info */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Membership Benefits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div>
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 mb-2">
                Gold Members
              </Badge>
              <p className="text-sm text-muted-foreground">
                Up to <span className="font-bold text-foreground">50% off</span> on services
              </p>
            </div>
            <div>
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 mb-2">
                Silver Plus
              </Badge>
              <p className="text-sm text-muted-foreground">
                Up to <span className="font-bold text-foreground">35% off</span> on services
              </p>
            </div>
            <div>
              <Badge className="bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300 mb-2">
                Silver
              </Badge>
              <p className="text-sm text-muted-foreground">
                Up to <span className="font-bold text-foreground">20% off</span> on services
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{serviceToDelete?.name}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={deleteLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ServicesSection;
