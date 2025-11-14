'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import { useAuth } from '../../lib/auth';
import { getStaff, getStaffAvailability, updateStaffAvailability, deleteStaff } from '../../lib/db';

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
        const newTimers = {...prev};
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900">
        <Navbar />
        <div className="container mx-auto py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading staff data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 dark:from-gray-900 dark:to-purple-900">
      <Navbar />
      
      <main className="container mx-auto py-10 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Operator Management</h1>
          <button 
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
            onClick={() => router.push('/staff/new')}
          >
            Add New Operator
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-8 rounded-md">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-4 mb-8 rounded-md">
            <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
          </div>
        )}
        
        {/* Operator List */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Operator Cards */}
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Operators</h2>
                
                {staff.length > 0 ? (
                  <div className="space-y-3">
                    {staff.map((person) => (
                      <div 
                        key={person.id} 
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedStaffId === person.id 
                            ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700' 
                            : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
                        }`}
                        onClick={() => setSelectedStaffId(person.id)}
                      >
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-3">
                            <span className="text-lg font-medium text-purple-700 dark:text-purple-300">
                              {person.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-800 dark:text-white">{person.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{person.role}</p>
                          </div>
                          <div className="ml-auto">
                            {person.is_available ? (
                              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full">
                                Available
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs rounded-full">
                                Not Available
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">No operators found.</p>
                    <button 
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                      onClick={() => router.push('/staff/new')}
                    >
                      Add Operator
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Operator Availability Management */}
          <div className="md:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                  Operator Availability
                </h2>
                
                {selectedStaffId ? (
                  <>
                    <div className="mb-6">
                      <label className="block text-gray-700 dark:text-gray-300 mb-2">Date</label>
                      <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full md:w-1/3 p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    
                    <div className="mb-6">
                      <h3 className="text-md font-medium text-gray-800 dark:text-white mb-3">
                        Available Time Slots for {staff.find(s => s.id === selectedStaffId)?.name || 'Selected Operator'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Toggle the time slots to mark when the operator is available.
                      </p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {timeSlots.map((slot) => {
                          const isLocked = !slot.available && blockedTimers[slot.id];
                          return (
                            <button
                              key={slot.id}
                              className={`p-3 rounded-md text-center transition-colors ${
                                slot.available
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                              } ${isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
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
                                <span className="block mt-1">
                                  <svg className="animate-spin h-4 w-4 mx-auto text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={saveAvailability}
                        disabled={updating}
                      >
                        {updating ? 'Saving...' : 'Save Availability'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-600 dark:text-gray-400">
                      Select an operator to manage their availability.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Operator Details */}
            {selectedStaffId && staff && staff.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden mt-6">
                <div className="p-6">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                    Operator Details
                  </h2>
                  
                  {staff.find(s => s.id === selectedStaffId) && (
                    <>
                      <div className="grid grid-cols-1 gap-6">
                        <div>
                          <h3 className="text-md font-medium text-gray-800 dark:text-white mb-3">Contact Information</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                              <span className="text-gray-800 dark:text-white font-medium">{staff.find(s => s.id === selectedStaffId)?.phone || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-6 flex justify-end space-x-3">
                        <button 
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                          onClick={() => router.push(`/staff/${selectedStaffId}`)}
                        >
                          View Details
                        </button>
                        <button 
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                          onClick={() => router.push(`/staff/edit/${selectedStaffId}`)}
                        >
                          Edit Operator
                        </button>
                        <button 
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                          onClick={() => setShowDeleteModal(true)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Confirm Deletion</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Are you sure you want to delete {staff.find(s => s.id === selectedStaffId)?.name}? This action cannot be undone.
              </p>
              
              <div className="mb-4">
                <label className="block text-gray-700 dark:text-gray-300 mb-2">
                  Enter admin password to confirm
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter password"
                />
              </div>
              
              {deleteError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-sm text-red-700 dark:text-red-300">
                  {deleteError}
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
                  onClick={handleDelete}
                  disabled={deleteLoading || !deletePassword}
                >
                  {deleteLoading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
} 