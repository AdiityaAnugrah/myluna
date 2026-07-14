'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useFeatures } from '@/lib/hooks/useFeatures';
import { Badge } from '@/components/ui/badge';
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
  PackageOpen,
  Code2,
  type LucideIcon,
} from 'lucide-react';

type NotificationKey =
  | 'pendingSales'
  | 'pendingApprovals'
  | 'overdueSettlements'
  | 'complaints'
  | 'returns'
  | 'displayRequests';

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  featureKey?: string;
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
      { name: 'Dasbor', href: '/', icon: LayoutDashboard, featureKey: 'dashboard' },
      { name: 'Analisa', href: '/analytics', icon: BarChart3, featureKey: 'analytics' },
    ]
  },
  {
    title: 'Inventaris',
    items: [
      { name: 'Data Master', href: '/products', icon: Package, featureKey: 'products' },
      { name: 'Sistem Display', href: '/display', icon: PackageOpen, featureKey: 'display', notificationKey: 'displayRequests' },
      { name: 'Kategori', href: '/categories', icon: FolderTree, featureKey: 'categories' },
      { name: 'Stok', href: '/stock', icon: BarChart3, featureKey: 'stock' },
    ]
  },
  {
    title: 'Pengajuan Stok',
    items: [
      { name: 'Pengajuan Stok', href: '/purchases', icon: ShoppingCart, featureKey: 'purchases' },
      { name: 'Supplier', href: '/suppliers', icon: Users, featureKey: 'suppliers' },
    ]
  },
  {
    title: 'Penjualan',
    items: [
      { name: 'Penjualan', href: '/sales', icon: ShoppingBag, featureKey: 'sales' },
      { name: 'Proses Penjualan', href: '/sales/process', icon: FileCheck, featureKey: 'sales-process', notificationKey: 'pendingSales' },
      { name: 'Komplen', href: '/complaints', icon: MessageSquareWarning, featureKey: 'complaints', notificationKey: 'complaints' },
    ]
  },
  {
    title: 'Keuangan',
    items: [
      { name: 'Ringkasan Keuangan', href: '/financial-summary', icon: DollarSign, featureKey: 'financial-summary' },
      { name: 'Pelunasan', href: '/settlements', icon: Coins, featureKey: 'settlements', notificationKey: 'overdueSettlements' },

      { name: 'Laporan Global', href: '/finance/global-report', icon: FileText, featureKey: 'finance-global-report' },
    ]
  },

  {
    title: 'Sistem',
    items: [
      { name: 'Pengguna', href: '/users', icon: Users, featureKey: 'users' },
      { name: 'Platform', href: '/platforms', icon: Store, featureKey: 'platforms' },
      { name: 'Jasa Pengiriman', href: '/shipping', icon: Truck, featureKey: 'shipping' },
      { name: 'Persetujuan', href: '/approvals', icon: FileText, featureKey: 'approvals', notificationKey: 'pendingApprovals' },
      { name: 'Pengaturan', href: '/settings', icon: Settings, featureKey: 'settings' },
      { name: 'Riwayat Aktivitas', href: '/activities', icon: History, featureKey: 'activities' },
    ]
  },
  {
    title: 'Developer',
    items: [
      { name: 'Dev Control', href: '/dev/features', icon: Code2, featureKey: 'dev-feature-control' },
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
  const { data: featuresResponse } = useFeatures();
  const features = featuresResponse?.data || [];
  const featureMap = new Map(features.map((feature) => [feature.key, feature]));
  const featureControlReady = features.length > 0;
  const isDev = role === 'DEV';

  const filteredGroups = navigationGroups.map(group => {
    let groupItems = group.items;

    // Logic for USER
    if (role === 'USER') {
      const allowedGroups = ['Ringkasan', 'Inventaris', 'Pengajuan Stok', 'Penjualan', 'Keuangan', 'Sistem'];

      if (!allowedGroups.includes(group.title)) {
        groupItems = [];
      } else if (group.title === 'Ringkasan') {
        groupItems = group.items.filter(item => item.href === '/');
      } else if (group.title === 'Keuangan') {
        groupItems = group.items.filter(item => item.href === '/settlements');
      } else if (group.title === 'Sistem') {
        groupItems = group.items.filter(item => item.href === '/settings');
      }
    }

    // Logic for ADMIN: full access except /users, /activities, and /platforms
    if (role === 'ADMIN') {
      if (group.title === 'Sistem') {
        groupItems = group.items.filter(item =>
            item.href !== '/users' && item.href !== '/activities' && item.href !== '/platforms'
          );
      } else if (group.title === 'Developer') {
        groupItems = [];
      } else {
        groupItems = group.items;
      }
    }

    // Logic for TCP
    if (role === 'TCP') {
        const allowedGroups = ['Ringkasan', 'Penjualan', 'Inventaris', 'Sistem'];

        if (!allowedGroups.includes(group.title)) {
            groupItems = [];
        } else if (group.title === 'Ringkasan') {
            groupItems = group.items.filter(item => item.href === '/');
        } else if (group.title === 'Penjualan') {
            groupItems = group.items.filter(item => item.href === '/sales/process' || item.href === '/complaints');
        } else if (group.title === 'Inventaris') {
            groupItems = group.items.filter(item => item.href === '/display');
        } else if (group.title === 'Sistem') {
            groupItems = group.items.filter(item => item.href === '/settings');
        }
    }

    // Filter "Proses Penjualan" — only visible to TCP, ADMIN, SUPER_ADMIN
    if (group.title === 'Penjualan' && role !== 'ADMIN') {
        if (role !== 'TCP' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
            groupItems = groupItems.filter(item => item.href !== '/sales/process');
        }
    }

    if (role === 'SUPER_ADMIN') {
      groupItems = group.title === 'Developer' ? [] : group.items;
    }

    if (isDev) {
      groupItems = group.items;
    }

    if (featureControlReady) {
      groupItems = groupItems.filter((item) => {
        const feature = item.featureKey ? featureMap.get(item.featureKey) : undefined;
        if (!feature) return true;
        if (isDev) return true;
        return feature.isEnabled;
      });
    }

    return { ...group, items: groupItems };
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
                } else if (item.notificationKey === 'complaints') {
                  notificationCount = notifications.complaintsCount;
                } else if (item.notificationKey === 'returns') {
                  notificationCount = notifications.returnsCount;
                } else if (item.notificationKey === 'displayRequests') {
                  notificationCount = notifications.displayRequestsCount;
                }
                const feature = item.featureKey ? featureMap.get(item.featureKey) : undefined;

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
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate">{item.name}</span>
                      {feature?.isDevelopment && (
                        <Badge variant="outline" className="shrink-0 border-amber-300 bg-amber-50 px-1.5 py-0 text-[9px] text-amber-700">
                          Dev
                        </Badge>
                      )}
                      {isDev && feature && !feature.isEnabled && (
                        <Badge variant="outline" className="shrink-0 border-slate-300 bg-slate-100 px-1.5 py-0 text-[9px] text-slate-600">
                          Off
                        </Badge>
                      )}
                    </span>
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
