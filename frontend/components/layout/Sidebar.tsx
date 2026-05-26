'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Users,
  ShoppingCart,
  ShoppingBag,
  MessageSquareWarning,
  BarChart3,
  FileText,
  Store,
  History,
  Settings,
  FileCheck,
  Coins,
  DollarSign,
  Truck,
  type LucideIcon,
} from 'lucide-react';

type NotificationKey = 'pendingSales' | 'pendingApprovals' | 'overdueSettlements';

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  notificationKey?: NotificationKey;
}

interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

const navigationGroups: NavigationGroup[] = [
  {
    title: 'Ringkasan',
    items: [
      { name: 'Dasbor', href: '/', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Inventaris',
    items: [
      { name: 'Data Master', href: '/products', icon: Package },
      { name: 'Kategori', href: '/categories', icon: FolderTree },
      { name: 'Stok', href: '/stock', icon: BarChart3 },
    ]
  },
  {
    title: 'Pengajuan Stok',
    items: [
      { name: 'Pengajuan Stok', href: '/purchases', icon: ShoppingCart },
      { name: 'Supplier', href: '/suppliers', icon: Users },
    ]
  },
  {
    title: 'Penjualan',
    items: [
      { name: 'Penjualan', href: '/sales', icon: ShoppingBag },
      { name: 'Proses Penjualan', href: '/sales/process', icon: FileCheck, notificationKey: 'pendingSales' },
      { name: 'Komplen', href: '/complaints', icon: MessageSquareWarning },
    ]
  },
  {
    title: 'Keuangan',
    items: [
      { name: 'Ringkasan Keuangan', href: '/financial-summary', icon: DollarSign },
      { name: 'Pelunasan', href: '/settlements', icon: Coins, notificationKey: 'overdueSettlements' },

      { name: 'Laporan Global', href: '/finance/global-report', icon: FileText },
    ]
  },

  {
    title: 'Sistem',
    items: [
      { name: 'Pengguna', href: '/users', icon: Users },
      { name: 'Platform', href: '/platforms', icon: Store },
      { name: 'Jasa Pengiriman', href: '/shipping', icon: Truck },
      { name: 'Persetujuan', href: '/approvals', icon: FileText, notificationKey: 'pendingApprovals' },
      { name: 'Pengaturan', href: '/settings', icon: Settings },
      { name: 'Riwayat Aktivitas', href: '/activities', icon: History },
    ]
  }
];

import { Logo } from '@/components/ui/logo';

interface SidebarProps {
  isMobile?: boolean;
  onScanClick?: () => void;
}

export function Sidebar({ isMobile, onScanClick }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const role = user?.isTestingMode ? 'SUPER_ADMIN' : user?.role;
  const notifications = useNotifications();

  const filteredGroups = navigationGroups.map(group => {
    // Logic for USER
    if (role === 'USER') {
      const allowedGroups = ['Ringkasan', 'Inventaris', 'Pengajuan Stok', 'Penjualan', 'Keuangan', 'Sistem'];
      
      if (!allowedGroups.includes(group.title)) {
        return { ...group, items: [] };
      }

      // Special handling for Keuangan group for USER - only show Pelunasan
      if (group.title === 'Keuangan') {
        return {
          ...group,
          items: group.items.filter(item => item.href === '/settlements')
        };
      }

      // Special handling for Sistem group for USER
      if (group.title === 'Sistem') {
        return {
            ...group,
            items: group.items.filter(item => item.href === '/settings')  // USER only sees Settings
        };
      }
    }

    // Logic for ADMIN: full access except /users, /activities, and /platforms
    if (role === 'ADMIN') {
      if (group.title === 'Sistem') {
        return {
          ...group,
          items: group.items.filter(item =>
            item.href !== '/users' && item.href !== '/activities' && item.href !== '/platforms'
          )
        };
      }
      // ADMIN sees everything else (including Laporan Global, Proses Penjualan, etc.)
      return group;
    }

    // Logic for TCP
    if (role === 'TCP') {
        const allowedGroups = ['Ringkasan', 'Penjualan', 'Sistem'];
        
        if (!allowedGroups.includes(group.title)) {
            return { ...group, items: [] };
        }

        if (group.title === 'Penjualan') {
            return {
                ...group,
                items: group.items.filter(item => item.href === '/sales/process' || item.href === '/complaints')
            };
        }
        
        if (group.title === 'Sistem') {
            return {
                ...group,
                items: group.items.filter(item => item.href === '/settings')  // TCP only sees Settings
            };
        }
    }

    // Filter "Proses Penjualan" — only visible to TCP, ADMIN, SUPER_ADMIN
    if (group.title === 'Penjualan') {
        if (role !== 'TCP' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
            return {
                ...group,
                items: group.items.filter(item => item.href !== '/sales/process')
            };
        }
    }

    // SUPER_ADMIN (or others) sees everything by default
    return group;
  }).filter(group => group.items.length > 0);

  return (
    <div className={cn(
      "flex h-full flex-col bg-sidebar text-sidebar-foreground overflow-y-auto border-r border-sidebar-border",
      isMobile ? "w-full border-none" : "w-64"
    )}>
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border shrink-0">
        <Logo size="md" />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-6 tour-sidebar-nav">
        {filteredGroups.map((group) => (
          <div key={group.title} className="mb-6">
            <div className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {group.title}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = item.href === '/' 
                  ? pathname === '/' 
                  : pathname === item.href || pathname?.startsWith(item.href + '/');
                
                // Get notification count if item has notificationKey
                let notificationCount = 0;
                if (item.notificationKey === 'pendingSales') {
                  notificationCount = notifications.pendingSalesCount;
                } else if (item.notificationKey === 'pendingApprovals') {
                  notificationCount = notifications.pendingApprovalsCount;
                } else if (item.notificationKey === 'overdueSettlements') {
                  notificationCount = notifications.overdueSettlementsCount;
                }
                  
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onScanClick}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-all duration-200 group',
                      isMobile ? 'text-[12px]' : 'text-sm',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-1'
                    )}
                  >
                    <item.icon className={cn(
                      "transition-transform group-hover:scale-110",
                      isMobile ? "h-4 w-4" : "h-5 w-5",
                      isActive ? "text-primary-foreground" : "text-sidebar-foreground/40 group-hover:text-primary"
                    )} />
                    <span className="flex-1">{item.name}</span>
                    {notificationCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white animate-pulse">
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Section - Settings - Removed to avoid duplication and use role-based navigation groups */}

    </div>
  );
}
