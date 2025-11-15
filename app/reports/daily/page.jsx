'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import SalonLayout from '../../components/SalonLayout';
import DailyReport from '../../components/DailyReport';
import { Lock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function DailyReportPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState('');

  // Check if user has admin role
  useEffect(() => {
    if (!authLoading) {
      // For now, we'll use a simple password check
      // In production, this should be properly secured with role-based access
      setShowPasswordModal(true);
    }
  }, [authLoading]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();

    // Simple password check - in production, this should be more secure
    const adminPassword = "salon123";

    if (password === adminPassword) {
      setAuthorized(true);
      setShowPasswordModal(false);
      setError('');
    } else {
      setError('Incorrect password. Access denied.');
      setPassword('');
    }
  };

  // Show loading state
  if (authLoading) {
    return (
      <SalonLayout currentPage="Reports">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </SalonLayout>
    );
  }

  // Show password modal
  if (showPasswordModal) {
    return (
      <SalonLayout currentPage="Reports">
        <div className="container mx-auto py-20 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle>Admin Access Required</CardTitle>
              <CardDescription>
                Daily reports contain sensitive business information. Please enter the admin password to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password">Admin Password</Label>
                  <Input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/reports')}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Access Reports
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </SalonLayout>
    );
  }

  if (!authorized) {
    // This shouldn't happen but just in case
    router.push('/reports');
    return null;
  }

  return (
    <SalonLayout currentPage="Reports">
      <main className="container mx-auto py-10 px-4">
        <div className="mb-10">
          <h2 className="text-3xl font-bold">Daily Report</h2>
          <p className="text-muted-foreground">
            Comprehensive daily performance and analytics report for salon operations.
          </p>
        </div>

        <DailyReport />
      </main>
    </SalonLayout>
  );
}
