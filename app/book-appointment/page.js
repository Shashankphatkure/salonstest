'use client';

import { useState, useEffect } from 'react';
import SalonLayout from '../components/SalonLayout';
import BookingStaffAvailability from '../components/BookingStaffAvailability';
import { useAuth } from '../../lib/auth';
import { useRouter } from 'next/navigation';
import { getServices, getStaff, getStaffAvailability, createAppointment, getCustomers, createCustomer, getBookedAppointments } from '../../lib/db';

export default function BookAppointment() {
  const { user } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [staffAvailability, setStaffAvailability] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(1); // Default 1 = 30 minutes (1 slot)
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [isExistingCustomer, setIsExistingCustomer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [appointmentTotal, setAppointmentTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [appointmentResults, setAppointmentResults] = useState([]);
  const [appointmentCustomer, setAppointmentCustomer] = useState(null);
  const [bookedAppointments, setBookedAppointments] = useState([]);

  // Fetch services and staff on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        console.log('📊 Fetching initial data from Supabase...');
        setLoading(true);
        
        console.log('🔍 Fetching services...');
        const servicesData = await getServices();
        console.log('✅ Services fetched:', servicesData.length);
        setServices(servicesData);
        
        console.log('🔍 Fetching staff...');
        const staffData = await getStaff();
        console.log('✅ Staff fetched:', staffData.length);
        setStaff(staffData);
        
        // Fetch customers list
        console.log('🔍 Fetching customers...');
        const customersData = await getCustomers();
        console.log('✅ Customers fetched:', customersData.length);
        setCustomers(customersData);
        
        console.log('📊 All data loaded successfully');
        setLoading(false);
      } catch (err) {
        console.error('❌ Error fetching data:', err);
        setError('Failed to load data. Please try again.');
        setLoading(false);
      }
    }
    
    fetchData();
    
    // Prefill user email if logged in
    if (user) {
      // Email prefill removed
    }
  }, [user]);

  // Fetch staff availability when date changes
  useEffect(() => {
    async function fetchAvailability() {
      try {
        if (selectedDate) {
          console.log(`🔍 Fetching staff availability for date: ${selectedDate}`);
          const availabilityData = await getStaffAvailability(selectedDate);
          console.log('✅ Staff availability fetched:', availabilityData.length);
          setStaffAvailability(availabilityData);
          
          // Also fetch booked appointments for this date
          console.log(`🔍 Fetching booked appointments for date: ${selectedDate}`);
          const bookedData = await getBookedAppointments(selectedDate);
          console.log('✅ Booked appointments fetched:', bookedData.length);
          setBookedAppointments(bookedData);
        }
      } catch (err) {
        console.error('❌ Error fetching staff availability:', err);
        setError('Failed to load staff availability. Please try again.');
      }
    }
    
    fetchAvailability();
  }, [selectedDate]);

  // Update appointment total when services change
  useEffect(() => {
    if (selectedServices.length > 0) {
      const total = selectedServices.reduce((sum, service) => sum + parseFloat(service.price), 0);
      setAppointmentTotal(total);
    } else {
      setAppointmentTotal(0);
    }
  }, [selectedServices]);

  // Select customer function
  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setShowCustomerSearch(false);
  };

  // Filter customers based on search query
  const filteredCustomers = customers.filter(customer => 
    customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    customer.phone.toLowerCase().includes(customerSearchQuery.toLowerCase())
  );

  // Handle customer type change for customer type
  const handleCustomerTypeChange = (e) => {
    const isExisting = e.target.value === 'existing';
    setIsExistingCustomer(isExisting);
    if (!isExisting) {
      // Reset customer data when switching to new customer
      setSelectedCustomer(null);
      setCustomerName('');
      setCustomerPhone('');
    }
  };

  // Handle date change with validation
  const handleDateChange = (e) => {
    const selectedDateValue = e.target.value;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selectedDateObj = new Date(selectedDateValue);
    selectedDateObj.setHours(0, 0, 0, 0);
    
    if (selectedDateObj < today) {
      // If selected date is in the past, set to today instead
      setSelectedDate(today.toISOString().split('T')[0]);
      setError('Cannot book appointments for past dates');
    } else {
      setSelectedDate(selectedDateValue);
      setError(null);
    }
    
    // Reset time selection when date changes
    setSelectedTime('');
  };

  // Handle service selection
  const toggleServiceSelection = (service) => {
    if (selectedServices.some(s => s.id === service.id)) {
      setSelectedServices(selectedServices.filter(s => s.id !== service.id));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
    
    // Reset time selection when services change as duration requirements may change
    setSelectedTime('');
    setSelectedDuration(1);
  };

  // Add service to pending appointments
  const addToPending = () => {
    if (selectedServices.length === 0) {
      setError('Please select at least one service');
      return;
    }
    
    if (!selectedStaff) {
      setError('Please select a staff member');
      return;
    }
    
    if (!selectedTime) {
      setError('Please select an appointment time');
      return;
    }
    
    const newPendingAppointment = {
      services: selectedServices,
      staff: selectedStaff,
      date: selectedDate,
      time: selectedTime,
      total: appointmentTotal
    };
    
    setPendingAppointments([...pendingAppointments, newPendingAppointment]);
    
    // Reset selections for next service
    setSelectedServices([]);
    setSelectedTime('');
    setError(null);
  };

  // Remove a pending appointment
  const removePendingAppointment = (index) => {
    const newPendingAppointments = [...pendingAppointments];
    newPendingAppointments.splice(index, 1);
    setPendingAppointments(newPendingAppointments);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (pendingAppointments.length === 0 && selectedServices.length === 0) {
      setError('Please select at least one service');
      return;
    }
    
    if (pendingAppointments.length === 0 && (!selectedStaff || !selectedTime)) {
      setError('Please select a staff member and appointment time');
      return;
    }
    
    // Check if a booked time slot was selected
    const availableSlots = getAvailableTimeSlots();
    const selectedTimeSlot = availableSlots.find(slot => 
      (typeof slot === 'string' ? slot : slot.time) === selectedTime
    );
    
    if (selectedTimeSlot && typeof selectedTimeSlot !== 'string' && selectedTimeSlot.booked) {
      setError('You cannot book an already booked time slot. Please select another time.');
      return;
    }
    
    // Validate appointment times
    const now = new Date();
    const today = new Date().toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Check if current selection is valid
    if (selectedServices.length > 0 && selectedStaff && selectedTime) {
      const [hour, minute] = selectedTime.split(':').map(num => parseInt(num, 10));
      
      if (selectedDate === today && 
          (hour < currentHour || (hour === currentHour && minute <= currentMinute))) {
        setError('Cannot book appointments for past times');
        return;
      }
    }
    
    // Check if any pending appointments are for past times
    for (const appointment of pendingAppointments) {
      const [hour, minute] = appointment.time.split(':').map(num => parseInt(num, 10));
      
      if (appointment.date === today && 
          (hour < currentHour || (hour === currentHour && minute <= currentMinute))) {
        setError('One or more appointments are scheduled for past times. Please remove them and try again.');
        return;
      }
    }
    
    try {
      console.log('🔄 Processing appointment booking...');
      setLoading(true);
      
      // Handle customer data
      let customerId = null;
      let customerInfo = null;
      
      if (selectedCustomer) {
        // Use existing customer
        customerId = selectedCustomer.id;
        customerInfo = selectedCustomer;
        console.log('👤 Using existing customer:', customerId);
      } else {
        // Create a new customer first
        try {
          console.log('👤 Creating new customer...');
          const currentDate = new Date().toISOString().split('T')[0];
          const newCustomer = {
            name: customerName,
            phone: customerPhone,
            join_date: currentDate,
            last_visit: currentDate
          };
          
          const createdCustomer = await createCustomer(newCustomer);
          customerId = createdCustomer.id;
          customerInfo = createdCustomer;
          console.log('✅ New customer created:', customerId);
        } catch (customerError) {
          console.error('❌ Error creating customer:', customerError);
          setError('Failed to create customer. Please try again.');
          setLoading(false);
          return;
        }
      }
      
      // Save customer for the invoice
      setAppointmentCustomer(customerInfo);
      
      // Create appointment objects
      const appointments = [];
      
      // Add current selection if it has all required fields
      if (selectedServices.length > 0 && selectedStaff && selectedTime) {
        // Calculate end time based on service duration and selected duration (30-min intervals)
        const [startHour, startMinute] = selectedTime.split(':').map(num => parseInt(num, 10));
        
        // Use either service duration or selected duration, whichever is longer
        const servicesDuration = selectedServices.reduce((total, service) => {
          return total + (service.duration_minutes || 30);
        }, 0);
        
        const selectedDurationMinutes = selectedDuration * 30;
        const effectiveDuration = Math.max(servicesDuration, selectedDurationMinutes);
        
        // Calculate end time in minutes
        const startTotalMinutes = (startHour * 60) + (startMinute || 0);
        const endTotalMinutes = startTotalMinutes + effectiveDuration;
        
        // Convert back to hours and minutes
        const endHour = Math.floor(endTotalMinutes / 60);
        const endMinute = endTotalMinutes % 60;
        const endTime = `${endHour}:${endMinute === 0 ? '00' : endMinute}`;
        
        appointments.push({
          customer_id: customerId,
          date: selectedDate,
          start_time: selectedTime,
          end_time: endTime,
          staff_id: selectedStaff.id,
          total_price: appointmentTotal,
          total_amount: appointmentTotal,
          status: 'pending',
          // Services will be handled separately after appointment creation
          _services: selectedServices.map(service => ({
            service_id: service.id,
            price: parseFloat(service.price),
            staff_id: selectedStaff.id
          }))
        });
      }
      
      // Add all pending appointments
      pendingAppointments.forEach(pending => {
        // Calculate end time based on service duration
        const [startHour, startMinute] = pending.time.split(':').map(num => parseInt(num, 10));
        const servicesDuration = pending.services.reduce((total, service) => {
          return total + (service.duration_minutes || 30);
        }, 0);
        
        // Calculate end time in minutes
        const startTotalMinutes = (startHour * 60) + (startMinute || 0);
        const endTotalMinutes = startTotalMinutes + servicesDuration;
        
        // Convert back to hours and minutes
        const endHour = Math.floor(endTotalMinutes / 60);
        const endMinute = endTotalMinutes % 60;
        const endTime = `${endHour}:${endMinute === 0 ? '00' : endMinute}`;
        
        appointments.push({
          customer_id: customerId,
          date: pending.date,
          start_time: pending.time,
          end_time: endTime,
          staff_id: pending.staff.id,
          total_price: pending.total,
          total_amount: pending.total,
          status: 'pending',
          // Services will be handled separately after appointment creation
          _services: pending.services.map(service => ({
            service_id: service.id,
            price: parseFloat(service.price),
            staff_id: pending.staff.id
          }))
        });
      });
      
      console.log('📝 Appointments to create:', appointments.length);
      
      // Create all appointments
      const createdAppointments = [];
      for (const appointment of appointments) {
        console.log('🔍 Creating appointment:', appointment);
        
        // Extract services to be inserted later
        const servicesToInsert = appointment._services || [];
        delete appointment._services;
        
        // Create the appointment
        const result = await createAppointment(appointment, servicesToInsert);
        console.log('✅ Appointment created successfully:', result);
        
        // Store the created appointment with its services for the invoice
        createdAppointments.push({
          ...result,
          services: servicesToInsert.map(service => {
            const fullService = services.find(s => s.id === service.service_id);
            return {
              ...service,
              name: fullService?.name || 'Service',
              duration_minutes: fullService?.duration_minutes || 30
            };
          }),
          staff: staff.find(s => s.id === result.staff_id) || { name: 'Staff' }
        });
      }
      
      // Save appointment results for the invoice
      setAppointmentResults(createdAppointments);
      
      console.log('🎉 All appointments created successfully');
      
      // Reset form and show success message
      setSelectedServices([]);
      setSelectedStaff(null);
      setSelectedTime('');
      setSelectedDuration(1);
      setPendingAppointments([]);
      setSuccess(true);
      setError(null);
    } catch (err) {
      console.error('❌ Error creating appointments:', err);
      setError('Failed to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Format time slots for display
  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes === '00' ? '00' : minutes} ${suffix}`;
  };

  // Generate available time slots for selected staff
  const getAvailableTimeSlots = () => {
    if (!selectedStaff) return [];
    
    console.log('🔍 Getting available time slots for staff:', selectedStaff.name);
    
    // First check if we have availability data from staff_availability table
    const staffSlots = staffAvailability.filter(slot => 
      slot.staff_id === selectedStaff.id && 
      slot.date === selectedDate &&
      slot.is_available !== false // Include slots unless explicitly marked as unavailable
    );
    
    console.log('Staff slots found:', staffSlots.length);
    
    // Check if the selected date is today or in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDateObj = new Date(selectedDate);
    selectedDateObj.setHours(0, 0, 0, 0);
    
    const isToday = selectedDateObj.getTime() === today.getTime();
    const isPastDay = selectedDateObj < today;
    
    // Don't allow booking for past days
    if (isPastDay) {
      return [];
    }
    
    // Get current time if it's today
    const currentHour = isToday ? new Date().getHours() : 0;
    const currentMinute = isToday ? new Date().getMinutes() : 0;
    
    // Filter for booked slots for this staff
    const bookedSlotsForStaff = bookedAppointments.filter(appointment => 
      appointment.staff_id === selectedStaff.id
    );
    
    // If no staff slots found, provide default time slots (9am-11:30pm)
    if (staffSlots.length === 0) {
      console.log('No staff availability records found, using default schedule');
      
      // Return all possible 30-minute slots from 9am to 11:30pm as default
      const defaultTimeSlots = [];
      for (let hour = 9; hour <= 23; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          // Skip slots after 11:30 PM
          if (hour > 23 || (hour === 23 && minute > 30)) continue;
          
          // Skip past time slots if it's today
          if (isToday && (hour < currentHour || (hour === currentHour && minute <= currentMinute))) {
            continue;
          }
          
          const timeString = `${hour}:${minute === 0 ? '00' : minute}`;
          
          // Check if this time slot overlaps with any booked appointments for this staff
          const isBooked = isTimeSlotBooked(timeString, bookedSlotsForStaff);
          
          // Add the slot with a "booked" flag if it's booked
          defaultTimeSlots.push({
            time: timeString,
            booked: isBooked
          });
        }
      }
      
      return defaultTimeSlots;
    }
    
    const timeSlots = [];
    
    // Generate time slots from 9am to 11:30pm in 30-minute intervals
    for (let hour = 9; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Skip slots after 11:30 PM
        if (hour > 23 || (hour === 23 && minute > 30)) continue;
        
        // Skip past time slots if it's today
        if (isToday && (hour < currentHour || (hour === currentHour && minute <= currentMinute))) {
          continue;
        }
        
        const timeString = `${hour}:${minute === 0 ? '00' : minute}`;
        
        // Check if this staff is available at this time according to their availability
        const isAvailable = staffSlots.some(slot => {
          // Parse time values into minutes for easier comparison
          const slotStartHour = parseInt(slot.start_time.split(':')[0], 10);
          const slotStartMinute = parseInt(slot.start_time.split(':')[1], 10);
          const slotEndHour = parseInt(slot.end_time.split(':')[0], 10);
          const slotEndMinute = parseInt(slot.end_time.split(':')[1], 10);
          
          const slotStartTime = slotStartHour * 60 + slotStartMinute;
          const slotEndTime = slotEndHour * 60 + slotEndMinute;
          const currentTime = hour * 60 + minute;
          
          return currentTime >= slotStartTime && currentTime < slotEndTime;
        });
        
        // Check if this time slot overlaps with any booked appointments for this staff
        const isBooked = isTimeSlotBooked(timeString, bookedSlotsForStaff);
        
        // Add the slot with availability and booking information
        if (isAvailable) {
          timeSlots.push({
            time: timeString,
            booked: isBooked
          });
        }
      }
    }
    
    // Sort the time slots chronologically
    timeSlots.sort((a, b) => {
      const [aHour, aMinute] = a.time.split(':').map(num => parseInt(num, 10));
      const [bHour, bMinute] = b.time.split(':').map(num => parseInt(num, 10));
      
      const aTotalMinutes = aHour * 60 + aMinute;
      const bTotalMinutes = bHour * 60 + bMinute;
      
      return aTotalMinutes - bTotalMinutes;
    });
    
    console.log('Time slots with availability:', timeSlots);
    return timeSlots;
  };

  // Handle time selection
  const handleTimeSelection = (time) => {
    const slot = getAvailableTimeSlots().find(slot => slot.time === time);
    if (!slot || slot.booked) {
      setError('This time slot is already booked');
      return;
    }
    
    setSelectedTime(time);
    setError(null);
  };

  // Check if a time slot can accommodate the selected duration
  const canFitDuration = (startTime, availableSlots, durationSlots) => {
    if (!startTime || durationSlots <= 0 || !availableSlots || availableSlots.length === 0) return false;
    
    // Find index of starting slot
    const startIndex = availableSlots.findIndex(slot => slot.time === startTime);
    if (startIndex === -1) return false;
    
    // Check if we have enough consecutive slots
    if (startIndex + durationSlots > availableSlots.length) return false;
    
    // Convert starting time to minutes
    const [startHour, startMinute] = startTime.split(':').map(num => parseInt(num, 10));
    const startTotalMinutes = (startHour * 60) + (startMinute || 0);
    
    // Calculate end time in minutes
    const endTotalMinutes = startTotalMinutes + (durationSlots * 30);
    
    // Check for conflicts with booked appointments
    // First check if any of the required slots are already booked
    for (let i = 0; i < durationSlots; i++) {
      if (startIndex + i >= availableSlots.length) return false;
      
      const slot = availableSlots[startIndex + i];
      if (slot.booked) return false;
    }
    
    // Check that each following slot is 30 minutes apart from the previous one
    for (let i = 1; i < durationSlots; i++) {
      const currentSlot = availableSlots[startIndex + i];
      const previousSlot = availableSlots[startIndex + i - 1];
      
      if (!currentSlot) return false;
      
      const [currentHour, currentMinute] = currentSlot.time.split(':').map(num => parseInt(num, 10));
      const [prevHour, prevMinute] = previousSlot.time.split(':').map(num => parseInt(num, 10));
      
      const currentTotalMinutes = (currentHour * 60) + (currentMinute || 0);
      const prevTotalMinutes = (prevHour * 60) + (prevMinute || 0);
      
      // Check if this slot is exactly 30 minutes after the previous one
      if (currentTotalMinutes !== prevTotalMinutes + 30) {
        return false;
      }
    }
    
    return true;
  };

  // Helper function to check if a time slot is already booked
  const isTimeSlotBooked = (timeString, bookedSlots) => {
    if (!bookedSlots || bookedSlots.length === 0) return false;
    
    // Convert the time string to minutes for easier comparison
    const [hour, minute] = timeString.split(':').map(num => parseInt(num, 10));
    const slotTimeInMinutes = hour * 60 + (minute || 0);
    
    // Duration of this slot - assuming 30 minutes
    const slotEndTimeInMinutes = slotTimeInMinutes + 30;
    
    // Check against all booked slots for this staff
    return bookedSlots.some(appointment => {
      const [startHour, startMinute] = appointment.start_time.split(':').map(num => parseInt(num, 10));
      const [endHour, endMinute] = appointment.end_time.split(':').map(num => parseInt(num, 10));
      
      const appointmentStartInMinutes = startHour * 60 + (startMinute || 0);
      const appointmentEndInMinutes = endHour * 60 + (endMinute || 0);
      
      // Check if the time slots overlap
      // A slot is booked if it starts during another appointment or if it ends during another appointment
      return (slotTimeInMinutes >= appointmentStartInMinutes && slotTimeInMinutes < appointmentEndInMinutes) || 
             (slotEndTimeInMinutes > appointmentStartInMinutes && slotEndTimeInMinutes <= appointmentEndInMinutes) ||
             (slotTimeInMinutes <= appointmentStartInMinutes && slotEndTimeInMinutes >= appointmentEndInMinutes);
    });
  };

  // Calculate total for all appointments
  const calculateTotal = () => {
    let total = appointmentTotal;
    
    pendingAppointments.forEach(appointment => {
      total += appointment.total;
    });
    
    return total;
  };

  // Filter services based on search query
  const filteredServices = services.filter(service => 
    service.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle print invoice
  const handlePrintInvoice = () => {
    // Open a new window for the invoice
    const invoiceWindow = window.open('', '_blank');
    
    if (!invoiceWindow) {
      alert('Please allow popups to print the invoice');
      return;
    }
    
    // Format the current date
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Calculate the invoice total
    const invoiceTotal = appointmentResults.reduce((total, appointment) => {
      return total + (appointment.total_price || 0);
    }, 0);
    
    // Generate invoice HTML
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Appointment Invoice</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #eee;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
          }
          .invoice-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
          }
          .invoice-title {
            font-size: 28px;
            color: #512da8;
          }
          .invoice-details {
            margin-bottom: 30px;
          }
          .customer-details, .salon-details {
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #eee;
          }
          th {
            background-color: #f8f8f8;
          }
          .total-row {
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #777;
            font-size: 12px;
          }
          @media print {
            body {
              padding: 0;
            }
            .invoice-container {
              box-shadow: none;
              border: none;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="invoice-header">
            <div>
              <div class="invoice-title">Hair & Care Unisex Salon</div>
              <div>Shop No 03, Ground floor, Govind Chintamani CHS</div>
              <div>Plot No.57/4, near Taluka Police Station, Nityanand Nagar</div>
              <div>HOC Colony, Panvel, Navi Mumbai, Maharashtra 410206</div>
              <div>Phone: +91 93722 17698</div>
            </div>
            <div>
              <div class="invoice-title">INVOICE</div>
              <div>Date: ${formattedDate}</div>
              <div>Time: ${new Date().toLocaleTimeString()}</div>
              <div>Created: ${formattedDate} </div>
              <div>Invoice #: INV-${Math.floor(Math.random() * 10000)}</div>
            </div>
          </div>
          
          <div class="invoice-details">
            <div class="customer-details">
              <h3>BILL TO:</h3>
              <div>${appointmentCustomer?.name || 'Guest Customer'}</div>
              <div>${appointmentCustomer?.phone || ''}</div>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>Staff</th>
                <th>Date</th>
                <th>Time</th>
                <th>Price (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${appointmentResults.map(appointment => {
                return appointment.services.map(service => `
                  <tr>
                    <td>${service.name}</td>
                    <td>${appointment.staff?.name || 'Staff'}</td>
                    <td>${new Date(appointment.date).toLocaleDateString()}</td>
                    <td>${formatTime(appointment.start_time)} - ${formatTime(appointment.end_time)}</td>
                    <td>₹${service.price.toLocaleString()}</td>
                  </tr>
                `).join('');
              }).join('')}
              <tr class="total-row">
                <td colspan="4" style="text-align: right;">Total:</td>
                <td>₹${invoiceTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="footer">
            <p>Thank you for your business! We look forward to seeing you again.</p>
            ${appointmentCustomer?.membership_type ? `<p>Membership Plan: ${appointmentCustomer.membership_type}</p>` : ''}
          </div>
          
          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print();" style="padding: 10px 20px; background: #512da8; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Print Invoice
            </button>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Write the HTML to the new window and print
    invoiceWindow.document.open();
    invoiceWindow.document.write(invoiceHtml);
    invoiceWindow.document.close();
  };

  // Calculate total duration based on selected time slots
  const calculateSessionDuration = (numSlots) => {
    return numSlots * 30; // Each slot is 30 minutes
  };

  // Get end time based on start time and duration slots
  const getEndTimeFromDuration = (startTime, durationSlots) => {
    if (!startTime) return '';
    
    const [startHour, startMinute] = startTime.split(':').map(num => parseInt(num, 10));
    const startTotalMinutes = (startHour * 60) + (startMinute || 0);
    const endTotalMinutes = startTotalMinutes + (durationSlots * 30);
    
    const endHour = Math.floor(endTotalMinutes / 60);
    const endMinute = endTotalMinutes % 60;
    
    return `${endHour}:${endMinute === 0 ? '00' : endMinute}`;
  };

  // Format duration for display
  const formatDuration = (slots) => {
    const minutes = slots * 30;
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`;
  };

  // Check if two slots are consecutive
  const areConsecutiveSlots = (slot1, slot2) => {
    const [hour1, minute1] = slot1.time.split(':').map(num => parseInt(num, 10));
    const [hour2, minute2] = slot2.time.split(':').map(num => parseInt(num, 10));
    
    const totalMinutes1 = hour1 * 60 + (minute1 || 0);
    const totalMinutes2 = hour2 * 60 + (minute2 || 0);
    
    return totalMinutes2 - totalMinutes1 === 30;
  };

  return (
    <SalonLayout currentPage="Book An Appointment">
      <main className="container mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 text-center">Book an Appointment</h1>
        
        {loading && !success ? (
          <div className="max-w-4xl mx-auto text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading services and availability...</p>
          </div>
        ) : success ? (
          <div className="max-w-xl mx-auto bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-6 rounded-lg">
            <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-2">Appointment Booked Successfully!</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Thank you for booking with Hair & Care Unisex Salon. Your appointment(s) have been confirmed.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setSuccess(false)} 
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Book Another Appointment
              </button>
              
            </div>
          </div>
        ) : (
          <>
            {/* BLOCK 1: Booking Form */}
            <div className="mb-12 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Book Your Appointment</h2>
              
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 mb-4">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Customer Information */}
                  <div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Customer Information</h3>
                    
                    {/* Customer Type Selection */}
                    <div className="mb-4">
                      <div className="flex items-center space-x-6">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="customerType"
                            value="new"
                            checked={!isExistingCustomer}
                            onChange={handleCustomerTypeChange}
                            className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                          />
                          <span className="ml-2 text-gray-700 dark:text-gray-300">New Customer</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="customerType"
                            value="existing"
                            checked={isExistingCustomer}
                            onChange={handleCustomerTypeChange}
                            className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                          />
                          <span className="ml-2 text-gray-700 dark:text-gray-300">Existing Customer</span>
                        </label>
                      </div>
                    </div>
                    
                    {isExistingCustomer ? (
                      <div className="space-y-4">
                        <div className="relative">
                          <label className="block text-gray-700 dark:text-gray-300 mb-1">Search Customer</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={customerSearchQuery}
                              onChange={(e) => {
                                setCustomerSearchQuery(e.target.value);
                                setShowCustomerSearch(true);
                              }}
                              onClick={() => setShowCustomerSearch(true)}
                              className="w-full p-2 pl-8 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="Search by name, phone or email"
                            />
                            <svg
                              className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </div>
                          
                          {/* Customer search results dropdown */}
                          {showCustomerSearch && (
                            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 shadow-lg rounded-md max-h-60 overflow-y-auto">
                              {filteredCustomers.length > 0 ? (
                                filteredCustomers.map(customer => (
                                  <div
                                    key={customer.id}
                                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                                    onClick={() => selectCustomer(customer)}
                                  >
                                    <div className="font-medium text-gray-800 dark:text-white">{customer.name}</div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {customer.phone}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="px-4 py-2 text-gray-500 dark:text-gray-400">
                                  No customers found
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {selectedCustomer && (
                          <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800">
                            <div className="font-medium text-gray-800 dark:text-white">{selectedCustomer.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {selectedCustomer.phone}
                            </div>
                            {selectedCustomer.membership_type && (
                              <div className="mt-1">
                                <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
                                  {selectedCustomer.membership_type}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-gray-700 dark:text-gray-300 mb-1">Name</label>
                          <input 
                            type="text" 
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Your full name"
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                          <input 
                            type="tel" 
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Your phone number"
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Date and Service Selection */}
                  <div>
                    <div className="mb-4">
                      <label className="block text-gray-700 dark:text-gray-300 mb-1">Date</label>
                      <input 
                        type="date" 
                        value={selectedDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={handleDateChange}
                        className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Select Services</h3>
                    
                    <div className="mb-3">
                      <div className="relative">
                        <input 
                          type="text" 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full p-2 pl-8 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Search services..."
                        />
                        <svg 
                          className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" 
                          xmlns="http://www.w3.org/2000/svg" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
                      {filteredServices.length > 0 ? (
                        filteredServices.map(service => (
                          <div 
                            key={service.id}
                            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                              selectedServices.some(s => s.id === service.id)
                                ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                            onClick={() => toggleServiceSelection(service)}
                          >
                            <input 
                              type="checkbox"
                              checked={selectedServices.some(s => s.id === service.id)}
                              onChange={() => {}}
                              className="h-4 w-4 text-purple-600 rounded border-gray-300 dark:border-gray-700 focus:ring-purple-500"
                            />
                            <div className="ml-3 flex-1">
                              <h4 className="font-medium text-gray-700 dark:text-gray-300">{service.name}</h4>
                              <div className="flex justify-between items-center">
                                
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  ₹{parseFloat(service.price).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center py-4 text-gray-500 dark:text-gray-400">No services found matching your search.</p>
                      )}
                    </div>
                    
                    {selectedServices.length > 0 && (
                      <div className="flex justify-end">
                        <div className="text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Selected Services: {selectedServices.length}</p>
                          <p className="font-bold text-gray-800 dark:text-white">Total: ₹{appointmentTotal.toLocaleString()}</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedServices.length > 0 && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={addToPending}
                          className="px-4 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg text-sm"
                        >
                          + Add Another Service
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Pending Appointments */}
                {pendingAppointments.length > 0 && (
                  <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Pending Appointments</h3>
                    <div className="space-y-4">
                      {pendingAppointments.map((appointment, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium text-gray-700 dark:text-gray-300">
                                {appointment.staff.name} - {formatTime(appointment.time)}
                              </p>
                              <div className="mt-1 space-y-1">
                                {appointment.services.map(service => (
                                  <p key={service.id} className="text-sm text-gray-600 dark:text-gray-400">
                                    {service.name} - ₹{parseFloat(service.price).toLocaleString()}
                                  </p>
                                ))}
                              </div>
                            </div>
                            <div className="flex flex-col justify-between items-end">
                              <button
                                type="button"
                                onClick={() => removePendingAppointment(index)}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm"
                              >
                                Remove
                              </button>
                              <p className="font-medium text-gray-700 dark:text-gray-300">
                                Total: ₹{appointment.total.toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="font-medium text-gray-700 dark:text-gray-300">Total for all appointments</p>
                        <p className="font-bold text-gray-800 dark:text-white">₹{calculateTotal().toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>
            
            {/* BLOCK 2: Staff Availability */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
                Staff Availability for {new Date(selectedDate).toLocaleDateString()}
              </h2>
              
              
              
              <BookingStaffAvailability
                staff={staff}
                staffAvailability={staffAvailability}
                selectedDate={selectedDate}
                selectedStaff={selectedStaff}
                setSelectedStaff={setSelectedStaff}
                selectedTime={selectedTime}
                setSelectedTime={setSelectedTime}
                selectedDuration={selectedDuration}
                setSelectedDuration={setSelectedDuration}
                getAvailableTimeSlots={getAvailableTimeSlots}
                canFitDuration={canFitDuration}
                formatTime={formatTime}
                formatDuration={formatDuration}
                getEndTimeFromDuration={getEndTimeFromDuration}
                bookedAppointments={bookedAppointments}
              />
            </div>
            
            {/* Book Appointment Button at bottom of page */}
            <div className="mt-8 flex justify-center">
              <button 
                onClick={handleSubmit}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg disabled:opacity-50 text-lg"
                disabled={loading || (pendingAppointments.length === 0 && selectedServices.length === 0)}
              >
                {loading ? 'Booking...' : 'Book Appointment'}
              </button>
            </div>
          </>
        )}
      </main>
    </SalonLayout>
  );
} 