'use client';

import { useAuthStore } from '@/lib/stores/auth';
import { useLogout } from '@/lib/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User, Menu } from 'lucide-react';
import { GlobalSearch } from '@/components/ui/global-search';
import { useUIStore } from '@/lib/stores/ui';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function Header() {
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogout();
  const openMobileNav = useUIStore((state) => state.openMobileNav);

  const initials = user?.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';
  const roleLabel = user?.isTestingMode ? (user.originalRole || 'TESTING') : user?.role;

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 shadow-sm">
      {/* Mobile Sidebar Trigger */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="md:hidden -ml-2" 
        onClick={openMobileNav}
      >
        <Menu className="h-6 w-6" />
        <span className="sr-only">Menu</span>
      </Button>

      <div className="animate-in flex-shrink-0 hidden md:block">
        <h2 className="text-lg font-bold tracking-tight text-gradient">
          Sistem Manajemen Gudang
        </h2>
      </div>

      {/* Global Search */}
      <div className="flex-1 max-w-md mx-4">
        <GlobalSearch />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-accent transition-all duration-200 focus:outline-none">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-foreground">{user?.fullName}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{roleLabel}</p>
          </div>
          <Avatar className="h-9 w-9 border-2 border-primary/20 transition-transform hover:scale-105">
            <AvatarFallback className="bg-primary text-primary-foreground font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Akun Saya</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profil</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => logoutMutation.mutate()}
            className="text-red-600 focus:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Keluar</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
