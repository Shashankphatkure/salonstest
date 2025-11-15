'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Calendar,
  ShoppingCart,
  Scissors,
  Users,
  History,
  Bell,
  CreditCard,
  FileText,
  Package,
  BarChart3,
  UserCircle
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { useAuth } from '@/lib/auth';
import { getUpcomingBirthdays, getUpcomingAnniversaries } from '@/lib/db';

export function AppSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);

  const menuItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/book-appointment', label: 'Book', icon: Calendar },
    { href: '/sales', label: 'Sales', icon: ShoppingCart },
    { href: '/services', label: 'Service', icon: Scissors },
    { href: '/staff', label: 'Operator', icon: Users },
    { href: '/customers', label: 'Customers', icon: Users },
    { href: '/client-history', label: 'History', icon: History },
    { href: '/notifications', label: 'Notifications', icon: Bell, hasNotifications: true },
    { href: '/membership', label: 'Membership', icon: CreditCard },
    { href: '/credit', label: 'Credit', icon: CreditCard },
    { href: '/invoice', label: 'Invoices', icon: FileText },
    { href: '/products', label: 'Products', icon: Package },
    { href: '/reports', label: 'Reports', icon: BarChart3 }
  ];

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const [birthdays, anniversaries] = await Promise.all([
          getUpcomingBirthdays(),
          getUpcomingAnniversaries()
        ]);
        setNotificationCount(birthdays.length + anniversaries.length);
      } catch (error) {
        console.error('Error fetching notification count:', error);
        setNotificationCount(0);
      }
    };

    fetchNotificationCount();

    // Refresh count every 5 minutes
    const interval = setInterval(fetchNotificationCount, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/logo2.png" alt="Glam CRM Logo" className="h-10 w-auto bg-white rounded" />
          <h2 className="text-lg font-bold text-purple-800 dark:text-purple-300">Glam CRM</h2>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                        {item.hasNotifications && notificationCount > 0 && (
                          <SidebarMenuBadge className="bg-red-500 text-white ml-auto">
                            {notificationCount > 99 ? '99+' : notificationCount}
                          </SidebarMenuBadge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              {user ? (
                <button onClick={signOut} className="w-full">
                  <UserCircle />
                  <span>Sign out</span>
                </button>
              ) : (
                <Link href="/auth/login">
                  <UserCircle />
                  <span>Sign in</span>
                </Link>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
