'use client';

import { Plus, FolderKanban } from 'lucide-react';
import ServicesSection from '../components/ServicesSection';
import Link from 'next/link';
import SalonLayout from '../components/SalonLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Services() {
  return (
    <SalonLayout currentPage="Service">
      <main className="container mx-auto py-6 px-4">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Our Services</h1>
              <p className="text-muted-foreground">
                Explore our premium services and exclusive membership benefits
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/services/categories">
                <Button variant="outline" className="gap-2">
                  <FolderKanban className="h-4 w-4" />
                  Manage Categories
                </Button>
              </Link>
              <Link href="/services/create">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add New Service
                </Button>
              </Link>
            </div>
          </div>

          {/* Services Section */}
          <ServicesSection />

          {/* Membership CTA Card */}
          <Card>
            <CardHeader>
              <CardTitle>Book Your Service Today</CardTitle>
              <CardDescription>
                Become a member to unlock exclusive discounts and rewards on all our services.
                Our memberships start from just ₹2,000 with benefits worth much more!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Link href="/">
                  <Button>
                    View Membership Plans
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline">
                    Member Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </SalonLayout>
  );
}
