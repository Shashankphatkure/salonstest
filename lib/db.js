import { supabase } from './supabase';

// Membership Functions
export async function getMembershipPlans() {
  const { data, error } = await supabase
    .from('membership_plans')
    .select('*')
    .order('price');
    
  if (error) throw error;
  return data;
}

export async function getUserMembership(userId) {
  const { data, error } = await supabase
    .from('user_memberships')
    .select(`
      *,
      membership_plans(*)
    `)
    .eq('user_id', userId)
    .single();
    
  if (error && error.code !== 'PGSQL_ERROR_NOT_FOUND') throw error;
  return data;
}

export async function upgradeMembership(userId, planId, previousPlanId) {
  // Start a transaction to handle the upgrade
  const { data, error } = await supabase.rpc('upgrade_membership', {
    p_user_id: userId,
    p_new_plan_id: planId,
    p_old_plan_id: previousPlanId
  });
  
  if (error) throw error;
  return data;
}

// Plan migration function for upgrading from Silver to Silver Plus to Gold
export async function migratePlan(customerId, newPlanType) {
  // Validate the plan type
  const validPlanTypes = ['Silver', 'Silver Plus', 'Gold'];
  if (!validPlanTypes.includes(newPlanType)) {
    throw new Error('Invalid plan type. Must be Silver, Silver Plus, or Gold.');
  }
  
  try {
    // Get the customer's current membership
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('membership_type')
      .eq('id', customerId)
      .single();
      
    if (customerError) throw customerError;
    
    const currentPlan = customerData.membership_type;
    
    // Get current points balance
    const { data: membershipData, error: membershipError } = await supabase
      .from('memberships')
      .select('id, points_balance')
      .eq('customer_id', customerId)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    // Calculate initial points for the new plan
    let initialPoints = 0;
    let currentPoints = 0;
    
    if (membershipData && membershipData.points_balance !== null) {
      // If we found an active membership, use its points balance
      currentPoints = membershipData.points_balance;
    }
    
    // Add new plan initial points based on plan type
    if (newPlanType === 'Silver') {
      initialPoints = 4500; // Silver starts with 4500 points
    } else if (newPlanType === 'Silver Plus') {
      initialPoints = 7500; // Silver Plus gets 7500 initial points
    } else if (newPlanType === 'Gold') {
      initialPoints = 12500; // Gold gets 12500 initial points
    }
    
    // Total points to carry forward is current balance + new plan initial points
    const pointsToCarry = currentPoints + initialPoints;
    
    // First, deactivate the old membership if it exists
    if (membershipData && membershipData.id) {
      const { error: deactivateError } = await supabase
        .from('memberships')
        .update({ active: false, updated_at: new Date() })
        .eq('id', membershipData.id);
        
      if (deactivateError) {
        console.error('Error deactivating old membership:', deactivateError);
        throw deactivateError;
      }
    }
    
    // Then create the new membership
    const { error: createError } = await supabase
      .from('memberships')
      .insert({
        customer_id: customerId,
        membership_type: newPlanType,
        start_date: new Date(),
        active: true,
        points_balance: pointsToCarry
      });
      
    if (createError) {
      console.error('Error creating new membership:', createError);
      throw createError;
    }
    
    // Update customer with new membership type
    const { error: updateError } = await supabase
      .from('customers')
      .update({ 
        membership_type: newPlanType,
        updated_at: new Date()
      })
      .eq('id', customerId);
      
    if (updateError) {
      console.error('Error updating customer membership type:', updateError);
      throw updateError;
    }
    
    // Record the migration history
    const { error: historyError } = await supabase
      .from('membership_upgrades')
      .insert({
        customer_id: customerId,
        from_plan: currentPlan,
        to_plan: newPlanType,
        points_carried: currentPoints,
        upgrade_date: new Date()
      });
      
    if (historyError) {
      console.error('Error recording membership upgrade history:', historyError);
      // Don't throw here as it's not critical
    }
    
    return { 
      success: true, 
      message: `Successfully migrated from ${currentPlan} to ${newPlanType} with ${currentPoints} existing points plus ${initialPoints} new points.`,
      fromPlan: currentPlan,
      toPlan: newPlanType,
      pointsCarried: currentPoints,
      totalPoints: pointsToCarry
    };
  } catch (error) {
    console.error('Error during plan migration:', error);
    throw error;
  }
}

