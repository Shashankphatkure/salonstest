'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CustomersList from '../components/CustomersList';
import SalonLayout from '../components/SalonLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Create a component that uses useSearchParams
function CustomerNotification() {
  const [showNotification, setShowNotification] = useState(false);
  const searchParams = useSearchParams();
  const updatedMembership = searchParams.get('updatedMembership');

  useEffect(() => {
    if (updatedMembership) {
      setShowNotification(true);
      // Auto-hide notification after 5 seconds
      const timer = setTimeout(() => setShowNotification(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [updatedMembership]);

  if (!showNotification) return null;

  return (
    <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-900/20">
      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
      <AlertDescription className="text-green-700 dark:text-green-300 flex items-center justify-between">
        <span>
          <strong>Success!</strong> Customer's membership has been updated.
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-green-700 hover:text-green-900 dark:text-green-300"
          onClick={() => setShowNotification(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export default function CustomersPage() {
  return (
    <SalonLayout currentPage="customers">
      <div className="container mx-auto px-4 py-6">
        {/* Wrap the component that uses useSearchParams in Suspense */}
        <Suspense fallback={<div className="mb-4 h-16"></div>}>
          <CustomerNotification />
        </Suspense>

        <Card>
          <CardHeader>
            <CardTitle>Customer Management</CardTitle>
            <CardDescription>
              View, add, and manage your salon customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CustomersList />
          </CardContent>
        </Card>
      </div>
    </SalonLayout>
  );
}
