# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive salon management dashboard built with Next.js 15, React 19, and Supabase. The application manages a complete salon business including appointments, staff, customers, memberships, credit systems, and reporting.

**Key Features:**
- Customer and membership management with tiered plans (Silver, Silver Plus, Gold, Non-Membership variants)
- Staff scheduling and availability management
- Service booking and appointment management
- Credit/points system with membership-based discounts
- Invoice generation and transaction tracking
- Daily reports and analytics
- Notifications for birthdays and anniversaries

## Development Commands

```bash
# Development (uses Turbopack for faster builds)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Architecture & Structure

### Core Technology Stack
- **Frontend**: Next.js 15 with App Router, React 19, TailwindCSS 4
- **Backend**: Supabase (PostgreSQL database with real-time features)
- **Authentication**: Supabase Auth with custom AuthProvider context
- **Styling**: TailwindCSS with custom color scheme (purple/pink gradients)

### Key Directories
- `app/` - Next.js App Router pages and components
- `app/components/` - Reusable React components
- `lib/` - Core utilities and database functions
- `app/utils/` - Helper functions and business logic

### Database Architecture

The application uses Supabase PostgreSQL with comprehensive schema including custom types, stored procedures, and extensive foreign key relationships.

#### Database Extensions
- **uuid-ossp**: UUID generation (v1.1)
- **pgcrypto**: Cryptographic functions (v1.3)
- **pgjwt**: JSON Web Token API (v0.2.0)
- **pg_stat_statements**: Query performance monitoring (v1.11)
- **supabase_vault**: Vault extension for secrets (v0.3.1)
- **pg_graphql**: GraphQL support (v1.5.11)
- **plpgsql**: Procedural language (v1.0)

#### Custom Types & Enums
```sql
-- Appointment status enum
CREATE TYPE appointment_status AS ENUM (
  'pending', 'in_progress', 'completed', 'cancelled', 'no_show'
);

