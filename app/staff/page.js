'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SalonLayout from '../components/SalonLayout';
import { useAuth } from '../../lib/auth';
import { getStaff, getStaffAvailability, updateStaffAvailability, deleteStaff } from '../../lib/db';
import { Users, Calendar, Loader2, Plus, Eye, Edit, Trash2, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function StaffPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [staff, setStaff] = useState([]);
  const [staffAvailability, setStaffAvailability] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStaffId, setSelectedStaffId] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [blockedTimers, setBlockedTimers] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Generate time slots from 9am to 11:30pm with 30-minute intervals
  useEffect(() => {
    const slots = [];
    for (let hour = 9; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Skip slots after 11:30 PM
        if (hour > 23 || (hour === 23 && minute > 30)) continue;

        const timeString = `${hour}:${minute === 0 ? '00' : minute}`;
        slots.push({
          id: `slot-${hour}-${minute}`,
          time: timeString,
          displayTime: formatTime(timeString),
          available: true,
        });
      }
    }
    setTimeSlots(slots);
  }, []);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/auth/login?redirect=/staff');
      return;
    }

    async function fetchStaffData() {
      try {
        setLoading(true);

        // Fetch staff members
        const staffData = await getStaff();
        setStaff(staffData || []);

        if (staffData && staffData.length > 0 && !selectedStaffId) {
          setSelectedStaffId(staffData[0].id);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching staff data:', err);
        setError('Failed to load staff data. Please try again.');
        setLoading(false);
      }
    }

    if (user) {
      fetchStaffData();
    }
  }, [user, authLoading, router, selectedStaffId]);

  // Fetch staff availability when date or selected staff changes
  useEffect(() => {
    async function fetchAvailability() {
      if (!selectedDate || !selectedStaffId) return;

      try {
        const availabilityData = await getStaffAvailability(selectedDate);

        // Filter availability for selected staff
        const staffAvail = availabilityData ? availabilityData.filter(a => a.staff_id === selectedStaffId) : [];

        // Create a map of time slots to availability
        const availabilityMap = {};

        staffAvail.forEach(a => {
          // Convert start_time and end_time to minutes for easier comparison
          const startParts = a.start_time.split(':');
          const endParts = a.end_time.split(':');

          const startHour = parseInt(startParts[0], 10);
          const startMinute = parseInt(startParts[1], 10);
          const endHour = parseInt(endParts[0], 10);
          const endMinute = parseInt(endParts[1], 10);

          const startTotalMinutes = startHour * 60 + startMinute;
          const endTotalMinutes = endHour * 60 + endMinute;

          // Mark all 30-minute slots that fall within this availability window
          for (let hour = 9; hour <= 23; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
              // Skip slots after 11:30 PM
              if (hour > 23 || (hour === 23 && minute > 30)) continue;

              const slotTotalMinutes = hour * 60 + minute;
              if (slotTotalMinutes >= startTotalMinutes && slotTotalMinutes < endTotalMinutes) {
                availabilityMap[`slot-${hour}-${minute}`] = a.is_available;
              }
            }
          }
        });

        // Update time slots with availability
        setTimeSlots(prevSlots =>
          prevSlots.map(slot => ({
            ...slot,
            available: availabilityMap[slot.id] !== undefined ? availabilityMap[slot.id] : true
          }))
        );

        setStaffAvailability(availabilityData || []);
      } catch (err) {
        console.error('Error fetching staff availability:', err);
        setError('Failed to load staff availability. Please try again.');
      }
    }

    fetchAvailability();
  }, [selectedDate, selectedStaffId]);

  // Format time for display
  function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const minute = minutes || '00';
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute} ${period}`;
  }

  // Toggle time slot availability with timer for blocked slots
  const toggleTimeSlot = (slotId) => {
    setTimeSlots(prevSlots =>
      prevSlots.map(slot => {
        if (slot.id === slotId) {
          // If slot is currently available, we can block it
          if (slot.available) {
            return { ...slot, available: false };
          }
          // If slot is blocked but has no active timer, check if we can unblock it
          else if (!blockedTimers[slotId]) {
            return { ...slot, available: true };
          }
          // If slot has an active timer, it cannot be unblocked
          return slot;
        }
        return slot;
      })
    );
  };

  // Start a timer when a slot is blocked
  const startBlockTimer = (slotId) => {
    // Set a 5-minute timer (300000 ms) for the blocked slot
    const timerId = setTimeout(() => {
      // Remove the timer after it expires
      setBlockedTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[slotId];
        return newTimers;
      });
    }, 300000); // 5 minutes

    // Store the timer ID
    setBlockedTimers(prev => ({
      ...prev,
      [slotId]: timerId
    }));
  };

  // Clear timers when component unmounts
  useEffect(() => {
    return () => {
      // Clean up all timers
      Object.values(blockedTimers).forEach(timerId => {
        clearTimeout(timerId);
      });
    };
  }, [blockedTimers]);

  // Save staff availability
  const saveAvailability = async () => {
    if (!selectedStaffId || !selectedDate) {
      setError('Please select a staff member and date');
      return;
    }

    try {
      setUpdating(true);
      setError(null);

      // Format time slots for API by grouping consecutive available slots
      const groupedSlots = [];
      let currentGroup = null;

      // Sort timeSlots by time
      const sortedSlots = [...timeSlots].sort((a, b) => {
        const [aHour, aMinute] = a.time.split(':').map(num => parseInt(num, 10));
        const [bHour, bMinute] = b.time.split(':').map(num => parseInt(num, 10));

        const aTotalMinutes = aHour * 60 + (aMinute || 0);
        const bTotalMinutes = bHour * 60 + (bMinute || 0);

        return aTotalMinutes - bTotalMinutes;
      });

      // Group consecutive slots with the same availability
      sortedSlots.forEach(slot => {
        const [hour, minute] = slot.time.split(':').map(num => parseInt(num, 10));
        const endHour = minute === 30 ? hour + 1 : hour;
        const endMinute = minute === 30 ? '00' : '30';

        if (!currentGroup || currentGroup.available !== slot.available) {
          // Start a new group
          if (currentGroup) {
            groupedSlots.push(currentGroup);
          }

          currentGroup = {
            start: slot.time,
            end: `${endHour}:${endMinute}`,
            available: slot.available
          };
        } else {
          // Extend the current group
          currentGroup.end = `${endHour}:${endMinute}`;
        }
      });

      // Add the last group
      if (currentGroup) {
        groupedSlots.push(currentGroup);
      }

      await updateStaffAvailability(selectedStaffId, selectedDate, groupedSlots);

      setSuccess('Staff availability updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating staff availability:', err);
      setError('Failed to update staff availability. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // Handle staff deletion
  const handleDelete = async () => {
    if (!selectedStaffId) {
      setDeleteError('No staff selected');
      return;
    }

    if (!deletePassword) {
      setDeleteError('Password is required for deletion');
      return;
    }

    try {
      setDeleteLoading(true);
      setDeleteError('');

      // Call the deleteStaff function with the staff ID and password
      await deleteStaff(selectedStaffId, deletePassword);

      // Update the local staff list
      setStaff(staff.filter(s => s.id !== selectedStaffId));
      setSelectedStaffId(null);
      setShowDeleteModal(false);
      setDeletePassword('');
      setSuccess('Staff member deleted successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting staff:', err);
      setDeleteError('Failed to delete staff. Please check your password and try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Cancel deletion modal
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletePassword('');
    setDeleteError('');
  };

  if (authLoading || loading) {
    return (
      <SalonLayout currentPage="Operator">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
          <p className="mt-4 text-muted-foreground">Loading staff data...</p>
        </div>
      </SalonLayout>
    );
  }

  return (
    <SalonLayout currentPage="Operator">
      <main className="container mx-auto py-10 px-4">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-purple-600" />
            <h1 className="text-3xl font-bold">Operator Management</h1>
          </div>
          <Button onClick={() => router.push('/staff/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Operator
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-8">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-8 border-green-500 bg-green-50 dark:bg-green-900/20">
            <AlertDescription className="text-green-700 dark:text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        {/* Operator List */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Operator Cards */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Operators</CardTitle>
              </CardHeader>
              <CardContent>
                {staff.length > 0 ? (
                  <div className="space-y-3">
                    {staff.map((person) => (
                      <div
                        key={person.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedStaffId === person.id
                            ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700'
                            : 'bg-muted/50 hover:bg-muted border border-transparent'
                        }`}
                        onClick={() => setSelectedStaffId(person.id)}
                      >
                        <div className="flex items-center">
                          <Avatar className="h-10 w-10 mr-3">
                            <AvatarFallback className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                              {person.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-medium">{person.name}</h3>
                            <p className="text-sm text-muted-foreground">{person.role}</p>
                          </div>
                          <Badge variant={person.is_available ? 'default' : 'destructive'}>
                            {person.is_available ? 'Available' : 'Not Available'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">No operators found.</p>
                    <Button onClick={() => router.push('/staff/new')} size="sm">
                      Add Operator
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Operator Availability Management */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Operator Availability
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedStaffId ? (
                  <>
                    <div className="mb-6">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full md:w-1/3 mt-1"
                      />
                    </div>

                    <div className="mb-6">
                      <h3 className="text-md font-medium mb-3">
                        Available Time Slots for {staff.find(s => s.id === selectedStaffId)?.name || 'Selected Operator'}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Toggle the time slots to mark when the operator is available.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {timeSlots.map((slot) => {
                          const isLocked = !slot.available && blockedTimers[slot.id];
                          return (
                            <Button
                              key={slot.id}
                              variant={slot.available ? 'default' : 'destructive'}
                              className={`h-auto flex-col py-3 ${isLocked ? 'cursor-not-allowed opacity-70' : ''}`}
                              onClick={() => {
                                // If slot is available, we can block it and start a timer
                                if (slot.available) {
                                  toggleTimeSlot(slot.id);
                                  startBlockTimer(slot.id);
                                }
                                // If slot is blocked but not locked, we can unblock it
                                else if (!isLocked) {
                                  toggleTimeSlot(slot.id);
                                }
                              }}
                            >
                              <span className="block text-sm font-medium">{slot.displayTime}</span>
                              <span className="block text-xs mt-1">
                                {slot.available
                                  ? 'Available'
                                  : isLocked
                                    ? 'Locked (5 min)'
                                    : 'Blocked'}
                              </span>
                              {isLocked && (
                                <Loader2 className="h-4 w-4 animate-spin mt-1" />
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={saveAvailability}
                        disabled={updating}
                      >
                        {updating ? 'Saving...' : 'Save Availability'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">
                      Select an operator to manage their availability.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Operator Details */}
            {selectedStaffId && staff && staff.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Operator Details</CardTitle>
                </CardHeader>
                <CardContent>
                  {staff.find(s => s.id === selectedStaffId) && (
                    <>
                      <div className="mb-6">
                        <h3 className="text-md font-medium mb-3">Contact Information</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Phone:</span>
                            <span className="font-medium">{staff.find(s => s.id === selectedStaffId)?.phone || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => router.push(`/staff/${selectedStaffId}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                        <Button
                          onClick={() => router.push(`/staff/edit/${selectedStaffId}`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Operator
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setShowDeleteModal(true)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete {staff.find(s => s.id === selectedStaffId)?.name}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="delete-password">Enter admin password to confirm</Label>
                <Input
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter password"
                  className="mt-1"
                />
              </div>

              {deleteError && (
                <Alert variant="destructive">
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={cancelDelete}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteLoading || !deletePassword}
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </SalonLayout>
  );
}
