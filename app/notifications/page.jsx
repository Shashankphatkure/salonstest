'use client';

import { useState, useEffect } from 'react';
import { Cake, Heart, Phone, Calendar, Info, Loader2 } from 'lucide-react';
import { getUpcomingBirthdays, getUpcomingAnniversaries } from '@/lib/db';
import SalonLayout from '../components/SalonLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function NotificationsPage() {
  const [birthdays, setBirthdays] = useState([]);
  const [anniversaries, setAnniversaries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [birthdayData, anniversaryData] = await Promise.all([
        getUpcomingBirthdays(),
        getUpcomingAnniversaries()
      ]);
      setBirthdays(birthdayData);
      setAnniversaries(anniversaryData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysFromNow = (dateString) => {
    const today = new Date();
    const eventDate = new Date(dateString);
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days`;
  };

  const NotificationCard = ({ customer, type }) => {
    const eventDate = type === 'birthdate' ? customer.nextBirthday : customer.nextAnniversary;
    const daysFromNow = getDaysFromNow(eventDate);
    const isToday = daysFromNow === 'Today';
    const isTomorrow = daysFromNow === 'Tomorrow';

    return (
      <Card className={`hover:shadow-md transition-shadow ${isToday ? 'border-primary' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className={`p-3 rounded-full ${type === 'birthdate' ? 'bg-pink-100 dark:bg-pink-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
                {type === 'birthdate' ? (
                  <Cake className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                ) : (
                  <Heart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base">
                  {customer.name}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" />
                  {customer.phone}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(eventDate)} • {daysFromNow}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={
                type === 'birthdate'
                  ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
              }>
                {type === 'birthdate' ? 'Birthday' : 'Anniversary'}
              </Badge>
              {isToday && (
                <Badge variant="default" className="text-xs">
                  Today!
                </Badge>
              )}
              {isTomorrow && (
                <Badge variant="secondary" className="text-xs">
                  Tomorrow
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <SalonLayout currentPage="Notifications">
        <div className="container mx-auto px-4 py-20 text-center">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading notifications...</p>
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout currentPage="Notifications">
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground mt-2">
              Upcoming customer birthdays and anniversaries in the next 7 days
            </p>
          </div>

          {/* Summary Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Quick Summary</AlertTitle>
            <AlertDescription>
              You have <strong>{birthdays.length} birthday{birthdays.length !== 1 ? 's' : ''}</strong> and{' '}
              <strong>{anniversaries.length} anniversar{anniversaries.length !== 1 ? 'ies' : 'y'}</strong> coming up in the next week.
              {(birthdays.length > 0 || anniversaries.length > 0) && (
                <span className="block mt-1">
                  Consider calling or sending a personal message to strengthen customer relationships!
                </span>
              )}
            </AlertDescription>
          </Alert>

          {/* Tabs */}
          <Tabs defaultValue="birthdays" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="birthdays" className="gap-2">
                <Cake className="h-4 w-4" />
                Birthdays ({birthdays.length})
              </TabsTrigger>
              <TabsTrigger value="anniversaries" className="gap-2">
                <Heart className="h-4 w-4" />
                Anniversaries ({anniversaries.length})
              </TabsTrigger>
            </TabsList>

            {/* Birthdays Tab */}
            <TabsContent value="birthdays" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cake className="h-5 w-5" />
                    Customer Birthdays (Next 7 Days)
                  </CardTitle>
                  <CardDescription>
                    Call or message these customers to wish them a happy birthday!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {birthdays.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🎂</div>
                      <h3 className="text-lg font-semibold mb-2">
                        No upcoming birthdays
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        No customer birthdays in the next 7 days.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {birthdays.map((customer) => (
                        <NotificationCard
                          key={customer.id}
                          customer={customer}
                          type="birthdate"
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Anniversaries Tab */}
            <TabsContent value="anniversaries" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Customer Anniversaries (Next 7 Days)
                  </CardTitle>
                  <CardDescription>
                    Call or message these customers to wish them a happy anniversary!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {anniversaries.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">💝</div>
                      <h3 className="text-lg font-semibold mb-2">
                        No upcoming anniversaries
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        No customer anniversaries in the next 7 days.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {anniversaries.map((customer) => (
                        <NotificationCard
                          key={customer.id}
                          customer={customer}
                          type="anniversary"
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </SalonLayout>
  );
}