-- Membership tier enum  
CREATE TYPE membership_tier AS ENUM (
  'Non-Membership', 'Silver', 'Silver Plus', 'Gold'
);
```

#### Core Tables (15 total)

**Customer Management:**
- `customers` (743 rows) - Customer records with membership types, demographics, visit tracking
  - Key fields: `name`, `phone`, `email`, `birthdate`, `anniversary`, `membership_type`, `total_spent`, `visits`
- `memberships` - Active membership instances with points balance
  - Key fields: `customer_id`, `plan_id` (FK), `membership_type`, `points_balance`, `active`, `start_date`, `end_date`
  - RLS enabled
- `membership_plans` - Plan templates with tiers and pricing
  - Key fields: `name`, `tier`, `price`, `points`, `discount_percentage`, `duration_months`, `is_active`, `total_count`, `active_count`
  - RLS enabled
- `membership_upgrades` - Upgrade history tracking points carried forward
  - Key fields: `customer_id`, `from_plan`, `to_plan`, `points_carried`, `upgrade_date`
  - RLS enabled (Note: missing from original RLS list)

**Staff Management:**
- `staff` - Staff member profiles with specialties
  - Key fields: `name`, `title`, `description`, `specialties[]` (text array), `profile_image`, `email`, `phone`, `active`, `joining_date`
- `staff_availability` - Time slot scheduling (30-minute granularity)
  - Key fields: `staff_id`, `date`, `start_time`, `end_time`, `is_available`
  - Unique composite index: (staff_id, date, start_time)
  - Indexed on: date, staff_id
- `staff_services` - Staff-service relationships (many-to-many)
  - Unique composite index: (staff_id, service_id)

**Service & Appointment Management:**
- `services` (144 rows) - Service catalog with categories and pricing
  - Key fields: `name`, `category`, `price`, `description`, `image_url`
- `appointments` (1,069 rows) - Booking system with RLS enabled
  - Key fields: `date`, `start_time`, `customer_id`, `staff_id`, `status`, `total_amount`, `has_services`
  - Special fields: `completed_at`, `cancelled_at`, `customer_name/phone/email` for non-registered customers
- `appointment_services` - Services within appointments (many-to-many)
  - Key fields: `appointment_id`, `service_id`, `price`, `discount_percentage`, `staff_id`
  - RLS enabled
  - Unique composite index: (appointment_id, service_id)

**Product & Order Management:**
- `products` (8 rows) - Product catalog
  - Key fields: `title`, `price`
- `appointment_products` (0 rows) - Products within appointments
- `orders` (8 rows) - Standalone product orders
  - Key fields: `customer_id`, `total_amount`, `status` (defaults to 'completed')
- `order_items` (13 rows) - Order line items
  - Key fields: `order_id`, `product_id`, `quantity`, `price`

**Financial Tracking:**
- `transactions` (0 rows) - Payment and credit usage tracking
  - Key fields: `customer_id`, `appointment_id`, `service_name`, `amount`, `credit_used`, `invoice_id`

#### Key Stored Procedures (10 total)
- `get_filtered_appointments()` - Advanced appointment filtering with date/status/customer/staff filters, supports pagination
- `migrate_membership_plan(p_customer_id, p_from_plan, p_to_plan, p_points_to_carry)` - Validates upgrade path, deactivates old membership, creates new one with carried points
- `upgrade_membership(p_user_id, p_new_plan_id, p_old_plan_id)` - Alternative upgrade function that transfers points and updates plan metrics
- `use_membership_points(p_user_id, p_points_to_use)` - Deducts membership points, validates sufficient balance
- `calculate_carried_points(p_customer_id, p_from_plan, p_to_plan)` - Returns current points balance from active membership
- `delete_product_with_password(product_id, admin_password)` - Password-protected deletion (hardcoded: "admin123")
- `get_user_membership(p_user_id)` - Returns active membership with complete plan details
- `get_appointment_services(p_appointment_id)` - Returns appointment services with joined service and staff names
- `get_membership_plans()` - Returns all active membership plans ordered by price
- `update_timestamp()` - Trigger function to auto-update updated_at columns

#### Row Level Security (RLS)
- **Enabled (4 tables)**: `appointments`, `appointment_services`, `memberships`, `membership_plans`
- **Disabled (11 tables)**: Most other tables rely on application-level security

#### Performance & Indexing
**Total Indexes**: 32 across all tables

**Key Performance Indexes:**
- **appointments**: idx_appointments_date, idx_appointments_status, idx_appointments_customer, idx_appointments_staff
- **staff_availability**: unique composite (staff_id, date, start_time), staff_availability_date_idx, staff_availability_staff_idx
- **services**: idx_services_category
- **membership_plans**: idx_membership_plans_active, idx_membership_plans_tier
- **transactions**: transactions_customer_id_idx, transactions_date_idx
- **appointment_services**: unique composite (appointment_id, service_id), idx_appointment_services_appointment, idx_appointment_services_service
- **staff_services**: unique composite (staff_id, service_id)

#### Database Relationships & Data Flow

**One-to-Many Relationships:**
- `customers` → `memberships`, `appointments`, `orders`, `transactions`
- `staff` → `appointments`, `staff_availability`, `appointment_services`
- `services` → `appointment_services`
- `membership_plans` → `memberships`
- `appointments` → `appointment_services`, `appointment_products`, `transactions`
- `products` → `appointment_products`, `order_items`
- `orders` → `order_items`

**Many-to-Many Relationships:**
- `staff` ↔ `services` (via `staff_services` junction table)
- `appointments` ↔ `services` (via `appointment_services` junction table)
- `appointments` ↔ `products` (via `appointment_products` junction table)
- `orders` ↔ `products` (via `order_items` junction table)

**Critical Data Flow Patterns:**
1. **Appointment Booking**: `customers` → `appointments` → `appointment_services` (multiple services per appointment with individual pricing/discounts)
2. **Membership Upgrade**: `customers.membership_type` → `memberships` (deactivate old) → `memberships` (create new with carried points) → `membership_upgrades` (history)
3. **Staff Scheduling**: `staff` → `staff_availability` (30-minute slots per date)
4. **Revenue Tracking**: `appointments` → `appointment_services` (with membership discounts) → `transactions` (credit usage) → calculated final amounts

### Core Components
- `SalonLayout` - Main layout wrapper with navbar and footer
- `Navbar` - Navigation with notification badges and responsive design
- `UserMenu` - Authentication menu with login/logout
- `MemberDashboard` - Customer membership management
- `StaffAvailability` - Staff scheduling interface
- `DailyReport` - Analytics and reporting dashboard

### Business Logic (lib/db.js)

The main database interface (`lib/db.js`) provides all database operations as exported async functions. Key function categories:

**Membership Functions:**
- `getMembershipPlans()` - Get all membership plans
- `getUserMembership(userId)` - Get user's active membership with plan details
- `upgradeMembership(userId, planId, previousPlanId)` - RPC call to upgrade_membership stored procedure
- `migratePlan(customerId, newPlanType)` - Client-side migration logic with point calculation and history tracking

**Customer Functions:**
- `getCustomers()`, `getCustomerById(customerId)` - Retrieve customer records
- `createCustomer(customer)`, `updateCustomer(id, updates)` - CRUD operations
- `deleteCustomer(id, password)` - Password-protected deletion
- `getRepeatCustomers()` - Returns customers with multiple appointments and spending analysis
- `getCustomerSpendingHistory(customerId)` - Detailed spending breakdown with membership discounts

**Appointment Functions:**
- `createAppointment(appointment, services, products)` - Creates appointment with associated services/products
- `getAppointments(filters)` - Get appointments with optional date/customer/staff/status filters
- `getAppointmentById(appointmentId)` - Get single appointment with all relations
- `updateAppointment(appointmentId, updates)` - Update appointment status/details
- `deleteAppointment(appointmentId, password)` - Delete appointment
- `getFilteredAppointments(params)` - Advanced filtering with pagination support
- `getBookedAppointments(date)` - Get booked slots for availability checking

**Staff Functions:**
- `getStaff()`, `getStaffById(staffId)` - Retrieve staff records
- `createStaff(staff)`, `updateStaff(staffId, updates)` - CRUD operations (maps fields like `role→title`, `bio→description`)
- `deleteStaff(staffId, password)` - Password-protected deletion with cascade to staff_availability
- `getStaffAvailability(date)` - Get all staff availability for a specific date
- `updateStaffAvailability(staffId, date, timeSlots)` - Replace availability slots (delete + insert pattern)

**Service & Product Functions:**
- `getServices()`, `getServiceById(serviceId)` - Service catalog operations
- `createService(service)`, `updateService(serviceId, updates)`, `deleteService(serviceId)` - CRUD operations
- `getProducts()`, `createProduct(product)`, `updateProduct(productId, updates)` - Product management
- `deleteProduct(productId, password)` - Password-protected deletion

**Order Functions:**
- `getOrders(filters)`, `getOrderById(orderId)` - Order retrieval with items and products
- `createOrder(orderData, orderItems)` - Create order with line items
- `updateOrderStatus(orderId, status)`, `deleteOrder(orderId, password)` - Order management

**Reporting Functions:**
- `getDailyReportData(date)` - Returns appointments, transactions, new customers, staff performance for a date
- `getDailyStats(date)` - Calculates revenue, appointment counts, customer metrics with membership discount logic
- `getUpcomingBirthdays()`, `getUpcomingAnniversaries()` - Returns customers with events in next 7 days

**Important Implementation Details:**
- **Membership Discounts**: Calculated client-side based on membership_type (Gold: 50%, Silver Plus: 38%, Silver: 30%, Non-Membership variants: 30-50%)
- **Delete Operations**: Most delete functions require hardcoded password "admin123" (security issue - should use env variables)
- **Staff Updates**: Field mapping required (role↔title, bio↔description, image_url↔profile_image, is_available↔active)
- **Time Slots**: Staff availability uses 30-minute increments, start_time and end_time are stored as time without timezone
- **Appointment Services**: Supports multiple services per appointment, each with individual staff_id, price, and discount_percentage

### Authentication Flow
- Uses Supabase Auth with email/password
- `AuthProvider` context wraps the entire app
- `useAuth()` hook provides user state and auth functions
- Authentication state persists across page reloads

### Key Business Rules
1. **Membership Migration**: Only upgrades allowed (Silver → Silver Plus → Gold), points carry forward
2. **Discount Tiers**: Gold (50%), Silver Plus (38%), Silver (30%), Non-Membership plans (30-50%)
3. **Password Protection**: Delete operations require admin password verification
4. **Staff Availability**: 30-minute time slots with availability status
5. **Appointment Status**: pending → in_progress → completed/cancelled/no_show

### Important Configuration Files
- `next.config.mjs` - Disables dev indicators
- `lib/supabase.js` - Supabase client configuration (requires env variables)
- `lib/auth.js` - AuthProvider context using Supabase Auth
- `.cursor/rules/project.mdc` - Development requirements and feature specifications

### Environment Variables
Required environment variables (should be in `.env.local`):
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Note**: Supabase public/anon keys are safe to expose client-side. Row Level Security (RLS) policies protect sensitive data.

### Navigation Menu Order
Home → Book An Appointment → Sales → Service → Operator → Customers → Client History → Notifications → Membership → Credit → Invoices → Products → Reports

### Security Notes
- Hardcoded admin password for delete operations: "admin123" (should be moved to env variables)
- Supabase keys are exposed in client code (standard for public/anon keys)
- RLS (Row Level Security) should be implemented in Supabase for data protection