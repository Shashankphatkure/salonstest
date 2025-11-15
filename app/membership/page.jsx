'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Search, Check, Sparkles, Crown, Star, Zap } from 'lucide-react';
import SalonLayout from '../components/SalonLayout';
import PlanUpgrade from '../components/PlanUpgrade';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

// Create a component that uses useSearchParams
function MembershipContent() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customer');
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(customerId || '');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch customers from Supabase
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, membership_type');

        if (error) throw error;

        const mappedCustomers = data.map(customer => ({
          id: customer.id,
          name: customer.name,
          membershipType: customer.membership_type
        }));

        setCustomers(mappedCustomers);
        setFilteredCustomers(mappedCustomers);

      } catch (error) {
        console.error('Error fetching customers:', error);
        alert('Error loading customers. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Filter customers when search term changes
  useEffect(() => {
    const results = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(results);
  }, [searchTerm, customers]);

  const handleSelectPlan = async (planType) => {
    if (!selectedCustomer) {
      alert('Please select a customer first to assign membership');
      return;
    }

    try {
      // Update customer membership in Supabase
      const { error } = await supabase
        .from('customers')
        .update({
          membership_type: planType,
          updated_at: new Date()
        })
        .eq('id', selectedCustomer);

      if (error) throw error;

      // Calculate initial points based on the plan type
      let initialPoints = 0;

      if (planType === 'Non-Membership-10k') initialPoints = 13000;
      else if (planType === 'Non-Membership-20k') initialPoints = 27600;
      else if (planType === 'Non-Membership-30k') initialPoints = 40500;
      else if (planType === 'Non-Membership-50k') initialPoints = 75000;
      else if (planType === 'Silver') initialPoints = 4500;
      else if (planType === 'Silver Plus') initialPoints = 7500;
      else if (planType === 'Gold') initialPoints = 12500;

      // Add to memberships table
      const { error: membershipError } = await supabase
        .from('memberships')
        .insert({
          customer_id: selectedCustomer,
          membership_type: planType,
          start_date: new Date(),
          active: true,
          points_balance: initialPoints
        });

      if (membershipError) {
        console.error('Error adding membership history:', membershipError);
      }

      alert(`Assigned ${planType} membership to customer with ${initialPoints} initial points`);
      router.push(`/customers?updatedMembership=${selectedCustomer}`);

    } catch (error) {
      console.error('Error updating membership:', error);
      alert('Error updating membership. Please try again.');
    }
  };

  const membershipPlans = [
    {
      type: 'Non-Membership-10k',
      name: 'Non-Membership',
      price: '10,000',
      points: '13,000',
      validity: '6 months',
      discount: '30%',
      icon: Zap,
      color: 'bg-gray-100 dark:bg-gray-800',
      features: ['70% claimable at once', '13,000 points value', 'All services']
    },
    {
      type: 'Non-Membership-20k',
      name: 'Non-Membership',
      price: '20,000',
      points: '27,600',
      validity: '6 months',
      discount: '38%',
      icon: Zap,
      color: 'bg-gray-100 dark:bg-gray-800',
      features: ['70% claimable at once', '27,600 points value', 'All services']
    },
    {
      type: 'Non-Membership-30k',
      name: 'Non-Membership',
      price: '30,000',
      points: '40,500',
      validity: '6 months',
      discount: '35%',
      icon: Zap,
      color: 'bg-gray-100 dark:bg-gray-800',
      features: ['70% claimable at once', '40,500 points value', 'All services']
    },
    {
      type: 'Non-Membership-50k',
      name: 'Non-Membership',
      price: '50,000',
      points: '75,000',
      validity: '6 months',
      discount: '50%',
      icon: Zap,
      color: 'bg-gray-100 dark:bg-gray-800',
      features: ['70% claimable at once', '75,000 points value', 'All services']
    },
    {
      type: 'Silver',
      name: 'Silver',
      price: '3,000',
      points: '4,500',
      validity: '3 months',
      discount: '30%',
      icon: Star,
      color: 'bg-gray-200 dark:bg-gray-700',
      popular: false,
      features: ['3 months validity', '4,500 points', 'Up to 30% off']
    },
    {
      type: 'Silver Plus',
      name: 'Silver Plus',
      price: '5,000',
      points: '7,500',
      validity: '6 months',
      discount: '38%',
      icon: Sparkles,
      color: 'bg-purple-100 dark:bg-purple-900/30',
      popular: true,
      features: ['6 months validity', '7,500 points', 'Up to 38% off', 'Priority booking']
    },
    {
      type: 'Gold',
      name: 'Gold',
      price: '10,000',
      points: '12,500',
      validity: '12 months',
      discount: '50%',
      icon: Crown,
      color: 'bg-amber-100 dark:bg-amber-900/30',
      popular: false,
      features: ['12 months validity', '12,500 points', 'Up to 50% off', 'VIP treatment']
    }
  ];

  return (
    <>
      {isLoading ? (
        <div className="flex justify-center items-center h-24">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Membership Plans</h1>
            <p className="text-muted-foreground mt-2">
              Choose the perfect membership plan for exclusive benefits, discounts, and rewards
            </p>
          </div>

          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Assign Membership to Customer</CardTitle>
              <CardDescription>
                Select a customer before choosing a membership plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search Customers</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer">Select Customer</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger id="customer">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCustomers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} {customer.membershipType !== 'None' ? `(Current: ${customer.membershipType})` : '(Walk-in Customer)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {filteredCustomers.length === 0 && searchTerm !== '' && (
                  <p className="text-sm text-destructive">No customers found matching "{searchTerm}"</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Plan Migration Options */}
          {selectedCustomer && (
            <Card>
              <CardHeader>
                <CardTitle>Plan Migration Options</CardTitle>
                <CardDescription>
                  Upgrade or change the customer's membership plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PlanUpgrade customerId={selectedCustomer} />
              </CardContent>
            </Card>
          )}

          {/* Membership Plans Grid */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Available Plans</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {membershipPlans.map((plan) => {
                const Icon = plan.icon;
                return (
                  <Card key={plan.type} className={`${plan.color} relative overflow-hidden`}>
                    {plan.popular && (
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-primary">Popular</Badge>
                      </div>
                    )}
                    <CardHeader className="text-center">
                      <div className="mx-auto mb-4 p-3 rounded-full bg-white dark:bg-gray-800 w-fit">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle>{plan.name}</CardTitle>
                      <div className="mt-4">
                        <span className="text-4xl font-bold">₹{plan.price}</span>
                      </div>
                      <CardDescription className="mt-2">
                        {plan.points} points • {plan.validity}
                      </CardDescription>
                      <Badge variant="secondary" className="mt-2">
                        {plan.discount} discount
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full"
                        onClick={() => handleSelectPlan(plan.type)}
                        disabled={!selectedCustomer}
                      >
                        Select Plan
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function MembershipPage() {
  return (
    <SalonLayout currentPage="Membership">
      <main className="container mx-auto py-6 px-4">
        <Suspense fallback={
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        }>
          <MembershipContent />
        </Suspense>
      </main>
    </SalonLayout>
  );
}
