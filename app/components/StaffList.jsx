'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Link from 'next/link';

const StaffList = () => {
  const supabase = createClientComponentClient();
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [newStaff, setNewStaff] = useState({
    name: '',
    title: '',
    description: '',
    email: '',
    phone: '',
    specialties: ''
  });
  const [error, setError] = useState(null);
  const [deletePasswordPrompt, setDeletePasswordPrompt] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);

  // Generate time slots for the day (9 AM to 8 PM in 30-min intervals)
  useEffect(() => {
    const slots = [];
    for (let hour = 9; hour <= 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Skip 8:30 PM
        if (hour === 20 && minute === 30) continue;
        slots.push(`${hour}:${minute === 0 ? '00' : minute}`);
      }
    }
    setTimeSlots(slots);
  }, []);

  // Format time for display
  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes === '00' ? '00' : minutes} ${suffix}`;
  };

  // Fetch staff from Supabase
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .order('name');
          
        if (error) throw error;
        
        setStaff(data || []);
      } catch (error) {
        console.error('Error fetching operators:', error);
        setError('Failed to load operator data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStaff();
  }, []);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (selectedStaff) {
      setSelectedStaff({
        ...selectedStaff,
        [name]: value
      });
    } else {
      setNewStaff({
        ...newStaff,
        [name]: value
      });
    }
  };

  // Open modal for adding a new staff member
  const openAddModal = () => {
    setSelectedStaff(null);
    setNewStaff({
      name: '',
      title: '',
      description: '',
      email: '',
      phone: '',
      specialties: ''
    });
    setIsModalOpen(true);
  };

  // Open modal for editing an existing staff member
  const openEditModal = (staff) => {
    setSelectedStaff(staff);
    setIsModalOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (selectedStaff) {
        // Parse specialties into an array
        const specialtiesArray = selectedStaff.specialties && typeof selectedStaff.specialties === 'string'
          ? selectedStaff.specialties.split(',').map(s => s.trim())
          : selectedStaff.specialties || [];
        
        // Update existing staff member
        const { error } = await supabase
          .from('staff')
          .update({
            name: selectedStaff.name,
            title: selectedStaff.title,
            description: selectedStaff.description,
            email: selectedStaff.email,
            phone: selectedStaff.phone,
            specialties: specialtiesArray,
            updated_at: new Date()
          })
          .eq('id', selectedStaff.id);
          
        if (error) throw error;
        
      } else {
        // Parse specialties into an array
        const specialtiesArray = newStaff.specialties
          ? newStaff.specialties.split(',').map(s => s.trim())
          : [];
        
        // Add new staff member
        const { error } = await supabase
          .from('staff')
          .insert({
            name: newStaff.name,
            title: newStaff.title,
            description: newStaff.description,
            email: newStaff.email,
            phone: newStaff.phone,
            specialties: specialtiesArray
          });
          
        if (error) throw error;
      }
      
      // Refresh staff list
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      setStaff(data || []);
      setIsModalOpen(false);
      
    } catch (error) {
      console.error('Error saving operator:', error);
      setError('Error saving operator. Please try again.');
    }
  };

  // Initiate staff deletion with password check
  const initiateDelete = (staff) => {
    setStaffToDelete(staff);
    setDeletePassword('');
    setDeletePasswordPrompt(true);
  };

  // Handle staff deletion after password verification
  const handleDelete = async () => {
    // Admin password check (in a production app, this would be properly secured)
    const adminPassword = "salon123"; // This is just for demonstration - in a real app, use proper authentication
    
    if (deletePassword !== adminPassword) {
      setError('Incorrect password. Delete operation canceled.');
      setDeletePasswordPrompt(false);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffToDelete.id);
        
      if (error) throw error;
      
      // Remove from state
      setStaff(staff.filter(s => s.id !== staffToDelete.id));
      setDeletePasswordPrompt(false);
      setStaffToDelete(null);
      
    } catch (error) {
      console.error('Error deleting operator:', error);
      setError('Error deleting operator. Please try again.');
    }
  };

  // Format availability display
  const getAvailabilityDays = (availabilityData) => {
    if (!availabilityData || !Array.isArray(availabilityData) || availabilityData.length === 0) {
      return 'Schedule not set';
    }
    
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const availableDays = availabilityData.map(a => a.day.toLowerCase());
    
    return days
      .filter(day => availableDays.includes(day))
      .map(day => day.charAt(0).toUpperCase() + day.slice(1))
      .join(', ');
  };

  // Mock availability data (for demonstration)
  // In a real implementation, this would come from the database
  const getStaffAvailability = (staffId) => {
    // Mock data - in a real app, this would come from your database
    const mockAvailability = {
      1: [
        { time: '9:00', isAvailable: true },
        { time: '9:30', isAvailable: true },
        { time: '10:00', isAvailable: true },
        { time: '10:30', isAvailable: false },
        { time: '11:00', isAvailable: false },
        { time: '11:30', isAvailable: true },
        // Add more time slots as needed...
      ],
      2: [
        { time: '9:00', isAvailable: false },
        { time: '9:30', isAvailable: false },
        { time: '10:00', isAvailable: true },
        { time: '10:30', isAvailable: true },
        { time: '11:00', isAvailable: true },
        { time: '11:30', isAvailable: false },
        // Add more time slots as needed...
      ],
      // Add more staff as needed...
    };
    
    return mockAvailability[staffId] || timeSlots.map(time => ({ time, isAvailable: Math.random() > 0.5 }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {/* Add Operator Button */}
      <div className="flex justify-end">
        <button 
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg flex items-center gap-2"
          onClick={openAddModal}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Operator
        </button>
      </div>
      
      {/* Operator Availability Box Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden mb-8">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Operator Availability</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="py-3 px-4 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Operator Name</th>
                  {timeSlots.slice(0, 8).map((time, index) => (
                    <th key={index} className="py-3 px-2 text-center text-xs font-medium text-gray-700 dark:text-gray-300">
                      {formatTime(time)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {staff.map((staffMember) => {
                  const availability = getStaffAvailability(staffMember.id);
                  return (
                    <tr key={staffMember.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4 text-sm font-medium text-gray-800 dark:text-white">
                        {staffMember.name}
                      </td>
                      {timeSlots.slice(0, 8).map((time, index) => {
                        const slot = availability.find(a => a.time === time) || { isAvailable: false };
                        return (
                          <td key={index} className="py-3 px-2 text-center">
                            <div 
                              className={`h-6 w-6 mx-auto rounded-sm ${
                                slot.isAvailable 
                                  ? 'bg-green-500 dark:bg-green-600' 
                                  : 'bg-red-500 dark:bg-red-600'
                              }`}
                              title={`${staffMember.name} is ${slot.isAvailable ? 'available' : 'not available'} at ${formatTime(time)}`}
                            ></div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <Link href="/staff/schedule" className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">
              View full schedule →
            </Link>
          </div>
        </div>
      </div>
      
      {/* Operators Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {staff && staff.length > 0 ? (
          staff.map((staffMember) => (
            <div key={staffMember.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-transform hover:scale-105">
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{staffMember.name}</h3>
                <p className="text-purple-600 dark:text-purple-400 font-medium mb-3">{staffMember.title}</p>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  {staffMember.description || 'No description provided.'}
                </p>
                
                {staffMember.specialties && staffMember.specialties.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SPECIALTIES</h4>
                    <div className="flex flex-wrap gap-2">
                      {staffMember.specialties.map((specialty, index) => (
                        <span 
                          key={index} 
                          className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 text-xs rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">ACTIONS</h4>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(staffMember)}
                      className="px-3 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-sm rounded"
                    >
                      Edit
                    </button>
                    <Link
                      href={`/staff/${staffMember.id}`}
                      className="px-3 py-1 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 dark:text-green-300 text-sm rounded"
                    >
                      Schedule
                    </Link>
                    <button
                      onClick={() => initiateDelete(staffMember)}
                      className="px-3 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-300 text-sm rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-12 text-gray-500 dark:text-gray-400">
            No operators found. Add your first operator to get started.
          </div>
        )}
      </div>
      
      {/* Add/Edit Operator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {selectedStaff ? 'Edit Operator' : 'Add New Operator'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={selectedStaff ? selectedStaff.name : newStaff.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Title/Position *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={selectedStaff ? selectedStaff.title : newStaff.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g. Hair Stylist"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={selectedStaff ? selectedStaff.email : newStaff.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={selectedStaff ? selectedStaff.phone : newStaff.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Specialties (comma separated)
                  </label>
                  <input
                    type="text"
                    name="specialties"
                    value={selectedStaff 
                      ? (Array.isArray(selectedStaff.specialties) 
                          ? selectedStaff.specialties.join(', ') 
                          : selectedStaff.specialties || '')
                      : newStaff.specialties}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="e.g. Hair Coloring, Styling, Cuts"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={selectedStaff ? selectedStaff.description : newStaff.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter a description of this operator"
                  ></textarea>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg"
                >
                  {selectedStaff ? 'Update Operator' : 'Add Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Password Prompt */}
      {deletePasswordPrompt && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Confirm Operator Deletion
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete {staffToDelete?.name}? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Admin Password
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter admin password"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg"
                onClick={() => {
                  setDeletePasswordPrompt(false);
                  setStaffToDelete(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffList; 