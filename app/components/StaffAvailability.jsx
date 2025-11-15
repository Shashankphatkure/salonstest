'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { format } from 'date-fns';

export default function StaffAvailability({
  staff = [],
  staffAvailability = [],
  selectedDate,
  selectedStaff,
  setSelectedStaff,
  selectedTime,
  setSelectedTime,
  selectedDuration,
  setSelectedDuration,
  getAvailableTimeSlots,
  canFitDuration,
  formatTime,
  formatDuration,
  getEndTimeFromDuration
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availability, setAvailability] = useState({});
  const [statusMessage, setStatusMessage] = useState({ type: '', message: '' });
  const [weekDays, setWeekDays] = useState([]);
  const [showPerformanceReport, setShowPerformanceReport] = useState(false);
  const [selectedStaffForReport, setSelectedStaffForReport] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);
  const [reportPassword, setReportPassword] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

  const supabase = createClientComponentClient();

  // Load availability data (called only when needed)
  const loadAvailabilityData = useCallback(async () => {
    if (!selectedStaff) return;
    
    try {
      setIsLoadingAvailability(true);
      
      // Fetch availability for selected staff for the current week
      const startDate = format(weekDays[0], 'yyyy-MM-dd');
      const endDate = format(weekDays[6], 'yyyy-MM-dd');
      
      const { data: availData, error: availError } = await supabase
        .from('staff_availability')
        .select('*')
        .eq('staff_id', selectedStaff)
        .gte('date', startDate)
        .lte('date', endDate);
        
      if (availError) throw availError;
      
      // Process availability data
      const availabilityMap = { ...availability };
      
      if (!availabilityMap[selectedStaff]) {
        availabilityMap[selectedStaff] = {};
      }
      
      availData.forEach(item => {
        if (!availabilityMap[selectedStaff][item.date]) {
          availabilityMap[selectedStaff][item.date] = [];
        }
        
        availabilityMap[selectedStaff][item.date].push({
          id: item.id,
          start: item.start_time,
          end: item.end_time,
          isAvailable: item.is_available
        });
      });
      
      setAvailability(availabilityMap);
      
      // Auto-clear any old status messages
      setStatusMessage({ type: '', message: '' });
    } catch (error) {
      console.error('Error fetching availability data:', error);
      setStatusMessage({ 
        type: 'error', 
        message: 'Failed to load availability data. Please try again.' 
      });
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [selectedStaff, weekDays, availability, supabase]);

  // Handle opening performance report
  const openPerformanceReport = (staff) => {
    setSelectedStaffForReport(staff);
    setShowPasswordPrompt(true);
  };

  // Verify admin password and show report
  const verifyPasswordAndShowReport = () => {
    // In a real app, this would be properly secured
    const adminPassword = "salon123";
    
    if (reportPassword === adminPassword) {
      // Password correct, fetch and show report
      fetchPerformanceData(selectedStaffForReport);
      setShowPasswordPrompt(false);
      setShowPerformanceReport(true);
      setReportPassword("");
    } else {
      // Wrong password
      setStatusMessage({
        type: 'error',
        message: 'Incorrect password. Access denied.'
      });
      setShowPasswordPrompt(false);
    }
  };

  // Mock fetching performance data (in a real app, this would come from your database)
  const fetchPerformanceData = (staff) => {
    // Simulate API call with mock data
    setTimeout(() => {
      const mockData = {
        totalHoursWorked: Math.floor(Math.random() * 30) + 20, // 20-50 hours
        clientsHandled: Math.floor(Math.random() * 20) + 10, // 10-30 clients
        serviceValue: Math.floor(Math.random() * 20000) + 10000, // 10,000-30,000
        idleTime: Math.floor(Math.random() * 5) + 1, // 1-6 hours
        performancePercentage: Math.floor(Math.random() * 30) + 70, // 70-100%
        clients: [
          { name: "Rahul Sharma", service: "Haircut", value: 500 },
          { name: "Priya Patel", service: "Hair Coloring", value: 2500 },
          { name: "Amir Khan", service: "Styling", value: 800 },
          { name: "Deepa Mehta", service: "Facial", value: 1200 },
          { name: "Vikram Singh", service: "Spa Treatment", value: 3000 }
        ].slice(0, Math.floor(Math.random() * 3) + 3) // Random subset of clients
      };
      
      setPerformanceData(mockData);
    }, 500);
  };

  // Calculate percentage bar width
  const getBarWidth = (percentage) => {
    return `${Math.min(percentage, 100)}%`;
  };

  return (
    <div className="mt-4">
      {statusMessage.type && (
        <div className={`mb-4 p-4 rounded-lg ${
          statusMessage.type === 'error' 
            ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-l-4 border-red-500' 
            : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-l-4 border-green-500'
        }`}>
          {statusMessage.message}
        </div>
      )}
      
      {staff && staff.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map(person => {
            const isSelected = selectedStaff && selectedStaff.id === person.id;
            const availableSlots = staffAvailability.filter(slot => 
              slot.staff_id === person.id && 
              slot.date === selectedDate &&
              slot.is_available
            );
            
            return (
              <div 
                key={person.id}
                className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                  isSelected 
                    ? 'border-purple-400 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => {
                  console.log('Selecting operator:', person.name);
                  setSelectedStaff(person);
                  // Reset selected time when switching operator
                  setSelectedTime('');
                }}
              >
                <div className="flex items-center mb-4">
                  <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-3">
                    <span className="text-lg font-medium text-purple-700 dark:text-purple-300">
                      {person.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800 dark:text-white">{person.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{person.role || 'Operator'}</p>
                  </div>
                  <div className="ml-auto">
                    {availableSlots.length > 0 ? (
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
                
                {/* Time slot selection with duration */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Available Times:</h4>
                  {availableSlots.length > 0 ? (
                    <div>
                      {isSelected && selectedTime && (
                        <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Selected time: {formatTime(selectedTime)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTime('');
                                setSelectedDuration(1);
                              }}
                              className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Clear
                            </button>
                          </div>
                          
                          <div className="flex items-center">
                            <label className="text-sm text-gray-600 dark:text-gray-400 mr-2">Duration:</label>
                            <select
                              value={selectedDuration}
                              onChange={(e) => {
                                e.stopPropagation();
                                setSelectedDuration(parseInt(e.target.value, 10));
                              }}
                              className="py-1 px-2 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white mr-3"
                              disabled={!selectedTime}
                            >
                              {[...Array(12)].map((_, i) => {
                                const slots = i + 1;
                                return (
                                  <option 
                                    key={slots} 
                                    value={slots}
                                    disabled={!canFitDuration(selectedTime, getAvailableTimeSlots(), slots)}
                                  >
                                    {formatDuration(slots)}
                                  </option>
                                );
                              })}
                            </select>
                            
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {selectedTime && `${formatTime(selectedTime)} - ${formatTime(getEndTimeFromDuration(selectedTime, selectedDuration))}`}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2">
                        {isSelected && getAvailableTimeSlots().map((time, index) => (
                          <button 
                            key={index}
                            type="button"
                            className={`px-3 py-1 text-xs rounded-full border ${
                              selectedTime === time
                                ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300'
                                : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log('Selecting time slot:', time);
                              setSelectedTime(time);
                              setSelectedDuration(1); // Reset duration when changing time
                            }}
                          >
                            {formatTime(time)}
                          </button>
                        ))}
                        
                        {!isSelected && (
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              // Group slots by hour for cleaner display
                              const timeGroups = {};
                              availableSlots.forEach(s => {
                                const hour = parseInt(s.start_time.split(':')[0], 10);
                                if (!timeGroups[hour]) timeGroups[hour] = [];
                                timeGroups[hour].push(s);
                              });
                              
                              return Object.entries(timeGroups).map(([hour, slots]) => (
                                <div key={hour} className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300">
                                  {formatTime(`${hour}:00`)} - {slots.length} slot(s)
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No availability for selected date</p>
                  )}
                </div>
                
                {/* Performance Report Button */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openPerformanceReport(person);
                    }}
                    className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-full"
                  >
                    View Performance Report
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-400 text-center py-8">No operators available. Please check back later.</p>
      )}
      
      {/* Password prompt modal */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Admin Authentication Required
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please enter the admin password to view the performance report for 
              <span className="font-medium"> {selectedStaffForReport?.name}</span>.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Admin Password
              </label>
              <input
                type="password"
                value={reportPassword}
                onChange={(e) => setReportPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter admin password"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg"
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setSelectedStaffForReport(null);
                  setReportPassword("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
                onClick={verifyPasswordAndShowReport}
              >
                View Report
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Performance Report Modal */}
      {showPerformanceReport && performanceData && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Operator Performance: {selectedStaffForReport?.name}
              </h3>
              <button
                onClick={() => {
                  setShowPerformanceReport(false);
                  setSelectedStaffForReport(null);
                  setPerformanceData(null);
                }}
                className="text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">PERFORMANCE METRICS</h4>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Hours Worked</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{performanceData.totalHoursWorked} hrs</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full" style={{ width: getBarWidth(performanceData.totalHoursWorked * 2) }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Clients Handled</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{performanceData.clientsHandled}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div className="bg-green-600 dark:bg-green-500 h-2.5 rounded-full" style={{ width: getBarWidth(performanceData.clientsHandled * 3.3) }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Idle Time</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{performanceData.idleTime} hrs</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div className="bg-yellow-600 dark:bg-yellow-500 h-2.5 rounded-full" style={{ width: getBarWidth(performanceData.idleTime * 10) }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Service Value</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">₹{performanceData.serviceValue.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div className="bg-purple-600 dark:bg-purple-500 h-2.5 rounded-full" style={{ width: getBarWidth(performanceData.serviceValue / 300) }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Overall Performance</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{performanceData.performancePercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          performanceData.performancePercentage >= 85 ? 'bg-green-600 dark:bg-green-500' : 
                          performanceData.performancePercentage >= 70 ? 'bg-yellow-600 dark:bg-yellow-500' : 
                          'bg-red-600 dark:bg-red-500'
                        }`}
                        style={{ width: `${performanceData.performancePercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CLIENTS HANDLED</h4>
                
                <div className="space-y-3">
                  {performanceData.clients.map((client, index) => (
                    <div key={index} className="flex justify-between items-center p-2 border-b border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="font-medium text-gray-700 dark:text-gray-300">{client.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{client.service}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-700 dark:text-gray-300">₹{client.value.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SUMMARY</h4>
              <p className="text-gray-600 dark:text-gray-400">
                {selectedStaffForReport?.name} worked for a total of {performanceData.totalHoursWorked} hours, 
                handling {performanceData.clientsHandled} clients with a total service value of 
                ₹{performanceData.serviceValue.toLocaleString()}. 
                The overall performance is rated at {performanceData.performancePercentage}%.
              </p>
              
              <div className="mt-4">
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recommendations:</h5>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
                  {performanceData.idleTime > 4 && (
                    <li>Reduce idle time by optimizing scheduling</li>
                  )}
                  {performanceData.performancePercentage < 80 && (
                    <li>Provide additional training to improve service quality</li>
                  )}
                  {performanceData.serviceValue < 15000 && (
                    <li>Encourage upselling of premium services</li>
                  )}
                  {performanceData.clientsHandled < 15 && (
                    <li>Optimize service time to handle more clients</li>
                  )}
                </ul>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowPerformanceReport(false);
                  setSelectedStaffForReport(null);
                  setPerformanceData(null);
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 