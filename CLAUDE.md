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
- **pg_stat_statements**: Query performance monitoring (v1.10)
- **supabase_vault**: Vault extension for secrets (v0.3.1)
- **pg_graphql**: GraphQL support (v1.5.11)

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

#### Core Tables (16 total)

**Customer Management:**
- `customers` (743 rows) - Customer records with membership types, demographics, visit tracking
  - Key fields: `name`, `phone`, `email`, `birthdate`, `anniversary`, `membership_type`, `total_spent`, `visits`
- `memberships` (3 rows) - Active membership instances with points balance
  - Key fields: `customer_id`, `membership_type`, `points_balance`, `active`, `start_date`, `end_date`
- `membership_plans` (4 rows) - Plan templates with tiers and pricing
  - Key fields: `name`, `tier`, `price`, `points`, `discount_percentage`, `duration_months`
- `membership_upgrades` (2 rows) - Upgrade history tracking points carried forward
  - Key fields: `customer_id`, `from_plan`, `to_plan`, `points_carried`, `upgrade_date`

**Staff Management:**
- `staff` (10 rows) - Staff member profiles with specialties
  - Key fields: `name`, `title`, `specialties[]`, `profile_image`, `active`, `joining_date`
- `staff_availability` (426 rows) - Time slot scheduling
  - Key fields: `staff_id`, `date`, `start_time`, `end_time`, `is_available`
- `staff_services` (0 rows) - Staff-service relationships (many-to-many)

**Service & Appointment Management:**
- `services` (144 rows) - Service catalog with categories and pricing
  - Key fields: `name`, `category`, `price`, `description`, `image_url`
- `appointments` (1,069 rows) - Booking system with RLS enabled
  - Key fields: `date`, `start_time`, `customer_id`, `staff_id`, `status`, `total_amount`, `has_services`
  - Special fields: `completed_at`, `cancelled_at`, `customer_name/phone/email` for non-registered customers
- `appointment_services` (1,792 rows) - Services within appointments
  - Key fields: `appointment_id`, `service_id`, `price`, `discount_percentage`, `staff_id`

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

#### Key Stored Procedures
- `get_filtered_appointments()` - Advanced appointment filtering with joins
- `migrate_membership_plan()` - Handles plan upgrades with point calculation
- `upgrade_membership()` - User membership plan changes
- `use_membership_points()` - Points redemption system
- `calculate_carried_points()` - Points carryover calculation
- `delete_product_with_password()` - Password-protected deletion
- `get_user_membership()` - User membership details with plan info
- `get_appointment_services()` - Appointment service details

#### Row Level Security (RLS)
- **Enabled**: `appointments`, `membership_plans`, `membership_upgrades`
- **Disabled**: Most tables (relies on application-level security)

#### Data Volume Overview
- **appointments**: 1,069 records (most active table)
- **appointment_services**: 1,792 records (multiple services per appointment)
- **customers**: 743 records 
- **staff_availability**: 426 records (scheduling data)
- **services**: 144 records (service catalog)
- **transactions**: 0 records (financial tracking - likely cleared or not in use)

### Core Components
- `SalonLayout` - Main layout wrapper with navbar and footer
- `Navbar` - Navigation with notification badges and responsive design
- `UserMenu` - Authentication menu with login/logout
- `MemberDashboard` - Customer membership management
- `StaffAvailability` - Staff scheduling interface
- `DailyReport` - Analytics and reporting dashboard

### Business Logic (lib/db.js)
The main database interface handles:
- **Membership System**: Plan migration with point carryover (Silver → Silver Plus → Gold)
- **Discount Calculation**: Automatic pricing based on membership tiers
- **Staff Management**: Availability scheduling and performance tracking  
- **Appointment Booking**: Multi-service booking with staff assignment
- **Credit System**: Points-based payments with membership discounts
- **Reporting**: Daily stats, customer history, and staff performance

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
- `lib/supabase.js` - Supabase client configuration
- `.cursor/rules/project.mdc` - Development requirements and feature specifications

### Navigation Menu Order
Home → Book An Appointment → Sales → Service → Operator → Customers → Client History → Notifications → Membership → Credit → Invoices → Products → Reports

### Security Notes
- Hardcoded admin password for delete operations: "admin123" (should be moved to env variables)
- Supabase keys are exposed in client code (standard for public/anon keys)
- RLS (Row Level Security) should be implemented in Supabase for data protection