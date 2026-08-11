import type { LucideIcon } from 'lucide-react';
import type { AppRole } from '@/types';
import {
  BarChart3,
  Code2,
  Coins,
  DollarSign,
  FileCheck,
  FileText,
  FolderTree,
  History,
  Landmark,
  LayoutDashboard,
  MessageSquareWarning,
  Package,
  PackageOpen,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Truck,
  Users,
} from 'lucide-react';

export type NotificationKey =
  | 'pendingSales'
  | 'pendingApprovals'
  | 'overdueSettlements'
  | 'complaints'
  | 'returns'
  | 'displayRequests';

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  featureKey: string;
  notificationKey?: NotificationKey;
  navRoles?: AppRole[];
}

export interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

export const navigationGroups: NavigationGroup[] = [
  {
    title: 'Ringkasan',
    items: [
      { name: 'Dasbor', href: '/', icon: LayoutDashboard, featureKey: 'dashboard' },
      { name: 'Analisa', href: '/analytics', icon: BarChart3, featureKey: 'analytics' },
    ],
  },
  {
    title: 'Inventaris',
    items: [
      { name: 'Data Master', href: '/products', icon: Package, featureKey: 'products' },
      { name: 'Sistem Display', href: '/display', icon: PackageOpen, featureKey: 'display', notificationKey: 'displayRequests' },
      { name: 'Kategori', href: '/categories', icon: FolderTree, featureKey: 'categories' },
      { name: 'Stok', href: '/stock', icon: BarChart3, featureKey: 'stock' },
    ],
  },
  {
    title: 'Pengajuan Stok',
    items: [
      { name: 'Pengajuan Stok', href: '/purchases', icon: ShoppingCart, featureKey: 'purchases' },
      { name: 'Supplier', href: '/suppliers', icon: Users, featureKey: 'suppliers' },
    ],
  },
  {
    title: 'Penjualan',
    items: [
      { name: 'Penjualan', href: '/sales', icon: ShoppingBag, featureKey: 'sales' },
      { name: 'Proses Penjualan', href: '/sales/process', icon: FileCheck, featureKey: 'sales-process', notificationKey: 'pendingSales' },
      { name: 'Komplen', href: '/complaints', icon: MessageSquareWarning, featureKey: 'complaints', notificationKey: 'complaints' },
    ],
  },
  {
    title: 'Keuangan',
    items: [
      { name: 'Ringkasan Keuangan', href: '/financial-summary', icon: DollarSign, featureKey: 'financial-summary' },
      { name: 'Pelunasan', href: '/settlements', icon: Coins, featureKey: 'settlements', notificationKey: 'overdueSettlements' },
      { name: 'Buku Bank', href: '/bank-book', icon: Landmark, featureKey: 'settlements', navRoles: ['ADMIN', 'SUPER_ADMIN', 'DEV'] },
      { name: 'Laporan Global', href: '/finance/global-report', icon: FileText, featureKey: 'finance-global-report' },
    ],
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
    ],
  },
  {
    title: 'Developer',
    items: [{ name: 'Dev Control', href: '/dev/features', icon: Code2, featureKey: 'dev-feature-control' }],
  },
];

export const navigationItems = navigationGroups.flatMap((group) => group.items);

export function findNavigationItemByPath(pathname: string | null | undefined) {
  if (!pathname) return undefined;

  return [...navigationItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => {
      if (item.href === '/') return pathname === '/';
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
    });
}