// Customer Functions
export async function getCustomers(userId) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function getCustomerById(customerId) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();
    
  if (error) throw error;
  return data;
}

export async function createCustomer(customer) {
  const { data, error } = await supabase
    .from('customers')
    .insert([customer])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateCustomer(id, updates) {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteCustomer(id, password) {
  // We'll implement a stored procedure to verify the password and delete if authorized
  const { data, error } = await supabase.rpc('delete_with_password', {
    p_table: 'customers',
    p_id: id,
    p_password: password
  });
  
  if (error) throw error;
  return data;
}

// Service Functions
export async function getServices() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .order('name');
    
  if (error) throw error;
  return data;
}

export async function getServiceById(serviceId) {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .single();
    
  if (error) throw error;
  return data;
}

export async function createService(service) {
  const { data, error } = await supabase
    .from('services')
    .insert([service])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateService(serviceId, updates) {
  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', serviceId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteService(serviceId) {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId);
    
  if (error) throw error;
  return true;
}

// Staff Functions
export async function getStaff() {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .order('name');
    
  if (error) throw error;
  return data;
}

export async function getStaffById(staffId) {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('id', staffId)
    .single();
    
  if (error) throw error;
  return data;
}

export async function createStaff(staff) {
  // First create the staff member
  const { data, error } = await supabase
    .from('staff')
    .insert([{
      name: staff.name,
      email: staff.email,
      phone: staff.phone,
      title: staff.title || staff.role,
      description: staff.bio,
      specialties: staff.specialties || [],
      profile_image: staff.image_url,
      active: staff.is_available
    }])
    .select()
    .single();
    
  if (error) throw error;
  
  return data;
}

export async function updateStaff(staffId, updates) {
  // Update staff details
  const { data, error } = await supabase
    .from('staff')
    .update({
      name: updates.name,
      email: updates.email,
      phone: updates.phone,
      title: updates.title || updates.role,
      description: updates.bio,
      specialties: updates.specialties || [],
      profile_image: updates.image_url,
      active: updates.is_available
    })
    .eq('id', staffId)
    .select()
    .single();
    
  if (error) throw error;
  
  return data;
}

export async function deleteStaff(staffId, password) {
  // Use direct deletion instead of a stored procedure if it's not available
  try {
    // Validate password - hardcoded for now
    const ADMIN_PASSWORD = "admin123";
    if (password !== ADMIN_PASSWORD) {
      throw new Error("Invalid password");
    }
    
    // First delete related availability records
    const { error: availabilityError } = await supabase
      .from('staff_availability')
      .delete()
      .eq('staff_id', staffId);
      
    if (availabilityError) throw availabilityError;
    
    // Then delete the staff record
    const { error } = await supabase
      .from('staff')
      .delete()
      .eq('id', staffId);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error deleting staff: ", error);
    throw error;
  }
}

export async function getStaffAvailability(date) {
  // Convert date to ISO format
  const formattedDate = new Date(date).toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('staff_availability')
    .select(`
      *,
      staff(*)
    `)
    .eq('date', formattedDate);
    
  if (error) throw error;
  return data;
}

export async function updateStaffAvailability(staffId, date, timeSlots) {
  // First delete existing slots
  const { error: deleteError } = await supabase
    .from('staff_availability')
    .delete()
    .eq('staff_id', staffId)
    .eq('date', date);
    
  if (deleteError) throw deleteError;
  
  // Then insert new slots
  const slots = timeSlots.map(slot => {
    // Parse start time
    const [startHour, startMinute] = slot.start.split(':').map(num => parseInt(num, 10));
    
    // Calculate end time (30 minutes after start by default)
    let endHour = startHour;
    let endMinute = (startMinute || 0) + 30;
    
    if (endMinute >= 60) {
      endHour += 1;
      endMinute = 0;
    }
    
    // If specific end time provided, use it
    if (slot.end) {
      const [providedEndHour, providedEndMinute] = slot.end.split(':').map(num => parseInt(num, 10));
      endHour = providedEndHour;
      endMinute = providedEndMinute || 0;
    }
    
    // Format times properly
    const formattedStartTime = `${startHour.toString().padStart(2, '0')}:${(startMinute || 0).toString().padStart(2, '0')}`;
    const formattedEndTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    
    return {
      staff_id: staffId,
      date,
      start_time: formattedStartTime,
      end_time: formattedEndTime,
      is_available: slot.available
    };
  });
  
  const { data, error } = await supabase
    .from('staff_availability')
    .insert(slots)
    .select();
    
  if (error) throw error;
  return data;
}

// Appointment Functions
export async function createAppointment(appointment, services = [], products = []) {
  try {
    console.log('Creating appointment with data:', appointment);
    console.log('Services to associate:', services);
    
    // Add flag to indicate if appointment has services
    const appointmentWithFlags = {
      ...appointment,
      has_services: services.length > 0
    };

    // Create the appointment
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .insert([appointmentWithFlags])
      .select('*')
      .single();
      
    if (appointmentError) throw appointmentError;
    
    console.log('Appointment created successfully:', appointmentData);
    
    // Create appointment services if any
    if (services.length > 0) {
      const appointmentServices = services.map(service => ({
        appointment_id: appointmentData.id,
        service_id: service.service_id || service.id,
        price: service.price,
        staff_id: service.staff_id || appointment.staff_id
      }));
      
      console.log('Inserting appointment services:', appointmentServices);
      
      const { data: servicesData, error: servicesError } = await supabase
        .from('appointment_services')
        .insert(appointmentServices)
        .select();
        
      if (servicesError) throw servicesError;
      
      console.log('Appointment services created successfully:', servicesData);
    }
    
    // Create appointment products if any
    if (products.length > 0) {
      const appointmentProducts = products.map(product => ({
        appointment_id: appointmentData.id,
        product_id: product.id,
        price: product.price
      }));
      
      console.log('Inserting appointment products:', appointmentProducts);
      
      const { data: productsData, error: productsError } = await supabase
        .from('appointment_products')
        .insert(appointmentProducts)
        .select();
        
      if (productsError) throw productsError;
      
      console.log('Appointment products created successfully:', productsData);
    }
    
    // Return the appointment with additional data
    return {
      ...appointmentData,
      services_count: services.length,
      products_count: products.length
    };
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
}

export async function getAppointments(filters = {}) {
  let query = supabase
    .from('appointments')
    .select(`
      *,
      customers!customer_id(*),
      staff!staff_id(*),
      services:appointment_services(
        service:services(*)
      )
    `);
  
  // Apply filters if provided
  if (filters.date) {
    query = query.eq('date', filters.date);
  }
  
  // Add date range filters
  if (filters.dateFrom) {
    query = query.gte('date', filters.dateFrom);
  }
  
  if (filters.dateTo) {
    query = query.lte('date', filters.dateTo);
  }
  
  if (filters.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }
  
  if (filters.staffId) {
    query = query.eq('staff_id', filters.staffId);
  }
  
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  query = query.order('date', { ascending: true })
               .order('start_time', { ascending: true });
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

// Get appointment counts using Supabase's count functionality
export async function getAppointmentCounts() {
  // Get total count
  const { count: totalCount, error: totalError } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true });
  
  if (totalError) throw totalError;
  
  // Get pending count
  const { count: pendingCount, error: pendingError } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
  
  if (pendingError) throw pendingError;
  
  return { total: totalCount, pending: pendingCount };
}

// Update an appointment
export async function updateAppointment(appointmentId, updates) {
  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', appointmentId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteAppointment(appointmentId, password) {
  // If password is provided, verify it (usually you'd do this on the server)
  // Here for demo purposes we'll just delete directly
  const { data, error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', appointmentId);
    
  if (error) throw error;
  return { success: true, message: 'Appointment deleted successfully' };
}

// Get a single appointment by ID
export async function getAppointmentById(appointmentId) {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      customers!customer_id(*),
      staff!staff_id(*),
      services:appointment_services(
        service:services(*)
      )
    `)
    .eq('id', appointmentId)
    .single();
  
  if (error) throw error;
  return data;
}

// Reports Functions
export async function getStaffPerformance(startDate, endDate) {
  const { data, error } = await supabase.rpc('get_staff_performance', {
    p_start_date: startDate,
    p_end_date: endDate
  });
  
  if (error) throw error;
  return data;
}

export async function getSalesReport(startDate, endDate) {
  // This function doesn't exist in the database - implement getFilteredAppointments instead
  console.warn('getSalesReport is deprecated, use getFilteredAppointments instead');
  return [];
}

export async function getFilteredAppointments(params) {
  const { 
    p_date_from, 
    p_date_to, 
    p_status, 
    p_customer_id, 
    p_staff_id, 
    p_limit = 100, 
    p_offset = 0 
  } = params;
  
  // Use a direct query with table aliases instead of RPC function
  let query = supabase
    .from('appointments')
    .select(`
      id,
      date,
      start_time,
      end_time,
      status,
      notes,
      total_amount,
      created_at,
      updated_at,
      customer_id,
      customers!customer_id(name, phone, email),
      staff!staff_id(name, email),
      appointment_services!inner(id)
    `, { count: 'exact' });
  
  // Apply filters
  if (p_date_from) {
    query = query.gte('date', p_date_from);
  }
  
  if (p_date_to) {
    query = query.lte('date', p_date_to);
  }
  
  if (p_status) {
    query = query.eq('status', p_status);
  }
  
  if (p_customer_id) {
    query = query.eq('customer_id', p_customer_id);
  }
  
  if (p_staff_id) {
    query = query.eq('staff_id', p_staff_id);
  }
  
  // Add ordering
  query = query.order('date', { ascending: false })
               .order('start_time', { ascending: true });
  
  // Add pagination
  query = query.range(p_offset, p_offset + p_limit - 1);
  
  const { data, error, count } = await query;
  
  if (error) {
    console.error('Error fetching filtered appointments:', error);
    throw error;
  }
  
  // Transform the data to match the expected format
  const transformedData = data.map(appointment => {
    const customer = appointment.customers || {};
    const staff = appointment.staff || {};
    const serviceCount = appointment.appointment_services ? appointment.appointment_services.length : 0;
    
    return {
      id: appointment.id,
      date: appointment.date,
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      status: appointment.status,
      notes: appointment.notes,
      total_amount: appointment.total_amount,
      created_at: appointment.created_at,
      updated_at: appointment.updated_at,
      customer_id: appointment.customer_id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email,
      staff_id: appointment.staff_id,
      staff_name: staff.name,
      staff_email: staff.email,
      service_count: serviceCount
    };
  });
  
  return transformedData;
}

// Credits Functions
export async function getUserCredits(userId) {
  const { data, error } = await supabase
    .from('user_credits')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  if (error && error.code !== 'PGSQL_ERROR_NOT_FOUND') throw error;
  return data || { points: 0, balance: 0 };
}

export async function getCreditHistory(userId) {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
}

// Utility Functions
export async function checkTableExists(tableName) {
  try {
    // Try to get a single row from the table with a limit
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .limit(1);
    
    // Check for specific error codes/messages related to table not existing
    if (error) {
      if (error.code === 'PGRST200' || 
          error.message.includes('relation') && error.message.includes('does not exist') ||
          error.message.includes('Cannot find') ||
          error.details?.includes('relation') && error.details?.includes('does not exist')) {
        console.warn(`Table ${tableName} does not exist in the database.`);
        return false;
      }
      // Other errors should be thrown
      throw error;
    }
    
    // If we got here, the table exists
    return true;
  } catch (error) {
    console.error(`Error checking if table ${tableName} exists:`, error);
    // Be cautious - if we can't check, assume it doesn't exist
    return false;
  }
}

// Product Functions
export async function getProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('title');
    
  if (error) throw error;
  return data;
}

export async function getProductById(productId) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();
    
  if (error) throw error;
  return data;
}

export async function createProduct(product) {
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function updateProduct(productId, updates) {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteProduct(productId, password) {
  // Use the correct stored procedure for deleting products
  const { data, error } = await supabase.rpc('delete_product_with_password', {
    product_id: productId,
    admin_password: password
  });

  if (error) throw error;
  return data;
}

// Order Functions
export async function getOrders(filters = {}) {
  let query = supabase
    .from('orders')
    .select(`
      *,
      customers(*),
      items:order_items(
        *,
        product:products(*)
      )
    `);
  
  // Apply filters if provided
  if (filters.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }
  
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  
  // Sort by newest first
  query = query.order('created_at', { ascending: false });
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

export async function getOrderById(orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customers(*),
      items:order_items(
        *,
        product:products(*)
      )
    `)
    .eq('id', orderId)
    .single();
    
  if (error) throw error;
  return data;
}

export async function createOrder(orderData, orderItems) {
  try {
    // Create the order
    const { data: orderResult, error: orderError } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single();
      
    if (orderError) throw orderError;
    
    // Create order items
    if (orderItems.length > 0) {
      const formattedItems = orderItems.map(item => ({
        order_id: orderResult.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price
      }));
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(formattedItems);
        
      if (itemsError) throw itemsError;
    }
    
    // Return the full order
    return getOrderById(orderResult.id);
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

export async function updateOrderStatus(orderId, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function deleteOrder(orderId, password) {
  // Similar to other delete functions, using password protection
  const { data, error } = await supabase.rpc('delete_with_password', {
    p_table: 'orders',
    p_id: orderId,
    p_password: password
  });
  
  if (error) throw error;
  return data;
}

// Get booked appointments for filtering available time slots
export async function getBookedAppointments(date) {
  const { data, error } = await supabase
    .from('appointments')
    .select('staff_id, date, start_time, end_time')
    .eq('date', date)
    .not('status', 'eq', 'cancelled')
    .not('status', 'eq', 'no_show');

  if (error) throw error;
  return data;
}

// Daily Report Functions
export async function getDailyReportData(date) {
  try {
    console.log('🔍 Fetching daily report data for date:', date);
    
    // Get appointments for the day
    const appointmentsData = await getAppointments({ date });
    console.log('📅 Appointments found:', appointmentsData?.length || 0);

    // Get transactions for the day
    const { data: transactionsData, error: transError } = await supabase
      .from('transactions')
      .select(`
        *,
        customers!customer_id(name, phone, membership_type)
      `)
      .eq('date', date);

    if (transError) throw transError;

    // Get new customers for the day
    const { data: newCustomersData, error: custError } = await supabase
      .from('customers')
      .select('*')
      .gte('created_at', `${date}T00:00:00`)
      .lt('created_at', `${date}T23:59:59`);

    if (custError) throw custError;

    // Get staff performance for the day
    const { data: staffPerformanceData, error: staffError } = await supabase
      .from('appointment_services')
      .select(`
        staff_id,
        price,
        staff!staff_id(name),
        appointment_id,
        appointments!appointment_id(date, status)
      `)
      .eq('appointments.date', date)
      .not('appointments.status', 'eq', 'cancelled')
      .not('appointments.status', 'eq', 'no_show');

    if (staffError) throw staffError;

    return {
      appointments: appointmentsData || [],
      transactions: transactionsData || [],
      newCustomers: newCustomersData || [],
      staffPerformance: staffPerformanceData || []
    };
  } catch (error) {
    console.error('Error fetching daily report data:', error);
    throw error;
  }
}

export async function getDailyStats(date) {
  try {
    console.log('💰 Calculating daily stats for date:', date);
    const reportData = await getDailyReportData(date);
    const { appointments, transactions, newCustomers, staffPerformance } = reportData;
    console.log('📊 Processing', appointments?.length || 0, 'appointments for stats');

    // Calculate basic appointment stats
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
    const cancelledAppointments = appointments.filter(apt => apt.status === 'cancelled').length;
    const noShowAppointments = appointments.filter(apt => apt.status === 'no_show').length;
    const pendingAppointments = appointments.filter(apt => apt.status === 'pending').length;
    const inProgressAppointments = appointments.filter(apt => apt.status === 'in_progress').length;

    // Process appointments into invoices to get proper revenue
    const invoices = [];
    for (const appointment of appointments) {
      let customerInfo = appointment.customers;
      
      // Calculate total price from services with membership discount
      let totalPrice = appointment.total_price || 0;
      if (appointment.services && appointment.services.length > 0) {
        let discountPercent = 0;
        const membershipType = customerInfo?.membership_type;
        
        if (membershipType) {
          if (membershipType.includes('Gold')) {
            discountPercent = 50;
          } else if (membershipType.includes('Silver Plus')) {
            discountPercent = 38;
          } else if (membershipType.includes('Silver')) {
            discountPercent = 30;
          } else if (membershipType.includes('Non-Membership-10k')) {
            discountPercent = 30;
          } else if (membershipType.includes('Non-Membership-20k')) {
            discountPercent = 38;
          } else if (membershipType.includes('Non-Membership-30k')) {
            discountPercent = 35;
          } else if (membershipType.includes('Non-Membership-50k')) {
            discountPercent = 50;
          }
        }
        
        // Calculate total with discount
        totalPrice = appointment.services.reduce((total, service) => {
          const basePrice = service.price || (service.service && service.service.price) || 0;
          const discountedPrice = basePrice * (1 - (discountPercent / 100));
          return total + parseFloat(discountedPrice);
        }, 0);
        
        totalPrice = Math.round(totalPrice * 100) / 100;
      }
      
      // Check if there's a transaction for credit used
      let creditUsed = 0;
      try {
        const { data: transactionData } = await supabase
          .from('transactions')
          .select('credit_used')
          .eq('invoice_id', appointment.id)
          .limit(1);
          
        if (transactionData && transactionData.length > 0) {
          creditUsed = transactionData[0].credit_used || 0;
        }
      } catch (err) {
        console.error(`Error fetching transaction for appointment ${appointment.id}:`, err);
      }
      
      const finalAmount = Math.max(0, totalPrice - creditUsed);
      
      invoices.push({
        appointment_id: appointment.id,
        amount: totalPrice,
        creditUsed: creditUsed,
        finalAmount: finalAmount,
        status: appointment.status === 'completed' ? 'Paid' : 'Pending',
        appointment: appointment
      });
    }

    // Calculate revenue from processed invoices
    const totalRevenue = invoices.reduce((sum, invoice) => sum + (invoice.finalAmount || 0), 0);
    const totalCreditUsed = invoices.reduce((sum, invoice) => sum + (invoice.creditUsed || 0), 0);
    const totalInvoiceAmount = invoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
    const cashRevenue = totalRevenue; // finalAmount already excludes credit

    // Calculate average service value based on completed appointments
    const completedInvoices = invoices.filter(invoice => invoice.status === 'Paid');
    const avgServiceValue = completedInvoices.length > 0 
      ? completedInvoices.reduce((sum, invoice) => sum + invoice.finalAmount, 0) / completedInvoices.length 
      : 0;

    // New customers count
    const newCustomersCount = newCustomers.length;

    // Staff performance summary - use invoice data for revenue
    const staffStats = {};
    appointments.forEach(appointment => {
      if (appointment.staff_id && appointment.staff) {
        const staffId = appointment.staff_id;
        const staffName = appointment.staff.name || 'Unknown';
        
        // Find corresponding invoice
        const invoice = invoices.find(inv => inv.appointment_id === appointment.id);
        const appointmentRevenue = invoice ? invoice.finalAmount : 0;

        if (!staffStats[staffId]) {
          staffStats[staffId] = {
            name: staffName,
            servicesCount: 0,
            revenue: 0
          };
        }

        staffStats[staffId].servicesCount += 1;
        staffStats[staffId].revenue += appointmentRevenue;
      }
    });

    return {
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        cancelled: cancelledAppointments,
        noShow: noShowAppointments,
        pending: pendingAppointments,
        inProgress: inProgressAppointments
      },
      revenue: {
        total: totalInvoiceAmount, // Total before credit
        cash: cashRevenue, // Actual cash received
        credit: totalCreditUsed, // Credit/points used
        finalRevenue: totalRevenue, // Final revenue after credit
        average: avgServiceValue
      },
      customers: {
        new: newCustomersCount
      },
      staff: Object.values(staffStats)
    };
  } catch (error) {
    console.error('Error calculating daily stats:', error);
    throw error;
  }
}

// Notification Functions
export async function getUpcomingBirthdays() {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone, birthdate')
    .not('birthdate', 'is', null);

  if (error) throw error;
  
  if (!data) return [];

  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  return data.filter(customer => {
    const birthdate = new Date(customer.birthdate);
    const currentYear = today.getFullYear();
    
    const thisYearBirthday = new Date(currentYear, birthdate.getMonth(), birthdate.getDate());
    
    if (thisYearBirthday < today) {
      const nextYearBirthday = new Date(currentYear + 1, birthdate.getMonth(), birthdate.getDate());
      return nextYearBirthday >= today && nextYearBirthday <= nextWeek;
    }
    
    return thisYearBirthday >= today && thisYearBirthday <= nextWeek;
  }).map(customer => ({
    ...customer,
    nextBirthday: (() => {
      const birthdate = new Date(customer.birthdate);
      const currentYear = today.getFullYear();
      const thisYearBirthday = new Date(currentYear, birthdate.getMonth(), birthdate.getDate());
      
      if (thisYearBirthday < today) {
        return new Date(currentYear + 1, birthdate.getMonth(), birthdate.getDate()).toISOString().split('T')[0];
      }
      return thisYearBirthday.toISOString().split('T')[0];
    })()
  }));
}

export async function getUpcomingAnniversaries() {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, phone, anniversary')
    .not('anniversary', 'is', null);

  if (error) throw error;
  
  if (!data) return [];

  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  return data.filter(customer => {
    const anniversary = new Date(customer.anniversary);
    const currentYear = today.getFullYear();
    
    const thisYearAnniversary = new Date(currentYear, anniversary.getMonth(), anniversary.getDate());
    
    if (thisYearAnniversary < today) {
      const nextYearAnniversary = new Date(currentYear + 1, anniversary.getMonth(), anniversary.getDate());
      return nextYearAnniversary >= today && nextYearAnniversary <= nextWeek;
    }
    
    return thisYearAnniversary >= today && thisYearAnniversary <= nextWeek;
  }).map(customer => ({
    ...customer,
    nextAnniversary: (() => {
      const anniversary = new Date(customer.anniversary);
      const currentYear = today.getFullYear();
      const thisYearAnniversary = new Date(currentYear, anniversary.getMonth(), anniversary.getDate());
      
      if (thisYearAnniversary < today) {
        return new Date(currentYear + 1, anniversary.getMonth(), anniversary.getDate()).toISOString().split('T')[0];
      }
      return thisYearAnniversary.toISOString().split('T')[0];
    })()
  }));
}

// Client History Functions
export async function getRepeatCustomers() {
  try {
    // Get customers with multiple appointments
    const { data: customersWithAppointments, error } = await supabase
      .from('customers')
      .select(`
        *,
        appointments:appointments(
          id,
          date,
          start_time,
          status,
          total_amount,
          staff:staff(name),
          services:appointment_services(
            service:services(name, price)
          )
        )
      `)
      .order('name');

    if (error) throw error;

    // Filter customers with multiple appointments and calculate their spending
    const repeatCustomers = customersWithAppointments
      .filter(customer => customer.appointments && customer.appointments.length > 1)
      .map(customer => {
        const appointments = customer.appointments || [];
        const completedAppointments = appointments.filter(apt => apt.status === 'completed');
        
        // Calculate total spending with membership discounts
        let totalSpending = 0;
        const appointmentHistory = [];

        appointments.forEach(appointment => {
          let appointmentTotal = 0;
          
          if (appointment.services && appointment.services.length > 0) {
            // Calculate with membership discount
            let discountPercent = 0;
            const membershipType = customer.membership_type;
            
            if (membershipType) {
              if (membershipType.includes('Gold')) {
                discountPercent = 50;
              } else if (membershipType.includes('Silver Plus')) {
                discountPercent = 38;
              } else if (membershipType.includes('Silver')) {
                discountPercent = 30;
              } else if (membershipType.includes('Non-Membership-10k')) {
                discountPercent = 30;
              } else if (membershipType.includes('Non-Membership-20k')) {
                discountPercent = 38;
              } else if (membershipType.includes('Non-Membership-30k')) {
                discountPercent = 35;
              } else if (membershipType.includes('Non-Membership-50k')) {
                discountPercent = 50;
              }
            }
            
            appointmentTotal = appointment.services.reduce((total, service) => {
              const basePrice = service.service?.price || 0;
              const discountedPrice = basePrice * (1 - (discountPercent / 100));
              return total + discountedPrice;
            }, 0);
          } else {
            appointmentTotal = appointment.total_amount || 0;
          }

          if (appointment.status === 'completed') {
            totalSpending += appointmentTotal;
          }

          appointmentHistory.push({
            ...appointment,
            calculatedTotal: appointmentTotal,
            discountApplied: customer.membership_type ? true : false
          });
        });

        // Sort appointments by date (newest first)
        appointmentHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

        return {
          ...customer,
          totalAppointments: appointments.length,
          completedAppointments: completedAppointments.length,
          totalSpending: Math.round(totalSpending * 100) / 100,
          averageSpending: completedAppointments.length > 0 
            ? Math.round((totalSpending / completedAppointments.length) * 100) / 100 
            : 0,
          lastVisit: appointments.length > 0 
            ? appointments.reduce((latest, apt) => 
                new Date(apt.date) > new Date(latest.date) ? apt : latest
              ).date 
            : null,
          appointmentHistory: appointmentHistory
        };
      })
      .sort((a, b) => b.totalSpending - a.totalSpending); // Sort by total spending

    return repeatCustomers;
  } catch (error) {
    console.error('Error fetching repeat customers:', error);
    throw error;
  }
}

export async function getCustomerSpendingHistory(customerId) {
  try {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select(`
        *,
        appointments:appointments(
          id,
          date,
          start_time,
          end_time,
          status,
          total_amount,
          notes,
          staff:staff(name),
          services:appointment_services(
            price,
            service:services(name, price)
          )
        )
      `)
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;

    // Calculate customer's discount percentage once
    let customerDiscountPercent = 0;
    const membershipType = customer.membership_type;
    
    if (membershipType) {
      if (membershipType.includes('Gold')) {
        customerDiscountPercent = 50;
      } else if (membershipType.includes('Silver Plus')) {
        customerDiscountPercent = 38;
      } else if (membershipType.includes('Silver')) {
        customerDiscountPercent = 30;
      } else if (membershipType.includes('Non-Membership-10k')) {
        customerDiscountPercent = 30;
      } else if (membershipType.includes('Non-Membership-20k')) {
        customerDiscountPercent = 38;
      } else if (membershipType.includes('Non-Membership-30k')) {
        customerDiscountPercent = 35;
      } else if (membershipType.includes('Non-Membership-50k')) {
        customerDiscountPercent = 50;
      }
    }

    // Process appointments to calculate spending with discounts
    const processedAppointments = (customer.appointments || []).map(appointment => {
      let appointmentTotal = 0;
      
      if (appointment.services && appointment.services.length > 0) {
        appointmentTotal = appointment.services.reduce((total, service) => {
          const basePrice = service.service?.price || service.price || 0;
          const discountedPrice = basePrice * (1 - (customerDiscountPercent / 100));
          return total + discountedPrice;
        }, 0);
      } else {
        appointmentTotal = appointment.total_amount || 0;
      }

      return {
        ...appointment,
        originalTotal: appointment.services?.reduce((total, service) => 
          total + (service.service?.price || service.price || 0), 0) || appointment.total_amount || 0,
        discountPercent: customerDiscountPercent,
        finalTotal: Math.round(appointmentTotal * 100) / 100,
        savings: appointment.services ? 
          appointment.services.reduce((total, service) => {
            const basePrice = service.service?.price || service.price || 0;
            return total + (basePrice * (customerDiscountPercent / 100));
          }, 0) : 0
      };
    });

    // Sort by date (newest first)
    processedAppointments.sort((a, b) => new Date(b.date) - new Date(a.date));

    const completedAppointments = processedAppointments.filter(apt => apt.status === 'completed');
    const totalSpending = completedAppointments.reduce((sum, apt) => sum + apt.finalTotal, 0);
    const totalSavings = completedAppointments.reduce((sum, apt) => sum + (apt.savings || 0), 0);

    return {
      customer,
      appointments: processedAppointments,
      summary: {
        totalAppointments: processedAppointments.length,
        completedAppointments: completedAppointments.length,
        totalSpending: Math.round(totalSpending * 100) / 100,
        totalSavings: Math.round(totalSavings * 100) / 100,
        averageSpending: completedAppointments.length > 0 
          ? Math.round((totalSpending / completedAppointments.length) * 100) / 100 
          : 0,
        membershipSavingsPercent: customer.membership_type ? customerDiscountPercent : 0
      }
    };
  } catch (error) {
    console.error('Error fetching customer spending history:', error);
    throw error;
  }
}